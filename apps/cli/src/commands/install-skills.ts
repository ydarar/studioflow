import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import kleur from "kleur";
import { getClaudeSkillsDir, getCodexSkillsDir } from "./runtime-paths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundledSkillNames = ["studioflow-cli", "studioflow-investigate"] as const;
const deprecatedSkillNames = ["studioflow-cli-operator", "webapp-flow-learner"] as const;

export type SkillsAgent = "codex" | "claude";
export type SkillsAgentSelection = SkillsAgent | "all";

export interface InstallSkillsOptions {
  force?: boolean;
  targetDir?: string;
  agent?: SkillsAgentSelection;
  codexTargetDir?: string;
  claudeTargetDir?: string;
  quiet?: boolean;
}

export interface InstallSkillsTargetResult {
  targetId: SkillsAgent | "custom";
  targetDir: string;
  installed: string[];
  skipped: string[];
}

export interface InstallSkillsResult {
  sourceDir: string;
  targets: InstallSkillsTargetResult[];
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

async function syncSkillsToTarget(sourceDir: string, targetDir: string, force: boolean) {
  await fs.mkdir(targetDir, { recursive: true });

  for (const deprecatedName of deprecatedSkillNames) {
    const deprecatedPath = path.join(targetDir, deprecatedName);
    if (await pathExists(deprecatedPath)) {
      await fs.rm(deprecatedPath, { recursive: true, force: true });
    }
  }

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

  return { installed, skipped };
}

export async function installBundledSkills(opts: InstallSkillsOptions = {}): Promise<InstallSkillsResult> {
  const sourceDir = await resolveBundledSkillsDir();
  const force = opts.force ?? false;
  const targets: Array<{ targetId: SkillsAgent | "custom"; targetDir: string }> = [];

  if (opts.targetDir && (opts.agent || opts.codexTargetDir || opts.claudeTargetDir)) {
    throw new Error("Use either --target or --agent/--codex-target/--claude-target options, not both.");
  }

  if (opts.targetDir) {
    targets.push({ targetId: "custom", targetDir: path.resolve(opts.targetDir) });
  } else {
    const agent = opts.agent ?? "all";

    if (agent === "all" || agent === "codex") {
      targets.push({
        targetId: "codex",
        targetDir: opts.codexTargetDir ? path.resolve(opts.codexTargetDir) : getCodexSkillsDir()
      });
    }
    if (agent === "all" || agent === "claude") {
      targets.push({
        targetId: "claude",
        targetDir: opts.claudeTargetDir ? path.resolve(opts.claudeTargetDir) : getClaudeSkillsDir()
      });
    }
  }

  const results: InstallSkillsTargetResult[] = [];
  for (const target of targets) {
    const synced = await syncSkillsToTarget(sourceDir, target.targetDir, force);
    results.push({
      targetId: target.targetId,
      targetDir: target.targetDir,
      installed: synced.installed,
      skipped: synced.skipped
    });
  }

  return { sourceDir, targets: results };
}

export async function installSkillsCommand(opts: InstallSkillsOptions = {}) {
  const result = await installBundledSkills(opts);
  if (opts.quiet) return result;

  console.log(kleur.green("Skill install complete."));
  console.log(`- Source: ${result.sourceDir}`);
  for (const target of result.targets) {
    const label = target.targetId === "custom" ? "custom" : target.targetId;
    console.log(`- Target (${label}): ${target.targetDir}`);
    if (target.installed.length > 0) {
      console.log(`- Installed (${label}): ${target.installed.join(", ")}`);
    }
    if (target.skipped.length > 0) {
      console.log(kleur.yellow(`- Skipped (${label}, already present): ${target.skipped.join(", ")}`));
    }
  }
  if (result.targets.some((target) => target.skipped.length > 0)) {
    console.log("Use --force to overwrite existing skill directories.");
  }

  return result;
}
