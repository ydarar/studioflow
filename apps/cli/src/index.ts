#!/usr/bin/env node
import "dotenv/config";
import kleur from "kleur";
import { runFlowFileCommand, runIntentCommand } from "./commands/run.js";
import { listFlowsCommand } from "./commands/list-flows.js";
import { doctorCommand } from "./commands/doctor.js";
import { listCandidatesCommand } from "./commands/list-candidates.js";
import { discoverCommand } from "./commands/discover.js";
import { planCommand } from "./commands/plan.js";
import { validateCommand } from "./commands/validate.js";
import { bootstrapCommand } from "./commands/bootstrap.js";
import { replayCommand } from "./commands/replay.js";
import { promoteCommand } from "./commands/promote.js";
import { screenstudioPrepCommand } from "./commands/screenstudio-prep.js";
import type { PacingProfile } from "@demopilot/contracts";

function readFlag(args: string[], flag: string) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

function removeFlagPair(args: string[], flag: string) {
  const index = args.indexOf(flag);
  if (index === -1) return args;
  const copy = [...args];
  copy.splice(index, 2);
  return copy;
}

function parsePacingProfile(raw?: string): PacingProfile | undefined {
  if (!raw) return undefined;
  if (raw === "fast" || raw === "standard" || raw === "cinematic") return raw;
  throw new Error("Invalid --pacing-profile. Expected one of: fast, standard, cinematic.");
}

async function main() {
  const [, , command = "run", ...args] = process.argv;
  const normalizedArgs = args.filter((arg) => arg !== "--");

  try {
    if (command === "run" || command === "demo") {
      const flowPath = readFlag(normalizedArgs, "--flow");
      if (flowPath) {
        const sourceIntent = readFlag(normalizedArgs, "--intent") ?? "artifact flow";
        await runFlowFileCommand(flowPath, sourceIntent);
        return;
      }

      const intentArgs = removeFlagPair(removeFlagPair(normalizedArgs, "--flow"), "--intent");
      const intent = intentArgs.join(" ").trim();
      if (!intent) {
        throw new Error("Usage: demopilot run \"<intent>\" OR demopilot run --flow <path>");
      }
      await runIntentCommand(intent);
      return;
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

    if (command === "plan") {
      const intent = readFlag(normalizedArgs, "--intent") ?? normalizedArgs.filter((a) => !a.startsWith("--")).join(" ").trim();
      if (!intent) {
        throw new Error(
          "Usage: demopilot plan --intent \"<intent>\" [--report artifacts/structure-report.json] [--out artifacts/flow.json] [--llm-plan artifacts/llm-plan.json] [--plan-report artifacts/plan-report.json] [--pacing-profile fast|standard|cinematic] [--target-duration-sec <int>] [--emphasis <path/to/emphasis.json>]"
        );
      }
      const reportPath = readFlag(normalizedArgs, "--report") ?? "artifacts/structure-report.json";
      const outPath = readFlag(normalizedArgs, "--out") ?? "artifacts/flow.json";
      const llmPlanPath = readFlag(normalizedArgs, "--llm-plan");
      const planReportOut = readFlag(normalizedArgs, "--plan-report");
      const pacingProfile = parsePacingProfile(readFlag(normalizedArgs, "--pacing-profile"));
      const targetDurationRaw = readFlag(normalizedArgs, "--target-duration-sec");
      let targetDurationSec: number | undefined;
      if (targetDurationRaw) {
        const parsedTarget = Number(targetDurationRaw);
        if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
          throw new Error("Invalid --target-duration-sec. Expected a positive number.");
        }
        targetDurationSec = parsedTarget;
      }
      const emphasisPath = readFlag(normalizedArgs, "--emphasis");
      await planCommand({
        intent,
        reportPath,
        outPath,
        llmPlanPath,
        planReportOut,
        pacingProfile,
        targetDurationSec: targetDurationSec ? Math.round(targetDurationSec) : undefined,
        emphasisPath
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

    if (command === "list-candidates") {
      await listCandidatesCommand();
      return;
    }

    if (command === "replay") {
      const candidateRef = readFlag(normalizedArgs, "--candidate") ?? normalizedArgs.find((arg) => !arg.startsWith("--"));
      const attemptsRaw = readFlag(normalizedArgs, "--attempts");
      const attempts = attemptsRaw ? Number(attemptsRaw) : undefined;
      if (attemptsRaw && Number.isNaN(attempts)) {
        throw new Error("Usage: demopilot replay [--candidate <candidateId|path>] [--attempts <number>]");
      }
      await replayCommand({ candidateRef, attempts });
      return;
    }

    if (command === "promote") {
      const candidateRef = readFlag(normalizedArgs, "--candidate") ?? normalizedArgs.find((arg) => !arg.startsWith("--"));
      const flowId = readFlag(normalizedArgs, "--flow-id");
      const minPassesRaw = readFlag(normalizedArgs, "--min-passes");
      const minStabilityRaw = readFlag(normalizedArgs, "--min-stability");
      const minPasses = minPassesRaw ? Number(minPassesRaw) : undefined;
      const minStability = minStabilityRaw ? Number(minStabilityRaw) : undefined;

      if (minPassesRaw && Number.isNaN(minPasses)) {
        throw new Error("Usage: demopilot promote [--candidate <candidateId|path>] [--flow-id <id>] [--min-passes <number>] [--min-stability <0..1>]");
      }
      if (minStabilityRaw && Number.isNaN(minStability)) {
        throw new Error("Usage: demopilot promote [--candidate <candidateId|path>] [--flow-id <id>] [--min-passes <number>] [--min-stability <0..1>]");
      }

      await promoteCommand({ candidateRef, flowId, minPasses, minStability });
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(kleur.red(`DemoPilot error: ${message}`));
    process.exit(1);
  }
}

main();
