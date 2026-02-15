import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeStep, startBrowser } from "@studioflow/adapters-playwright";
import type { FlowStep } from "@studioflow/contracts";

describe.sequential("playwright action execution", () => {
  let browser: Awaited<ReturnType<typeof startBrowser>>["browser"];
  let page: Awaited<ReturnType<typeof startBrowser>>["page"];
  let runDir = "";
  const originalHeadless = process.env.STUDIOFLOW_HEADLESS;
  const originalRenderCursor = process.env.STUDIOFLOW_RENDER_CURSOR;
  const originalCursorTheme = process.env.STUDIOFLOW_CURSOR_THEME;

  beforeEach(async () => {
    process.env.STUDIOFLOW_HEADLESS = "true";
    process.env.STUDIOFLOW_RENDER_CURSOR = "true";
    process.env.STUDIOFLOW_CURSOR_THEME = "macos";
    const session = await startBrowser("http://localhost:4173");
    browser = session.browser;
    page = session.page;
    runDir = await fs.mkdtemp(path.join(os.tmpdir(), "studioflow-actions-"));
    await fs.mkdir(path.join(runDir, "screenshots"), { recursive: true });
  });

  afterEach(async () => {
    await browser.close();
    process.env.STUDIOFLOW_HEADLESS = originalHeadless;
    process.env.STUDIOFLOW_RENDER_CURSOR = originalRenderCursor;
    process.env.STUDIOFLOW_CURSOR_THEME = originalCursorTheme;
    await fs.rm(runDir, { recursive: true, force: true });
  });

  it("executes type/click/wait/assert/screenshot actions on a real page", async () => {
    await page.setContent(`
      <main>
        <input data-testid="name-input" />
        <button data-testid="go-button">Go</button>
        <div data-testid="result" style="display: none"></div>
      </main>
      <script>
        const button = document.querySelector('[data-testid="go-button"]');
        const input = document.querySelector('[data-testid="name-input"]');
        const result = document.querySelector('[data-testid="result"]');
        button.addEventListener('click', () => {
          result.textContent = 'Hello ' + input.value;
          result.style.display = 'block';
        });
      </script>
    `);

    const baseUrl = "http://localhost:4173";

    await executeStep(
      page,
      {
        id: "type-name",
        action: "type",
        target: '[data-testid="name-input"]',
        value: "StudioFlow"
      },
      runDir,
      baseUrl
    );

    expect(await page.locator('[data-testid="name-input"]').inputValue()).toBe("StudioFlow");

    await executeStep(
      page,
      {
        id: "click-go",
        action: "click",
        target: '[data-testid="go-button"]'
      },
      runDir,
      baseUrl
    );

    await executeStep(
      page,
      {
        id: "wait-result",
        action: "wait_for",
        target: '[data-testid="result"]'
      },
      runDir,
      baseUrl
    );

    await executeStep(
      page,
      {
        id: "assert-result-visible",
        action: "assert_visible",
        target: '[data-testid="result"]'
      },
      runDir,
      baseUrl
    );

    await executeStep(
      page,
      {
        id: "assert-result-text",
        action: "assert_text",
        value: "Hello StudioFlow"
      },
      runDir,
      baseUrl
    );

    await executeStep(
      page,
      {
        id: "capture",
        action: "screenshot",
        value: "result-screen"
      },
      runDir,
      baseUrl
    );

    const screenshotPath = path.join(runDir, "screenshots", "result-screen.png");
    await expect(fs.access(screenshotPath)).resolves.toBeUndefined();
  });

  it("executes goto with an absolute URL", async () => {
    const dataUrl = "data:text/html,<html><body><h1>StudioFlow</h1></body></html>";
    await executeStep(
      page,
      {
        id: "goto-abs",
        action: "goto",
        value: dataUrl
      },
      runDir,
      "http://localhost:4173"
    );

    await expect(page.locator("h1").textContent()).resolves.toBe("StudioFlow");
  });

  it("skips reload when goto target already matches current URL", async () => {
    const dataUrl =
      "data:text/html,<html><body><h1>StudioFlow</h1><script>window.__reloadCount=(window.__reloadCount||0)+1;</script></body></html>";
    await executeStep(
      page,
      {
        id: "goto-first",
        action: "goto",
        value: dataUrl
      },
      runDir,
      "http://localhost:4173"
    );

    await page.evaluate(() => {
      (window as any).__reloadCount = 99;
    });

    await executeStep(
      page,
      {
        id: "goto-same",
        action: "goto",
        value: dataUrl
      },
      runDir,
      "http://localhost:4173"
    );

    const reloadCount = await page.evaluate(() => (window as any).__reloadCount);
    expect(reloadCount).toBe(99);
  });

  it("uses the macos cursor overlay theme and waits for cursor movement completion", async () => {
    await page.setContent(`
      <main>
        <button data-testid="left-button" style="margin-left: 30px; margin-top: 24px;">Left</button>
        <button data-testid="right-button" style="margin-left: 520px; margin-top: 120px;">Right</button>
      </main>
    `);

    const baseUrl = "http://localhost:4173";

    await executeStep(
      page,
      {
        id: "first-click",
        action: "click",
        target: '[data-testid="left-button"]',
        preDelayMs: 0,
        postDelayMs: 0,
        dwellMs: 0,
        highlightMs: 0,
        mouseMoveMs: 220
      },
      runDir,
      baseUrl
    );

    const moveStartedAt = Date.now();
    await executeStep(
      page,
      {
        id: "second-click",
        action: "click",
        target: '[data-testid="right-button"]',
        preDelayMs: 0,
        postDelayMs: 0,
        dwellMs: 0,
        highlightMs: 0,
        mouseMoveMs: 220
      },
      runDir,
      baseUrl
    );
    const elapsed = Date.now() - moveStartedAt;
    expect(elapsed).toBeGreaterThanOrEqual(120);

    const cursorDetails = await page.evaluate(() => {
      const cursor = document.getElementById("studioflow-cursor");
      if (!cursor) return null;
      const style = getComputedStyle(cursor);
      return {
        theme: cursor.getAttribute("data-theme"),
        opacity: style.opacity,
        width: style.width,
        height: style.height,
        backgroundImage: style.backgroundImage
      };
    });

    expect(cursorDetails).toBeTruthy();
    expect(cursorDetails?.theme).toBe("macos");
    expect(cursorDetails?.width).not.toBe("0px");
    expect(cursorDetails?.height).not.toBe("0px");
    expect(cursorDetails?.backgroundImage).toContain("data:image/png;base64");
    expect(Number(cursorDetails?.opacity ?? "0")).toBeGreaterThan(0.9);
  });

  it("keeps hover effects aligned with the visible cursor position", async () => {
    await page.setContent(`
      <main>
        <button data-testid="hover-sync-button" style="margin-left: 560px; margin-top: 120px;">Hover</button>
      </main>
      <script>
        window.__hoverSample = null;
        const button = document.querySelector('[data-testid="hover-sync-button"]');
        button.addEventListener('mouseenter', () => {
          const cursor = document.getElementById('studioflow-cursor');
          const cursorRect = cursor ? cursor.getBoundingClientRect() : null;
          const targetRect = button.getBoundingClientRect();
          window.__hoverSample = {
            cursorX: cursorRect ? cursorRect.left + cursorRect.width / 2 : null,
            cursorY: cursorRect ? cursorRect.top + cursorRect.height / 2 : null,
            targetX: targetRect.left + targetRect.width / 2,
            targetY: targetRect.top + targetRect.height / 2
          };
        });
      </script>
    `);

    await executeStep(
      page,
      {
        id: "hover-sync-click",
        action: "click",
        target: '[data-testid="hover-sync-button"]',
        preDelayMs: 0,
        postDelayMs: 0,
        dwellMs: 0,
        highlightMs: 0,
        mouseMoveMs: 260
      },
      runDir,
      "http://localhost:4173"
    );

    const sample = await page.evaluate(() => (window as any).__hoverSample);
    expect(sample).toBeTruthy();
    expect(sample?.cursorX).not.toBeNull();
    expect(sample?.cursorY).not.toBeNull();
    expect(Math.abs((sample?.cursorX ?? 0) - (sample?.targetX ?? 0))).toBeLessThan(85);
    expect(Math.abs((sample?.cursorY ?? 0) - (sample?.targetY ?? 0))).toBeLessThan(85);
  });

  it("supports the generic cursor theme override", async () => {
    process.env.STUDIOFLOW_CURSOR_THEME = "generic";
    await page.setContent('<button data-testid="theme-button">Theme</button>');
    await executeStep(
      page,
      {
        id: "theme-click",
        action: "click",
        target: '[data-testid="theme-button"]',
        preDelayMs: 0,
        postDelayMs: 0,
        dwellMs: 0,
        highlightMs: 0,
        mouseMoveMs: 120
      },
      runDir,
      "http://localhost:4173"
    );

    const genericCursor = await page.evaluate(() => {
      const cursor = document.getElementById("studioflow-cursor");
      if (!cursor) return null;
      const style = getComputedStyle(cursor);
      return {
        theme: cursor.getAttribute("data-theme"),
        backgroundImage: style.backgroundImage
      };
    });

    expect(genericCursor?.theme).toBe("generic");
    expect(genericCursor?.backgroundImage).toContain("data:image/svg+xml");
  });

  it("throws clear errors for invalid step payloads and unsupported actions", async () => {
    await expect(
      executeStep(
        page,
        {
          id: "bad-click",
          action: "click"
        } as FlowStep,
        runDir,
        "http://localhost:4173"
      )
    ).rejects.toThrow("Step bad-click missing target");

    await expect(
      executeStep(
        page,
        {
          id: "unknown",
          action: "recorder_start"
        } as FlowStep,
        runDir,
        "http://localhost:4173"
      )
    ).resolves.toBeUndefined();

    await expect(
      executeStep(
        page,
        {
          id: "bad-action",
          action: "not_real_action"
        } as unknown as FlowStep,
        runDir,
        "http://localhost:4173"
      )
    ).rejects.toThrow("Unsupported action: not_real_action");
  });

  it("sanitizes screenshot filenames to stay inside run artifacts", async () => {
    await page.setContent("<main>safe</main>");

    await executeStep(
      page,
      {
        id: "capture-traversal",
        action: "screenshot",
        value: "../../outside"
      },
      runDir,
      "http://localhost:4173"
    );

    await expect(fs.access(path.join(runDir, "screenshots", "outside.png"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(runDir, "outside.png"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
