import kleur from "kleur";
import { loadFlowFromFile } from "@studioflow/flow-registry";
import { validateFlowDefinition } from "./flow-validation.js";
import { resolveFromWorkspace } from "./path-utils.js";

export async function validateCommand(flowPath: string) {
  if (!flowPath) {
    throw new Error("Usage: studioflow validate --flow <path/to/flow.json|yaml>");
  }

  const resolvedPath = resolveFromWorkspace(flowPath);
  const flow = await loadFlowFromFile(resolvedPath);
  const result = validateFlowDefinition(flow);

  if (result.warnings.length > 0) {
    console.log(kleur.yellow(`Validation warnings (${result.warnings.length}):`));
    result.warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (!result.valid) {
    console.log(kleur.red(`Validation errors (${result.errors.length}):`));
    result.errors.forEach((error) => console.log(`- ${error}`));
    throw new Error("Flow validation failed");
  }

  console.log(kleur.green(`Flow is valid: ${flow.id}`));
  console.log(`Source: ${resolvedPath}`);
}
