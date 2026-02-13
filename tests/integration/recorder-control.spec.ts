import { beforeEach, describe, expect, it, vi } from "vitest";

const { runAppleScriptMock } = vi.hoisted(() => ({
  runAppleScriptMock: vi.fn(async (_script?: string) => ({ stdout: "", stderr: "" }))
}));

vi.mock("@studioflow/adapters-desktop", () => ({
  runAppleScript: runAppleScriptMock
}));

beforeEach(() => {
  vi.resetModules();
  runAppleScriptMock.mockReset();
  runAppleScriptMock.mockResolvedValue({ stdout: "", stderr: "" });
  process.env.SCREENSTUDIO_APP_NAME = "Screen Studio";
  process.env.SCREENSTUDIO_PRE_CONFIRM_DELAY_MS = "0";
  process.env.SCREENSTUDIO_POST_START_DELAY_MS = "0";
  process.env.SCREENSTUDIO_POST_STOP_DELAY_MS = "0";
  process.env.SCREENSTUDIO_EXPORT_DIALOG_CONFIRM_DELAY_MS = "0";
  process.env.SCREENSTUDIO_EXPORT_DELAY_MS = "0";
});

describe("screen studio menu automation", () => {
  it("builds menu scripts and parses menu item output", async () => {
    const {
      buildActivateScreenStudioScript,
      buildListRecordMenuItemsScript,
      buildClickRecordMenuItemScript,
      buildPressReturnScript,
      parseMenuItems
    } = await import("../../packages/adapters-screenstudio/src/menu-controls.ts");

    expect(buildActivateScreenStudioScript("Screen Studio")).toBe(
      'tell application "Screen Studio" to activate'
    );
    expect(buildListRecordMenuItemsScript("Screen Studio")).toContain(
      'get name of every menu item of menu "Record"'
    );
    expect(buildClickRecordMenuItemScript("Screen Studio", "Record display")).toContain(
      'click menu item "Record display"'
    );
    expect(buildPressReturnScript()).toBe('tell application "System Events" to key code 36');
    expect(parseMenuItems("Record display, missing value, Stop recording")).toEqual([
      "Record display",
      "Stop recording"
    ]);
  });

  it("throws a clear error when a required menu item is missing", async () => {
    const { clickRecordMenuItem } = await import("../../packages/adapters-screenstudio/src/menu-controls.ts");

    runAppleScriptMock.mockResolvedValueOnce({
      stdout: "Record display, Export and save to file",
      stderr: ""
    });

    await expect(clickRecordMenuItem("Screen Studio", "Stop recording")).rejects.toThrow(
      'Screen Studio Record menu item "Stop recording" not available. Available items: Record display, Export and save to file'
    );
  });

  it("runs start recording through activate -> menu click -> return", async () => {
    const { startRecording } = await import("../../packages/adapters-screenstudio/src/recorder.ts");

    runAppleScriptMock.mockImplementation(async (script?: string) => {
      if ((script ?? "").includes('get name of every menu item of menu "Record"')) {
        return { stdout: "Record display, Stop recording, Export and save to file", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });

    await startRecording();

    const scripts = runAppleScriptMock.mock.calls.map((args) => String(args[0]));
    expect(scripts).toHaveLength(4);
    expect(scripts[0]).toContain('tell application "Screen Studio" to activate');
    expect(scripts[1]).toContain('get name of every menu item of menu "Record"');
    expect(scripts[2]).toContain('click menu item "Record display"');
    expect(scripts[3]).toContain("key code 36");
  });

  it("runs stop recording through activate -> menu click", async () => {
    const { stopRecording } = await import("../../packages/adapters-screenstudio/src/recorder.ts");

    runAppleScriptMock.mockImplementation(async (script?: string) => {
      if ((script ?? "").includes('get name of every menu item of menu "Record"')) {
        return { stdout: "Record display, Stop recording, Export and save to file", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });

    await stopRecording();

    const scripts = runAppleScriptMock.mock.calls.map((args) => String(args[0]));
    expect(scripts).toHaveLength(3);
    expect(scripts[0]).toContain('tell application "Screen Studio" to activate');
    expect(scripts[1]).toContain('get name of every menu item of menu "Record"');
    expect(scripts[2]).toContain('click menu item "Stop recording"');
  });

  it("runs export through activate -> menu click -> return", async () => {
    const { exportRecording } = await import("../../packages/adapters-screenstudio/src/recorder.ts");

    runAppleScriptMock.mockImplementation(async (script?: string) => {
      if ((script ?? "").includes('get name of every menu item of menu "Record"')) {
        return { stdout: "Record display, Stop recording, Export and save to file", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });

    await exportRecording();

    const scripts = runAppleScriptMock.mock.calls.map((args) => String(args[0]));
    expect(scripts).toHaveLength(4);
    expect(scripts[0]).toContain('tell application "Screen Studio" to activate');
    expect(scripts[1]).toContain('get name of every menu item of menu "Record"');
    expect(scripts[2]).toContain('click menu item "Export and save to file"');
    expect(scripts[3]).toContain("key code 36");
  });
});
