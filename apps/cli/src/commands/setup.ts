import fs from "node:fs/promises";
import path from "node:path";
import kleur from "kleur";
import { checkPermissions } from "@studioflow/adapters-desktop";
import { ensureChromiumInstalled } from "@studioflow/adapters-playwright";
import type { SkillsAgentSelection } from "./install-skills.js";
import { installBundledSkills } from "./install-skills.js";
import { getStudioflowDataDir } from "./runtime-paths.js";

export interface SetupOptions {
  skipSkills?: boolean;
  forceSkills?: boolean;
  skillsTargetDir?: string;
  skillsAgent?: SkillsAgentSelection;
  codexSkillsTargetDir?: string;
  claudeSkillsTargetDir?: string;
}

function setupStatePath() {
  return path.join(getStudioflowDataDir(), "setup-state.json");
}

async function writeSetupState(payload: Record<string, unknown>) {
  const statePath = setupStatePath();
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(payload, null, 2), "utf8");
}

export async function setupCommand(opts: SetupOptions = {}) {
  console.log(kleur.bold("StudioFlow setup"));

  const chromium = await ensureChromiumInstalled({ autoInstall: true });
  if (!chromium.installed) {
    throw new Error("Chromium installation is required but could not be completed.");
  }

  if (chromium.installedNow) {
    console.log(kleur.green("Chromium installed for Playwright."));
  } else {
    console.log(kleur.green("Chromium already installed for Playwright."));
  }

  let skillsSummary:
    | {
        sourceDir: string;
        targets: Array<{
          targetId: string;
          targetDir: string;
          installed: string[];
          skipped: string[];
        }>;
      }
    | undefined;

  if (opts.skipSkills) {
    console.log(kleur.yellow("Skipped skill installation (--skip-skills)."));
  } else {
    skillsSummary = await installBundledSkills({
      force: opts.forceSkills,
      targetDir: opts.skillsTargetDir,
      agent: opts.skillsAgent,
      codexTargetDir: opts.codexSkillsTargetDir,
      claudeTargetDir: opts.claudeSkillsTargetDir
    });

    console.log(kleur.green("Skills synchronized."));
    for (const target of skillsSummary.targets) {
      const label = target.targetId === "custom" ? "custom" : target.targetId;
      console.log(`- Target (${label}): ${target.targetDir}`);
      if (target.installed.length > 0) {
        console.log(`- Installed (${label}): ${target.installed.join(", ")}`);
      }
      if (target.skipped.length > 0) {
        console.log(kleur.yellow(`- Skipped (${label}, already present): ${target.skipped.join(", ")}`));
      }
    }
  }

  const permissions = await checkPermissions();
  const permissionChecks = [
    { label: "Screen Studio installed", ok: permissions.screenStudioInstalled },
    { label: "AppleScript available", ok: permissions.canRunAppleScript },
    { label: "Keystroke automation allowed", ok: permissions.canSendKeystrokes }
  ];

  console.log(kleur.bold("Permission checks"));
  for (const check of permissionChecks) {
    const mark = check.ok ? kleur.green("PASS") : kleur.yellow("WARN");
    console.log(`- ${mark} ${check.label}`);
  }

  if (permissions.notes.length > 0) {
    console.log(kleur.yellow("Notes:"));
    for (const note of permissions.notes) {
      console.log(`- ${note}`);
    }
    console.log("Run `studioflow doctor` to trigger permission prompts and open settings panes.");
  }

  await writeSetupState({
    completedAt: new Date().toISOString(),
    chromiumExecutablePath: chromium.executablePath,
    chromiumInstalledNow: chromium.installedNow,
    skills: skillsSummary
      ? {
          targets: skillsSummary.targets.map((target) => ({
            targetId: target.targetId,
            targetDir: target.targetDir,
            installed: target.installed,
            skipped: target.skipped
          }))
        }
      : { skipped: true }
  });

  console.log(kleur.green("Setup complete."));
  console.log(`- State file: ${setupStatePath()}`);
}
