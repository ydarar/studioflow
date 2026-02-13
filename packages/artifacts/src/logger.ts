import fs from "node:fs/promises";

export async function appendJsonLine(filePath: string, payload: unknown) {
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}
