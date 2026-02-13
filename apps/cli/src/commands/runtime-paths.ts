import os from "node:os";
import path from "node:path";

export function getDemopilotDataDir() {
  const configured = process.env.DEMOPILOT_DATA_DIR ?? process.env.DEMOPILOT_HOME;
  if (configured && configured.trim()) {
    return path.resolve(configured);
  }
  return path.join(os.homedir(), ".demopilot");
}

export function getCodexSkillsDir() {
  const codexHome = process.env.CODEX_HOME;
  const base = codexHome && codexHome.trim() ? path.resolve(codexHome) : path.join(os.homedir(), ".codex");
  return path.join(base, "skills");
}
