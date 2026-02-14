import fs from "node:fs/promises";
import path from "node:path";
import kleur from "kleur";
import { loadFlows } from "@studioflow/flow-registry";
import { structureReportSchema, navigationGraphSchema, type NavigationGraph, type StructureReport } from "@studioflow/contracts";
import { resolveFromWorkspace, workspaceRoot } from "./path-utils.js";

async function walk(dir: string, acc: string[] = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (["node_modules", ".next", ".git", "dist", ".runs"].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, acc);
    } else {
      acc.push(fullPath);
    }
  }
  return acc;
}

function routeFromAppFile(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, "/");
  const idx = normalized.indexOf("/app/");
  if (idx === -1 || !normalized.endsWith("/page.tsx")) return null;
  const routePart = normalized.slice(idx + 5, normalized.length - "/page.tsx".length);
  if (!routePart) return "/";
  return `/${routePart}`;
}

function normalizeTargetRoute(target: string): string | null {
  if (!target.startsWith("/")) return null;
  const withoutQuery = target.split("?")[0];
  if (!withoutQuery) return null;
  return withoutQuery;
}

function detectProjectType(pkg: Record<string, unknown>, files: string[]): "nextjs" | "vite-react" | "unknown" {
  const deps = {
    ...(typeof pkg.dependencies === "object" && pkg.dependencies ? (pkg.dependencies as Record<string, unknown>) : {}),
    ...(typeof pkg.devDependencies === "object" && pkg.devDependencies
      ? (pkg.devDependencies as Record<string, unknown>)
      : {})
  };

  if (deps.next || files.some((file) => file.includes("/app/") && file.endsWith("/page.tsx"))) {
    return "nextjs";
  }
  if (deps.vite && deps.react) {
    return "vite-react";
  }
  return "unknown";
}

async function detectPackageManager(root: string): Promise<string> {
  const lockfiles = [
    { name: "pnpm", file: "pnpm-lock.yaml" },
    { name: "npm", file: "package-lock.json" },
    { name: "yarn", file: "yarn.lock" }
  ];

  for (const lock of lockfiles) {
    try {
      await fs.access(path.join(root, lock.file));
      return lock.name;
    } catch {
      // Keep checking.
    }
  }

  return "unknown";
}

function deriveStartCommands(pkg: Record<string, unknown>, packageManager: string) {
  const scripts =
    typeof pkg.scripts === "object" && pkg.scripts ? (pkg.scripts as Record<string, unknown>) : ({} as Record<string, unknown>);
  const pmRun = packageManager === "npm" ? "npm run" : packageManager === "yarn" ? "yarn" : "pnpm";
  const commands: string[] = [];

  if (typeof scripts["dev:sample"] === "string") commands.push(`${pmRun} dev:sample`);
  if (typeof scripts.dev === "string") commands.push(`${pmRun} dev`);
  if (typeof scripts.start === "string") commands.push(`${pmRun} start`);

  if (commands.length === 0) {
    commands.push("pnpm dev:sample", "pnpm dev");
  }

  return commands;
}

