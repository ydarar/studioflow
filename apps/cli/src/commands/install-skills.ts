import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import kleur from "kleur";
import { getCodexSkillsDir } from "./runtime-paths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundledSkillNames = ["studioflow-cli-operator", "webapp-flow-learner"] as const;

export interface InstallSkillsOptions {
  force?: boolean;
  targetDir?: string;
  quiet?: boolean;
}

export interface InstallSkillsResult {
  sourceDir: string;
  targetDir: string;
  installed: string[];
  skipped: string[];
}

async function pathExists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function resolveBundledSkillsDir(): Promise<string> {
  const candidates = [
    process.env.STUDIOFLOW_SKILLS_SOURCE,
    path.resolve(__dirname, "../skills"),
    path.resolve(__dirname, "../../skills"),
    path.resolve(__dirname, "../../../../skills"),
    path.resolve(process.cwd(), "skills")
  ].filter((value): value is string => Boolean(value && value.trim()));

  for (const candidate of candidates) {
    const hasAllSkills = await Promise.all(
      bundledSkillNames.map(async (name) => {
        const dir = path.join(candidate, name);
        return pathExists(path.join(dir, "SKILL.md"));
      })
    );
    if (hasAllSkills.every(Boolean)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not locate bundled skills. Checked: ${candidates.join(", ")}. Set STUDIOFLOW_SKILLS_SOURCE if needed.`
  );
}

export async function installBundledSkills(opts: InstallSkillsOptions = {}): Promise<InstallSkillsResult> {
  const sourceDir = await resolveBundledSkillsDir();
  const targetDir = opts.targetDir ? path.resolve(opts.targetDir) : getCodexSkillsDir();
  const force = opts.force ?? false;

  await fs.mkdir(targetDir, { recursive: true });

  const installed: string[] = [];
  const skipped: string[] = [];

  for (const skillName of bundledSkillNames) {
    const source = path.join(sourceDir, skillName);
    const target = path.join(targetDir, skillName);
    const exists = await pathExists(target);

    if (exists && !force) {
      skipped.push(skillName);
      continue;
    }

    if (exists && force) {
      await fs.rm(target, { recursive: true, force: true });
    }

    await fs.cp(source, target, { recursive: true });
    installed.push(skillName);
  }

  return { sourceDir, targetDir, installed, skipped };
}

export async function installSkillsCommand(opts: InstallSkillsOptions = {}) {
  const result = await installBundledSkills(opts);
  if (opts.quiet) return result;

  console.log(kleur.green("Skill install complete."));
  console.log(`- Source: ${result.sourceDir}`);
  console.log(`- Target: ${result.targetDir}`);
  if (result.installed.length > 0) {
    console.log(`- Installed: ${result.installed.join(", ")}`);
  }
  if (result.skipped.length > 0) {
    console.log(kleur.yellow(`- Skipped (already present): ${result.skipped.join(", ")}`));
    console.log("  Use --force to overwrite existing skill directories.");
  }

  return result;
}
