import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["tests/**/*.spec.ts"],
    environment: "node",
    globals: true
  },
  resolve: {
    alias: [
      {
        find: /^@demopilot\/(.+)$/,
        replacement: path.resolve(__dirname, "packages/$1/src/index.ts")
      }
    ],
    conditions: ["source", "node", "import", "default"]
  }
});
