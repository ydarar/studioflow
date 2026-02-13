import kleur from "kleur";
import { ensureAutomationPermissions } from "@demopilot/adapters-desktop";
import { activateScreenStudio, listRecordMenuItems } from "@demopilot/adapters-screenstudio";

const defaultAppName = process.env.SCREENSTUDIO_APP_NAME ?? "Screen Studio";

function hasRecordingEntry(items: string[]) {
  return items.includes("Record display") || items.includes("Stop recording");
}

export async function screenstudioPrepCommand(appName = defaultAppName) {
  await ensureAutomationPermissions();
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

  console.log(kleur.green("Screen Studio prep passed."));
  console.log(`- App: ${appName}`);
  console.log(`- Record menu items: ${items.join(", ")}`);
}
