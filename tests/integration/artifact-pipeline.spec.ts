import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bootstrapCommand } from "../../apps/cli/src/commands/bootstrap.js";
import { discoverCommand } from "../../apps/cli/src/commands/discover.js";
import { planCommand } from "../../apps/cli/src/commands/plan.js";

const outDir = "artifacts-test";

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

describe("artifact pipeline", () => {
  afterEach(async () => {
    await fs.rm(path.resolve(outDir), { recursive: true, force: true });
  });

  it("generates bootstrap and discovery artifacts with inferred graph edges", async () => {
    await bootstrapCommand(`${outDir}/bootstrap.json`);
    await discoverCommand(outDir);

    const bootstrap = await readJson<{
      projectType: string;
      startCommand: string;
      healthPath: string;
    }>(path.resolve(outDir, "bootstrap.json"));
    expect(["nextjs", "vite-react", "unknown"]).toContain(bootstrap.projectType);
    expect(bootstrap.startCommand).toContain("pnpm");
    expect(bootstrap.healthPath).toMatch(/^\/.*/);

    const structure = await readJson<{
      routes: Array<{ route: string; file: string }>;
      existingFlowIds: string[];
      startCommands: string[];
    }>(path.resolve(outDir, "structure-report.json"));
    expect(structure.startCommands.some((command) => command.includes("pnpm"))).toBe(true);
    expect(structure.routes.map((route) => route.route)).toEqual(
      expect.arrayContaining(["/", "/onboarding", "/billing", "/success"])
    );
    expect(structure.existingFlowIds).toEqual(
      expect.arrayContaining(["onboarding", "billing", "onboarding_billing"])
    );

    const graph = await readJson<{
      nodes: Array<{ id: string; route: string }>;
      edges: Array<{ from: string; to: string }>;
    }>(path.resolve(outDir, "navigation-graph.json"));
    expect(graph.nodes.map((node) => node.route)).toEqual(
      expect.arrayContaining(["/", "/onboarding", "/billing", "/success"])
    );
    expect(graph.edges.some((edge) => edge.from === "/" && edge.to === "/onboarding")).toBe(true);
    expect(graph.edges.some((edge) => edge.from === "/onboarding" && edge.to === "/billing")).toBe(true);
    expect(graph.edges.some((edge) => edge.from === "/billing" && edge.to === "/success")).toBe(true);
  });

  it("uses llm-plan artifact and emits a plan report", async () => {
    await discoverCommand(outDir);
    const llmPlanPath = path.resolve(outDir, "llm-plan.json");
    await fs.writeFile(
      llmPlanPath,
      JSON.stringify(
        {
          selectedFlowId: "onboarding_billing",
          confidence: 0.9,
          rationale: "LLM chose the combined deterministic flow."
        },
        null,
        2
      ),
      "utf8"
    );

    await planCommand({
      intent: "show onboarding and billing",
      reportPath: `${outDir}/structure-report.json`,
      outPath: `${outDir}/flow.json`,
      llmPlanPath,
      planReportOut: `${outDir}/plan-report.json`
    });

    const flow = await readJson<{ id: string; pacing?: { profile: string } }>(path.resolve(outDir, "flow.json"));
    const report = await readJson<{
      source: string;
      selectedFlowId?: string;
      pacing?: { profile: string };
      needsClarification: boolean;
    }>(path.resolve(outDir, "plan-report.json"));

    expect(flow.id).toBe("onboarding_billing");
    expect(flow.pacing?.profile).toBe("standard");
    expect(report.source).toBe("llm-artifact");
    expect(report.selectedFlowId).toBe("onboarding_billing");
    expect(report.pacing?.profile).toBe("standard");
    expect(report.needsClarification).toBe(false);
  });

  it("applies pacing profile, emphasis directives, and soft duration targeting", async () => {
    await discoverCommand(outDir);

    await planCommand({
      intent: "show onboarding and billing",
      reportPath: `${outDir}/structure-report.json`,
      outPath: `${outDir}/flow-fast.json`,
      planReportOut: `${outDir}/plan-fast-report.json`,
      pacingProfile: "fast"
    });

    const emphasisPath = path.resolve(outDir, "emphasis.json");
    await fs.writeFile(
      emphasisPath,
      JSON.stringify(
        [
          {
            scope: "stepId",
            value: "choose-plan",
            weight: 2
          }
        ],
        null,
        2
      ),
      "utf8"
    );

    await planCommand({
      intent: "show onboarding and billing",
      reportPath: `${outDir}/structure-report.json`,
      outPath: `${outDir}/flow-cinematic.json`,
      planReportOut: `${outDir}/plan-cinematic-report.json`,
      pacingProfile: "cinematic",
      targetDurationSec: 75,
      emphasisPath
    });

    const fastFlow = await readJson<{
      steps: Array<{ id: string; postDelayMs?: number }>;
    }>(path.resolve(outDir, "flow-fast.json"));
    const cinematicFlow = await readJson<{
      pacing: { profile: string; targetDurationSec?: number; durationMultiplier: number };
      steps: Array<{ id: string; postDelayMs?: number }>;
    }>(path.resolve(outDir, "flow-cinematic.json"));

    const fastChoosePlan = fastFlow.steps.find((step) => step.id === "choose-plan");
    const cinematicChoosePlan = cinematicFlow.steps.find((step) => step.id === "choose-plan");

    expect(cinematicFlow.pacing.profile).toBe("cinematic");
    expect(cinematicFlow.pacing.targetDurationSec).toBe(75);
    expect(cinematicFlow.pacing.durationMultiplier).toBeGreaterThanOrEqual(0.75);
    expect(cinematicFlow.pacing.durationMultiplier).toBeLessThanOrEqual(1.6);
    expect(cinematicChoosePlan?.postDelayMs ?? 0).toBeGreaterThan(fastChoosePlan?.postDelayMs ?? 0);
  });
});
