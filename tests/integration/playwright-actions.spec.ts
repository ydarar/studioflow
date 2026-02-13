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

  beforeEach(async () => {
    process.env.STUDIOFLOW_HEADLESS = "true";
    const session = await startBrowser("http://localhost:4173");
    browser = session.browser;
    page = session.page;
    runDir = await fs.mkdtemp(path.join(os.tmpdir(), "studioflow-actions-"));
    await fs.mkdir(path.join(runDir, "screenshots"), { recursive: true });
  });

  afterEach(async () => {
    await browser.close();
    process.env.STUDIOFLOW_HEADLESS = originalHeadless;
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
