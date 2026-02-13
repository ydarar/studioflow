import kleur from "kleur";
import { loadFlows } from "@demopilot/flow-registry";

export async function listFlowsCommand() {
  const flows = await loadFlows();
  console.log(kleur.bold("Available deterministic flows:"));
  for (const flow of flows) {
    console.log(`- ${flow.id}: ${flow.description}`);
  }
}
