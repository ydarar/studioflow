import kleur from "kleur";
import { writePromotedFlow, writePromotionRecord } from "@demopilot/flow-registry";
import { resolveCandidateReference, persistCandidate } from "./candidate-utils.js";

function sanitizeFlowId(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function promoteCommand(opts: {
  candidateRef?: string;
  flowId?: string;
  minPasses?: number;
  minStability?: number;
}) {
  const minPasses = Math.max(1, opts.minPasses ?? 3);
  const minStability = Math.max(0, Math.min(1, opts.minStability ?? 0.7));

  const resolved = await resolveCandidateReference(opts.candidateRef);

  if (resolved.candidate.replay.passes < minPasses) {
    throw new Error(
      `Candidate ${resolved.candidate.candidateId} has only ${resolved.candidate.replay.passes} replay passes (requires ${minPasses}).`
    );
  }

  if (resolved.candidate.selectorStabilityScore < minStability) {
    throw new Error(
      `Candidate ${resolved.candidate.candidateId} selector stability ${resolved.candidate.selectorStabilityScore.toFixed(2)} is below ${minStability.toFixed(2)}.`
    );
  }

  const promotedFlowId = sanitizeFlowId(opts.flowId ?? resolved.candidate.flow.id);
  if (!promotedFlowId) {
    throw new Error("Unable to derive a valid promoted flow ID.");
  }

  const promotedFlow = {
    ...resolved.candidate.flow,
    id: promotedFlowId,
    tags: Array.from(new Set([...(resolved.candidate.flow.tags ?? []), "promoted"]))
  };

  const flowPath = await writePromotedFlow(promotedFlow);
  const recordPath = await writePromotionRecord({
    candidateId: resolved.candidate.candidateId,
    promotedFlowId,
    promotedAt: new Date().toISOString(),
    replayAttempts: resolved.candidate.replay.attempts,
    replayPasses: resolved.candidate.replay.passes,
    selectorStabilityScore: resolved.candidate.selectorStabilityScore
  });

  resolved.candidate.validationState = "validated";
  resolved.candidate.flow = promotedFlow;
  await persistCandidate(resolved.file, resolved.candidate);

  console.log(kleur.green("Promotion complete."));
  console.log(`- Candidate: ${resolved.candidate.candidateId}`);
  console.log(`- Flow: ${promotedFlowId}`);
  console.log(`- Flow file: ${flowPath}`);
  console.log(`- Promotion record: ${recordPath}`);
}
