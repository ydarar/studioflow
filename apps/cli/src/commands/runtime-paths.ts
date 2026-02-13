import os from "node:os";
import path from "node:path";

export function getStudioflowDataDir() {
  const configured = process.env.STUDIOFLOW_DATA_DIR ?? process.env.STUDIOFLOW_HOME;
  if (configured && configured.trim()) {
    return path.resolve(configured);
  }
  return path.join(os.homedir(), ".studioflow");
}

function resolveAgentHome(envVar: string, defaultDir: string) {
  const configured = process.env[envVar];
  return configured && configured.trim() ? path.resolve(configured) : path.join(os.homedir(), defaultDir);
}

export function getCodexSkillsDir() {
  return path.join(resolveAgentHome("CODEX_HOME", ".codex"), "skills");
}

export function getClaudeSkillsDir() {
  return path.join(resolveAgentHome("CLAUDE_HOME", ".claude"), "skills");
}
