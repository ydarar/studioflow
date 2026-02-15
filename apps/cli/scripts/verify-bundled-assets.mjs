#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const bundledRoot = path.join(packageRoot, "bundled");
const bundledSkillsRoot = path.join(bundledRoot, "skills");
const bundledFlowsRoot = path.join(bundledRoot, "flows");
const expectedSkills = ["studioflow-cli", "studioflow-investigate", "studioflow-author"];
const expectedFlows = ["billing.yaml", "onboarding.yaml", "onboarding_billing.yaml"];

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function assertExists(filePath, label) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const packageJson = await readJson(path.join(packageRoot, "package.json"));
  const manifestPath = path.join(bundledSkillsRoot, "manifest.json");
  await assertExists(manifestPath, "skills manifest");

  const manifest = await readJson(manifestPath);
  assert(manifest.schemaVersion === 1, "Invalid skills manifest schemaVersion.");
  assert(manifest.packageName === "studioflow", "Invalid skills manifest packageName.");
  assert(
    manifest.packageVersion === packageJson.version,
    `Skills manifest packageVersion ${manifest.packageVersion} does not match package version ${packageJson.version}.`
  );

  for (const skillName of expectedSkills) {
    await assertExists(path.join(bundledSkillsRoot, skillName, "SKILL.md"), `bundled skill ${skillName}`);
    const hash = manifest.skills?.[skillName]?.hash;
    assert(typeof hash === "string" && hash.length > 0, `Missing manifest hash for ${skillName}.`);
  }

  for (const flowName of expectedFlows) {
    await assertExists(path.join(bundledFlowsRoot, flowName), `bundled flow ${flowName}`);
  }

  console.log(`Bundled assets verified: ${bundledRoot}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
