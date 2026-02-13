#!/usr/bin/env node
import kleur from "kleur";
import { runFlowFileCommand } from "./commands/run.js";
import { listFlowsCommand } from "./commands/list-flows.js";
import { doctorCommand } from "./commands/doctor.js";
import { discoverCommand } from "./commands/discover.js";
import { validateCommand } from "./commands/validate.js";
import { bootstrapCommand } from "./commands/bootstrap.js";
import { screenstudioPrepCommand } from "./commands/screenstudio-prep.js";
import { setupCommand } from "./commands/setup.js";
import type { SkillsAgentSelection } from "./commands/install-skills.js";
import { installSkillsCommand } from "./commands/install-skills.js";
import type { RuntimeConfigOverrides } from "./commands/config.js";
import { configCheckCommand, configShowCommand } from "./commands/config.js";

function readFlag(args: string[], flag: string) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

function hasFlag(args: string[], flag: string) {
  return args.includes(flag);
}

function parseBoolean(raw: string, flag: string) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`Invalid ${flag} value: ${raw}. Expected true or false.`);
}

function readFlagValue(args: string[], flag: string) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Flag ${flag} requires a value.`);
  }
  return value;
}

function parseRuntimeConfigOverrides(args: string[]): RuntimeConfigOverrides {
  const headlessRaw = readFlagValue(args, "--headless");

  return {
    baseUrl: readFlagValue(args, "--base-url"),
    startCommand: readFlagValue(args, "--start-command"),
    healthPath: readFlagValue(args, "--health-path"),
    bootstrapReportPath: readFlagValue(args, "--bootstrap-report"),
    runsDir: readFlagValue(args, "--runs-dir"),
    headless: headlessRaw ? parseBoolean(headlessRaw, "--headless") : undefined
  };
}

function parseSkillsAgent(raw: string | undefined, flag: string): SkillsAgentSelection | undefined {
  if (raw === undefined) return undefined;
  if (raw === "codex" || raw === "claude" || raw === "all") {
    return raw;
  }
  throw new Error(`Invalid ${flag} value: ${raw}. Expected codex, claude, or all.`);
}

async function main() {
  const [, , command = "run", ...args] = process.argv;
  const normalizedArgs = args.filter((arg) => arg !== "--");

  try {
    if (command === "run" || command === "demo") {
      const flowPath = readFlag(normalizedArgs, "--flow");
      if (!flowPath) {
        throw new Error(
          'Usage: studioflow run --flow <path/to/flow.json|yaml> [--intent "<label>"] [--base-url <url>] [--start-command "<command>"] [--health-path <path>] [--headless <true|false>] [--bootstrap-report <path>] [--runs-dir <path>]'
        );
      }

      const sourceIntent = readFlag(normalizedArgs, "--intent") ?? "artifact flow";
      const runtimeOverrides = parseRuntimeConfigOverrides(normalizedArgs);
      await runFlowFileCommand(flowPath, sourceIntent, runtimeOverrides);
      return;
    }

    if (command === "config") {
      const subcommand = normalizedArgs[0] && !normalizedArgs[0].startsWith("--") ? normalizedArgs[0] : "show";
      const commandArgs = normalizedArgs[0] === subcommand ? normalizedArgs.slice(1) : normalizedArgs;
      const json = hasFlag(commandArgs, "--json");
      const runtimeOverrides = parseRuntimeConfigOverrides(commandArgs);

      if (subcommand === "show") {
        await configShowCommand({ json, overrides: runtimeOverrides });
        return;
      }

      if (subcommand === "check") {
        await configCheckCommand({ json, overrides: runtimeOverrides });
        return;
      }

      throw new Error(
        "Usage: studioflow config <show|check> [--json] [--base-url <url>] [--start-command <command>] [--health-path <path>] [--headless <true|false>] [--bootstrap-report <path>] [--runs-dir <path>]"
      );
    }

    if (command === "discover") {
      const outDir = readFlag(normalizedArgs, "--out") ?? "artifacts";
      await discoverCommand(outDir);
      return;
    }

    if (command === "bootstrap") {
      const outPath = readFlag(normalizedArgs, "--out") ?? "artifacts/bootstrap.json";
      await bootstrapCommand(outPath);
      return;
    }

    if (command === "screenstudio-prep") {
      const appName = readFlag(normalizedArgs, "--app-name");
      await screenstudioPrepCommand(appName);
      return;
    }

    if (command === "setup") {
      await setupCommand({
        skipSkills: hasFlag(normalizedArgs, "--skip-skills"),
        forceSkills: hasFlag(normalizedArgs, "--force-skills"),
        skillsTargetDir: readFlag(normalizedArgs, "--skills-target"),
        skillsAgent: parseSkillsAgent(readFlag(normalizedArgs, "--skills-agent"), "--skills-agent"),
        codexSkillsTargetDir: readFlag(normalizedArgs, "--codex-skills-target"),
        claudeSkillsTargetDir: readFlag(normalizedArgs, "--claude-skills-target")
      });
      return;
    }

    if (command === "install-skills") {
      await installSkillsCommand({
        force: hasFlag(normalizedArgs, "--force"),
        targetDir: readFlag(normalizedArgs, "--target"),
        agent: parseSkillsAgent(readFlag(normalizedArgs, "--agent"), "--agent"),
        codexTargetDir: readFlag(normalizedArgs, "--codex-target"),
        claudeTargetDir: readFlag(normalizedArgs, "--claude-target")
      });
      return;
    }

    if (command === "validate") {
      const flowPath = readFlag(normalizedArgs, "--flow") ?? normalizedArgs[0];
      await validateCommand(flowPath);
      return;
    }

    if (command === "list-flows") {
      await listFlowsCommand();
      return;
    }

    if (command === "doctor") {
      await doctorCommand();
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(kleur.red(`StudioFlow error: ${message}`));
    process.exit(1);
  }
}

main();
