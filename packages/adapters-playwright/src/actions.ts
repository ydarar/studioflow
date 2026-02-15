import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
type CursorTheme = "macos" | "generic";
interface CursorOverlayAsset {
  dataUri: string;
  width: number;
  height: number;
  hotspotX: number;
  hotspotY: number;
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

const macosCursorSvgDataUri =
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2226%22%20height%3D%2236%22%20viewBox%3D%220%200%2026%2036%22%3E%3Cpath%20d%3D%22M2%201.5v26.2l6.7-6.4%204.4%2012.8%204.2-1.6-4.4-12.8h10.8L2%201.5z%22%20fill%3D%22%23111%22%2F%3E%3Cpath%20d%3D%22M4%204.5v18.1l5.1-4.9a1%201%200%200%201%201.6.4l3.7%2010.9%201.4-.5-3.7-10.9a1%201%200%200%201%20.9-1.3h7.8L4%204.5z%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E";
const genericCursorSvgDataUri =
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2222%22%20height%3D%2230%22%20viewBox%3D%220%200%2022%2030%22%3E%3Cpath%20d%3D%22M1.5%201.5V22.2L7.4%2017.4L11%2028.5L14.4%2027L10.8%2015.9H19.6L1.5%201.5Z%22%20fill%3D%22white%22%20stroke%3D%22%23000%22%20stroke-width%3D%221.5%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E";
const macosFallbackCursorAsset: CursorOverlayAsset = {
  dataUri: macosCursorSvgDataUri,
  width: 26,
  height: 36,
  hotspotX: 2,
  hotspotY: 1
};
const genericCursorAsset: CursorOverlayAsset = {
  dataUri: genericCursorSvgDataUri,
  width: 22,
  height: 30,
  hotspotX: 2,
  hotspotY: 1
};
const cursorAssetCache = new Map<string, CursorOverlayAsset>();

function cursorThemeEnv(env: NodeJS.ProcessEnv = process.env): CursorTheme {
  const raw = env.STUDIOFLOW_CURSOR_THEME?.trim().toLowerCase();
  if (raw === "generic") return "generic";
  return "macos";
}

function parsePngDimensions(buffer: Buffer) {
  if (buffer.length < 24) return null;
  const pngHeader = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let index = 0; index < pngHeader.length; index += 1) {
    if (buffer[index] !== pngHeader[index]) {
      return null;
    }
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function resolveCursorPngPath(env: NodeJS.ProcessEnv = process.env) {
  const projectRoot = env.INIT_CWD ?? process.cwd();
  const explicitPath = env.STUDIOFLOW_CURSOR_PNG_PATH?.trim();
  const candidates = [
    explicitPath
      ? path.isAbsolute(explicitPath)
        ? explicitPath
        : path.resolve(projectRoot, explicitPath)
      : "",
    path.resolve(projectRoot, "apps/cli/assets/cursor.png"),
    path.resolve(projectRoot, "apps/cli/cursor.png"),
    path.resolve(projectRoot, "assets/cursor.png"),
    path.resolve(projectRoot, "cursor.png"),
    path.resolve(moduleDir, "../../../apps/cli/assets/cursor.png"),
    path.resolve(moduleDir, "../../../apps/cli/cursor.png"),
    path.resolve(moduleDir, "../assets/cursor.png"),
    path.resolve(moduleDir, "../cursor.png")
  ];
  const visited = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate || visited.has(candidate)) continue;
    visited.add(candidate);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function loadCursorPngAsset(filePath: string, env: NodeJS.ProcessEnv = process.env): CursorOverlayAsset | null {
  const cached = cursorAssetCache.get(filePath);
  if (cached) return cached;

  try {
    const image = fs.readFileSync(filePath);
    const dimensions = parsePngDimensions(image);
    const maxEdge = Math.max(20, intEnv("STUDIOFLOW_CURSOR_MAX_EDGE_PX", 34, env));
    const sourceWidth = dimensions?.width ?? 26;
    const sourceHeight = dimensions?.height ?? 36;
    const scale = maxEdge / Math.max(sourceWidth, sourceHeight);
    const width = Math.max(18, Math.round(sourceWidth * scale));
    const height = Math.max(18, Math.round(sourceHeight * scale));
    const asset: CursorOverlayAsset = {
      dataUri: `data:image/png;base64,${image.toString("base64")}`,
      width,
      height,
      hotspotX: Math.max(1, Math.round(width * 0.08)),
      hotspotY: Math.max(1, Math.round(height * 0.08))
    };
    cursorAssetCache.set(filePath, asset);
    return asset;
  } catch {
    return null;
  }
}

function resolveCursorOverlayAsset(theme: CursorTheme, env: NodeJS.ProcessEnv = process.env): CursorOverlayAsset {
  if (theme === "generic") {
    return genericCursorAsset;
  }

  const cursorPngPath = resolveCursorPngPath(env);
  if (!cursorPngPath) {
    return macosFallbackCursorAsset;
  }

  return loadCursorPngAsset(cursorPngPath, env) ?? macosFallbackCursorAsset;
}

export interface RuntimePacingDefaults {
  renderCursorOverlay: boolean;
  cursorTheme: CursorTheme;
  cursorMoveMs: number;
  cursorHighlightMs: number;
  realisticTyping: boolean;
  typingDelayMs: number;
  clickPulseMs: number;
  fullPageScreenshots: boolean;
  scrollAnimationMs: number;
  scrollSettleMs: number;
  stepPreDelayMs: number;
  stepPostDelayMs: number;
  stepDwellMs: number;
  pacingAdjustmentEnabled: boolean;
  pacingJitterEnabled: boolean;
}

export function resolveRuntimePacingDefaults(env: NodeJS.ProcessEnv = process.env): RuntimePacingDefaults {
  return {
    renderCursorOverlay: boolEnv("STUDIOFLOW_RENDER_CURSOR", true, env),
    cursorTheme: cursorThemeEnv(env),
    cursorMoveMs: Math.max(0, intEnv("STUDIOFLOW_CURSOR_MOVE_MS", 430, env)),
    cursorHighlightMs: Math.max(0, intEnv("STUDIOFLOW_CURSOR_HIGHLIGHT_MS", 170, env)),
    realisticTyping: boolEnv("STUDIOFLOW_REALISTIC_TYPING", true, env),
    typingDelayMs: Math.max(0, intEnv("STUDIOFLOW_TYPING_DELAY_MS", 55, env)),
    clickPulseMs: Math.max(0, intEnv("STUDIOFLOW_CLICK_PULSE_MS", 220, env)),
    fullPageScreenshots: boolEnv("STUDIOFLOW_SCREENSHOT_FULL_PAGE", false, env),
    scrollAnimationMs: Math.max(0, intEnv("STUDIOFLOW_SCROLL_ANIMATION_MS", 340, env)),
    scrollSettleMs: Math.max(0, intEnv("STUDIOFLOW_SCROLL_SETTLE_MS", 180, env)),
    stepPreDelayMs: Math.max(0, intEnv("STUDIOFLOW_STEP_PRE_DELAY_MS", 90, env)),
    stepPostDelayMs: Math.max(0, intEnv("STUDIOFLOW_STEP_POST_DELAY_MS", 130, env)),
    stepDwellMs: Math.max(0, intEnv("STUDIOFLOW_STEP_DWELL_MS", 180, env)),
    pacingAdjustmentEnabled: boolEnv("STUDIOFLOW_PACING_ADJUSTMENT", true, env),
    pacingJitterEnabled: boolEnv("STUDIOFLOW_PACING_JITTER", true, env)
  };
}

type ScrollAlignment = "start" | "center" | "end" | "nearest";

interface StepScrollPlan {
  required: boolean;
  alignment: ScrollAlignment;
  maxAttempts: number;
}

interface ElementTargetSnapshot {
  exists: boolean;
  visible: boolean;
  inViewport: boolean;
  clippedByOverflow: boolean;
  scrollableAncestors: number;
  rect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  viewport?: {
    width: number;
    height: number;
  };
}

const defaultScrollPlan: StepScrollPlan = {
  required: false,
  alignment: "center",
  maxAttempts: 2
};

async function collectTargetSnapshot(page: Page, target: string): Promise<ElementTargetSnapshot> {
  const locator = page.locator(target).first();
  try {
    if ((await locator.count()) === 0) {
      return {
        exists: false,
        visible: false,
        inViewport: false,
        clippedByOverflow: false,
        scrollableAncestors: 0
      };
    }
    return locator.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      const visible =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || "1") > 0 &&
        rect.width > 0 &&
        rect.height > 0;
      const inViewport = rect.bottom > 0 && rect.right > 0 && rect.top < viewport.height && rect.left < viewport.width;

      let clippedByOverflow = false;
      let scrollableAncestors = 0;
      let parent = element.parentElement;
      while (parent) {
        const parentStyle = window.getComputedStyle(parent);
        const scrollableY =
          /(auto|scroll|overlay)/.test(parentStyle.overflowY) && parent.scrollHeight > parent.clientHeight + 1;
        const scrollableX =
          /(auto|scroll|overlay)/.test(parentStyle.overflowX) && parent.scrollWidth > parent.clientWidth + 1;
        if (scrollableY || scrollableX) {
          scrollableAncestors += 1;
          const parentRect = parent.getBoundingClientRect();
          if (
            rect.top < parentRect.top ||
            rect.bottom > parentRect.bottom ||
            rect.left < parentRect.left ||
            rect.right > parentRect.right
          ) {
            clippedByOverflow = true;
          }
        }
        parent = parent.parentElement;
      }

      return {
        exists: true,
        visible,
        inViewport,
        clippedByOverflow,
        scrollableAncestors,
        rect: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        viewport
      };
    });
  } catch {
    return {
      exists: false,
      visible: false,
      inViewport: false,
      clippedByOverflow: false,
      scrollableAncestors: 0
    };
  }
}

