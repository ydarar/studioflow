import { spawn } from "node:child_process";
import kleur from "kleur";
import type { FlowDefinition } from "@studioflow/contracts";
import { ensureChromiumInstalled } from "@studioflow/adapters-playwright";
import { loadFlowFromFile } from "@studioflow/flow-registry";
import { runEngine } from "@studioflow/orchestrator";
import { ensureAutomationPermissions } from "@studioflow/adapters-desktop";
import type { ResolvedRuntimeConfig, RuntimeConfigOverrides } from "./config.js";
import { resolveRuntimeConfig } from "./config.js";
import { validateFlowDefinition } from "./flow-validation.js";
import { resolveFromWorkspace, workspaceRoot } from "./path-utils.js";
import { runScreenStudioPreflight } from "./screenstudio-prep.js";

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

async function startAppLifecycle(
  baseUrl: string,
  startCommand: string | undefined,
  healthPath: string
): Promise<() => Promise<void>> {
  const healthUrl = new URL(healthPath, baseUrl).toString();

  try {
    await waitForHealth(healthUrl, 1800);
    return async () => {};
  } catch {
    // App not running yet, continue and launch it.
  }

  if (!startCommand) {
    throw new Error(
      `App is not healthy at ${healthUrl} and no start command is configured. Run \`studioflow bootstrap\` or pass --start-command.`
    );
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

async function runWithFlows(
  intentLabel: string,
  flowIds: string[],
  flows: FlowDefinition[],
  runtime: ResolvedRuntimeConfig
) {
  const chromium = await ensureChromiumInstalled({ autoInstall: true });
  if (!chromium.installed) {
    throw new Error("Playwright Chromium is not installed. Run `studioflow setup` and retry.");
  }
  if (chromium.installedNow) {
    console.log(kleur.green("Installed Playwright Chromium runtime."));
  }

  await ensureAutomationPermissions();
  try {
    const prep = await runScreenStudioPreflight({ ensurePermissions: false, quiet: true });
    console.log(`Screen Studio preflight: ready (${prep.recordMenuItems.join(", ")})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Screen Studio preflight failed: ${message}. Run \`studioflow screenstudio-prep\` for diagnostics.`);
  }

  for (const flow of flows) {
    const validation = validateFlowDefinition(flow);
    if (!validation.valid) {
      throw new Error(`Flow ${flow.id} failed validation: ${validation.errors.join("; ")}`);
    }
  }

  const started = Date.now();

  console.log(kleur.bold("StudioFlow Run"));
  console.log(`Intent: ${intentLabel}`);
  console.log(`Mapped flows: ${flowIds.join(", ")}`);
  console.log(`Base URL: ${runtime.values.baseUrl}`);
  console.log(`Start command: ${runtime.values.startCommand ?? "(not configured)"}`);
  console.log(`Health path: ${runtime.values.healthPath}`);
  console.log(`Headless: ${String(runtime.values.headless)}`);
  console.log(`Runs dir: ${runtime.values.runsDir}`);

  const previousRunsDir = process.env.STUDIOFLOW_RUNS_DIR;
  process.env.STUDIOFLOW_RUNS_DIR = runtime.values.runsDir;
  try {
    const result = await runEngine({
      intent: intentLabel,
      flows,
      baseUrl: runtime.values.baseUrl,
      headless: runtime.values.headless,
      startApp: async () =>
        startAppLifecycle(runtime.values.baseUrl, runtime.values.startCommand, runtime.values.healthPath)
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
  } finally {
    if (previousRunsDir === undefined) {
      delete process.env.STUDIOFLOW_RUNS_DIR;
    } else {
      process.env.STUDIOFLOW_RUNS_DIR = previousRunsDir;
    }
  }
}

export async function runFlowFileCommand(
  flowPath: string,
  sourceIntent = "artifact flow",
  overrides?: RuntimeConfigOverrides
) {
  if (!flowPath) {
    throw new Error("Usage: studioflow run --flow <path/to/flow.json|yaml>");
  }

  const resolvedPath = resolveFromWorkspace(flowPath);
  const runtime = await resolveRuntimeConfig(overrides);
  const flow = await loadFlowFromFile(resolvedPath);
  await runWithFlows(sourceIntent, [flow.id], [flow], runtime);
}
