import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bootstrapCommand } from "../../apps/cli/src/commands/bootstrap.js";
import { discoverCommand } from "../../apps/cli/src/commands/discover.js";

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
});
