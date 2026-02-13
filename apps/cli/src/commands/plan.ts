import fs from "node:fs/promises";
import path from "node:path";
import { resolveFromWorkspace } from "./path-utils.js";
import kleur from "kleur";
import {
  flowDefinitionSchema,
  flowPacingMetadataSchema,
  pacingDirectivesSchema,
  pacingEmphasisDirectiveSchema,
  planReportSchema,
  structureReportSchema,
  type FlowPacingMetadata,
  type FlowDefinition,
  type FlowStep,
  type PacingDirectives,
  type PacingProfile,
  type PlanReport,
  type StructureReport
} from "@demopilot/contracts";
import { getFlowById, loadFlows } from "@demopilot/flow-registry";
import { routeIntent } from "@demopilot/planner";

interface LlmPlanArtifact {
  selectedFlowId?: string;
  generatedFlow?: FlowDefinition;
  confidence?: number;
  rationale?: string;
  needsClarification?: boolean;
  clarifyingQuestion?: string;
  pacingDirectives?: PacingDirectives;
}

const profileDelays: Record<
  PacingProfile,
  {
    pre: number;
    post: number;
    dwell: number;
    move: number;
    highlight: number;
    typingDelay: number;
    gotoPostBoost: number;
    firstClickPreBoost: number;
    screenshotDwellBoost: number;
    checkpointDwellBoost: number;
  }
