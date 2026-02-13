import kleur from "kleur";
import {
  checkPermissions,
  openPermissionSettings,
  triggerPermissionPrompts
} from "@demopilot/adapters-desktop";

export async function doctorCommand() {
  const permissions = await checkPermissions();

  const checks = [
    {
      name: "Screen Studio installed",
      ok: permissions.screenStudioInstalled
    },
    {
      name: "AppleScript available",
      ok: permissions.canRunAppleScript
    },
    {
      name: "Keystroke automation allowed",
      ok: permissions.canSendKeystrokes
    }
  ];

  for (const check of checks) {
    const mark = check.ok ? kleur.green("PASS") : kleur.red("FAIL");
    console.log(`${mark} ${check.name}`);
  }

  if (permissions.notes.length > 0) {
    console.log(kleur.yellow("Notes:"));
    for (const note of permissions.notes) {
      console.log(`- ${note}`);
    }
  }

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    await triggerPermissionPrompts();
    await openPermissionSettings();
    throw new Error(
      "Doctor checks failed. Permission prompts were triggered and settings panes were opened. Approve access, then rerun doctor."
    );
  }

  console.log(kleur.green("Doctor checks passed."));
}
