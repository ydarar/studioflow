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
  fullscreen?: boolean;
}

const defaultViewport = { width: 1440, height: 960 };

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return undefined;
}

export interface ResolvedBrowserLaunch {
  headless: boolean;
  launchArgs: string[] | undefined;
  viewport: { width: number; height: number } | null;
}

export function resolveBrowserLaunch(opts: StartBrowserOptions = {}, env: NodeJS.ProcessEnv = process.env): ResolvedBrowserLaunch {
  const headless = opts.headless ?? parseBooleanEnv(env.STUDIOFLOW_HEADLESS) ?? false;
  const fullscreen = opts.fullscreen ?? parseBooleanEnv(env.STUDIOFLOW_BROWSER_FULLSCREEN) ?? !headless;
  const useFullscreen = !headless && fullscreen;
  return {
    headless,
    launchArgs: useFullscreen ? ["--start-maximized"] : undefined,
    viewport: useFullscreen ? null : defaultViewport
  };
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
  const resolved = resolveBrowserLaunch(opts);

  const browser = await chromium.launch({
    headless: resolved.headless,
    ...(resolved.launchArgs ? { args: resolved.launchArgs } : {})
  });
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: resolved.viewport
  });
  const page = await context.newPage();
  return { browser, page };
}
