import { describe, expect, it } from "vitest";
import { routeIntent } from "@demopilot/planner";

describe("day0 demo mapping", () => {
  it("handles canonical phrase", async () => {
    const mapping = await routeIntent("show onboarding and billing", [
      "onboarding",
      "billing",
      "onboarding_billing"
    ]);

    expect(mapping.selectedFlowIds).toEqual(["onboarding_billing"]);
  });
});
