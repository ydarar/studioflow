import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LearningCandidate } from "@demopilot/contracts";
import { promoteCommand } from "../../apps/cli/src/commands/promote.js";
import { replayCommand } from "../../apps/cli/src/commands/replay.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const flowsDir = path.resolve(rootDir, "packages/flow-registry/flows");
const promotionsDir = path.resolve(rootDir, "packages/flow-registry/learned/promotions");

function makeCandidate(overrides: Partial<LearningCandidate> = {}): LearningCandidate {
  return {
    candidateId: "candidate-test",
    sourceRunId: "run-test",
    intent: "show onboarding",
    flow: {
      id: "learned-flow",
      description: "learned flow",
      tags: ["learned"],
      steps: [
        {
          id: "click-onboarding",
          action: "click",
          target: '[data-testid="go-onboarding"]'
        }
      ]
    },
    selectorStabilityScore: 0.6,
    replay: {
      attempts: 0,
      passes: 0
    },
    validationState: "candidate",
    ...overrides
  };
}

async function readCandidate(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as LearningCandidate;
}

describe.sequential("candidate lifecycle", () => {
  let tempRoot = "";
  let createdFlowPath: string | null = null;
  let createdPromotionPaths: string[] = [];
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "demopilot-candidates-"));
    process.env = { ...originalEnv, INIT_CWD: rootDir };
    createdFlowPath = null;
    createdPromotionPaths = [];
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await fs.rm(tempRoot, { recursive: true, force: true });
    if (createdFlowPath) {
      await fs.rm(createdFlowPath, { force: true });
    }
    for (const file of createdPromotionPaths) {
      await fs.rm(file, { force: true });
    }
  });

  it("replay increments attempts/passes and upgrades validation state for resolvable selectors", async () => {
    const candidatePath = path.join(tempRoot, "candidate-replay.json");
    const candidate = makeCandidate({
      candidateId: "candidate-replay",
      replay: { attempts: 1, passes: 1 },
      selectorStabilityScore: 0.5
    });
    await fs.writeFile(candidatePath, JSON.stringify(candidate, null, 2), "utf8");

    await replayCommand({ candidateRef: candidatePath, attempts: 2 });

    const updated = await readCandidate(candidatePath);
    expect(updated.replay.attempts).toBe(3);
    expect(updated.replay.passes).toBe(3);
    expect(updated.validationState).toBe("validated");
    expect(updated.selectorStabilityScore).toBeGreaterThan(0.5);
  });

  it("promote rejects candidates below replay and stability thresholds", async () => {
    const candidatePath = path.join(tempRoot, "candidate-fail-promote.json");
    const candidate = makeCandidate({
      candidateId: "candidate-fail-promote",
      replay: { attempts: 3, passes: 1 },
      selectorStabilityScore: 0.55
    });
    await fs.writeFile(candidatePath, JSON.stringify(candidate, null, 2), "utf8");

    await expect(
      promoteCommand({
        candidateRef: candidatePath,
        minPasses: 3,
        minStability: 0.7
      })
    ).rejects.toThrow("has only 1 replay passes");
  });

  it("promote writes promoted flow and promotion record and persists validated candidate state", async () => {
    await fs.mkdir(promotionsDir, { recursive: true });
    const beforePromotionFiles = new Set(await fs.readdir(promotionsDir));

    const candidatePath = path.join(tempRoot, "candidate-success-promote.json");
    const candidate = makeCandidate({
      candidateId: "candidate-success-promote",
      replay: { attempts: 5, passes: 5 },
      selectorStabilityScore: 0.91,
      validationState: "candidate"
    });
    await fs.writeFile(candidatePath, JSON.stringify(candidate, null, 2), "utf8");

    const promotedFlowId = `promoted-test-${Date.now()}`;
    createdFlowPath = path.join(flowsDir, `${promotedFlowId}.yaml`);

    await promoteCommand({
      candidateRef: candidatePath,
      flowId: promotedFlowId,
      minPasses: 3,
      minStability: 0.7
    });

    const promotedFlowRaw = await fs.readFile(createdFlowPath, "utf8");
    expect(promotedFlowRaw).toContain(`id: ${promotedFlowId}`);
    expect(promotedFlowRaw).toContain("- promoted");

    const afterPromotionFiles = await fs.readdir(promotionsDir);
    createdPromotionPaths = afterPromotionFiles
      .filter((file) => !beforePromotionFiles.has(file))
      .map((file) => path.join(promotionsDir, file));
    expect(createdPromotionPaths.length).toBe(1);

    const promotionRaw = await fs.readFile(createdPromotionPaths[0], "utf8");
    expect(promotionRaw).toContain(`"candidateId": "${candidate.candidateId}"`);
    expect(promotionRaw).toContain(`"promotedFlowId": "${promotedFlowId}"`);

    const updatedCandidate = await readCandidate(candidatePath);
    expect(updatedCandidate.validationState).toBe("validated");
    expect(updatedCandidate.flow.id).toBe(promotedFlowId);
    expect(updatedCandidate.flow.tags).toContain("promoted");
  });
});