function inferEdgesFromSource(
  sourceRoute: string,
  sourceFile: string,
  content: string,
  knownRoutes: Set<string>
): NavigationGraph["edges"] {
  const edges: NavigationGraph["edges"] = [];
  const addEdge = (to: string, via: string, confidence: number, evidence: string) => {
    if (!knownRoutes.has(to)) return;
    edges.push({ from: sourceRoute, to, via, confidence, evidence });
  };

  const hrefRegex = /\bhref\s*=\s*["'`]([^"'`]+)["'`]/g;
  for (const match of content.matchAll(hrefRegex)) {
    const raw = match[1];
    const to = normalizeTargetRoute(raw);
    if (!to) continue;
    addEdge(to, `href:${raw}`, 0.95, `${path.basename(sourceFile)} -> href="${raw}"`);
  }

  const routerPushRegex = /router\.push\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
  for (const match of content.matchAll(routerPushRegex)) {
    const raw = match[1];
    const to = normalizeTargetRoute(raw);
    if (!to) continue;
    addEdge(to, `router.push:${raw}`, 0.92, `${path.basename(sourceFile)} -> router.push("${raw}")`);
  }

  const routerPushTemplateRegex = /router\.push\(\s*`([^`]+)`\s*\)/g;
  for (const match of content.matchAll(routerPushTemplateRegex)) {
    const raw = match[1];
    const to = normalizeTargetRoute(raw);
    if (!to) continue;
    addEdge(to, `router.push:${raw}`, 0.88, `${path.basename(sourceFile)} -> router.push(\`${raw}\`)`);
  }

  return edges;
}

export async function discoverCommand(outDir = "artifacts") {
  const root = workspaceRoot();
  const files = await walk(root);
  const pkgPath = path.join(root, "package.json");
  const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
  const packageManager = await detectPackageManager(root);
  const projectType = detectProjectType(pkg, files);

  const frameworkHints = [
    pkg.dependencies?.next || pkg.devDependencies?.next ? "nextjs" : null,
    pkg.dependencies?.react || pkg.devDependencies?.react ? "react" : null,
    files.some((f) => f.endsWith("playwright.config.ts")) ? "playwright" : null
  ].filter(Boolean) as string[];

  const routeFiles = files.filter((f) => f.endsWith("/page.tsx") && f.includes("/app/"));
  const routes = routeFiles
    .map((file) => ({ route: routeFromAppFile(file), file: path.relative(root, file) }))
    .filter((item): item is { route: string; file: string } => Boolean(item.route));

  const componentFiles = files
    .filter((f) => /\/components\/.+\.(tsx|ts|jsx|js)$/.test(f.replace(/\\/g, "/")))
    .map((file) => ({ name: path.basename(file).replace(/\.(tsx|ts|jsx|js)$/, ""), file: path.relative(root, file) }));

  const flows = await loadFlows();

  const structureReport: StructureReport = {
    generatedAt: new Date().toISOString(),
    projectRoot: root,
    packageManager,
    projectType,
    frameworkHints,
    startCommands: [...deriveStartCommands(pkg, packageManager), "pnpm demo -- \"<intent>\""],
    routes,
    components: componentFiles,
    existingFlowIds: flows.map((f) => f.id),
    notes: [
      "Generated by studioflow discover.",
      "Use this report as context for studioflow-investigate routing and studioflow-author artifact generation."
    ]
  };

  const routeSet = new Set(routes.map((route) => route.route));
  const routeFilesWithPaths = routes.map((route) => ({
    route: route.route,
    filePath: path.join(root, route.file),
    file: route.file
  }));

  const inferredEdges: NavigationGraph["edges"] = [];
  for (const routeFile of routeFilesWithPaths) {
    const raw = await fs.readFile(routeFile.filePath, "utf8");
    inferredEdges.push(...inferEdgesFromSource(routeFile.route, routeFile.filePath, raw, routeSet));
  }

  const deduped = Array.from(
    new Map(inferredEdges.map((edge) => [`${edge.from}|${edge.to}|${edge.via}`, edge])).values()
  );

  const graph: NavigationGraph = {
    generatedAt: new Date().toISOString(),
    nodes: routes.map((route) => ({ id: route.route, route: route.route, file: route.file })),
    edges: deduped
  };

  structureReportSchema.parse(structureReport);
  navigationGraphSchema.parse(graph);

  const outputDir = resolveFromWorkspace(outDir);
  await fs.mkdir(outputDir, { recursive: true });

  const structurePath = path.join(outputDir, "structure-report.json");
  const graphPath = path.join(outputDir, "navigation-graph.json");

  await fs.writeFile(structurePath, JSON.stringify(structureReport, null, 2), "utf8");
  await fs.writeFile(graphPath, JSON.stringify(graph, null, 2), "utf8");

  console.log(kleur.green("Discovery complete."));
  console.log(`- Structure report: ${structurePath}`);
  console.log(`- Navigation graph: ${graphPath}`);
}
