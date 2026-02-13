import type { Page } from "playwright";

export async function assertText(page: Page, text: string, timeoutMs = 5000) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: timeoutMs });
}

export async function assertVisible(page: Page, selector: string, timeoutMs = 5000) {
  await page.locator(selector).first().waitFor({ state: "visible", timeout: timeoutMs });
}
