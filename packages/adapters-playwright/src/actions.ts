import type { Page } from "playwright";
import type { FlowStep } from "@demopilot/contracts";
import { assertText, assertVisible } from "./assertions.js";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function boolEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function intEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const renderCursorOverlay = boolEnv("DEMOPILOT_RENDER_CURSOR", true);
const defaultCursorMoveMs = intEnv("DEMOPILOT_CURSOR_MOVE_MS", 320);
const defaultCursorHighlightMs = intEnv("DEMOPILOT_CURSOR_HIGHLIGHT_MS", 120);
const realisticTyping = boolEnv("DEMOPILOT_REALISTIC_TYPING", true);
const typingDelayMs = Math.max(0, intEnv("DEMOPILOT_TYPING_DELAY_MS", 35));
const pacingAdjustmentEnabled = boolEnv("DEMOPILOT_PACING_ADJUSTMENT", true);
const pacingJitterEnabled = boolEnv("DEMOPILOT_PACING_JITTER", true);
const maxDelayMs = 60_000;

export interface StepExecutionContext {
  pacingMultiplier?: number;
  strictPacing?: boolean;
  jitterSeed?: string;
}

interface Point {
  x: number;
  y: number;
}

const cursorOverlaySetupScript = `
(() => {
  const win = window;
  if (win.__demopilotCursor) return;

  if (!document.getElementById("demopilot-cursor-style")) {
    const style = document.createElement("style");
    style.id = "demopilot-cursor-style";
    style.textContent = \`
      #demopilot-cursor {
        position: fixed;
        top: 0;
        left: 0;
        width: 16px;
        height: 16px;
        border-radius: 999px;
        border: 2px solid rgba(2, 6, 23, 0.9);
        background: rgba(255, 255, 255, 0.78);
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.95), 0 4px 14px rgba(2, 6, 23, 0.28);
        pointer-events: none;
        z-index: 2147483647;
        transform: translate3d(8px, 8px, 0);
        transition-property: transform;
        transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
      }
      #demopilot-cursor::after {
        content: "";
        position: absolute;
        inset: -8px;
        border-radius: 999px;
        border: 2px solid rgba(59, 130, 246, 0.72);
        opacity: 0;
        transform: scale(0.65);
      }
      #demopilot-cursor.demopilot-cursor-pulse::after {
        animation: demopilot-cursor-pulse 300ms ease-out;
      }
      @keyframes demopilot-cursor-pulse {
        0% { opacity: 0.9; transform: scale(0.55); }
        100% { opacity: 0; transform: scale(1.5); }
      }
    \`;
    document.head.appendChild(style);
  }

  const cursor = document.createElement("div");
  cursor.id = "demopilot-cursor";
  cursor.setAttribute("aria-hidden", "true");
  document.body.appendChild(cursor);

  let x = 16;
  let y = 16;
  const setPosition = (nextX, nextY, durationMs) => {
    x = nextX;
    y = nextY;
    cursor.style.transitionDuration = \`\${Math.max(0, durationMs)}ms\`;
    cursor.style.transform = \`translate3d(\${x - 8}px, \${y - 8}px, 0)\`;
  };

  win.__demopilotCursor = {
    moveTo(nextX, nextY, durationMs) {
      setPosition(nextX, nextY, durationMs);
    },
    clickPulse() {
      cursor.classList.remove("demopilot-cursor-pulse");
      void cursor.offsetWidth;
      cursor.classList.add("demopilot-cursor-pulse");
    }
  };
})();
`;

const cursorMoveScript = (point: Point, durationMs: number) => `
(() => {
  const cursor = window.__demopilotCursor;
  if (cursor) cursor.moveTo(${point.x}, ${point.y}, ${durationMs});
})();
`;

const cursorClickPulseScript = `
(() => {
  const cursor = window.__demopilotCursor;
  if (cursor) cursor.clickPulse();
})();
`;

