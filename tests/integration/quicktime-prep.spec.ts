import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureAutomationPermissionsMock,
  activateQuickTimeMock,
  listQuickTimeFileMenuItemsMock
} = vi.hoisted(() => ({
  ensureAutomationPermissionsMock: vi.fn(),
  activateQuickTimeMock: vi.fn(),
  listQuickTimeFileMenuItemsMock: vi.fn()
}));

vi.mock("@studioflow/adapters-desktop", () => ({
  ensureAutomationPermissions: ensureAutomationPermissionsMock,
  activateQuickTime: activateQuickTimeMock,
  listQuickTimeFileMenuItems: listQuickTimeFileMenuItemsMock
}));

describe("quicktime preflight", () => {
  beforeEach(() => {
    vi.resetModules();
    ensureAutomationPermissionsMock.mockReset();
    activateQuickTimeMock.mockReset();
    listQuickTimeFileMenuItemsMock.mockReset();

    ensureAutomationPermissionsMock.mockResolvedValue(undefined);
    activateQuickTimeMock.mockResolvedValue(undefined);
    listQuickTimeFileMenuItemsMock.mockResolvedValue(["New Screen Recording", "Close"]);
  });

  it("passes when file menu exposes new screen recording", async () => {
    const { runQuickTimePreflight } = await import("../../apps/cli/src/commands/quicktime-prep.ts");

    const result = await runQuickTimePreflight({ ensurePermissions: true, quiet: true });

    expect(result.fileMenuItems).toEqual(["New Screen Recording", "Close"]);
    expect(ensureAutomationPermissionsMock).toHaveBeenCalledTimes(1);
    expect(activateQuickTimeMock).toHaveBeenCalledTimes(1);
  });

  it("fails when file menu does not expose new screen recording", async () => {
    listQuickTimeFileMenuItemsMock.mockResolvedValue(["New Movie Recording", "Open Location"]);
    const { runQuickTimePreflight } = await import("../../apps/cli/src/commands/quicktime-prep.ts");

    await expect(runQuickTimePreflight({ ensurePermissions: false, quiet: true })).rejects.toThrow(
      'QuickTime File menu does not expose "New Screen Recording"'
    );
    expect(ensureAutomationPermissionsMock).not.toHaveBeenCalled();
  });
});
