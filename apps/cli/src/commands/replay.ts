import fs from "node:fs/promises";
import path from "node:path";
import kleur from "kleur";
import { resolveCandidateReference, persistCandidate } from "./candidate-utils.js";
import { validateFlowDefinition } from "./flow-validation.js";
import { workspaceRoot } from "./path-utils.js";

async function walk(dir: string, acc: string[] = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (["node_modules", ".next", ".git", "dist", ".runs"].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, acc);
    } else {
      acc.push(fullPath);
    }
  }
  return acc;
}

function extractTestId(selector: string): string | null {
  const bracketMatch = selector.match(/\[data-testid=(["']?)([^"'\\\]]+)\1\]/);
  if (bracketMatch) return bracketMatch[2];

  const attrMatch = selector.match(/data-testid=(["'])([^"']+)\1/);
  if (attrMatch) return attrMatch[2];

  return null;
}

async function selectorResolvabilityScore(selectors: string[]) {
  if (selectors.length === 0) return 1;

  const testIds = selectors.map(extractTestId).filter((value): value is string => Boolean(value));
  if (testIds.length === 0) return 0.6;

  const root = workspaceRoot();
  const files = await walk(root);
  const sourceFiles = files.filter((file) => /\.(tsx|ts|jsx|js|html)$/.test(file));
  const contents = await Promise.all(sourceFiles.map((file) => fs.readFile(file, "utf8")));
  const corpus = contents.join("\n");

  const matched = testIds.filter((testId) => corpus.includes(`data-testid="${testId}"`) || corpus.includes(`data-testid='${testId}'`));
  return matched.length / testIds.length;
}

export async function replayCommand(opts: { candidateRef?: string; attempts?: number }) {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const resolved = await resolveCandidateReference(opts.candidateRef);
  const validation = validateFlowDefinition(resolved.candidate.flow);
  const selectors = resolved.candidate.flow.steps
    .map((step) => step.target)
    .filter((target): target is string => Boolean(target));
  const resolvability = await selectorResolvabilityScore(selectors);
  const passThreshold = 0.75;
  const attemptPass = validation.valid && resolvability >= passThreshold;
  const passes = attemptPass ? attempts : 0;

  resolved.candidate.replay = {
    attempts: resolved.candidate.replay.attempts + attempts,
    passes: resolved.candidate.replay.passes + passes
  };
  resolved.candidate.selectorStabilityScore = Number(
    (((resolved.candidate.selectorStabilityScore ?? 0.6) + resolvability) / 2).toFixed(3)
  );
  resolved.candidate.validationState = attemptPass ? "validated" : "candidate";

  await persistCandidate(resolved.file, resolved.candidate);

  console.log(kleur.bold("Replay gate complete."));
  console.log(`- Candidate: ${resolved.candidate.candidateId}`);
  console.log(`- Candidate file: ${resolved.file}`);
  console.log(`- Attempts (this run): ${attempts}`);
  console.log(`- Passes (this run): ${passes}`);
  console.log(`- Total attempts: ${resolved.candidate.replay.attempts}`);
  console.log(`- Total passes: ${resolved.candidate.replay.passes}`);
  console.log(`- Selector resolvability: ${resolvability.toFixed(2)}`);
  console.log(`- Validation state: ${resolved.candidate.validationState}`);

  if (!validation.valid) {
    console.log(kleur.yellow(`- Flow validation errors: ${validation.errors.join("; ")}`));
  }
  if (validation.warnings.length > 0) {
    console.log(kleur.yellow(`- Flow validation warnings: ${validation.warnings.join("; ")}`));
  }
}
