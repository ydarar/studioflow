import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import kleur from "kleur";
import { getClaudeSkillsDir, getCodexSkillsDir } from "./runtime-paths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundledSkillNames = ["studioflow-cli", "studioflow-investigate", "studioflow-author"] as const;
const skillManifestFile = "manifest.json";
const skillMetadataFile = ".studioflow-skill.json";
const packageName = "studioflow";

type BundledSkillName = (typeof bundledSkillNames)[number];

export type SkillsAgent = "codex" | "claude";
export type SkillsAgentSelection = SkillsAgent | "all";

export interface InstallSkillsOptions {
  force?: boolean;
  targetDir?: string;
  agent?: SkillsAgentSelection;
  codexTargetDir?: string;
  claudeTargetDir?: string;
  sourceDir?: string;
  allowExternalSource?: boolean;
  quiet?: boolean;
}

export interface InstallSkillsTargetResult {
  targetId: SkillsAgent | "custom";
  targetDir: string;
  installed: string[];
  updated: string[];
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

interface BundledSkillManifestEntry {
  hash: string;
}

interface BundledSkillManifest {
  schemaVersion: number;
  packageName: string;
  packageVersion: string;
  skills: Record<string, BundledSkillManifestEntry>;
}

interface InstalledSkillMetadata {
  packageName: string;
  cliVersion: string;
  skillHash: string;
  installedAt: string;
}

function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}

async function listFilesRecursively(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

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

async function hashDirectoryContents(rootDir: string): Promise<string> {
  const hasher = createHash("sha256");
  const files = await listFilesRecursively(rootDir);

  for (const filePath of files) {
    const relativePath = toPosixPath(path.relative(rootDir, filePath));
    hasher.update(relativePath);
    hasher.update("\n");
    hasher.update(await fs.readFile(filePath));
    hasher.update("\n");
  }

  return hasher.digest("hex");
}

async function resolveCliPackageVersion(sourceDir: string): Promise<string> {
  const candidates = [
    path.resolve(sourceDir, "../package.json"),
    path.resolve(__dirname, "../../package.json"),
    path.resolve(process.cwd(), "apps/cli/package.json")
  ];

  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, "utf8");
      const parsed = JSON.parse(raw) as {
        name?: string;
        version?: string;
      };
      if (parsed.name === packageName && typeof parsed.version === "string") {
        return parsed.version;
      }
    } catch {
      // Try next candidate.
    }
  }

  return "0.0.0";
}

function isValidManifest(value: unknown): value is BundledSkillManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<BundledSkillManifest>;
  if (
    manifest.schemaVersion !== 1 ||
    manifest.packageName !== packageName ||
    typeof manifest.packageVersion !== "string" ||
    !manifest.skills ||
    typeof manifest.skills !== "object"
  ) {
    return false;
  }

  return bundledSkillNames.every((name) => {
    const entry = (manifest.skills as Record<string, unknown>)[name] as Partial<BundledSkillManifestEntry> | undefined;
    return Boolean(entry && typeof entry.hash === "string" && entry.hash.length > 0);
  });
}

