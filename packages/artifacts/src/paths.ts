import os from "node:os";
import path from "node:path";

export function getRunsRoot() {
  const dataDir = process.env.STUDIOFLOW_DATA_DIR ?? process.env.STUDIOFLOW_HOME;
  const defaultRunsDir =
    dataDir && dataDir.trim()
      ? path.join(path.resolve(dataDir), "runs")
      : path.join(os.homedir(), ".studioflow", "runs");
  const configured = process.env.STUDIOFLOW_RUNS_DIR || defaultRunsDir;
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
