import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const cliDir = path.join(rootDir, "apps/cli");
const builtCliPath = path.join(cliDir, "dist/index.js");

function stripAnsi(text: string) {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

async function runBuiltCli(args: string[]) {
  try {
    const result = await execFileAsync("node", [builtCliPath, ...args], {
      cwd: rootDir,
      env: process.env
    });
    return {
      code: 0,
      stdout: stripAnsi(result.stdout),
      stderr: stripAnsi(result.stderr)
    };
  } catch (error) {
    const failed = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      code: failed.code ?? 1,
      stdout: stripAnsi(failed.stdout ?? ""),
      stderr: stripAnsi(failed.stderr ?? "")
    };
  }
}

describe.sequential("built cli artifact", () => {
  it("builds and executes --version and -v directly from dist output", async () => {
    await execFileAsync("pnpm", ["--filter", "studioflow", "run", "build"], {
      cwd: rootDir,
      env: process.env
    });

    const shebang = await fs.readFile(builtCliPath, "utf8");
    expect(shebang.startsWith("#!/usr/bin/env node\n")).toBe(true);
    expect(shebang.startsWith("#!/usr/bin/env node\n#!/usr/bin/env node\n")).toBe(false);

    const pkg = JSON.parse(await fs.readFile(path.join(cliDir, "package.json"), "utf8")) as { version: string };

    const longVersion = await runBuiltCli(["--version"]);
    expect(longVersion.code).toBe(0);
    expect(longVersion.stdout.trim()).toBe(pkg.version);

    const shortVersion = await runBuiltCli(["-v"]);
    expect(shortVersion.code).toBe(0);
    expect(shortVersion.stdout.trim()).toBe(pkg.version);
  });
});
