import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { runAppleScript } from "./osascript.js";

const execFileAsync = promisify(execFile);

export interface PermissionStatus {
  screenStudioInstalled: boolean;
  canRunAppleScript: boolean;
  canSendKeystrokes: boolean;
  notes: string[];
}

export async function checkPermissions(): Promise<PermissionStatus> {
  const notes: string[] = [];
  let screenStudioInstalled = false;

  try {
    await fs.access("/Applications/Screen Studio.app");
    screenStudioInstalled = true;
  } catch {
    notes.push("Screen Studio app not found at /Applications/Screen Studio.app");
  }

  let canRunAppleScript = true;
  try {
    await runAppleScript('tell application "System Events" to get UI elements enabled');
  } catch {
    canRunAppleScript = false;
    notes.push("AppleScript execution failed. Accessibility/Automation permission may be missing.");
  }

  let canSendKeystrokes = true;
  try {
    // Uses an unlikely key chord to validate keystroke permission with low side-effect risk.
    await runAppleScript(
      'tell application "System Events" to keystroke "9" using {command down, option down, control down, shift down}'
    );
  } catch {
    canSendKeystrokes = false;
    notes.push("Keystroke automation is blocked. Grant Accessibility + Automation permissions.");
  }

  return {
    screenStudioInstalled,
    canRunAppleScript,
    canSendKeystrokes,
    notes
  };
}

export async function triggerPermissionPrompts() {
  const results = {
    automationPromptAttempted: false,
    accessibilityPromptAttempted: false
  };

  try {
    // Triggers Apple Events automation prompt when not yet approved.
    await runAppleScript('tell application "System Events" to get name of first process');
    results.automationPromptAttempted = true;
  } catch {
    results.automationPromptAttempted = true;
  }

  try {
    // Triggers keystroke permission path with a low-risk chord.
    await runAppleScript(
      'tell application "System Events" to keystroke "9" using {command down, option down, control down, shift down}'
    );
    results.accessibilityPromptAttempted = true;
  } catch {
    results.accessibilityPromptAttempted = true;
  }

  return results;
}

export async function openPermissionSettings() {
  const panes = [
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
  ];

  for (const pane of panes) {
    try {
      await execFileAsync("open", [pane]);
    } catch {
      // Best-effort only.
    }
  }
}

export async function ensureAutomationPermissions() {
  const firstCheck = await checkPermissions();
  if (firstCheck.canRunAppleScript && firstCheck.canSendKeystrokes) {
    return firstCheck;
  }

  await triggerPermissionPrompts();
  const secondCheck = await checkPermissions();
  if (secondCheck.canRunAppleScript && secondCheck.canSendKeystrokes) {
    return secondCheck;
  }

  await openPermissionSettings();

  throw new Error(
    "macOS automation permission is required. Approve Terminal/iTerm for System Events in Privacy & Security (Automation + Accessibility), then rerun the demo."
  );
}
