import path from "node:path";

export function workspaceRoot() {
  return process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
}

export function resolveFromWorkspace(inputPath: string) {
  if (!inputPath) return workspaceRoot();
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(workspaceRoot(), inputPath);
}
