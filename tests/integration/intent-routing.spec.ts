import { describe, expect, it } from "vitest";
import { routeIntent } from "@studioflow/planner";

describe("routeIntent", () => {
  const known = ["billing", "onboarding", "onboarding_billing"];

  it("maps onboarding+billing to combined flow", async () => {
    const result = await routeIntent("show onboarding and billing", known);
    expect(result.selectedFlowIds).toEqual(["onboarding_billing"]);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("maps billing text to billing flow", async () => {
    const result = await routeIntent("walk me through billing", known);
    expect(result.selectedFlowIds).toEqual(["billing"]);
  });
});
