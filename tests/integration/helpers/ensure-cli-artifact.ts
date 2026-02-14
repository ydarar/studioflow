import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const lockDirName = ".cli-prepack-lock";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function waitForUnlock(lockDirPath: string, timeoutMs: number) {
  const start = Date.now();
  while (await pathExists(lockDirPath)) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for CLI prepack lock: ${lockDirPath}`);
    }
    await sleep(120);
  }
}

export async function ensureCliArtifact(rootDir: string) {
  const cliDistPath = path.join(rootDir, "apps/cli/dist/index.js");
  if (await pathExists(cliDistPath)) {
    return;
  }

  const runsDir = path.join(rootDir, ".runs");
  await fs.mkdir(runsDir, { recursive: true });
  const lockDirPath = path.join(runsDir, lockDirName);

  for (;;) {
    try {
      await fs.mkdir(lockDirPath);
      break;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") {
        throw error;
      }
      await waitForUnlock(lockDirPath, 120_000);
      if (await pathExists(cliDistPath)) {
        return;
      }
    }
  }

  try {
    await execFileAsync("pnpm", ["--filter", "studioflow", "run", "prepack"], {
      cwd: rootDir,
      env: process.env
    });
  } finally {
    await fs.rm(lockDirPath, { recursive: true, force: true });
  }
}

