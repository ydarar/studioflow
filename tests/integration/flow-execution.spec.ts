import { describe, expect, it } from "vitest";
import { loadFlows } from "@demopilot/flow-registry";

describe("flow registry", () => {
  it("loads deterministic day0 flows", async () => {
    const flows = await loadFlows();
    const ids = flows.map((f) => f.id);
    expect(ids).toEqual(["billing", "onboarding", "onboarding_billing"]);

    for (const flow of flows) {
      expect(flow.steps.length).toBeGreaterThan(0);
      const uniqueStepIds = new Set(flow.steps.map((step) => step.id));
      expect(uniqueStepIds.size).toBe(flow.steps.length);
    }

    const combined = flows.find((flow) => flow.id === "onboarding_billing");
    expect(combined).toBeTruthy();
    expect(combined?.steps.some((step) => step.action === "screenshot")).toBe(true);
  });
});
