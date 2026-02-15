import { describe, expect, it } from "vitest";
import { resolveRuntimePacingDefaults } from "@studioflow/adapters-playwright";

describe("playwright runtime pacing defaults", () => {
  it("uses standard natural defaults", () => {
    const resolved = resolveRuntimePacingDefaults({});

    expect(resolved).toEqual({
      renderCursorOverlay: true,
      cursorTheme: "macos",
      cursorMoveMs: 430,
      cursorHighlightMs: 170,
      realisticTyping: true,
      typingDelayMs: 55,
      clickPulseMs: 220,
      fullPageScreenshots: false,
      scrollAnimationMs: 340,
      scrollSettleMs: 180,
      stepPreDelayMs: 90,
      stepPostDelayMs: 130,
      stepDwellMs: 180,
      pacingAdjustmentEnabled: true,
      pacingJitterEnabled: true
    });
  });

  it("applies explicit env overrides", () => {
    const resolved = resolveRuntimePacingDefaults({
      STUDIOFLOW_RENDER_CURSOR: "false",
      STUDIOFLOW_CURSOR_THEME: "generic",
      STUDIOFLOW_CURSOR_MOVE_MS: "600",
      STUDIOFLOW_CURSOR_HIGHLIGHT_MS: "250",
      STUDIOFLOW_REALISTIC_TYPING: "false",
      STUDIOFLOW_TYPING_DELAY_MS: "30",
      STUDIOFLOW_CLICK_PULSE_MS: "300",
      STUDIOFLOW_SCREENSHOT_FULL_PAGE: "true",
      STUDIOFLOW_SCROLL_ANIMATION_MS: "420",
      STUDIOFLOW_SCROLL_SETTLE_MS: "240",
      STUDIOFLOW_STEP_PRE_DELAY_MS: "120",
      STUDIOFLOW_STEP_POST_DELAY_MS: "160",
      STUDIOFLOW_STEP_DWELL_MS: "210",
      STUDIOFLOW_PACING_ADJUSTMENT: "false",
      STUDIOFLOW_PACING_JITTER: "false"
    });

    expect(resolved).toEqual({
      renderCursorOverlay: false,
      cursorTheme: "generic",
      cursorMoveMs: 600,
      cursorHighlightMs: 250,
      realisticTyping: false,
      typingDelayMs: 30,
      clickPulseMs: 300,
      fullPageScreenshots: true,
      scrollAnimationMs: 420,
      scrollSettleMs: 240,
      stepPreDelayMs: 120,
      stepPostDelayMs: 160,
      stepDwellMs: 210,
      pacingAdjustmentEnabled: false,
      pacingJitterEnabled: false
    });
  });

  it("clamps negative timing values to zero", () => {
    const resolved = resolveRuntimePacingDefaults({
      STUDIOFLOW_TYPING_DELAY_MS: "-1",
      STUDIOFLOW_CLICK_PULSE_MS: "-5",
      STUDIOFLOW_SCROLL_ANIMATION_MS: "-10",
      STUDIOFLOW_SCROLL_SETTLE_MS: "-15",
      STUDIOFLOW_STEP_PRE_DELAY_MS: "-20",
      STUDIOFLOW_STEP_POST_DELAY_MS: "-30",
      STUDIOFLOW_STEP_DWELL_MS: "-40"
    });

    expect(resolved.typingDelayMs).toBe(0);
    expect(resolved.clickPulseMs).toBe(0);
    expect(resolved.scrollAnimationMs).toBe(0);
    expect(resolved.scrollSettleMs).toBe(0);
    expect(resolved.stepPreDelayMs).toBe(0);
    expect(resolved.stepPostDelayMs).toBe(0);
    expect(resolved.stepDwellMs).toBe(0);
  });
});
