import { runAppleScript } from "./osascript.js";

const defaultQuickTimeAppName = process.env.QUICKTIME_APP_NAME ?? "QuickTime Player";

function int(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const preConfirmDelay = int(process.env.QUICKTIME_PRE_CONFIRM_DELAY_MS, 700);
const postStartDelay = int(process.env.QUICKTIME_POST_START_DELAY_MS, 1200);
const postStopDelay = int(process.env.QUICKTIME_POST_STOP_DELAY_MS, 900);
const exportDialogConfirmDelay = int(process.env.QUICKTIME_EXPORT_DIALOG_CONFIRM_DELAY_MS, 900);
const exportDelay = int(process.env.QUICKTIME_EXPORT_DELAY_MS, 2500);

function quote(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function normalizeMenuItem(raw: string) {
  return raw.trim();
}

export function parseQuickTimeMenuItems(stdout: string) {
  if (!stdout.trim()) {
    return [] as string[];
  }

  return stdout
    .split(",")
    .map(normalizeMenuItem)
    .filter((item) => item.length > 0 && item !== "missing value");
}

export function buildActivateQuickTimeScript(appName: string) {
  return `tell application "${quote(appName)}" to activate`;
}

export function buildListQuickTimeFileMenuItemsScript(appName: string) {
  return `tell application "System Events" to tell process "${quote(appName)}" to get name of every menu item of menu "File" of menu bar 1`;
}

export function buildClickQuickTimeFileMenuItemScript(appName: string, itemName: string) {
  return `tell application "System Events" to tell process "${quote(appName)}" to click menu item "${quote(itemName)}" of menu "File" of menu bar 1`;
}

export function buildQuickTimeStartShortcutScript() {
  return 'tell application "System Events" to keystroke "n" using {command down, control down}';
}

export function buildQuickTimeStopShortcutScript() {
  return 'tell application "System Events" to key code 53 using {command down, control down}';
}

export function buildQuickTimeSaveShortcutScript() {
  return 'tell application "System Events" to keystroke "s" using {command down}';
}

export function buildPressReturnScript() {
  return 'tell application "System Events" to key code 36';
}

export async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function findMenuItem(items: string[], partial: string) {
  const needle = partial.toLowerCase();
  return items.find((item) => item.toLowerCase().includes(needle));
}

export async function activateQuickTime(appName = defaultQuickTimeAppName) {
  await runAppleScript(buildActivateQuickTimeScript(appName));
}

export async function listQuickTimeFileMenuItems(appName = defaultQuickTimeAppName) {
  const { stdout } = await runAppleScript(buildListQuickTimeFileMenuItemsScript(appName));
  return parseQuickTimeMenuItems(stdout);
}

export async function clickQuickTimeFileMenuItem(appName: string, itemName: string) {
  const items = await listQuickTimeFileMenuItems(appName);

  if (!items.includes(itemName)) {
    const available = items.length > 0 ? items.join(", ") : "none";
    throw new Error(
      `QuickTime File menu item "${itemName}" not available. Available items: ${available}`
    );
  }

  await runAppleScript(buildClickQuickTimeFileMenuItemScript(appName, itemName));
}

export async function pressQuickTimeStartShortcut() {
  await runAppleScript(buildQuickTimeStartShortcutScript());
}

export async function pressQuickTimeStopShortcut() {
  await runAppleScript(buildQuickTimeStopShortcutScript());
}

export async function pressQuickTimeSaveShortcut() {
  await runAppleScript(buildQuickTimeSaveShortcutScript());
}

export async function pressReturn() {
  await runAppleScript(buildPressReturnScript());
}

export async function startQuickTimeRecording(appName = defaultQuickTimeAppName) {
  await activateQuickTime(appName);
  const items = await listQuickTimeFileMenuItems(appName);
  const newScreenRecordingItem = findMenuItem(items, "new screen recording");

  if (newScreenRecordingItem) {
    await clickQuickTimeFileMenuItem(appName, newScreenRecordingItem);
  } else {
    await pressQuickTimeStartShortcut();
  }

  await wait(preConfirmDelay);
  await pressReturn();
  await wait(postStartDelay);
}

export async function stopQuickTimeRecording(appName = defaultQuickTimeAppName) {
  await activateQuickTime(appName);
  const items = await listQuickTimeFileMenuItems(appName);
  const stopScreenRecordingItem = findMenuItem(items, "stop screen recording");

  if (stopScreenRecordingItem) {
    await clickQuickTimeFileMenuItem(appName, stopScreenRecordingItem);
  } else {
    await pressQuickTimeStopShortcut();
  }

  await wait(postStopDelay);
}

export async function exportQuickTimeRecording(appName = defaultQuickTimeAppName) {
  await activateQuickTime(appName);
  const items = await listQuickTimeFileMenuItems(appName);
  const saveItem = findMenuItem(items, "save");

  if (saveItem) {
    await clickQuickTimeFileMenuItem(appName, saveItem);
  } else {
    await pressQuickTimeSaveShortcut();
  }

  await wait(exportDialogConfirmDelay);
  await pressReturn();
  await wait(exportDelay);
}
