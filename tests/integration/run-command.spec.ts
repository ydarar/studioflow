import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FlowDefinition } from "@studioflow/contracts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

const {
  loadFlowsMock,
  getFlowByIdMock,
  loadFlowFromFileMock,
  routeIntentMock,
  runEngineMock,
  ensureAutomationPermissionsMock
} = vi.hoisted(() => ({
  loadFlowsMock: vi.fn(),
  getFlowByIdMock: vi.fn(),
  loadFlowFromFileMock: vi.fn(),
  routeIntentMock: vi.fn(),
  runEngineMock: vi.fn(),
  ensureAutomationPermissionsMock: vi.fn()
}));

vi.mock("@studioflow/flow-registry", () => ({
  loadFlows: loadFlowsMock,
  getFlowById: getFlowByIdMock,
  loadFlowFromFile: loadFlowFromFileMock
}));

vi.mock("@studioflow/planner", () => ({
  routeIntent: routeIntentMock
}));

vi.mock("@studioflow/orchestrator", () => ({
  runEngine: runEngineMock
}));

vi.mock("@studioflow/adapters-desktop", () => ({
  ensureAutomationPermissions: ensureAutomationPermissionsMock
}));

function makeFlow(id: string): FlowDefinition {
  return {
    id,
    description: `${id} flow`,
    tags: [id],
    steps: [
      {
        id: "goto-root",
        action: "goto",
        value: "/"
      }
    ]
  };
}

describe.sequential("run command orchestration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    loadFlowsMock.mockReset();
    getFlowByIdMock.mockReset();
    loadFlowFromFileMock.mockReset();
    routeIntentMock.mockReset();
    runEngineMock.mockReset();
    ensureAutomationPermissionsMock.mockReset();

    process.env = { ...originalEnv };
    process.env.INIT_CWD = rootDir;
    process.env.STUDIOFLOW_BASE_URL = "http://localhost:4173";
    delete process.env.STUDIOFLOW_START_COMMAND;
    delete process.env.STUDIOFLOW_HEALTH_PATH;
    delete process.env.STUDIOFLOW_BOOTSTRAP_REPORT;

    ensureAutomationPermissionsMock.mockResolvedValue({
      screenStudioInstalled: true,
      canRunAppleScript: true,
      canSendKeystrokes: true,
      notes: []
    });

    loadFlowsMock.mockResolvedValue([makeFlow("billing"), makeFlow("onboarding_billing")]);
    getFlowByIdMock.mockResolvedValue(makeFlow("billing"));
    routeIntentMock.mockResolvedValue({
      intent: "walk me through billing",
      selectedFlowIds: ["billing"],
      confidence: 0.92,
      rationale: "Keyword match"
    });
    loadFlowFromFileMock.mockResolvedValue(makeFlow("billing"));
    runEngineMock.mockResolvedValue({
      runId: "run-123",
      runDir: "/tmp/run-123",
      status: "success",
      startedAt: "2026-02-01T00:00:00.000Z",
      endedAt: "2026-02-01T00:00:10.000Z",
      files: {}
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("prefers STUDIOFLOW_* env overrides over bootstrap hints", async () => {
    const bootstrapDir = await fs.mkdtemp(path.join(os.tmpdir(), "studioflow-bootstrap-"));
    const bootstrapPath = path.join(bootstrapDir, "bootstrap.json");
    await fs.writeFile(
      bootstrapPath,
      JSON.stringify(
        {
          generatedAt: "2026-02-01T00:00:00.000Z",
          projectRoot: rootDir,
          packageManager: "pnpm",
          projectType: "nextjs",
          startCommand: "pnpm bootstrap-start",
          healthPath: "/bootstrap-health",
          notes: []
        },
        null,
        2
      ),
      "utf8"
    );

    process.env.STUDIOFLOW_BOOTSTRAP_REPORT = bootstrapPath;
    process.env.STUDIOFLOW_START_COMMAND = "pnpm env-start";
    process.env.STUDIOFLOW_HEALTH_PATH = "/env-health";

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { runIntentCommand } = await import("../../apps/cli/src/commands/run.ts");

    await runIntentCommand("walk me through billing");

    const logged = logSpy.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("Start command: pnpm env-start");
    expect(logged).toContain("Health path: /env-health");
    expect(runEngineMock).toHaveBeenCalledTimes(1);
  });

  it("uses bootstrap hints when env overrides are absent", async () => {
    const bootstrapDir = await fs.mkdtemp(path.join(os.tmpdir(), "studioflow-bootstrap-"));
    const bootstrapPath = path.join(bootstrapDir, "bootstrap.json");
    await fs.writeFile(
      bootstrapPath,
      JSON.stringify(
        {
          generatedAt: "2026-02-01T00:00:00.000Z",
          projectRoot: rootDir,
          packageManager: "pnpm",
          projectType: "nextjs",
          startCommand: "pnpm bootstrap-start",
          healthPath: "/bootstrap-health",
          notes: []
        },
        null,
        2
      ),
      "utf8"
    );

    process.env.STUDIOFLOW_BOOTSTRAP_REPORT = bootstrapPath;
    delete process.env.STUDIOFLOW_START_COMMAND;
    delete process.env.STUDIOFLOW_HEALTH_PATH;

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { runIntentCommand } = await import("../../apps/cli/src/commands/run.ts");

    await runIntentCommand("walk me through billing");

    const logged = logSpy.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("Start command: pnpm bootstrap-start");
    expect(logged).toContain("Health path: /bootstrap-health");
  });

  it("falls back to default start command and health path when no hints exist", async () => {
    process.env.STUDIOFLOW_BOOTSTRAP_REPORT = path.join(rootDir, "does-not-exist-bootstrap.json");
    delete process.env.STUDIOFLOW_START_COMMAND;
    delete process.env.STUDIOFLOW_HEALTH_PATH;

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { runIntentCommand } = await import("../../apps/cli/src/commands/run.ts");

    await runIntentCommand("walk me through billing");

    const logged = logSpy.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("Start command: pnpm --filter @studioflow/sample-app dev");
    expect(logged).toContain("Health path: /api/health");
  });

  it("fails fast on invalid flow definitions before orchestrator execution", async () => {
    getFlowByIdMock.mockResolvedValue({
      id: "broken",
      description: "invalid flow",
      tags: [],
      steps: [
        {
          id: "bad-click",
          action: "click"
        }
      ]
    });
    routeIntentMock.mockResolvedValue({
      intent: "broken flow",
      selectedFlowIds: ["broken"],
      confidence: 0.2,
      rationale: "test"
    });

    const { runIntentCommand } = await import("../../apps/cli/src/commands/run.ts");

    await expect(runIntentCommand("broken flow")).rejects.toThrow(
      "Flow broken failed validation: step[0] (bad-click): action click requires target"
    );
    expect(runEngineMock).not.toHaveBeenCalled();
  });

  it("resolves --flow paths from workspace root for runFlowFileCommand", async () => {
    const { runFlowFileCommand } = await import("../../apps/cli/src/commands/run.ts");

    await runFlowFileCommand("artifacts/flow.json", "artifact flow");

    expect(loadFlowFromFileMock).toHaveBeenCalledWith(path.join(rootDir, "artifacts/flow.json"));
    expect(runEngineMock).toHaveBeenCalledTimes(1);
  });
});
