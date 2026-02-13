#!/usr/bin/env node
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");

await build({
  entryPoints: [path.join(packageRoot, "src/index.ts")],
  outfile: path.join(packageRoot, "dist/index.js"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  sourcemap: true,
  external: ["playwright", "playwright/*"],
  alias: {
    "@studioflow/contracts": path.join(packageRoot, "../../packages/contracts/src/index.ts"),
    "@studioflow/planner": path.join(packageRoot, "../../packages/planner/src/index.ts"),
    "@studioflow/flow-registry": path.join(packageRoot, "../../packages/flow-registry/src/index.ts"),
    "@studioflow/orchestrator": path.join(packageRoot, "../../packages/orchestrator/src/index.ts"),
    "@studioflow/artifacts": path.join(packageRoot, "../../packages/artifacts/src/index.ts"),
    "@studioflow/adapters-desktop": path.join(packageRoot, "../../packages/adapters-desktop/src/index.ts"),
    "@studioflow/adapters-playwright": path.join(packageRoot, "../../packages/adapters-playwright/src/index.ts"),
    "@studioflow/adapters-screenstudio": path.join(packageRoot, "../../packages/adapters-screenstudio/src/index.ts")
  },
  banner: {
    js: "#!/usr/bin/env node"
  }
});
