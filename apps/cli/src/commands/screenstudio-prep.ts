import kleur from "kleur";
import { ensureAutomationPermissions } from "@studioflow/adapters-desktop";
import { activateScreenStudio, listRecordMenuItems } from "@studioflow/adapters-screenstudio";

export const defaultScreenStudioAppName = process.env.SCREENSTUDIO_APP_NAME ?? "Screen Studio";

export interface ScreenStudioPrepOptions {
  appName?: string;
  ensurePermissions?: boolean;
  quiet?: boolean;
}

export interface ScreenStudioPrepResult {
  appName: string;
  recordMenuItems: string[];
}

export function hasRecordingEntry(items: string[]) {
  return items.includes("Record display") || items.includes("Stop recording");
}

export async function runScreenStudioPreflight(
  opts: ScreenStudioPrepOptions = {}
): Promise<ScreenStudioPrepResult> {
  const appName = opts.appName ?? defaultScreenStudioAppName;
  const ensurePermissions = opts.ensurePermissions ?? true;

  if (ensurePermissions) {
    await ensureAutomationPermissions();
  }

  await activateScreenStudio(appName);
  const items = await listRecordMenuItems(appName);

  if (items.length === 0) {
    throw new Error(
      `Screen Studio Record menu is empty for app "${appName}". Ensure Screen Studio is running and menu automation is allowed.`
    );
  }

  if (!hasRecordingEntry(items)) {
    throw new Error(
      `Screen Studio Record menu does not expose expected recording actions for "${appName}". Found: ${items.join(", ")}`
    );
  }

  const result = {
    appName,
    recordMenuItems: items
  };

  if (!opts.quiet) {
    console.log(kleur.green("Screen Studio prep passed."));
    console.log(`- App: ${appName}`);
    console.log(`- Record menu items: ${items.join(", ")}`);
  }

  return result;
}

export async function screenstudioPrepCommand(appName = defaultScreenStudioAppName) {
  await runScreenStudioPreflight({ appName, ensurePermissions: true, quiet: false });
}