> = {
  fast: {
    pre: 120,
    post: 220,
    dwell: 0,
    move: 180,
    highlight: 60,
    typingDelay: 20,
    gotoPostBoost: 300,
    firstClickPreBoost: 80,
    screenshotDwellBoost: 180,
    checkpointDwellBoost: 250
  },
  standard: {
    pre: 220,
    post: 420,
    dwell: 80,
    move: 320,
    highlight: 120,
    typingDelay: 35,
    gotoPostBoost: 450,
    firstClickPreBoost: 140,
    screenshotDwellBoost: 300,
    checkpointDwellBoost: 420
  },
  cinematic: {
    pre: 320,
    post: 700,
    dwell: 180,
    move: 460,
    highlight: 180,
    typingDelay: 55,
    gotoPostBoost: 650,
    firstClickPreBoost: 220,
    screenshotDwellBoost: 460,
    checkpointDwellBoost: 620
  }
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampDelayMs(value: number) {
  if (value <= 0) return 0;
  return Math.round(clamp(value, 50, 3000));
}

function parseLlmPlanArtifact(input: unknown): LlmPlanArtifact {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid llm-plan artifact: expected object.");
  }

  const payload = input as Record<string, unknown>;
  const confidence =
    typeof payload.confidence === "number" && payload.confidence >= 0 && payload.confidence <= 1
      ? payload.confidence
      : undefined;

  const parsedPacingDirectives = pacingDirectivesSchema.partial().safeParse(payload.pacingDirectives);
  const shorthandPacingDirectives = pacingDirectivesSchema
    .partial()
    .safeParse({
      profile: payload.pacingProfile,
      targetDurationSec: payload.targetDurationSec,
      emphasis: payload.emphasis,
      strictPacing: payload.strictPacing
    });

  const pacingDirectives =
    parsedPacingDirectives.success && parsedPacingDirectives.data
      ? parsedPacingDirectives.data
      : shorthandPacingDirectives.success
        ? shorthandPacingDirectives.data
        : undefined;

  return {
    selectedFlowId: typeof payload.selectedFlowId === "string" ? payload.selectedFlowId : undefined,
    generatedFlow: payload.generatedFlow ? flowDefinitionSchema.parse(payload.generatedFlow) : undefined,
    confidence,
    rationale: typeof payload.rationale === "string" ? payload.rationale : undefined,
    needsClarification: typeof payload.needsClarification === "boolean" ? payload.needsClarification : undefined,
    clarifyingQuestion: typeof payload.clarifyingQuestion === "string" ? payload.clarifyingQuestion : undefined,
    pacingDirectives
  };
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreFlow(intent: string, flow: FlowDefinition) {
  const intentTokens = new Set(tokenize(intent));
  const flowTokens = new Set(tokenize(`${flow.id} ${flow.description} ${flow.tags.join(" ")}`));
  let score = 0;
  for (const token of flowTokens) {
    if (intentTokens.has(token)) score += 1;
  }
  return score;
}

function estimateActionMs(step: FlowStep, profile: PacingProfile) {
  if (step.action === "goto") return 800;
  if (step.action === "click") return 300;
  if (step.action === "type") {
    const chars = step.value?.length ?? 0;
    return 250 + chars * profileDelays[profile].typingDelay;
  }
  if (step.action === "wait_for") return 450;
  if (step.action === "assert_text" || step.action === "assert_visible") return 250;
  if (step.action === "screenshot") return 350;
  return 0;
}

function estimateFlowDurationSeconds(flow: FlowDefinition, profile: PacingProfile) {
  const totalMs = flow.steps.reduce((sum, step) => {
    const pre = step.preDelayMs ?? 0;
    const post = step.postDelayMs ?? 0;
    const dwell = step.dwellMs ?? 0;
    const move = step.mouseMoveMs ?? 0;
    const highlight = step.highlightMs ?? 0;
    return sum + pre + post + dwell + move + highlight + estimateActionMs(step, profile);
  }, 0);
  return Number((totalMs / 1000).toFixed(2));
}

function matchesEmphasis(flow: FlowDefinition, step: FlowStep, emphasis: NonNullable<PacingDirectives["emphasis"]>[number]) {
  if (emphasis.scope === "flowId") return flow.id === emphasis.value;
  if (emphasis.scope === "tag") return flow.tags.includes(emphasis.value);
  if (emphasis.scope === "stepId") return step.id === emphasis.value;
  if (emphasis.scope === "action") return step.action === emphasis.value;
  if (emphasis.scope === "route") {
    if (step.action !== "goto") return false;
    const route = step.value?.split("?")[0] ?? "";
    return route === emphasis.value || route.startsWith(emphasis.value);
  }
  return false;
}

function actionBasePacing(step: FlowStep, profile: PacingProfile) {
  const base = profileDelays[profile];

  if (step.action === "goto") {
    return { preDelayMs: base.pre * 0.8, postDelayMs: base.post * 1.35, dwellMs: base.dwell * 0.5 };
  }

  if (step.action === "click") {
    return {
      preDelayMs: base.pre,
      postDelayMs: base.post,
      dwellMs: base.dwell,
      mouseMoveMs: base.move,
      highlightMs: base.highlight
    };
  }

  if (step.action === "type") {
    return {
      preDelayMs: base.pre * 1.05,
      postDelayMs: base.post * 1.1,
      dwellMs: base.dwell + 50,
      mouseMoveMs: base.move,
      highlightMs: base.highlight
    };
  }

  if (step.action === "wait_for") {
    return { preDelayMs: base.pre * 0.9, postDelayMs: base.post * 0.9, dwellMs: base.dwell };
  }

  if (step.action === "assert_text" || step.action === "assert_visible") {
    return { preDelayMs: base.pre * 0.85, postDelayMs: base.post * 0.8, dwellMs: base.dwell };
  }

  if (step.action === "screenshot") {
    return { preDelayMs: base.pre * 1.1, postDelayMs: base.post * 1.15, dwellMs: base.dwell + 200 };
  }

  return { preDelayMs: base.pre, postDelayMs: base.post, dwellMs: base.dwell };
}

async function loadEmphasisFromFile(emphasisPath?: string) {
  if (!emphasisPath) return undefined;
  const resolved = resolveFromWorkspace(emphasisPath);
  const raw = await fs.readFile(resolved, "utf8");
  const parsed = JSON.parse(raw);

  const parseEmphasisArray = (input: unknown) => {
    if (!Array.isArray(input)) {
      throw new Error("Expected emphasis directives to be an array.");
    }
    return input.map((item) => pacingEmphasisDirectiveSchema.parse(item));
  };

  if (Array.isArray(parsed)) {
    return parseEmphasisArray(parsed);
  }
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { emphasis?: unknown }).emphasis)) {
    return parseEmphasisArray((parsed as { emphasis: unknown }).emphasis);
  }
  throw new Error("Invalid emphasis file. Expected an array of emphasis directives or an object with an emphasis array.");
}

async function resolvePacingDirectives(opts: {
  llmArtifact: LlmPlanArtifact | null;
  pacingProfile?: PacingProfile;
  targetDurationSec?: number;
  emphasisPath?: string;
  strictPacing?: boolean;
}): Promise<PacingDirectives> {
  const fromLlm = opts.llmArtifact?.pacingDirectives ?? {};
  const fileEmphasis = await loadEmphasisFromFile(opts.emphasisPath);

  const merged = {
    profile: opts.pacingProfile ?? fromLlm.profile ?? "standard",
    targetDurationSec: opts.targetDurationSec ?? fromLlm.targetDurationSec,
    emphasis: fileEmphasis ?? fromLlm.emphasis ?? [],
    strictPacing: opts.strictPacing ?? fromLlm.strictPacing ?? false
  } satisfies PacingDirectives;

  return pacingDirectivesSchema.parse(merged);
}

function applyEmphasisWeight(baseValue: number, weight: number) {
  if (baseValue <= 0) return 0;
  return baseValue * clamp(weight, 0.5, 2);
}

