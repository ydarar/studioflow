import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

function stripAnsi(text: string) {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

async function runCli(args: string[]) {
  try {
    const result = await execFileAsync(
      "pnpm",
      ["--filter", "@demopilot/cli", "exec", "tsx", "src/index.ts", ...args],
      { cwd: rootDir }
    );
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

describe.sequential("cli command contracts", () => {
  it("uses `run` in root doctor script to avoid pnpm command collisions", async () => {
    const pkgPath = path.resolve(rootDir, "package.json");
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.doctor).toBe("pnpm --filter @demopilot/cli run doctor");
  });

  it("returns a clear error for unknown commands", async () => {
    const result = await runCli(["definitely-not-a-command"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("DemoPilot error: Unknown command: definitely-not-a-command");
  });

  it("lists deterministic flows from the flow registry", async () => {
    const result = await runCli(["list-flows"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Available deterministic flows");
    expect(result.stdout).toContain("onboarding");
    expect(result.stdout).toContain("billing");
    expect(result.stdout).toContain("onboarding_billing");
  });
});
