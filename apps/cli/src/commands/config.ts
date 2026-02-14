import fs from "node:fs/promises";
import path from "node:path";
import kleur from "kleur";
import { bootstrapReportSchema, type RecorderBackend } from "@studioflow/contracts";
import { resolveFromWorkspace, workspaceRoot } from "./path-utils.js";
import { getStudioflowDataDir } from "./runtime-paths.js";

export type ConfigSource = "flag" | "project-config" | "user-config" | "bootstrap" | "default";

interface RuntimeConfigFile {
  baseUrl?: string;
  startCommand?: string;
  healthPath?: string;
  headless?: boolean;
  recorder?: RecorderBackend;
  bootstrapReport?: string;
  runsDir?: string;
}

interface RuntimeValues {
  baseUrl: string;
  startCommand: string | undefined;
  healthPath: string;
  headless: boolean;
  recorder: RecorderBackend;
  runsDir: string;
}

interface RuntimeSources {
  baseUrl: ConfigSource;
  startCommand: ConfigSource;
  healthPath: ConfigSource;
  headless: ConfigSource;
  recorder: ConfigSource;
  runsDir: ConfigSource;
}

export interface RuntimeConfigOverrides {
  baseUrl?: string;
  startCommand?: string;
  healthPath?: string;
  headless?: boolean;
  recorder?: RecorderBackend;
  bootstrapReportPath?: string;
  runsDir?: string;
}

export interface ResolvedRuntimeConfig {
  values: RuntimeValues;
  sources: RuntimeSources;
  files: {
    projectConfigPath: string;
    projectConfigExists: boolean;
    userConfigPath: string;
    userConfigExists: boolean;
    bootstrapReportPath: string;
    bootstrapReportLoaded: boolean;
  };
}

function ensureObject(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function optionalString(value: unknown, key: string, label: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`${label} field "${key}" must be a string.`);
  }
  return value;
}

function optionalBoolean(value: unknown, key: string, label: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(`${label} field "${key}" must be a boolean.`);
  }
  return value;
}

function optionalRecorder(value: unknown, key: string, label: string) {
  if (value === undefined) return undefined;
  if (value === "quicktime" || value === "screenstudio") {
    return value;
  }
  throw new Error(`${label} field "${key}" must be "quicktime" or "screenstudio".`);
}

function parseRuntimeConfigFile(value: unknown, label: string): RuntimeConfigFile {
  const obj = ensureObject(value, label);
  return {
    baseUrl: optionalString(obj.baseUrl, "baseUrl", label),
    startCommand: optionalString(obj.startCommand, "startCommand", label),
    healthPath: optionalString(obj.healthPath, "healthPath", label),
    headless: optionalBoolean(obj.headless, "headless", label),
    recorder: optionalRecorder(obj.recorder, "recorder", label),
    bootstrapReport: optionalString(obj.bootstrapReport, "bootstrapReport", label),
    runsDir: optionalString(obj.runsDir, "runsDir", label)
  };
}

async function readConfigFile(filePath: string, label: string): Promise<{ exists: boolean; config: RuntimeConfigFile }> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      exists: true,
      config: parseRuntimeConfigFile(parsed, label)
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return { exists: false, config: {} };
    }
    throw error;
  }
}

function chooseOptional(
  candidates: Array<{ value: string | undefined; source: ConfigSource }>
): { value: string | undefined; source: ConfigSource } {
  for (const candidate of candidates) {
    if (candidate.value !== undefined) return candidate;
  }
  return { value: undefined, source: "default" };
}

function chooseString(
  candidates: Array<{ value: string | undefined; source: ConfigSource }>,
  fallback: string
): { value: string; source: ConfigSource } {
  for (const candidate of candidates) {
    if (candidate.value !== undefined) return { value: candidate.value, source: candidate.source };
  }
  return { value: fallback, source: "default" };
}

function chooseBoolean(
  candidates: Array<{ value: boolean | undefined; source: ConfigSource }>,
  fallback: boolean
): { value: boolean; source: ConfigSource } {
  for (const candidate of candidates) {
    if (candidate.value !== undefined) return { value: candidate.value, source: candidate.source };
  }
  return { value: fallback, source: "default" };
}

function validateBaseUrl(baseUrl: string) {
  try {
    new URL(baseUrl);
  } catch {
    throw new Error(`Invalid base URL: ${baseUrl}`);
  }
}

