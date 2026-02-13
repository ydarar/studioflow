import fs from "node:fs/promises";
import path from "node:path";
import { getRunDir } from "./paths.js";

export interface RunContext {
  runId: string;
  runDir: string;
  eventsFile: string;
  startedAt: string;
}

export async function createRunContext() {
  const now = new Date();
  const runId = now.toISOString().replace(/[:.]/g, "-");
  const runDir = getRunDir(runId);
  const screenshotsDir = path.join(runDir, "screenshots");
  await fs.mkdir(screenshotsDir, { recursive: true });

  const eventsFile = path.join(runDir, "events.jsonl");
  await fs.writeFile(eventsFile, "", "utf8");

  return {
    runId,
    runDir,
    eventsFile,
    startedAt: now.toISOString()
  } satisfies RunContext;
}

export async function writeJsonFile(filePath: string, payload: unknown) {
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}
