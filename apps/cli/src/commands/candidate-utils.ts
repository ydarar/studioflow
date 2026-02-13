import fs from "node:fs/promises";
import path from "node:path";
import type { LearningCandidate } from "@demopilot/contracts";
import { getCandidateById, loadCandidateFromFile, loadCandidates } from "@demopilot/flow-registry";
import { resolveFromWorkspace } from "./path-utils.js";

export interface ResolvedCandidate {
  file: string;
  candidate: LearningCandidate;
}

function seemsLikePath(ref: string) {
  return ref.includes("/") || ref.includes("\\") || ref.endsWith(".json");
}

export async function resolveCandidateReference(ref?: string): Promise<ResolvedCandidate> {
  if (!ref) {
    const loaded = await loadCandidates();
    const latest = loaded.at(-1);
    if (!latest) {
      throw new Error("No learning candidates found.");
    }
    return latest;
  }

  if (seemsLikePath(ref)) {
    const resolved = resolveFromWorkspace(ref);
    const candidate = await loadCandidateFromFile(resolved);
    return { file: resolved, candidate };
  }

  return await getCandidateById(ref);
}

export async function persistCandidate(filePath: string, candidate: LearningCandidate) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(candidate, null, 2), "utf8");
}
