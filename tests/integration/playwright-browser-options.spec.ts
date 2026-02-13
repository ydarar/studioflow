import { describe, expect, it } from "vitest";
import { resolveBrowserLaunch } from "@studioflow/adapters-playwright";

describe("playwright browser launch resolution", () => {
  it("defaults to headed maximized mode for recording-friendly runs", () => {
    const resolved = resolveBrowserLaunch({}, {});

    expect(resolved).toEqual({
      headless: false,
      launchArgs: ["--start-maximized"],
      viewport: null
    });
  });

  it("keeps fixed viewport when headless is enabled", () => {
    const resolved = resolveBrowserLaunch({ headless: true }, {});

    expect(resolved).toEqual({
      headless: true,
      launchArgs: undefined,
      viewport: { width: 1440, height: 960 }
    });
  });

  it("allows disabling maximized mode via environment override", () => {
    const resolved = resolveBrowserLaunch({}, { STUDIOFLOW_BROWSER_FULLSCREEN: "false" });

    expect(resolved).toEqual({
      headless: false,
      launchArgs: undefined,
      viewport: { width: 1440, height: 960 }
    });
  });
});
