import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

async function readText(relativePath: string) {
  return fs.readFile(path.join(rootDir, relativePath), "utf8");
}

describe("studioflow-investigate clarification contract", () => {
  it("documents bounded clarification rounds and fallback policy", async () => {
    const skill = await readText("skills/studioflow-investigate/SKILL.md");

    expect(skill).toContain("Max 2 rounds.");
    expect(skill).toContain("Ask 1-3 questions per round");
    expect(skill).toContain("best-effort");
    expect(skill).toContain("artifacts/intent-fit-report.json");
    expect(skill).toContain("execute-existing");
    expect(skill).toContain("patch-existing");
    expect(skill).toContain("create-new");
    expect(skill).toContain("references/question-card-spec.md");
    expect(skill).toContain("references/clarification-state.md");
    expect(skill).toContain("references/artifact-fit-spec.md");
    expect(skill).toContain("Infer run feel and pacing automatically");
  });

  it("includes question-card and clarification-state reference files", async () => {
    const questionCard = await readText("skills/studioflow-investigate/references/question-card-spec.md");
    const stateTemplate = await readText("skills/studioflow-investigate/references/clarification-state.md");

    expect(questionCard).toContain("\"cardId\"");
    expect(questionCard).toContain("mapsTo");
    expect(questionCard).toContain("Max 2 rounds total.");

    expect(stateTemplate).toContain("maxRounds: 2");
    expect(stateTemplate).toContain("done_assertion");
    expect(stateTemplate).toContain("confidence: low");
  });
});