function compilePacing(flow: FlowDefinition, directives: PacingDirectives): FlowDefinition {
  const profile = directives.profile ?? "standard";
  const base = profileDelays[profile];
  const firstClickStepId = flow.steps.find((step) => step.action === "click")?.id;
  const emphasis = directives.emphasis ?? [];

  const pacedSteps = flow.steps.map((step) => {
    const basePacing = actionBasePacing(step, profile);
    let preDelay = step.preDelayMs ?? basePacing.preDelayMs ?? base.pre;
    let postDelay = step.postDelayMs ?? basePacing.postDelayMs ?? base.post;
    let dwellDelay = step.dwellMs ?? basePacing.dwellMs ?? base.dwell;
    let mouseMove = step.mouseMoveMs ?? basePacing.mouseMoveMs ?? (step.action === "click" || step.action === "type" ? base.move : 0);
    let highlight = step.highlightMs ?? basePacing.highlightMs ?? (step.action === "click" || step.action === "type" ? base.highlight : 0);

    if (step.action === "goto") {
      postDelay += base.gotoPostBoost;
    }
    if (firstClickStepId && step.id === firstClickStepId) {
      preDelay += base.firstClickPreBoost;
    }
    if (step.action === "screenshot") {
      dwellDelay += base.screenshotDwellBoost;
    }
    if (step.narrativeCheckpoint) {
      dwellDelay += base.checkpointDwellBoost;
    }

    const matched = emphasis.filter((directive) => matchesEmphasis(flow, step, directive));
    if (matched.length > 0) {
      const combinedWeight = clamp(
        matched.reduce((weight, directive) => weight * directive.weight, 1),
        0.5,
        2
      );
      preDelay = applyEmphasisWeight(preDelay, combinedWeight);
      postDelay = applyEmphasisWeight(postDelay, combinedWeight);
      dwellDelay = applyEmphasisWeight(dwellDelay, combinedWeight);
      mouseMove = applyEmphasisWeight(mouseMove, combinedWeight);
      highlight = applyEmphasisWeight(highlight, combinedWeight);
    }

    return {
      ...step,
      preDelayMs: clampDelayMs(preDelay),
      postDelayMs: clampDelayMs(postDelay),
      dwellMs: clampDelayMs(dwellDelay),
      mouseMoveMs: clampDelayMs(mouseMove),
      highlightMs: clampDelayMs(highlight)
    } satisfies FlowStep;
  });

  const predictedDurationSec = estimateFlowDurationSeconds({ ...flow, steps: pacedSteps }, profile);
  const rawMultiplier =
    directives.targetDurationSec && predictedDurationSec > 0 ? directives.targetDurationSec / predictedDurationSec : 1;
  const durationMultiplier = Number(clamp(rawMultiplier, 0.75, 1.6).toFixed(3));

  const pacing = flowPacingMetadataSchema.parse({
    profile,
    targetDurationSec: directives.targetDurationSec,
    predictedDurationSec,
    durationMultiplier,
    strictPacing: directives.strictPacing,
    emphasis: directives.emphasis
  } satisfies FlowPacingMetadata);

  return {
    ...flow,
    pacing,
    steps: pacedSteps
  };
}

function generateFallbackFlow(intent: string, report: StructureReport): FlowDefinition {
  const firstRoute = report.routes[0]?.route ?? "/";
  return {
    id: `generated-${Date.now()}`,
    description: `Generated flow for intent: ${intent}`,
    tags: ["generated", "skill-driven"],
    preconditions: ["Verify app is running before execution"],
    steps: [
      {
        id: "goto-initial",
        action: "goto",
        value: firstRoute,
        preDelayMs: 300,
        postDelayMs: 700,
        narrativeCheckpoint: "landed on initial screen"
      },
      {
        id: "assert-page-shell",
        action: "assert_visible",
        target: "body",
        postDelayMs: 500
      },
      {
        id: "capture-screen",
        action: "screenshot",
        value: "generated-capture",
        postDelayMs: 400
      }
    ]
  };
}