async function resolveBundledSkillsManifest(sourceDir: string): Promise<BundledSkillManifest> {
  const manifestPath = path.join(sourceDir, skillManifestFile);
  if (await pathExists(manifestPath)) {
    try {
      const raw = await fs.readFile(manifestPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (isValidManifest(parsed)) {
        return parsed;
      }
    } catch {
      // Fall back to a computed manifest when the bundled manifest is missing or invalid.
    }
  }

  const skills = {} as Record<BundledSkillName, BundledSkillManifestEntry>;
  for (const skillName of bundledSkillNames) {
    const skillPath = path.join(sourceDir, skillName);
    skills[skillName] = {
      hash: await hashDirectoryContents(skillPath)
    };
  }

  return {
    schemaVersion: 1,
    packageName,
    packageVersion: await resolveCliPackageVersion(sourceDir),
    skills
  };
}

async function readInstalledSkillMetadata(skillDir: string): Promise<InstalledSkillMetadata | null> {
  const metadataPath = path.join(skillDir, skillMetadataFile);
  if (!(await pathExists(metadataPath))) {
    return null;
  }

  try {
    const raw = await fs.readFile(metadataPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<InstalledSkillMetadata>;
    if (
      typeof parsed.packageName === "string" &&
      typeof parsed.cliVersion === "string" &&
      typeof parsed.skillHash === "string" &&
      typeof parsed.installedAt === "string"
    ) {
      return parsed as InstalledSkillMetadata;
    }
  } catch {
    // Treat invalid metadata as stale and reinstall.
  }

  return null;
}

async function writeInstalledSkillMetadata(
  skillDir: string,
  expectedVersion: string,
  expectedHash: string
): Promise<void> {
  const metadata: InstalledSkillMetadata = {
    packageName,
    cliVersion: expectedVersion,
    skillHash: expectedHash,
    installedAt: new Date().toISOString()
  };

  await fs.writeFile(path.join(skillDir, skillMetadataFile), `${JSON.stringify(metadata, null, 2)}\n`);
}

async function hasBundledSkills(candidate: string) {
  const hasAllSkills = await Promise.all(
    bundledSkillNames.map(async (name) => {
      const dir = path.join(candidate, name);
      return pathExists(path.join(dir, "SKILL.md"));
    })
  );
  return hasAllSkills.every(Boolean);
}

async function resolveBundledSkillsDir(opts: { sourceDir?: string; allowExternalSource?: boolean } = {}): Promise<string> {
  if (opts.sourceDir) {
    if (!opts.allowExternalSource) {
      throw new Error("External skill source requires --allow-external-source true.");
    }
    const resolved = path.resolve(opts.sourceDir);
    if (await hasBundledSkills(resolved)) {
      return resolved;
    }
    throw new Error(`External skill source is missing required bundled skills: ${resolved}`);
  }

  const candidates = [path.resolve(__dirname, "../bundled/skills"), path.resolve(__dirname, "../../bundled/skills")];

  for (const candidate of candidates) {
    if (await hasBundledSkills(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not locate packaged bundled skills. Checked: ${candidates.join(", ")}.`
  );
}

async function syncSkillsToTarget(
  sourceDir: string,
  targetDir: string,
  force: boolean,
  manifest: BundledSkillManifest
) {
  await fs.mkdir(targetDir, { recursive: true });

  const installed: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  for (const skillName of bundledSkillNames) {
    const source = path.join(sourceDir, skillName);
    const target = path.join(targetDir, skillName);
    const exists = await pathExists(target);
    const expectedHash = manifest.skills[skillName]?.hash;
    if (!expectedHash) {
      throw new Error(`Missing skill hash in manifest for ${skillName}.`);
    }

    if (!exists) {
      await fs.cp(source, target, { recursive: true });
      await writeInstalledSkillMetadata(target, manifest.packageVersion, expectedHash);
      installed.push(skillName);
      continue;
    }

    if (force) {
      await fs.rm(target, { recursive: true, force: true });
      await fs.cp(source, target, { recursive: true });
      await writeInstalledSkillMetadata(target, manifest.packageVersion, expectedHash);
      installed.push(skillName);
      continue;
    }

    const currentMetadata = await readInstalledSkillMetadata(target);
    const matchesInstalledVersion =
      currentMetadata?.packageName === manifest.packageName &&
      currentMetadata.cliVersion === manifest.packageVersion &&
      currentMetadata.skillHash === expectedHash;

    if (matchesInstalledVersion) {
      skipped.push(skillName);
      continue;
    }

    await fs.rm(target, { recursive: true, force: true });
    await fs.cp(source, target, { recursive: true });
    await writeInstalledSkillMetadata(target, manifest.packageVersion, expectedHash);
    updated.push(skillName);
  }

  return { installed, updated, skipped };
}

export async function installBundledSkills(opts: InstallSkillsOptions = {}): Promise<InstallSkillsResult> {
  const sourceDir = await resolveBundledSkillsDir({
    sourceDir: opts.sourceDir,
    allowExternalSource: opts.allowExternalSource
  });
  const manifest = await resolveBundledSkillsManifest(sourceDir);
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
    const synced = await syncSkillsToTarget(sourceDir, target.targetDir, force, manifest);
    results.push({
      targetId: target.targetId,
      targetDir: target.targetDir,
      installed: synced.installed,
      updated: synced.updated,
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
    if (target.updated.length > 0) {
      console.log(`- Updated (${label}): ${target.updated.join(", ")}`);
    }
    if (target.skipped.length > 0) {
      console.log(kleur.yellow(`- Skipped (${label}, up to date): ${target.skipped.join(", ")}`));
    }
  }
  if (result.targets.some((target) => target.skipped.length > 0)) {
    console.log("Use --force to overwrite existing skill directories.");
  }

  return result;
}
