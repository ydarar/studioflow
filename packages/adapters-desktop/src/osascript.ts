import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runAppleScript(script: string) {
  const { stdout, stderr } = await execFileAsync("osascript", ["-e", script]);
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}
