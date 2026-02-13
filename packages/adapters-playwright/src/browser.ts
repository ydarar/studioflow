import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium, type Browser, type Page } from "playwright";

export interface BrowserSession {
  browser: Browser;
  page: Page;
}

export interface ChromiumInstallStatus {
  installed: boolean;
  executablePath: string;
  installedNow: boolean;
}

export interface StartBrowserOptions {
  headless?: boolean;
}

async function runPlaywrightCli(args: string[]) {
  const require = createRequire(import.meta.url);
  const cliPath = require.resolve("playwright/cli");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      stdio: "inherit",
      env: process.env
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Playwright CLI exited with code ${code ?? "unknown"}.`));
    });
  });
}

export async function getChromiumInstallStatus(): Promise<ChromiumInstallStatus> {
  const executablePath = chromium.executablePath();
  try {
    await fs.access(executablePath);
    return { installed: true, executablePath, installedNow: false };
  } catch {
    return { installed: false, executablePath, installedNow: false };
  }
}

export async function ensureChromiumInstalled(opts: { autoInstall?: boolean } = {}): Promise<ChromiumInstallStatus> {
  const status = await getChromiumInstallStatus();
  if (status.installed || !opts.autoInstall) {
    return status;
  }

  await runPlaywrightCli(["install", "chromium"]);
  const postInstall = await getChromiumInstallStatus();
  return { ...postInstall, installedNow: postInstall.installed };
}

export async function startBrowser(baseUrl: string, opts: StartBrowserOptions = {}): Promise<BrowserSession> {
  const headless = opts.headless ?? (process.env.STUDIOFLOW_HEADLESS ?? "false") === "true";
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  return { browser, page };
}
