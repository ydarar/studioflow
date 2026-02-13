import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  flowDefinitionSchema,
  learningCandidateSchema,
  promotionRecordSchema,
  type FlowDefinition,
  type LearningCandidate,
  type PromotionRecord
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

function candidatesDir() {
  return path.join(dataRoot(), "learned", "candidates");
}

function promotionsDir() {
  return path.join(dataRoot(), "learned", "promotions");
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

export async function writeCandidate(name: string, payload: unknown) {
  const parsed = learningCandidateSchema.parse(payload);
  const outputDir = candidatesDir();
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `${Date.now()}-${name}.json`;
  const filePath = path.join(outputDir, filename);
  await fs.writeFile(filePath, JSON.stringify(parsed, null, 2), "utf8");
  return filePath;
}

export async function loadCandidateFromFile(filePath: string): Promise<LearningCandidate> {
  const raw = await fs.readFile(filePath, "utf8");
  return learningCandidateSchema.parse(JSON.parse(raw));
}

export async function loadCandidates(): Promise<Array<{ file: string; candidate: LearningCandidate }>> {
  const outputDir = candidatesDir();
  await fs.mkdir(outputDir, { recursive: true });
  const files = await fs.readdir(outputDir);
  const loaded: Array<{ file: string; candidate: LearningCandidate }> = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const fullPath = path.join(outputDir, file);
    const candidate = await loadCandidateFromFile(fullPath);
    loaded.push({ file: fullPath, candidate });
  }

  return loaded.sort((a, b) => a.file.localeCompare(b.file));
}

export async function getCandidateById(candidateId: string): Promise<{ file: string; candidate: LearningCandidate }> {
  const loaded = await loadCandidates();
  const match = loaded.find((entry) => entry.candidate.candidateId === candidateId);
  if (!match) {
    throw new Error(`Candidate not found: ${candidateId}`);
  }
  return match;
}

export async function writePromotedFlow(flow: FlowDefinition) {
  const validated = flowDefinitionSchema.parse(flow);
  const outputDir = userFlowsDir();
  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${validated.id}.yaml`);
  await fs.writeFile(filePath, YAML.stringify(validated), "utf8");
  return filePath;
}

export async function writePromotionRecord(record: PromotionRecord) {
  const validated = promotionRecordSchema.parse(record);
  const outputDir = promotionsDir();
  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${Date.now()}-${validated.candidateId}.json`);
  await fs.writeFile(filePath, JSON.stringify(validated, null, 2), "utf8");
  return filePath;
}
