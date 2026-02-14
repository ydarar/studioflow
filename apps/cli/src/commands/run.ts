import { spawn } from "node:child_process";
import kleur from "kleur";
import type { FlowDefinition, RecorderBackend } from "@studioflow/contracts";
import { ensureChromiumInstalled } from "@studioflow/adapters-playwright";
import { loadFlowFromFile } from "@studioflow/flow-registry";
import { runEngine } from "@studioflow/orchestrator";
import { ensureAutomationPermissions } from "@studioflow/adapters-desktop";
import type { ResolvedRuntimeConfig, RuntimeConfigOverrides } from "./config.js";
import { resolveRuntimeConfig } from "./config.js";
import { validateFlowDefinition } from "./flow-validation.js";
import { resolveFromWorkspace, workspaceRoot } from "./path-utils.js";
import { runScreenStudioPreflight } from "./screenstudio-prep.js";
import { runQuickTimePreflight } from "./quicktime-prep.js";

interface ParsedStartCommand {
  command: string;
  args: string[];
}

export interface RunCommandOptions {
  allowExport?: boolean;
}

const explicitExportIntentMatchers = [
  /\bexport(?:ed|ing)?\b/i,
  /\bdownload(?:ed|ing)?\b/i,
  /\bsave(?:\s+(?:the|to|as|a|an))*\s+(?:video|recording|file)\b/i,
  /\bshareable\s+link\b/i,
  /\bcopy\s+to\s+clipboard\b/i
];

function isWhitespace(char: string) {
  return /\s/.test(char);
}

export function parseStartCommand(raw: string): ParsedStartCommand {
  const tokens: string[] = [];
  let current = "";
  let tokenStarted = false;
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (escaped) {
      current += char;
      tokenStarted = true;
      escaped = false;
      continue;
    }

    if (char === "\\" && quote !== "'") {
      escaped = true;
      tokenStarted = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      tokenStarted = true;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      tokenStarted = true;
      continue;
    }

    if (isWhitespace(char)) {
      if (tokenStarted) {
        tokens.push(current);
        current = "";
        tokenStarted = false;
      }
      continue;
    }

    current += char;
    tokenStarted = true;
  }

  if (escaped) {
    throw new Error("Start command ends with an escape character.");
  }
  if (quote) {
    throw new Error("Start command contains an unterminated quote.");
  }
  if (tokenStarted) {
    tokens.push(current);
  }
  if (tokens.length === 0) {
    throw new Error("Start command is empty.");
  }

  const [command, ...args] = tokens;
  return { command, args };
}

function flowRequestsExport(flows: FlowDefinition[]) {
  return flows.some((flow) => flow.steps.some((step) => step.action === "recorder_export"));
}

function parseBooleanFromEnv(name: string, env: NodeJS.ProcessEnv = process.env) {
  const raw = env[name];
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(`Invalid ${name} value: ${raw}. Expected true or false.`);
}

export function intentAllowsExport(intentLabel: string) {
  const normalized = intentLabel.trim();
  if (!normalized) return false;
  return explicitExportIntentMatchers.some((matcher) => matcher.test(normalized));
}

function resolveExportPermission(intentLabel: string, opts: RunCommandOptions = {}) {
  if (opts.allowExport !== undefined) {
    return opts.allowExport;
  }
  const envOverride = parseBooleanFromEnv("STUDIOFLOW_ALLOW_EXPORT");
  if (envOverride !== undefined) {
    return envOverride;
  }
  return intentAllowsExport(intentLabel);
}

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

  const parsedStartCommand = parseStartCommand(startCommand);
  const child = spawn(parsedStartCommand.command, parsedStartCommand.args, {
    shell: false,
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

async function runRecorderPreflight(recorder: RecorderBackend) {
  if (recorder === "screenstudio") {
    const prep = await runScreenStudioPreflight({ ensurePermissions: false, quiet: true });
    return {
      label: "Screen Studio",
      itemsLabel: "Record menu",
      menuItems: prep.recordMenuItems
    };
  }

  const prep = await runQuickTimePreflight({ ensurePermissions: false, quiet: true });
  return {
    label: "QuickTime",
    itemsLabel: "File menu",
    menuItems: prep.fileMenuItems
  };
}

async function runWithFlows(
  intentLabel: string,
  flowIds: string[],
  flows: FlowDefinition[],
  runtime: ResolvedRuntimeConfig,
  opts: RunCommandOptions = {}
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
    const prep = await runRecorderPreflight(runtime.values.recorder);
    console.log(`${prep.label} preflight: ready (${prep.itemsLabel}: ${prep.menuItems.join(", ")})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const diagnosticsCommand =
      runtime.values.recorder === "screenstudio" ? "studioflow screenstudio-prep" : "studioflow quicktime-prep";
    throw new Error(`${runtime.values.recorder} preflight failed: ${message}. Run \`${diagnosticsCommand}\` for diagnostics.`);
  }

  for (const flow of flows) {
    const validation = validateFlowDefinition(flow);
    if (!validation.valid) {
      throw new Error(`Flow ${flow.id} failed validation: ${validation.errors.join("; ")}`);
    }
  }

  if (flowRequestsExport(flows) && !resolveExportPermission(intentLabel, opts)) {
    throw new Error(
      "Flow includes recorder_export, but the run intent does not explicitly request export. Remove recorder_export, include export language in --intent, or pass --allow-export true."
    );
  }

  const started = Date.now();

  console.log(kleur.bold("StudioFlow Run"));
  console.log(`Intent: ${intentLabel}`);
  console.log(`Mapped flows: ${flowIds.join(", ")}`);
  console.log(`Base URL: ${runtime.values.baseUrl}`);
  console.log(`Start command: ${runtime.values.startCommand ?? "(not configured)"}`);
  console.log(`Health path: ${runtime.values.healthPath}`);
  console.log(`Headless: ${String(runtime.values.headless)}`);
  console.log(`Recorder: ${runtime.values.recorder}`);
  console.log(`Runs dir: ${runtime.values.runsDir}`);

  const previousRunsDir = process.env.STUDIOFLOW_RUNS_DIR;
  process.env.STUDIOFLOW_RUNS_DIR = runtime.values.runsDir;
  try {
    const result = await runEngine({
      intent: intentLabel,
      flows,
      baseUrl: runtime.values.baseUrl,
      headless: runtime.values.headless,
      recorder: runtime.values.recorder,
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
  overrides?: RuntimeConfigOverrides,
  opts: RunCommandOptions = {}
) {
  if (!flowPath) {
    throw new Error("Usage: studioflow run --flow <path/to/flow.json|yaml>");
  }

  const resolvedPath = resolveFromWorkspace(flowPath);
  const runtime = await resolveRuntimeConfig(overrides);
  const flow = await loadFlowFromFile(resolvedPath);
  await runWithFlows(sourceIntent, [flow.id], [flow], runtime, opts);
}
