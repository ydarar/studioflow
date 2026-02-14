import { beforeEach, describe, expect, it, vi } from "vitest";

const { runAppleScriptMock } = vi.hoisted(() => ({
  runAppleScriptMock: vi.fn(async (_script?: string) => ({ stdout: "", stderr: "" }))
}));

vi.mock("../../packages/adapters-desktop/src/osascript.js", () => ({
  runAppleScript: runAppleScriptMock
}));

describe("quicktime recorder automation", () => {
  beforeEach(() => {
    vi.resetModules();
    runAppleScriptMock.mockReset();
    runAppleScriptMock.mockResolvedValue({ stdout: "", stderr: "" });

    process.env.QUICKTIME_PRE_CONFIRM_DELAY_MS = "0";
    process.env.QUICKTIME_POST_START_DELAY_MS = "0";
    process.env.QUICKTIME_FULL_SCREEN_SELECT_DELAY_MS = "0";
    process.env.QUICKTIME_FORCE_RECORD_ENTIRE_SCREEN = "true";
  });

  it("builds screenshot toolbar click script for both process names", async () => {
    const { buildClickScreenshotToolbarControlScript } = await import(
      "../../packages/adapters-desktop/src/quicktime.ts"
    );

    const script = buildClickScreenshotToolbarControlScript("checkbox", "Record Entire Screen");
    expect(script).toContain('if exists process "Screenshot"');
    expect(script).toContain('else if exists process "screencaptureui"');
    expect(script).toContain('click checkbox "Record Entire Screen"');
  });

  it("selects record entire screen before starting recording", async () => {
    runAppleScriptMock.mockImplementation(async (script?: string) => {
      if ((script ?? "").includes('get name of every menu item of menu "File"')) {
        return { stdout: "New Screen Recording, Close", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });

    const { startQuickTimeRecording } = await import("../../packages/adapters-desktop/src/quicktime.ts");
    await startQuickTimeRecording("QuickTime Player");

    const scripts = runAppleScriptMock.mock.calls.map((call) => String(call[0]));
    expect(scripts.some((script) => script.includes('click menu item "New Screen Recording"'))).toBe(true);
    expect(scripts.some((script) => script.includes('click checkbox "Record Entire Screen"'))).toBe(true);
    expect(scripts.some((script) => script.includes('click button "Record"'))).toBe(true);
    expect(scripts.some((script) => script.includes("key code 36"))).toBe(false);
  });

  it("falls back to legacy return shortcut when full-screen controls are unavailable", async () => {
    runAppleScriptMock.mockImplementation(async (script?: string) => {
      if ((script ?? "").includes('get name of every menu item of menu "File"')) {
        return { stdout: "New Screen Recording, Close", stderr: "" };
      }
      if ((script ?? "").includes('click checkbox "Record Entire Screen"')) {
        throw new Error("No screenshot toolbar checkbox available");
      }
      return { stdout: "", stderr: "" };
    });

    const { startQuickTimeRecording } = await import("../../packages/adapters-desktop/src/quicktime.ts");
    await expect(startQuickTimeRecording("QuickTime Player")).resolves.toBeUndefined();

    const scripts = runAppleScriptMock.mock.calls.map((call) => String(call[0]));
    expect(scripts.some((script) => script.includes("key code 36"))).toBe(true);
  });
});
