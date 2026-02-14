#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const sourceSkillsRoot = path.resolve(packageRoot, "../../skills");
const targetSkillsRoot = path.join(packageRoot, "skills");
const sourceFlowsRoot = path.resolve(packageRoot, "../../packages/flow-registry/flows");
const targetFlowsRoot = path.join(packageRoot, "flows");
const skillNames = ["studioflow-cli", "studioflow-investigate"];
const flowNames = ["billing.yaml", "onboarding.yaml", "onboarding_billing.yaml"];

async function listFilesRecursively(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(fullPath)));
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function hashDirectoryContents(rootDir) {
  const hasher = createHash("sha256");
  const files = await listFilesRecursively(rootDir);

  for (const filePath of files) {
    const relativePath = path.relative(rootDir, filePath).split(path.sep).join("/");
    hasher.update(relativePath);
    hasher.update("\n");
    hasher.update(await fs.readFile(filePath));
    hasher.update("\n");
  }

  return hasher.digest("hex");
}

async function readPackageVersion() {
  const packageJsonPath = path.join(packageRoot, "package.json");
  const raw = await fs.readFile(packageJsonPath, "utf8");
  const parsed = JSON.parse(raw);
  return typeof parsed.version === "string" ? parsed.version : "0.0.0";
}

async function buildSkillsManifest() {
  const skills = {};
  for (const skillName of skillNames) {
    const skillPath = path.join(sourceSkillsRoot, skillName);
    skills[skillName] = {
      hash: await hashDirectoryContents(skillPath)
    };
  }

  return {
    schemaVersion: 1,
    packageName: "studioflow",
    packageVersion: await readPackageVersion(),
    generatedAt: new Date().toISOString(),
    skills
  };
}

async function ensureSkillExists(skillName) {
  const skillPath = path.join(sourceSkillsRoot, skillName, "SKILL.md");
  await fs.access(skillPath);
}

async function ensureFlowExists(flowName) {
  const flowPath = path.join(sourceFlowsRoot, flowName);
  await fs.access(flowPath);
}

async function main() {
  await Promise.all(skillNames.map(ensureSkillExists));
  await Promise.all(flowNames.map(ensureFlowExists));

  await fs.rm(targetSkillsRoot, { recursive: true, force: true });
  await fs.mkdir(targetSkillsRoot, { recursive: true });

  for (const skillName of skillNames) {
    const source = path.join(sourceSkillsRoot, skillName);
    const target = path.join(targetSkillsRoot, skillName);
    await fs.cp(source, target, { recursive: true });
  }
  await fs.writeFile(path.join(targetSkillsRoot, "manifest.json"), `${JSON.stringify(await buildSkillsManifest(), null, 2)}\n`);

  await fs.rm(targetFlowsRoot, { recursive: true, force: true });
  await fs.mkdir(targetFlowsRoot, { recursive: true });

  for (const flowName of flowNames) {
    const source = path.join(sourceFlowsRoot, flowName);
    const target = path.join(targetFlowsRoot, flowName);
    await fs.cp(source, target);
  }

  console.log(`Bundled assets synced: skills -> ${targetSkillsRoot}, flows -> ${targetFlowsRoot}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
