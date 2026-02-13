import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadFlows } from "@studioflow/flow-registry";

describe("flow registry", () => {
  it("loads deterministic day0 flows", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "studioflow-flow-registry-"));
    const originalDataDir = process.env.STUDIOFLOW_DATA_DIR;
    process.env.STUDIOFLOW_DATA_DIR = tempDir;

    const flows = await loadFlows();
    try {
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
    } finally {
      if (typeof originalDataDir === "string") {
        process.env.STUDIOFLOW_DATA_DIR = originalDataDir;
      } else {
        delete process.env.STUDIOFLOW_DATA_DIR;
      }
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
