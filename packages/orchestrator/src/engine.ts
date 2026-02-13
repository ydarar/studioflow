import fs from "node:fs/promises";
import path from "node:path";
import type { FlowDefinition, RunArtifactIndex } from "@studioflow/contracts";
import { appendJsonLine, createRunContext, writeJsonFile } from "@studioflow/artifacts";
import { executeStep, startBrowser } from "@studioflow/adapters-playwright";
import { exportRecording, startRecording, stopRecording } from "@studioflow/adapters-screenstudio";
import { withRetry } from "./retry-policy.js";
import type { EngineState } from "./state-machine.js";

export interface RunInput {
  intent: string;
  flows: FlowDefinition[];
  startApp: () => Promise<() => Promise<void>>;
  baseUrl: string;
  headless?: boolean;
}

export async function runEngine(input: RunInput): Promise<RunArtifactIndex & { runDir: string }> {
  const run = await createRunContext();
  let state: EngineState = "INIT";
  const files: Record<string, string> = {
    events: run.eventsFile
  };

  const emit = async (event: string, payload: Record<string, unknown> = {}) => {
    await appendJsonLine(run.eventsFile, {
      ts: new Date().toISOString(),
      state,
      event,
      ...payload
    });
  };

  let closeApp: (() => Promise<void>) | null = null;
  const { browser, page } = await startBrowser(input.baseUrl, { headless: input.headless });

  try {
    state = "START_APP";
    await emit("start_app.begin");
    closeApp = await input.startApp();
    await emit("start_app.done");

    state = "START_RECORDER";
    await emit("recorder.start.begin");
    await startRecording();
    // Recording startup brings Screen Studio to foreground; return focus to the demo browser.
    await page.bringToFront();
    await emit("recorder.start.done");

    state = "RUN_FLOW";
    const runtimePacingEnabled = (process.env.STUDIOFLOW_PACING_ADJUSTMENT ?? "true").toLowerCase() !== "false";
    for (const flow of input.flows) {
      await emit("flow.begin", { flowId: flow.id });
      const flowMultiplier = runtimePacingEnabled ? flow.pacing?.durationMultiplier ?? 1 : 1;
      const strictPacing = flow.pacing?.strictPacing ?? false;
      for (const step of flow.steps) {
        await withRetry(
          async () => {
            await emit("step.begin", { flowId: flow.id, stepId: step.id, action: step.action });
            await executeStep(page, step, run.runDir, input.baseUrl, {
              pacingMultiplier: flowMultiplier,
              strictPacing,
              jitterSeed: `${run.runId}:${flow.id}:${step.id}`
            });
            await emit("step.done", { flowId: flow.id, stepId: step.id });
          },
          { retries: step.retries ?? 2 }
        );
      }
      await emit("flow.done", { flowId: flow.id });
    }

    state = "STOP_RECORDER";
    await emit("recorder.stop.begin");
    await stopRecording();
    await emit("recorder.stop.done");

    state = "EXPORT";
    await emit("recorder.export.begin");
    await exportRecording();
    await emit("recorder.export.done");

    state = "VERIFY_ARTIFACTS";
    const planPath = path.join(run.runDir, "plan.json");
    await writeJsonFile(planPath, {
      intent: input.intent,
      flowIds: input.flows.map((f) => f.id),
      pacing: {
        runtimeAdjustmentEnabled: runtimePacingEnabled,
        flows: input.flows.map((flow) => ({
          flowId: flow.id,
          profile: flow.pacing?.profile ?? "standard",
          predictedDurationSec: flow.pacing?.predictedDurationSec,
          targetDurationSec: flow.pacing?.targetDurationSec,
          durationMultiplier: runtimePacingEnabled ? flow.pacing?.durationMultiplier ?? 1 : 1,
          strictPacing: flow.pacing?.strictPacing ?? false
        }))
      }
    });
    files.plan = planPath;

    state = "DONE";
    await emit("run.done", { runId: run.runId });

    const result: RunArtifactIndex & { runDir: string } = {
      runId: run.runId,
      runDir: run.runDir,
      status: "success",
      startedAt: run.startedAt,
      endedAt: new Date().toISOString(),
      files
    };

    const resultPath = path.join(run.runDir, "run.json");
    files.run = resultPath;
    await writeJsonFile(resultPath, result);

    return result;
  } catch (error) {
    state = "FAILED";
    await emit("run.failed", { message: error instanceof Error ? error.message : String(error) });

    const failShot = path.join(run.runDir, "screenshots", "failure.png");
    await page.screenshot({ path: failShot, fullPage: true });
    files.failureScreenshot = failShot;

    const result: RunArtifactIndex & { runDir: string } = {
      runId: run.runId,
      runDir: run.runDir,
      status: "failed",
      startedAt: run.startedAt,
      endedAt: new Date().toISOString(),
      files
    };

    const resultPath = path.join(run.runDir, "run.json");
    files.run = resultPath;
    await writeJsonFile(resultPath, result);

    throw Object.assign(new Error(error instanceof Error ? error.message : String(error)), {
      runDir: run.runDir,
      resultPath
    });
  } finally {
    await browser.close();
    if (closeApp) {
      await closeApp();
    }
    // Ensure run dir exists even on failure if nothing else touched it
    await fs.mkdir(run.runDir, { recursive: true });
  }
}
