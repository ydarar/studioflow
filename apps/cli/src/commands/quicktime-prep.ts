import kleur from "kleur";
import { ensureAutomationPermissions, activateQuickTime, listQuickTimeFileMenuItems } from "@studioflow/adapters-desktop";

export const defaultQuickTimeAppName = process.env.QUICKTIME_APP_NAME ?? "QuickTime Player";

export interface QuickTimePrepOptions {
  appName?: string;
  ensurePermissions?: boolean;
  quiet?: boolean;
}

export interface QuickTimePrepResult {
  appName: string;
  fileMenuItems: string[];
}

export function hasScreenRecordingEntry(items: string[]) {
  return items.some((item) => item.toLowerCase().includes("new screen recording"));
}

export async function runQuickTimePreflight(opts: QuickTimePrepOptions = {}): Promise<QuickTimePrepResult> {
  const appName = opts.appName ?? defaultQuickTimeAppName;
  const ensurePermissions = opts.ensurePermissions ?? true;

  if (ensurePermissions) {
    await ensureAutomationPermissions();
  }

  await activateQuickTime(appName);
  const items = await listQuickTimeFileMenuItems(appName);

  if (items.length === 0) {
    throw new Error(
      `QuickTime File menu is empty for app "${appName}". Ensure QuickTime Player is running and menu automation is allowed.`
    );
  }

  if (!hasScreenRecordingEntry(items)) {
    throw new Error(
      `QuickTime File menu does not expose "New Screen Recording" for "${appName}". Found: ${items.join(", ")}`
    );
  }

  const result = {
    appName,
    fileMenuItems: items
  };

  if (!opts.quiet) {
    console.log(kleur.green("QuickTime prep passed."));
    console.log(`- App: ${appName}`);
    console.log(`- File menu items: ${items.join(", ")}`);
  }

  return result;
}

export async function quicktimePrepCommand(appName = defaultQuickTimeAppName) {
  await runQuickTimePreflight({ appName, ensurePermissions: true, quiet: false });
}
