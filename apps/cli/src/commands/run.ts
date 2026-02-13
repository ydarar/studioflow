import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import kleur from "kleur";
import { bootstrapReportSchema } from "@studioflow/contracts";
import { ensureChromiumInstalled } from "@studioflow/adapters-playwright";
import { loadFlows, getFlowById, loadFlowFromFile } from "@studioflow/flow-registry";
import { routeIntent } from "@studioflow/planner";
import { runEngine } from "@studioflow/orchestrator";
import { ensureAutomationPermissions } from "@studioflow/adapters-desktop";
import { validateFlowDefinition } from "./flow-validation.js";
import { resolveFromWorkspace, workspaceRoot } from "./path-utils.js";

async function waitForHealth(healthUrl: string, timeoutMs = 45_000) {
  const start = Date.now();
  let lastError: unknown = null;

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
      lastError = new Error(`Health endpoint returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  throw new Error(`Timed out waiting for sample app health (${healthUrl}): ${String(lastError)}`);
}

async function loadBootstrapHints() {
  const configured = process.env.STUDIOFLOW_BOOTSTRAP_REPORT ?? "artifacts/bootstrap.json";
  const resolved = resolveFromWorkspace(configured);

  try {
    const raw = await fs.readFile(resolved, "utf8");
    return bootstrapReportSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function startAppLifecycle(baseUrl: string, startCommand: string, healthPath: string): Promise<() => Promise<void>> {
  const healthUrl = new URL(healthPath, baseUrl).toString();

  try {
    await waitForHealth(healthUrl, 1800);
    return async () => {};
  } catch {
    // App not running yet, continue and launch it.
  }

  const child = spawn(startCommand, {
    shell: true,
    cwd: workspaceRoot(),
    stdio: "ignore",
    detached: false
  });

  try {
    await waitForHealth(healthUrl, 60_000);
  } catch (error) {
    child.kill("SIGTERM");
    throw error;
  }

  return async () => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  };
}

function formatDuration(start: number) {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

async function runWithFlows(intentLabel: string, flowIds: string[], flows: Awaited<ReturnType<typeof loadFlowFromFile>>[]) {
  const chromium = await ensureChromiumInstalled({ autoInstall: true });
  if (!chromium.installed) {
    throw new Error("Playwright Chromium is not installed. Run `studioflow setup` and retry.");
  }
  if (chromium.installedNow) {
    console.log(kleur.green("Installed Playwright Chromium runtime."));
  }

  await ensureAutomationPermissions();

  for (const flow of flows) {
    const validation = validateFlowDefinition(flow);
    if (!validation.valid) {
      throw new Error(`Flow ${flow.id} failed validation: ${validation.errors.join("; ")}`);
    }
  }

  const baseUrl = process.env.STUDIOFLOW_BASE_URL ?? "http://localhost:4173";
  const bootstrap = await loadBootstrapHints();
  const startCommand = process.env.STUDIOFLOW_START_COMMAND ?? bootstrap?.startCommand ?? "pnpm --filter @studioflow/sample-app dev";
  const healthPath = process.env.STUDIOFLOW_HEALTH_PATH ?? bootstrap?.healthPath ?? "/api/health";
  const started = Date.now();

  console.log(kleur.bold("StudioFlow Run"));
  console.log(`Intent: ${intentLabel}`);
  console.log(`Mapped flows: ${flowIds.join(", ")}`);
  console.log(`Start command: ${startCommand}`);
  console.log(`Health path: ${healthPath}`);

  try {
    const result = await runEngine({
      intent: intentLabel,
      flows,
      baseUrl,
      startApp: async () => startAppLifecycle(baseUrl, startCommand, healthPath)
    });

    console.log(kleur.green("Run completed successfully."));
    console.log(`Run ID: ${result.runId}`);
    console.log(`Duration: ${formatDuration(started)}`);
    console.log(`Artifacts: ${result.runDir}`);
  } catch (error) {
    const err = error as { message?: string; runDir?: string };
    console.error(kleur.red(`Run failed: ${err.message ?? String(error)}`));
    if (err.runDir) {
      console.error(kleur.yellow(`Artifacts: ${err.runDir}`));
    }
    throw error;
  }
}

export async function runIntentCommand(intent: string) {
  const knownFlows = await loadFlows();
  if (knownFlows.length === 0) {
    throw new Error("No flows registered.");
  }

  const mapping = await routeIntent(
    intent,
    knownFlows.map((f) => f.id)
  );

  const selectedFlows = await Promise.all(mapping.selectedFlowIds.map((id) => getFlowById(id)));

  console.log(`Rationale: ${mapping.rationale} (confidence ${(mapping.confidence * 100).toFixed(0)}%)`);

  await runWithFlows(intent, mapping.selectedFlowIds, selectedFlows);
}

export async function runFlowFileCommand(flowPath: string, sourceIntent = "artifact flow") {
  if (!flowPath) {
    throw new Error("Usage: studioflow run --flow <path/to/flow.json|yaml>");
  }

  const resolvedPath = resolveFromWorkspace(flowPath);
  const flow = await loadFlowFromFile(resolvedPath);
  await runWithFlows(sourceIntent, [flow.id], [flow]);
}
