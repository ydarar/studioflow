#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");

async function main() {
  const ref = process.env.GITHUB_REF?.trim() ?? "";
  if (!ref.startsWith("refs/tags/v")) {
    console.log("Release tag verification skipped: not running on a v* tag ref.");
    return;
  }

  const packageJsonPath = path.join(packageRoot, "package.json");
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  const expectedRef = `refs/tags/v${packageJson.version}`;

  if (ref !== expectedRef) {
    throw new Error(
      `Release tag ${ref} does not match CLI version ${packageJson.version}. Expected ${expectedRef}.`
    );
  }

  console.log(`Release tag matches CLI version: ${ref}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
