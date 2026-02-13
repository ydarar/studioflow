import fs from "node:fs/promises";
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
} from "@demopilot/contracts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const flowsDir = path.join(rootDir, "flows");
const candidatesDir = path.join(rootDir, "learned", "candidates");
const promotionsDir = path.join(rootDir, "learned", "promotions");

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
  const files = (await fs.readdir(flowsDir)).filter((f) => [".yaml", ".yml", ".json"].includes(path.extname(f)));
  const flows: FlowDefinition[] = [];

  for (const file of files) {
    const fullPath = path.join(flowsDir, file);
    const flow = await loadFlowFromFile(fullPath);
    flows.push(flow);
  }

  return flows.sort((a, b) => a.id.localeCompare(b.id));
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
  await fs.mkdir(candidatesDir, { recursive: true });
  const filename = `${Date.now()}-${name}.json`;
  const filePath = path.join(candidatesDir, filename);
  await fs.writeFile(filePath, JSON.stringify(parsed, null, 2), "utf8");
  return filePath;
}

export async function loadCandidateFromFile(filePath: string): Promise<LearningCandidate> {
  const raw = await fs.readFile(filePath, "utf8");
  return learningCandidateSchema.parse(JSON.parse(raw));
}

export async function loadCandidates(): Promise<Array<{ file: string; candidate: LearningCandidate }>> {
  await fs.mkdir(candidatesDir, { recursive: true });
  const files = await fs.readdir(candidatesDir);
  const loaded: Array<{ file: string; candidate: LearningCandidate }> = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const fullPath = path.join(candidatesDir, file);
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
  await fs.mkdir(flowsDir, { recursive: true });
  const filePath = path.join(flowsDir, `${validated.id}.yaml`);
  await fs.writeFile(filePath, YAML.stringify(validated), "utf8");
  return filePath;
}

export async function writePromotionRecord(record: PromotionRecord) {
  const validated = promotionRecordSchema.parse(record);
  await fs.mkdir(promotionsDir, { recursive: true });
  const filePath = path.join(promotionsDir, `${Date.now()}-${validated.candidateId}.json`);
  await fs.writeFile(filePath, JSON.stringify(validated, null, 2), "utf8");
  return filePath;
}
