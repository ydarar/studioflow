import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installBundledSkills } from "../../apps/cli/src/commands/install-skills.ts";

const skillNames = ["studioflow-cli", "studioflow-investigate", "studioflow-author"] as const;
const metadataFile = ".studioflow-skill.json";
const tempDirs: string[] = [];

async function makeTempDir(prefix: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function writeJson(filePath: string, payload: unknown) {
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

describe.sequential("install skills version-aware sync", () => {
  afterEach(async () => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        await fs.rm(dir, { recursive: true, force: true });
      }
    }
  });

  it("updates stale installed skills and skips up-to-date skills without --force", async () => {
    const sourceDir = await makeTempDir("studioflow-skill-source-");
    const targetDir = await makeTempDir("studioflow-skill-target-");

    for (const skillName of skillNames) {
      const skillSourceDir = path.join(sourceDir, skillName);
      await fs.mkdir(skillSourceDir, { recursive: true });
      await fs.writeFile(path.join(skillSourceDir, "SKILL.md"), `# ${skillName} source`, "utf8");
    }

    await writeJson(path.join(sourceDir, "manifest.json"), {
      schemaVersion: 1,
      packageName: "studioflow",
      packageVersion: "9.9.9",
      generatedAt: "2026-02-14T00:00:00.000Z",
      skills: {
        "studioflow-cli": { hash: "cli-hash" },
        "studioflow-investigate": { hash: "investigate-hash" },
        "studioflow-author": { hash: "author-hash" }
      }
    });

    const upToDateSkillDir = path.join(targetDir, "studioflow-cli");
    await fs.mkdir(upToDateSkillDir, { recursive: true });
    await fs.writeFile(path.join(upToDateSkillDir, "SKILL.md"), "# studioflow-cli existing", "utf8");
    await writeJson(path.join(upToDateSkillDir, metadataFile), {
      packageName: "studioflow",
      cliVersion: "9.9.9",
      skillHash: "cli-hash",
      installedAt: "2026-02-13T00:00:00.000Z"
    });

    const staleSkillDir = path.join(targetDir, "studioflow-investigate");
    await fs.mkdir(staleSkillDir, { recursive: true });
    await fs.writeFile(path.join(staleSkillDir, "SKILL.md"), "# studioflow-investigate existing", "utf8");
    await writeJson(path.join(staleSkillDir, metadataFile), {
      packageName: "studioflow",
      cliVersion: "9.9.8",
      skillHash: "investigate-hash",
      installedAt: "2026-02-13T00:00:00.000Z"
    });

    const authorSkillDir = path.join(targetDir, "studioflow-author");
    await fs.mkdir(authorSkillDir, { recursive: true });
    await fs.writeFile(path.join(authorSkillDir, "SKILL.md"), "# studioflow-author existing", "utf8");
    await writeJson(path.join(authorSkillDir, metadataFile), {
      packageName: "studioflow",
      cliVersion: "9.9.9",
      skillHash: "author-hash",
      installedAt: "2026-02-13T00:00:00.000Z"
    });

    const result = await installBundledSkills({
      targetDir,
      sourceDir,
      allowExternalSource: true
    });

    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]?.installed).toEqual([]);
    expect(result.targets[0]?.updated).toEqual(["studioflow-investigate"]);
    expect(result.targets[0]?.skipped).toEqual(["studioflow-cli", "studioflow-author"]);

    const upToDateSkillContents = await fs.readFile(path.join(upToDateSkillDir, "SKILL.md"), "utf8");
    expect(upToDateSkillContents).toContain("existing");

    const refreshedSkillContents = await fs.readFile(path.join(staleSkillDir, "SKILL.md"), "utf8");
    expect(refreshedSkillContents).toContain("source");

    const refreshedMetadata = JSON.parse(
      await fs.readFile(path.join(staleSkillDir, metadataFile), "utf8")
    ) as {
      packageName: string;
      cliVersion: string;
      skillHash: string;
    };
    expect(refreshedMetadata.packageName).toBe("studioflow");
    expect(refreshedMetadata.cliVersion).toBe("9.9.9");
    expect(refreshedMetadata.skillHash).toBe("investigate-hash");
  });

  it("requires explicit opt-in for external skill sources", async () => {
    const sourceDir = await makeTempDir("studioflow-skill-source-");
    const targetDir = await makeTempDir("studioflow-skill-target-");

    for (const skillName of skillNames) {
      const skillSourceDir = path.join(sourceDir, skillName);
      await fs.mkdir(skillSourceDir, { recursive: true });
      await fs.writeFile(path.join(skillSourceDir, "SKILL.md"), `# ${skillName} source`, "utf8");
    }

    await expect(
      installBundledSkills({
        targetDir,
        sourceDir
      })
    ).rejects.toThrow("External skill source requires --allow-external-source true.");
  });
});
