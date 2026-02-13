import path from "node:path";

export function getRunsRoot() {
  const configured = process.env.STUDIOFLOW_RUNS_DIR || ".runs";
  if (path.isAbsolute(configured)) {
    return configured;
  }

  const initCwd = process.env.INIT_CWD;
  if (initCwd) {
    return path.resolve(initCwd, configured);
  }

  return path.resolve(process.cwd(), configured);
}

export function getRunDir(runId: string) {
  return path.join(getRunsRoot(), runId);
}
