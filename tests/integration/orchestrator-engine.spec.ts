import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FlowDefinition } from "@studioflow/contracts";

const {
  startBrowserMock,
  executeStepMock,
  startRecordingMock,
  stopRecordingMock,
  exportRecordingMock,
  writeCandidateMock
} = vi.hoisted(() => ({
  startBrowserMock: vi.fn(),
  executeStepMock: vi.fn(),
  startRecordingMock: vi.fn(),
  stopRecordingMock: vi.fn(),
  exportRecordingMock: vi.fn(),
  writeCandidateMock: vi.fn()
}));

vi.mock("@studioflow/adapters-playwright", () => ({
  startBrowser: startBrowserMock,
  executeStep: executeStepMock
}));

vi.mock("@studioflow/adapters-screenstudio", () => ({
  startRecording: startRecordingMock,
  stopRecording: stopRecordingMock,
  exportRecording: exportRecordingMock
}));

vi.mock("@studioflow/flow-registry", () => ({
  writeCandidate: writeCandidateMock
}));

function parseJsonLines(raw: string) {
  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { event: string });
}

function makeFlow(stepOverrides: Partial<FlowDefinition["steps"][number]> = {}): FlowDefinition {
  return {
    id: "billing",
    description: "billing flow",
    tags: ["billing"],
    steps: [
      {
        id: "step-1",
        action: "click",
        target: '[data-testid="plan-pro"]',
        retries: 1,
        ...stepOverrides
      }
    ]
  };
}

describe.sequential("orchestrator engine", () => {
  const originalEnv = { ...process.env };
  let tempRoot = "";

  beforeEach(async () => {
    vi.resetModules();
    startBrowserMock.mockReset();
    executeStepMock.mockReset();
    startRecordingMock.mockReset();
    stopRecordingMock.mockReset();
    exportRecordingMock.mockReset();
    writeCandidateMock.mockReset();

    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "studioflow-orchestrator-"));
    process.env = {
      ...originalEnv,
      STUDIOFLOW_RUNS_DIR: path.join(tempRoot, "runs")
    };

    const page = {
      bringToFront: vi.fn(),
      screenshot: vi.fn(async () => {})
    };
    const browser = {
      close: vi.fn(async () => {})
    };

    startBrowserMock.mockResolvedValue({ page, browser });
    startRecordingMock.mockResolvedValue(undefined);
    stopRecordingMock.mockResolvedValue(undefined);
    exportRecordingMock.mockResolvedValue(undefined);
    writeCandidateMock.mockResolvedValue(path.join(tempRoot, "candidate.json"));
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("retries failed steps and writes success artifacts with expected state events", async () => {
    let attempts = 0;
    executeStepMock.mockImplementation(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("transient step failure");
      }
    });

    const closeApp = vi.fn(async () => {});
    const { runEngine } = await import("../../packages/orchestrator/src/engine.ts");

    const result = await runEngine({
      intent: "billing flow",
      flows: [makeFlow({ retries: 1 })],
      baseUrl: "http://localhost:4173",
      startApp: async () => closeApp
    });

    expect(executeStepMock).toHaveBeenCalledTimes(2);
    expect(startRecordingMock).toHaveBeenCalledTimes(1);
    expect(stopRecordingMock).toHaveBeenCalledTimes(1);
    expect(exportRecordingMock).toHaveBeenCalledTimes(1);
    expect(closeApp).toHaveBeenCalledTimes(1);

    const eventsRaw = await fs.readFile(result.files.events, "utf8");
    const events = parseJsonLines(eventsRaw).map((item) => item.event);
    expect(events).toEqual([
      "start_app.begin",
      "start_app.done",
      "recorder.start.begin",
      "recorder.start.done",
      "flow.begin",
      "step.begin",
      "step.begin",
      "step.done",
      "flow.done",
      "recorder.stop.begin",
      "recorder.stop.done",
      "recorder.export.begin",
      "recorder.export.done",
      "run.done"
    ]);

    const runJsonPath = result.files.run;
    expect(runJsonPath).toBeTruthy();
    const runJson = JSON.parse(await fs.readFile(runJsonPath, "utf8")) as { status: string };
    expect(runJson.status).toBe("success");
  });

  it("captures failure artifacts and returns enriched errors on fatal step failures", async () => {
    executeStepMock.mockRejectedValue(new Error("fatal step failure"));
    const closeApp = vi.fn(async () => {});

    const { runEngine } = await import("../../packages/orchestrator/src/engine.ts");

    let thrown: unknown;
    try {
      await runEngine({
        intent: "billing flow",
        flows: [makeFlow({ retries: 0 })],
        baseUrl: "http://localhost:4173",
        startApp: async () => closeApp
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeTruthy();
    const err = thrown as { message: string; runDir: string; resultPath: string };
    expect(err.message).toBe("fatal step failure");
    expect(err.runDir).toContain(path.join(tempRoot, "runs"));
    expect(err.resultPath).toContain("run.json");

    const runJson = JSON.parse(await fs.readFile(err.resultPath, "utf8")) as {
      status: string;
      files: Record<string, string>;
    };
    expect(runJson.status).toBe("failed");
    expect(runJson.files.failureScreenshot).toContain("screenshots/failure.png");

    const eventsRaw = await fs.readFile(path.join(err.runDir, "events.jsonl"), "utf8");
    const events = parseJsonLines(eventsRaw).map((item) => item.event);
    expect(events).toContain("run.failed");

    expect(stopRecordingMock).not.toHaveBeenCalled();
    expect(exportRecordingMock).not.toHaveBeenCalled();
    const { page, browser } = await startBrowserMock.mock.results[0].value;
    expect(page.screenshot).toHaveBeenCalledTimes(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
    expect(closeApp).toHaveBeenCalledTimes(1);
  });

  it("passes flow pacing context into step execution", async () => {
    executeStepMock.mockResolvedValue(undefined);

    const closeApp = vi.fn(async () => {});
    const { runEngine } = await import("../../packages/orchestrator/src/engine.ts");

    await runEngine({
      intent: "billing flow",
      flows: [
        {
          ...makeFlow(),
          pacing: {
            profile: "cinematic",
            predictedDurationSec: 42,
            durationMultiplier: 1.3,
            strictPacing: true
          }
        }
      ],
      baseUrl: "http://localhost:4173",
      startApp: async () => closeApp
    });

    expect(executeStepMock).toHaveBeenCalledTimes(1);
    const context = executeStepMock.mock.calls[0]?.[4] as
      | { pacingMultiplier?: number; strictPacing?: boolean; jitterSeed?: string }
      | undefined;
    expect(context?.pacingMultiplier).toBe(1.3);
    expect(context?.strictPacing).toBe(true);
    expect(context?.jitterSeed).toContain("billing:step-1");
  });
});
