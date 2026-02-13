import { runAppleScript } from "@demopilot/adapters-desktop";

function quote(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function normalizeMenuItem(raw: string) {
  return raw.trim();
}

export function parseMenuItems(stdout: string) {
  if (!stdout.trim()) {
    return [] as string[];
  }

  return stdout
    .split(",")
    .map(normalizeMenuItem)
    .filter((item) => item.length > 0 && item !== "missing value");
}

export function buildActivateScreenStudioScript(appName: string) {
  return `tell application "${quote(appName)}" to activate`;
}

export function buildListRecordMenuItemsScript(appName: string) {
  return `tell application "System Events" to tell process "${quote(appName)}" to get name of every menu item of menu "Record" of menu bar 1`;
}

export function buildClickRecordMenuItemScript(appName: string, itemName: string) {
  return `tell application "System Events" to tell process "${quote(appName)}" to click menu item "${quote(itemName)}" of menu "Record" of menu bar 1`;
}

export function buildPressReturnScript() {
  return 'tell application "System Events" to key code 36';
}

export async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function activateScreenStudio(appName: string) {
  await runAppleScript(buildActivateScreenStudioScript(appName));
}

export async function listRecordMenuItems(appName: string) {
  const { stdout } = await runAppleScript(buildListRecordMenuItemsScript(appName));
  return parseMenuItems(stdout);
}

export async function clickRecordMenuItem(appName: string, itemName: string) {
  const items = await listRecordMenuItems(appName);

  if (!items.includes(itemName)) {
    const available = items.length > 0 ? items.join(", ") : "none";
    throw new Error(
      `Screen Studio Record menu item "${itemName}" not available. Available items: ${available}`
    );
  }

  await runAppleScript(buildClickRecordMenuItemScript(appName, itemName));
}

export async function pressReturn() {
  await runAppleScript(buildPressReturnScript());
}