export async function resolveRuntimeConfig(overrides: RuntimeConfigOverrides = {}): Promise<ResolvedRuntimeConfig> {
  const projectConfigPath = path.join(workspaceRoot(), ".studioflow", "config.json");
  const userConfigPath = path.join(getStudioflowDataDir(), "config.json");

  const [project, user] = await Promise.all([
    readConfigFile(projectConfigPath, `Project config (${projectConfigPath})`),
    readConfigFile(userConfigPath, `User config (${userConfigPath})`)
  ]);

  const bootstrapPathField = chooseString(
    [
      { value: overrides.bootstrapReportPath, source: "flag" },
      { value: project.config.bootstrapReport, source: "project-config" },
      { value: user.config.bootstrapReport, source: "user-config" }
    ],
    "artifacts/bootstrap.json"
  );
  const bootstrapReportPath = resolveFromWorkspace(bootstrapPathField.value);

  let bootstrap:
    | {
        startCommand: string;
        healthPath: string;
      }
    | null = null;

  try {
    const raw = await fs.readFile(bootstrapReportPath, "utf8");
    const parsed = bootstrapReportSchema.parse(JSON.parse(raw));
    bootstrap = { startCommand: parsed.startCommand, healthPath: parsed.healthPath };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") {
      throw error;
    }
  }

  const baseUrl = chooseString(
    [
      { value: overrides.baseUrl, source: "flag" },
      { value: project.config.baseUrl, source: "project-config" },
      { value: user.config.baseUrl, source: "user-config" }
    ],
    "http://localhost:4173"
  );

  const startCommand = chooseOptional([
    { value: overrides.startCommand, source: "flag" },
    { value: project.config.startCommand, source: "project-config" },
    { value: user.config.startCommand, source: "user-config" },
    { value: bootstrap?.startCommand, source: "bootstrap" }
  ]);

  const healthPath = chooseString(
    [
      { value: overrides.healthPath, source: "flag" },
      { value: project.config.healthPath, source: "project-config" },
      { value: user.config.healthPath, source: "user-config" },
      { value: bootstrap?.healthPath, source: "bootstrap" }
    ],
    "/api/health"
  );

  const headless = chooseBoolean(
    [
      { value: overrides.headless, source: "flag" },
      { value: project.config.headless, source: "project-config" },
      { value: user.config.headless, source: "user-config" }
    ],
    false
  );

  const recorder = chooseString(
    [
      { value: overrides.recorder, source: "flag" },
      { value: project.config.recorder, source: "project-config" },
      { value: user.config.recorder, source: "user-config" }
    ],
    "quicktime"
  );

  const runsDir = chooseString(
    [
      { value: overrides.runsDir, source: "flag" },
      { value: project.config.runsDir, source: "project-config" },
      { value: user.config.runsDir, source: "user-config" }
    ],
    path.join(getStudioflowDataDir(), "runs")
  );

  validateBaseUrl(baseUrl.value);

  return {
    values: {
      baseUrl: baseUrl.value,
      startCommand: startCommand.value,
      healthPath: healthPath.value,
      headless: headless.value,
      recorder: recorder.value as RecorderBackend,
      runsDir: runsDir.value
    },
    sources: {
      baseUrl: baseUrl.source,
      startCommand: startCommand.source,
      healthPath: healthPath.source,
      headless: headless.source,
      recorder: recorder.source,
      runsDir: runsDir.source
    },
    files: {
      projectConfigPath,
      projectConfigExists: project.exists,
      userConfigPath,
      userConfigExists: user.exists,
      bootstrapReportPath,
      bootstrapReportLoaded: Boolean(bootstrap)
    }
  };
}

export async function configShowCommand(opts: { json?: boolean; overrides?: RuntimeConfigOverrides } = {}) {
  const resolved = await resolveRuntimeConfig(opts.overrides);
  if (opts.json) {
    console.log(JSON.stringify(resolved, null, 2));
    return resolved;
  }

  console.log(kleur.bold("StudioFlow configuration"));
  console.log(`- baseUrl: ${resolved.values.baseUrl} (${resolved.sources.baseUrl})`);
  console.log(
    `- startCommand: ${resolved.values.startCommand ?? "(not configured)"} (${resolved.sources.startCommand})`
  );
  console.log(`- healthPath: ${resolved.values.healthPath} (${resolved.sources.healthPath})`);
  console.log(`- headless: ${String(resolved.values.headless)} (${resolved.sources.headless})`);
  console.log(`- recorder: ${resolved.values.recorder} (${resolved.sources.recorder})`);
  console.log(`- runsDir: ${resolved.values.runsDir} (${resolved.sources.runsDir})`);
  console.log(`- project config: ${resolved.files.projectConfigPath} (${resolved.files.projectConfigExists ? "found" : "missing"})`);
  console.log(`- user config: ${resolved.files.userConfigPath} (${resolved.files.userConfigExists ? "found" : "missing"})`);
  console.log(
    `- bootstrap report: ${resolved.files.bootstrapReportPath} (${resolved.files.bootstrapReportLoaded ? "loaded" : "missing"})`
  );
  return resolved;
}

export async function configCheckCommand(opts: { json?: boolean; overrides?: RuntimeConfigOverrides } = {}) {
  const resolved = await resolveRuntimeConfig(opts.overrides);
  const warnings: string[] = [];

  if (!resolved.values.startCommand) {
    warnings.push("No startCommand resolved. Runs will require the app to already be healthy at baseUrl/healthPath.");
  }
  if (!resolved.files.bootstrapReportLoaded) {
    warnings.push(
      `Bootstrap report not found at ${resolved.files.bootstrapReportPath}. Run \`studioflow bootstrap\` for project hints.`
    );
  }

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          warnings,
          config: resolved
        },
        null,
        2
      )
    );
    return { ok: true, warnings, config: resolved };
  }

  console.log(kleur.green("Configuration check passed."));
  console.log(`- baseUrl: ${resolved.values.baseUrl}`);
  console.log(`- healthPath: ${resolved.values.healthPath}`);
  console.log(`- headless: ${String(resolved.values.headless)}`);
  console.log(`- recorder: ${resolved.values.recorder}`);
  console.log(`- runsDir: ${resolved.values.runsDir}`);
  if (warnings.length > 0) {
    console.log(kleur.yellow("Warnings:"));
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  return { ok: true, warnings, config: resolved };
}