async function scrollTargetIntoView(
  page: Page,
  target: string,
  timeoutMs: number,
  runtime: RuntimePacingDefaults,
  context: StepExecutionContext = {}
) {
  const locator = page.locator(target).first();
  const snapshot = await collectTargetSnapshot(page, target);
  if (!snapshot.exists) return;

  const effective = defaultScrollPlan;
  const needsScroll = snapshot.visible && (!snapshot.inViewport || snapshot.clippedByOverflow);
  if (!effective.required && !needsScroll) return;
  const scrollAnimationMs = resolvePacedDelay(runtime.scrollAnimationMs, context, runtime, "scroll-motion");
  const scrollSettleMs = resolvePacedDelay(runtime.scrollSettleMs, context, runtime, "scroll-settle", false);

  for (let attempt = 0; attempt < effective.maxAttempts; attempt += 1) {
    try {
      await locator.evaluate(
        (element, payload: { alignment: ScrollAlignment; smooth: boolean }) => {
          const block =
            payload.alignment === "start" || payload.alignment === "center" || payload.alignment === "end"
              ? payload.alignment
              : "nearest";
          const behavior = payload.smooth ? "smooth" : "instant";

          let parent = element.parentElement;
          while (parent) {
            const style = window.getComputedStyle(parent);
            const scrollableY =
              /(auto|scroll|overlay)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight + 1;
            const scrollableX =
              /(auto|scroll|overlay)/.test(style.overflowX) && parent.scrollWidth > parent.clientWidth + 1;

            if (scrollableY || scrollableX) {
              const targetRect = element.getBoundingClientRect();
              const parentRect = parent.getBoundingClientRect();
              let nextScrollTop = parent.scrollTop;
              let nextScrollLeft = parent.scrollLeft;

              if (scrollableY) {
                const offsetTop = targetRect.top - parentRect.top + parent.scrollTop;
                if (block === "start") {
                  nextScrollTop = offsetTop - 8;
                } else if (block === "end") {
                  nextScrollTop = offsetTop - parent.clientHeight + targetRect.height + 8;
                } else if (block === "center") {
                  nextScrollTop = offsetTop - parent.clientHeight / 2 + targetRect.height / 2;
                } else if (targetRect.top < parentRect.top || targetRect.bottom > parentRect.bottom) {
                  nextScrollTop = offsetTop - parent.clientHeight / 2 + targetRect.height / 2;
                }
              }

              if (scrollableX) {
                const offsetLeft = targetRect.left - parentRect.left + parent.scrollLeft;
                nextScrollLeft = offsetLeft - parent.clientWidth / 2 + targetRect.width / 2;
              }

              const didMoveY = Math.abs(nextScrollTop - parent.scrollTop) > 0.5;
              const didMoveX = Math.abs(nextScrollLeft - parent.scrollLeft) > 0.5;
              if (didMoveY || didMoveX) {
                parent.scrollTo({
                  top: nextScrollTop,
                  left: nextScrollLeft,
                  behavior
                });
              }
            }

            parent = parent.parentElement;
          }

          element.scrollIntoView({ behavior, block, inline: "nearest" });
        },
        {
          alignment: effective.alignment,
          smooth: scrollAnimationMs > 0
        }
      );
    } catch {
      return;
    }

    const settleMs = Math.min(timeoutMs, Math.max(60, Math.max(scrollSettleMs, Math.round(scrollAnimationMs * 0.75))));
    if (settleMs > 0) {
      await wait(settleMs);
    }

    const after = await collectTargetSnapshot(page, target);
    if (!after.exists) return;
    if (after.visible && after.inViewport && !after.clippedByOverflow) return;
  }
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

const cursorOverlaySetupScript = (clickPulseMs: number, theme: CursorTheme, asset: CursorOverlayAsset) => `
(() => {
  const win = window;
  const cursorAsset = "${asset.dataUri}";
  if (win.__studioflowCursor) return;

  if (!document.getElementById("studioflow-cursor-style")) {
    const style = document.createElement("style");
    style.id = "studioflow-cursor-style";
    style.textContent = \`
      #studioflow-cursor {
        position: fixed;
        top: 0;
        left: 0;
        width: ${asset.width}px;
        height: ${asset.height}px;
        background-image: url("\${cursorAsset}");
        background-repeat: no-repeat;
        background-size: ${asset.width}px ${asset.height}px;
        pointer-events: none;
        z-index: 2147483647;
        opacity: 0;
        transform: translate3d(-9999px, -9999px, 0);
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.48));
        transition: opacity 120ms ease;
        will-change: transform;
      }
      #studioflow-cursor::after {
        content: "";
        position: absolute;
        left: -7px;
        top: -7px;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        border: 2px solid rgba(37, 99, 235, 0.72);
        opacity: 0;
        transform: scale(0.65);
      }
      #studioflow-cursor.studioflow-cursor-pulse::after {
        animation: studioflow-cursor-pulse var(--studioflow-click-pulse-ms, ${Math.max(0, clickPulseMs)}ms) ease-out;
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
  cursor.dataset.theme = "${theme}";
  document.body.appendChild(cursor);

  const hotSpotX = ${asset.hotspotX};
  const hotSpotY = ${asset.hotspotY};
  let x = 0;
  let y = 0;
  let initialized = false;
  let raf = 0;
  let activeResolve = null;

  const resolveActiveAnimation = () => {
    if (activeResolve) {
      const done = activeResolve;
      activeResolve = null;
      done();
    }
  };

  const stopAnimation = () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    resolveActiveAnimation();
  };

  const setPosition = (nextX, nextY) => {
    x = nextX;
    y = nextY;
    cursor.style.transform = \`translate3d(\${Math.round(x - hotSpotX)}px, \${Math.round(y - hotSpotY)}px, 0)\`;
  };

  const easeInOut = (value) => {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
  };

  const animateTo = (nextX, nextY, durationMs) => {
    const startX = x;
    const startY = y;
    const ms = Math.max(0, Math.round(durationMs));

    if (ms === 0 || (Math.abs(startX - nextX) < 0.5 && Math.abs(startY - nextY) < 0.5)) {
      setPosition(nextX, nextY);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      activeResolve = resolve;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / ms);
        const eased = easeInOut(progress);
        const currentX = startX + (nextX - startX) * eased;
        const currentY = startY + (nextY - startY) * eased;
        setPosition(currentX, currentY);
        if (progress >= 1) {
          raf = 0;
          resolveActiveAnimation();
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
  };

  win.__studioflowCursor = {
    moveTo(nextX, nextY, durationMs) {
      const targetX = Number(nextX) || 0;
      const targetY = Number(nextY) || 0;
      const transitionMs = Math.max(0, Number(durationMs) || 0);
      stopAnimation();

      if (!initialized) {
        initialized = true;
        cursor.style.opacity = "1";
        setPosition(targetX - 14, targetY - 10);
        return animateTo(targetX, targetY, Math.min(280, Math.max(120, transitionMs)));
      }

      return animateTo(targetX, targetY, transitionMs);
    },
    getPosition() {
      if (!initialized) return null;
      return { x, y };
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
  if (cursor) return cursor.moveTo(${point.x}, ${point.y}, ${durationMs});
  return undefined;
})();
`;

const cursorClickPulseScript = (pulseMs: number) => `
(() => {
  const cursor = window.__studioflowCursor;
  if (!cursor) return;
  const pulse = Math.max(0, Math.round(${pulseMs}));
  const cursorNode = document.getElementById("studioflow-cursor");
  if (cursorNode) {
    cursorNode.style.setProperty("--studioflow-click-pulse-ms", pulse + "ms");
  }
  cursor.clickPulse();
})();
`;

const cursorPositionScript = `
(() => {
  const cursor = window.__studioflowCursor;
  if (!cursor) return null;
  return cursor.getPosition();
})();
`;

const cursorExistsScript = `
(() => Boolean(window.__studioflowCursor))();
`;

declare global {
  interface Window {
    __studioflowCursor?: {
      moveTo: (x: number, y: number, durationMs: number) => Promise<void>;
      getPosition: () => Point | null;
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

function sanitizeScreenshotName(raw: string) {
  const normalized = raw.trim().replace(/\\/g, "/");
  const base = normalized.split("/").filter(Boolean).pop() ?? "screenshot";
  const withoutPng = base.toLowerCase().endsWith(".png") ? base.slice(0, -4) : base;
  const safe = withoutPng.replace(/[^A-Za-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^\.+/, "").slice(0, 120);
  return safe || "screenshot";
}

function normalizePathname(pathname: string) {
  if (!pathname) return "/";
  const normalized = pathname.replace(/\/+$/g, "");
  return normalized.length > 0 ? normalized : "/";
}

function isSameNavigationTarget(currentUrl: string, nextUrl: string) {
  if (!currentUrl) return false;
  try {
    const current = new URL(currentUrl);
    const next = new URL(nextUrl);
    return (
      current.origin === next.origin &&
      normalizePathname(current.pathname) === normalizePathname(next.pathname) &&
      current.search === next.search &&
      current.hash === next.hash
    );
  } catch {
    return currentUrl === nextUrl;
  }
}

async function ensureCursorOverlay(page: Page, runtime: RuntimePacingDefaults) {
  if (!runtime.renderCursorOverlay) return;
  const cursorExists = await page.evaluate(cursorExistsScript);
  if (cursorExists) return;
  const cursorAsset = resolveCursorOverlayAsset(runtime.cursorTheme);
  await page.evaluate(cursorOverlaySetupScript(runtime.clickPulseMs, runtime.cursorTheme, cursorAsset));
}

function distanceBetweenPoints(start: Point, end: Point) {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function resolveCursorTravelDuration(baseMs: number, start: Point | null, end: Point) {
  if (baseMs <= 0) return 0;
  if (!start) {
    return Math.max(120, Math.round(baseMs * 0.7));
  }

  const distanceMs = distanceBetweenPoints(start, end) * 1.1;
  const blended = baseMs * 0.45 + distanceMs * 0.55;
  const minMs = Math.max(110, Math.round(baseMs * 0.35));
  const maxMs = Math.min(maxDelayMs, Math.max(850, Math.round(baseMs * 2.2)));
  return Math.max(minMs, Math.min(maxMs, Math.round(blended)));
}

async function getCursorPosition(page: Page, runtime: RuntimePacingDefaults): Promise<Point | null> {
  if (!runtime.renderCursorOverlay) return null;
  await ensureCursorOverlay(page, runtime);
  return page.evaluate(cursorPositionScript) as Promise<Point | null>;
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
    return;
  }
  if (durationMs > 0) {
    await wait(durationMs);
  }
}

async function clickPulse(page: Page, runtime: RuntimePacingDefaults, pulseMs: number) {
  if (!runtime.renderCursorOverlay) return;
  await ensureCursorOverlay(page, runtime);
  await page.evaluate(cursorClickPulseScript(pulseMs));
}

async function applyPreStepPacing(
  page: Page,
  step: FlowStep,
  timeout: number,
  context: StepExecutionContext,
  runtime: RuntimePacingDefaults
) {
  const preDelay = resolvePacedDelay(step.preDelayMs ?? runtime.stepPreDelayMs, context, runtime, "pre");
  if (preDelay > 0) {
    await wait(preDelay);
  }

  const shouldMoveCursor = ["click", "type"].includes(step.action) && Boolean(step.target);
  if (!shouldMoveCursor || !step.target) return;

  await scrollTargetIntoView(page, step.target, timeout, runtime, context);

  const center = await getTargetCenter(page, step.target);
  if (!center) return;

  const baseMoveMs = resolvePacedDelay(step.mouseMoveMs ?? runtime.cursorMoveMs, context, runtime, "move");
  const currentCursorPosition = await getCursorPosition(page, runtime);
  const moveMs = resolveCursorTravelDuration(baseMoveMs, currentCursorPosition, center);
  if (moveMs > 0) {
    await moveCursor(page, center, moveMs, runtime);
  }

  const highlightMs = resolvePacedDelay(step.highlightMs ?? runtime.cursorHighlightMs, context, runtime, "highlight");
  if (highlightMs > 0) {
    await wait(highlightMs);
  }
}

async function applyPostStepPacing(
  step: FlowStep,
  context: StepExecutionContext,
  runtime: RuntimePacingDefaults
) {
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
  await applyPreStepPacing(page, step, timeout, context, runtime);

  if (step.action === "goto") {
    const target = step.value ?? "/";
    const isAbsolute = /^https?:\/\//.test(target);
    const destinationUrl = isAbsolute ? target : new URL(target, baseUrl).toString();
    if (!isSameNavigationTarget(page.url(), destinationUrl)) {
      await page.goto(destinationUrl, { timeout });
    }
    await applyPostStepPacing(step, context, runtime);
    return;
  }

  if (step.action === "click") {
    if (!step.target) throw new Error(`Step ${step.id} missing target`);
    await scrollTargetIntoView(page, step.target, timeout, runtime, context);
    await page.locator(step.target).first().click({ timeout });
    const pulseMs = resolvePacedDelay(runtime.clickPulseMs, context, runtime, "click", false);
    await clickPulse(page, runtime, pulseMs);
    await applyPostStepPacing(step, context, runtime);
    return;
  }

  if (step.action === "type") {
    if (!step.target) throw new Error(`Step ${step.id} missing target`);
    await scrollTargetIntoView(page, step.target, timeout, runtime, context);
    const locator = page.locator(step.target).first();
    if (runtime.realisticTyping) {
      await locator.click({ timeout });
      const pulseMs = resolvePacedDelay(runtime.clickPulseMs, context, runtime, "click", false);
      await clickPulse(page, runtime, pulseMs);
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
      await scrollTargetIntoView(page, step.target, timeout, runtime, context);
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
    await scrollTargetIntoView(page, step.target, timeout, runtime, context);
    await assertVisible(page, step.target, timeout);
    await applyPostStepPacing(step, context, runtime);
    return;
  }

  if (step.action === "screenshot") {
    const name = sanitizeScreenshotName(step.value ?? step.id);
    const screenshotPath = path.join(runDir, "screenshots", `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: runtime.fullPageScreenshots });
    await applyPostStepPacing(step, context, runtime);
    return;
  }

  if (["recorder_start", "recorder_stop", "recorder_export"].includes(step.action)) {
    await applyPostStepPacing(step, context, runtime);
    return;
  }

  throw new Error(`Unsupported action: ${step.action}`);
}
