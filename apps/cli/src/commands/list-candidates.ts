import { loadCandidates } from "@studioflow/flow-registry";
import kleur from "kleur";

export async function listCandidatesCommand() {
  const candidates = await loadCandidates();
  if (candidates.length === 0) {
    console.log(kleur.yellow("No learning candidates yet."));
    return;
  }

  console.log(kleur.bold("Learning candidates:"));
  for (const entry of candidates) {
    const replay = `${entry.candidate.replay.passes}/${entry.candidate.replay.attempts}`;
    console.log(
      `- ${entry.candidate.candidateId} [${entry.candidate.validationState}] replay=${replay} stability=${entry.candidate.selectorStabilityScore.toFixed(2)}`
    );
  }
}
