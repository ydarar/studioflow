import type { Page } from "playwright";
import type { FlowStep } from "@studioflow/contracts";
import { assertText, assertVisible } from "./assertions.js";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function boolEnv(name: string, fallback: boolean, env: NodeJS.ProcessEnv = process.env) {
  const raw = env[name];
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function intEnv(name: string, fallback: number, env: NodeJS.ProcessEnv = process.env) {
  const raw = env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const maxDelayMs = 60_000;

export interface RuntimePacingDefaults {
  renderCursorOverlay: boolean;
  cursorMoveMs: number;
  cursorHighlightMs: number;
  realisticTyping: boolean;
  typingDelayMs: number;
  clickPulseMs: number;
  stepPreDelayMs: number;
  stepPostDelayMs: number;
  stepDwellMs: number;
  pacingAdjustmentEnabled: boolean;
  pacingJitterEnabled: boolean;
}

export function resolveRuntimePacingDefaults(env: NodeJS.ProcessEnv = process.env): RuntimePacingDefaults {
  return {
    renderCursorOverlay: boolEnv("STUDIOFLOW_RENDER_CURSOR", true, env),
    cursorMoveMs: Math.max(0, intEnv("STUDIOFLOW_CURSOR_MOVE_MS", 430, env)),
    cursorHighlightMs: Math.max(0, intEnv("STUDIOFLOW_CURSOR_HIGHLIGHT_MS", 170, env)),
    realisticTyping: boolEnv("STUDIOFLOW_REALISTIC_TYPING", true, env),
    typingDelayMs: Math.max(0, intEnv("STUDIOFLOW_TYPING_DELAY_MS", 55, env)),
    clickPulseMs: Math.max(0, intEnv("STUDIOFLOW_CLICK_PULSE_MS", 220, env)),
    stepPreDelayMs: Math.max(0, intEnv("STUDIOFLOW_STEP_PRE_DELAY_MS", 90, env)),
    stepPostDelayMs: Math.max(0, intEnv("STUDIOFLOW_STEP_POST_DELAY_MS", 130, env)),
    stepDwellMs: Math.max(0, intEnv("STUDIOFLOW_STEP_DWELL_MS", 180, env)),
    pacingAdjustmentEnabled: boolEnv("STUDIOFLOW_PACING_ADJUSTMENT", true, env),
    pacingJitterEnabled: boolEnv("STUDIOFLOW_PACING_JITTER", true, env)
  };
}

export interface StepExecutionContext {
  pacingMultiplier?: number;
  strictPacing?: boolean;
  jitterSeed?: string;
}

interface Point {
  x: number;
  y: number;
}

const cursorOverlaySetupScript = (clickPulseMs: number) => `
(() => {
  const win = window;
  if (win.__studioflowCursor) return;

  if (!document.getElementById("studioflow-cursor-style")) {
    const style = document.createElement("style");
    style.id = "studioflow-cursor-style";
    style.textContent = \`
      #studioflow-cursor {
        position: fixed;
        top: 0;
        left: 0;
        width: 22px;
        height: 30px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='30' viewBox='0 0 22 30'%3E%3Cpath d='M1.5 1.5V22.2L7.4 17.4L11 28.5L14.4 27L10.8 15.9H19.6L1.5 1.5Z' fill='white' stroke='%23000' stroke-width='1.5' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-size: 22px 30px;
        pointer-events: none;
        z-index: 2147483647;
        filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.55));
        transform: translate3d(16px, 16px, 0);
        transition-property: transform;
        transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
      }
      #studioflow-cursor::after {
        content: "";
        position: absolute;
        left: -8px;
        top: -8px;
        width: 20px;
        height: 20px;
        border-radius: 999px;
        border: 2px solid rgba(59, 130, 246, 0.72);
        opacity: 0;
        transform: scale(0.65);
      }
      #studioflow-cursor.studioflow-cursor-pulse::after {
        animation: studioflow-cursor-pulse ${Math.max(0, clickPulseMs)}ms ease-out;
      }
      @keyframes studioflow-cursor-pulse {
        0% { opacity: 0.9; transform: scale(0.55); }
        100% { opacity: 0; transform: scale(1.5); }
      }
    \`;
    document.head.appendChild(style);
  }

  const cursor = document.createElement("div");
  cursor.id = "studioflow-cursor";
  cursor.setAttribute("aria-hidden", "true");
  document.body.appendChild(cursor);

  let x = 16;
  let y = 16;
  const setPosition = (nextX, nextY, durationMs) => {
    x = nextX;
    y = nextY;
    cursor.style.transitionDuration = \`\${Math.max(0, durationMs)}ms\`;
    cursor.style.transform = \`translate3d(\${x}px, \${y}px, 0)\`;
  };

  win.__studioflowCursor = {
    moveTo(nextX, nextY, durationMs) {
      setPosition(nextX, nextY, durationMs);
    },
    clickPulse() {
      cursor.classList.remove("studioflow-cursor-pulse");
      void cursor.offsetWidth;
      cursor.classList.add("studioflow-cursor-pulse");
    }
  };
})();
`;

const cursorMoveScript = (point: Point, durationMs: number) => `
(() => {
  const cursor = window.__studioflowCursor;
  if (cursor) cursor.moveTo(${point.x}, ${point.y}, ${durationMs});
})();
`;

const cursorClickPulseScript = `
(() => {
  const cursor = window.__studioflowCursor;
  if (cursor) cursor.clickPulse();
})();
`;

declare global {
  interface Window {
    __studioflowCursor?: {
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
  runtime: RuntimePacingDefaults,
  channel: string,
  allowJitter = true
) {
  if (!rawMs || rawMs <= 0) return 0;

  let value = rawMs;
  const multiplier = runtime.pacingAdjustmentEnabled ? context.pacingMultiplier ?? 1 : 1;
  value *= multiplier;

  const shouldApplyJitter =
    allowJitter && runtime.pacingJitterEnabled && !context.strictPacing && Boolean(context.jitterSeed);

  if (shouldApplyJitter) {
    value *= 1 + jitterFactor(`${context.jitterSeed}:${channel}`);
  }

  return Math.max(0, Math.min(maxDelayMs, Math.round(value)));
}

async function ensureCursorOverlay(page: Page, runtime: RuntimePacingDefaults) {
  if (!runtime.renderCursorOverlay) return;
  await page.evaluate(cursorOverlaySetupScript(runtime.clickPulseMs));
}

async function getTargetCenter(page: Page, target: string): Promise<Point | null> {
  const box = await page.locator(target).first().boundingBox();
  if (!box) return null;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function moveCursor(page: Page, point: Point, durationMs: number, runtime: RuntimePacingDefaults) {
  await page.mouse.move(point.x, point.y, { steps: Math.max(8, Math.floor(durationMs / 16)) });
  if (runtime.renderCursorOverlay) {
    await ensureCursorOverlay(page, runtime);
    await page.evaluate(cursorMoveScript(point, durationMs));
  }
}

async function clickPulse(page: Page, runtime: RuntimePacingDefaults) {
  if (!runtime.renderCursorOverlay) return;
  await ensureCursorOverlay(page, runtime);
  await page.evaluate(cursorClickPulseScript);
}

async function applyPreStepPacing(page: Page, step: FlowStep, context: StepExecutionContext, runtime: RuntimePacingDefaults) {
  const preDelay = resolvePacedDelay(step.preDelayMs ?? runtime.stepPreDelayMs, context, runtime, "pre");
  if (preDelay > 0) {
    await wait(preDelay);
  }

  const shouldMoveCursor = ["click", "type"].includes(step.action) && Boolean(step.target);
  if (!shouldMoveCursor || !step.target) return;

  const center = await getTargetCenter(page, step.target);
  if (!center) return;

  const moveMs = resolvePacedDelay(step.mouseMoveMs ?? runtime.cursorMoveMs, context, runtime, "move");
  if (moveMs > 0) {
    await moveCursor(page, center, moveMs, runtime);
  }

  const highlightMs = resolvePacedDelay(step.highlightMs ?? runtime.cursorHighlightMs, context, runtime, "highlight");
  if (highlightMs > 0) {
    await wait(highlightMs);
  }
}

async function applyPostStepPacing(step: FlowStep, context: StepExecutionContext, runtime: RuntimePacingDefaults) {
  const postDelay = resolvePacedDelay(step.postDelayMs ?? runtime.stepPostDelayMs, context, runtime, "post");
  if (postDelay > 0) {
    await wait(postDelay);
  }
  const dwellDelay = resolvePacedDelay(step.dwellMs ?? runtime.stepDwellMs, context, runtime, "dwell");
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
  const runtime = resolveRuntimePacingDefaults();
  await applyPreStepPacing(page, step, context, runtime);

  if (step.action === "goto") {
    const target = step.value ?? "/";
    const isAbsolute = /^https?:\/\//.test(target);
    await page.goto(isAbsolute ? target : new URL(target, baseUrl).toString(), { timeout });
    await applyPostStepPacing(step, context, runtime);
    return;
  }

  if (step.action === "click") {
    if (!step.target) throw new Error(`Step ${step.id} missing target`);
    await page.locator(step.target).first().click({ timeout });
    await clickPulse(page, runtime);
    await applyPostStepPacing(step, context, runtime);
    return;
  }

  if (step.action === "type") {
    if (!step.target) throw new Error(`Step ${step.id} missing target`);
    const locator = page.locator(step.target).first();
    if (runtime.realisticTyping) {
      await locator.click({ timeout });
      await clickPulse(page, runtime);
      await locator.fill("", { timeout });
      const effectiveTypingDelay = resolvePacedDelay(runtime.typingDelayMs, context, runtime, "typing", false);
      await page.keyboard.type(step.value ?? "", { delay: effectiveTypingDelay });
    } else {
      await locator.fill(step.value ?? "", { timeout });
    }
    await applyPostStepPacing(step, context, runtime);
    return;
  }

  if (step.action === "wait_for") {
    if (step.target) {
      await page.locator(step.target).first().waitFor({ state: "visible", timeout });
      await applyPostStepPacing(step, context, runtime);
      return;
    }
    if (step.value) {
      await page.getByText(step.value).first().waitFor({ timeout });
      await applyPostStepPacing(step, context, runtime);
      return;
    }
    throw new Error(`Step ${step.id} requires target or value for wait_for`);
  }

  if (step.action === "assert_text") {
    if (!step.value) throw new Error(`Step ${step.id} missing value`);
    await assertText(page, step.value, timeout);
    await applyPostStepPacing(step, context, runtime);
    return;
  }

  if (step.action === "assert_visible") {
    if (!step.target) throw new Error(`Step ${step.id} missing target`);
    await assertVisible(page, step.target, timeout);
    await applyPostStepPacing(step, context, runtime);
    return;
  }

  if (step.action === "screenshot") {
    const name = step.value ?? `${step.id}.png`;
    await page.screenshot({ path: `${runDir}/screenshots/${name}.png`, fullPage: true });
    await applyPostStepPacing(step, context, runtime);
    return;
  }

  if (["recorder_start", "recorder_stop", "recorder_export"].includes(step.action)) {
    await applyPostStepPacing(step, context, runtime);
    return;
  }

  throw new Error(`Unsupported action: ${step.action}`);
}
