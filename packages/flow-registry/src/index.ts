import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  flowDefinitionSchema,
  type FlowDefinition
} from "@studioflow/contracts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const builtInFlowsDir = path.join(rootDir, "flows");

function dataRoot() {
  const configured = process.env.STUDIOFLOW_DATA_DIR ?? process.env.STUDIOFLOW_HOME;
  if (configured && configured.trim()) {
    return path.resolve(configured);
  }
  return path.join(os.homedir(), ".studioflow");
}

function userFlowsDir() {
  return path.join(dataRoot(), "flows");
}

async function listFlowFiles(dir: string) {
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => [".yaml", ".yml", ".json"].includes(path.extname(f).toLowerCase()));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw error;
  }
}

function parseFlow(raw: string, ext: string): FlowDefinition {
  const parsed = ext === ".json" ? JSON.parse(raw) : YAML.parse(raw);
  return flowDefinitionSchema.parse(parsed);
}

export async function loadFlowFromFile(filePath: string): Promise<FlowDefinition> {
  const ext = path.extname(filePath).toLowerCase();
  if (![".yaml", ".yml", ".json"].includes(ext)) {
    throw new Error(`Unsupported flow file format: ${filePath}`);
  }
  const raw = await fs.readFile(filePath, "utf8");
  return parseFlow(raw, ext);
}

export async function loadFlows(): Promise<FlowDefinition[]> {
  const merged = new Map<string, FlowDefinition>();
  const dirs = [builtInFlowsDir, userFlowsDir()];

  for (const dir of dirs) {
    const files = await listFlowFiles(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const flow = await loadFlowFromFile(fullPath);
      merged.set(flow.id, flow);
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.id.localeCompare(b.id));
}

export async function getFlowById(id: string): Promise<FlowDefinition> {
  const flows = await loadFlows();
  const flow = flows.find((f) => f.id === id);
  if (!flow) {
    throw new Error(`Flow not found: ${id}`);
  }
  return flow;
}