export async function planCommand(opts: {
  intent: string;
  reportPath: string;
  outPath: string;
  llmPlanPath?: string;
  planReportOut?: string;
  pacingProfile?: PacingProfile;
  targetDurationSec?: number;
  emphasisPath?: string;
  strictPacing?: boolean;
}) {
  const reportPath = resolveFromWorkspace(opts.reportPath);
  const reportRaw = await fs.readFile(reportPath, "utf8");
  const report = structureReportSchema.parse(JSON.parse(reportRaw));

  const allFlows = await loadFlows();
  const deterministicMapping = await routeIntent(
    opts.intent,
    allFlows.map((flow) => flow.id)
  );
  const scoredFlows = allFlows
    .map((flow) => ({ flow, score: scoreFlow(opts.intent, flow) }))
    .sort((a, b) => b.score - a.score);

  const llmPath = opts.llmPlanPath ?? process.env.DEMOPILOT_PLAN_ARTIFACT;
  let llmArtifact: LlmPlanArtifact | null = null;

  if (llmPath) {
    const resolvedLlmPath = resolveFromWorkspace(llmPath);
    const llmRaw = await fs.readFile(resolvedLlmPath, "utf8");
    llmArtifact = parseLlmPlanArtifact(JSON.parse(llmRaw));
  }

  let selectedRaw: FlowDefinition | null = null;
  let source: PlanReport["source"] = "heuristic";
  let confidence = 0.6;
  let rationale = "Heuristic token scoring over registered flows.";
  let selectedFlowId: string | undefined;
  let generatedFlowId: string | undefined;
  let needsClarification = false;
  let clarifyingQuestion: string | undefined;

  if (llmArtifact?.selectedFlowId && allFlows.some((flow) => flow.id === llmArtifact.selectedFlowId)) {
    selectedRaw = await getFlowById(llmArtifact.selectedFlowId);
    source = "llm-artifact";
    confidence = llmArtifact.confidence ?? 0.86;
    rationale = llmArtifact.rationale ?? `LLM selected existing flow ${llmArtifact.selectedFlowId}.`;
    selectedFlowId = llmArtifact.selectedFlowId;
    needsClarification = llmArtifact.needsClarification ?? false;
    clarifyingQuestion = llmArtifact.clarifyingQuestion;
  } else if (llmArtifact?.generatedFlow) {
    selectedRaw = flowDefinitionSchema.parse(llmArtifact.generatedFlow);
    source = "llm-artifact";
    confidence = llmArtifact.confidence ?? 0.74;
    rationale = llmArtifact.rationale ?? "LLM supplied a generated flow artifact.";
    generatedFlowId = selectedRaw.id;
    needsClarification = llmArtifact.needsClarification ?? false;
    clarifyingQuestion = llmArtifact.clarifyingQuestion;
  } else if (deterministicMapping.confidence >= 0.9 && deterministicMapping.selectedFlowIds.length > 0) {
    const mappedFlowId = deterministicMapping.selectedFlowIds[0];
    selectedRaw = await getFlowById(mappedFlowId);
    confidence = deterministicMapping.confidence;
    rationale = `Deterministic routeIntent selection: ${deterministicMapping.rationale}`;
    selectedFlowId = mappedFlowId;
  } else if (scoredFlows[0] && scoredFlows[0].score > 0) {
    selectedRaw = await getFlowById(scoredFlows[0].flow.id);
    confidence = Math.min(0.95, 0.55 + scoredFlows[0].score * 0.1);
    rationale = `Top heuristic match: ${scoredFlows[0].flow.id} (${scoredFlows[0].score} matched tokens).`;
    selectedFlowId = scoredFlows[0].flow.id;
  } else {
    selectedRaw = generateFallbackFlow(opts.intent, report);
    confidence = 0.42;
    rationale = "No existing flow scored above zero; generated fallback flow.";
    generatedFlowId = selectedRaw.id;
    needsClarification = true;
    clarifyingQuestion = "Should the flow start from home, onboarding, or billing?";
  }

  const directives = await resolvePacingDirectives({
    llmArtifact,
    pacingProfile: opts.pacingProfile,
    targetDurationSec: opts.targetDurationSec,
    emphasisPath: opts.emphasisPath,
    strictPacing: opts.strictPacing
  });
  if (!selectedRaw) {
    throw new Error("Failed to resolve a flow for planning.");
  }
  const selected = compilePacing(selectedRaw, directives);
  const validated = flowDefinitionSchema.parse(selected);
  const outputPath = resolveFromWorkspace(opts.outPath);
  const planReportPath = resolveFromWorkspace(opts.planReportOut ?? process.env.DEMOPILOT_PLAN_REPORT_OUT ?? "artifacts/plan-report.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.mkdir(path.dirname(planReportPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(validated, null, 2), "utf8");

  const planReport = planReportSchema.parse({
    generatedAt: new Date().toISOString(),
    intent: opts.intent,
    confidence,
    rationale,
    source,
    selectedFlowId,
    generatedFlowId,
    pacing: validated.pacing,
    needsClarification,
    clarifyingQuestion
  } satisfies PlanReport);

  await fs.writeFile(planReportPath, JSON.stringify(planReport, null, 2), "utf8");

  console.log(kleur.green("Flow planning complete."));
  console.log(`- Report: ${reportPath}`);
  console.log(`- Output flow: ${outputPath}`);
  console.log(`- Plan report: ${planReportPath}`);
  console.log(`- Flow ID: ${validated.id}`);
  if (planReport.needsClarification) {
    console.log(kleur.yellow(`- Clarification suggested: ${planReport.clarifyingQuestion ?? "Please refine the intent."}`));
  }
}
