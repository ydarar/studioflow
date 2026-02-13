import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadFlowFromFile } from "@studioflow/flow-registry";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

describe("day0 artifact flow", () => {
  it("loads onboarding_billing flow from deterministic registry", async () => {
    const flowPath = path.join(rootDir, "packages/flow-registry/flows/onboarding_billing.yaml");
    const flow = await loadFlowFromFile(flowPath);

    expect(flow.id).toBe("onboarding_billing");
    expect(flow.steps.length).toBeGreaterThan(0);
  });
});
