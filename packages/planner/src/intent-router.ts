import type { IntentMapping } from "@studioflow/contracts";

export async function routeIntent(intent: string, knownFlowIds: string[]): Promise<IntentMapping> {
  const normalized = intent.toLowerCase();

  const hasOnboarding = normalized.includes("onboarding");
  const hasBilling = normalized.includes("billing") || normalized.includes("plan");

  if (hasOnboarding && hasBilling && knownFlowIds.includes("onboarding_billing")) {
    return {
      intent,
      selectedFlowIds: ["onboarding_billing"],
      confidence: 0.98,
      rationale: "Direct keyword match for combined onboarding and billing flow"
    };
  }

  if (hasOnboarding && knownFlowIds.includes("onboarding")) {
    return {
      intent,
      selectedFlowIds: ["onboarding"],
      confidence: 0.94,
      rationale: "Keyword match for onboarding flow"
    };
  }

  if (hasBilling && knownFlowIds.includes("billing")) {
    return {
      intent,
      selectedFlowIds: ["billing"],
      confidence: 0.92,
      rationale: "Keyword match for billing flow"
    };
  }

  return {
    intent,
    selectedFlowIds: [knownFlowIds[0]],
    confidence: 0.55,
    rationale: "Fallback to first registered deterministic flow"
  };
}