declare global {
  interface Window {
    __demopilotCursor?: {
      moveTo: (x: number, y: number, durationMs: number) => void;
      clickPulse: () => void;
    };
  }
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function jitterFactor(seed: string) {
  const hash = hashString(seed);
  const normalized = hash / 0xffffffff;
  return normalized * 0.24 - 0.12;
}

function resolvePacedDelay(
  rawMs: number | undefined,
  context: StepExecutionContext,
  channel: string,
  allowJitter = true
) {
  if (!rawMs || rawMs <= 0) return 0;

  let value = rawMs;
  const multiplier = pacingAdjustmentEnabled ? context.pacingMultiplier ?? 1 : 1;
  value *= multiplier;

  const shouldApplyJitter =
    allowJitter && pacingJitterEnabled && !context.strictPacing && Boolean(context.jitterSeed);

  if (shouldApplyJitter) {
    value *= 1 + jitterFactor(`${context.jitterSeed}:${channel}`);
  }

  return Math.max(0, Math.min(maxDelayMs, Math.round(value)));
}

async function ensureCursorOverlay(page: Page) {
  if (!renderCursorOverlay) return;
  await page.evaluate(cursorOverlaySetupScript);
}

async function getTargetCenter(page: Page, target: string): Promise<Point | null> {
  const box = await page.locator(target).first().boundingBox();
  if (!box) return null;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function moveCursor(page: Page, point: Point, durationMs: number) {
  await page.mouse.move(point.x, point.y, { steps: Math.max(8, Math.floor(durationMs / 16)) });
  if (renderCursorOverlay) {
    await ensureCursorOverlay(page);
    await page.evaluate(cursorMoveScript(point, durationMs));
  }
}

async function clickPulse(page: Page) {
  if (!renderCursorOverlay) return;
  await ensureCursorOverlay(page);
  await page.evaluate(cursorClickPulseScript);
}

async function applyPreStepPacing(page: Page, step: FlowStep, context: StepExecutionContext) {
  const preDelay = resolvePacedDelay(step.preDelayMs, context, "pre");
  if (preDelay > 0) {
    await wait(preDelay);
  }

  const shouldMoveCursor = ["click", "type"].includes(step.action) && Boolean(step.target);
  if (!shouldMoveCursor || !step.target) return;

  const center = await getTargetCenter(page, step.target);
  if (!center) return;

  const moveMs = resolvePacedDelay(step.mouseMoveMs ?? defaultCursorMoveMs, context, "move");
  if (moveMs > 0) {
    await moveCursor(page, center, moveMs);
  }

  const highlightMs = resolvePacedDelay(step.highlightMs ?? defaultCursorHighlightMs, context, "highlight");
  if (highlightMs > 0) {
    await wait(highlightMs);
  }
}

async function applyPostStepPacing(step: FlowStep, context: StepExecutionContext) {
  const postDelay = resolvePacedDelay(step.postDelayMs, context, "post");
  if (postDelay > 0) {
    await wait(postDelay);
  }
  const dwellDelay = resolvePacedDelay(step.dwellMs, context, "dwell");
  if (dwellDelay > 0) {
    await wait(dwellDelay);
  }
}

export async function executeStep(
  page: Page,
  step: FlowStep,
  runDir: string,
  baseUrl: string,
  context: StepExecutionContext = {}
) {
  const timeout = step.timeoutMs ?? 6000;
  await applyPreStepPacing(page, step, context);

  if (step.action === "goto") {
    const target = step.value ?? "/";
    const isAbsolute = /^https?:\/\//.test(target);
    await page.goto(isAbsolute ? target : new URL(target, baseUrl).toString(), { timeout });
    await applyPostStepPacing(step, context);
    return;
  }

  if (step.action === "click") {
    if (!step.target) throw new Error(`Step ${step.id} missing target`);
    await page.locator(step.target).first().click({ timeout });
    await clickPulse(page);
    await applyPostStepPacing(step, context);
    return;
  }

  if (step.action === "type") {
    if (!step.target) throw new Error(`Step ${step.id} missing target`);
    const locator = page.locator(step.target).first();
    if (realisticTyping) {
      await locator.click({ timeout });
      await clickPulse(page);
      await locator.fill("", { timeout });
      const effectiveTypingDelay = resolvePacedDelay(typingDelayMs, context, "typing", false);
      await page.keyboard.type(step.value ?? "", { delay: effectiveTypingDelay });
    } else {
      await locator.fill(step.value ?? "", { timeout });
    }
    await applyPostStepPacing(step, context);
    return;
  }

  if (step.action === "wait_for") {
    if (step.target) {
      await page.locator(step.target).first().waitFor({ state: "visible", timeout });
      await applyPostStepPacing(step, context);
      return;
    }
    if (step.value) {
      await page.getByText(step.value).first().waitFor({ timeout });
      await applyPostStepPacing(step, context);
      return;
    }
    throw new Error(`Step ${step.id} requires target or value for wait_for`);
  }

  if (step.action === "assert_text") {
    if (!step.value) throw new Error(`Step ${step.id} missing value`);
    await assertText(page, step.value, timeout);
    await applyPostStepPacing(step, context);
    return;
  }

  if (step.action === "assert_visible") {
    if (!step.target) throw new Error(`Step ${step.id} missing target`);
    await assertVisible(page, step.target, timeout);
    await applyPostStepPacing(step, context);
    return;
  }

  if (step.action === "screenshot") {
    const name = step.value ?? `${step.id}.png`;
    await page.screenshot({ path: `${runDir}/screenshots/${name}.png`, fullPage: true });
    await applyPostStepPacing(step, context);
    return;
  }

  if (["recorder_start", "recorder_stop", "recorder_export"].includes(step.action)) {
    await applyPostStepPacing(step, context);
    return;
  }

  throw new Error(`Unsupported action: ${step.action}`);
}
