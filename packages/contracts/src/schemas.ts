import { z } from "zod";

export const flowActionSchema = z.enum([
  "goto",
  "click",
  "type",
  "wait_for",
  "assert_text",
  "assert_visible",
  "screenshot",
  "recorder_start",
  "recorder_stop",
  "recorder_export"
]);

export const pacingProfileSchema = z.enum(["fast", "standard", "cinematic"]);
export const emphasisScopeSchema = z.enum(["flowId", "tag", "stepId", "route", "action"]);

export const pacingEmphasisDirectiveSchema = z.object({
  scope: emphasisScopeSchema,
  value: z.string().min(1),
  weight: z.number().min(0.5).max(2)
});

export const pacingDirectivesSchema = z.object({
  profile: pacingProfileSchema.optional(),
  targetDurationSec: z.number().int().positive().optional(),
  emphasis: z.array(pacingEmphasisDirectiveSchema).optional(),
  strictPacing: z.boolean().optional()
});

export const flowPacingMetadataSchema = z.object({
  profile: pacingProfileSchema,
  targetDurationSec: z.number().int().positive().optional(),
  predictedDurationSec: z.number().positive(),
  durationMultiplier: z.number().min(0.75).max(1.6),
  strictPacing: z.boolean().optional(),
  emphasis: z.array(pacingEmphasisDirectiveSchema).optional()
});

export const flowStepSchema = z.object({
  id: z.string().min(1),
  action: flowActionSchema,
  target: z.string().optional(),
  value: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  retries: z.number().int().nonnegative().optional(),
  preDelayMs: z.number().int().nonnegative().optional(),
  postDelayMs: z.number().int().nonnegative().optional(),
  mouseMoveMs: z.number().int().nonnegative().optional(),
  highlightMs: z.number().int().nonnegative().optional(),
  dwellMs: z.number().int().nonnegative().optional(),
  narrativeCheckpoint: z.string().optional()
});

export const flowDefinitionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  preconditions: z.array(z.string()).optional(),
  estimated_duration_sec: z.number().int().positive().optional(),
  pacing: flowPacingMetadataSchema.optional(),
  steps: z.array(flowStepSchema).min(1)
});

export const intentMappingSchema = z.object({
  intent: z.string().min(1),
  selectedFlowIds: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1)
});

export const structureReportSchema = z.object({
  generatedAt: z.string(),
  projectRoot: z.string().min(1),
  packageManager: z.string().min(1),
  projectType: z.enum(["nextjs", "vite-react", "unknown"]).optional(),
  frameworkHints: z.array(z.string()),
  startCommands: z.array(z.string()),
  routes: z.array(z.object({ route: z.string(), file: z.string() })),
  components: z.array(z.object({ name: z.string(), file: z.string() })),
  existingFlowIds: z.array(z.string()),
  notes: z.array(z.string())
});

export const navigationGraphSchema = z.object({
  generatedAt: z.string(),
  nodes: z.array(z.object({ id: z.string(), route: z.string(), file: z.string().optional() })),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      via: z.string(),
      confidence: z.number().min(0).max(1),
      evidence: z.string().optional()
    })
  )
});

export const bootstrapReportSchema = z.object({
  generatedAt: z.string(),
  projectRoot: z.string().min(1),
  packageManager: z.enum(["pnpm", "npm", "yarn", "unknown"]),
  projectType: z.enum(["nextjs", "vite-react", "unknown"]),
  startCommand: z.string().min(1),
  healthPath: z.string().min(1),
  notes: z.array(z.string())
});

export const planReportSchema = z.object({
  generatedAt: z.string(),
  intent: z.string().min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  source: z.enum(["llm-artifact", "heuristic"]),
  selectedFlowId: z.string().optional(),
  generatedFlowId: z.string().optional(),
  pacing: flowPacingMetadataSchema.optional(),
  needsClarification: z.boolean(),
  clarifyingQuestion: z.string().optional()
});

export const runArtifactIndexSchema = z.object({
  runId: z.string().min(1),
  status: z.enum(["success", "failed"]),
  startedAt: z.string(),
  endedAt: z.string(),
  files: z.record(z.string(), z.string())
});

export const learningCandidateSchema = z.object({
  candidateId: z.string().min(1),
  sourceRunId: z.string().min(1),
  intent: z.string().min(1),
  flow: flowDefinitionSchema,
  selectorStabilityScore: z.number().min(0).max(1),
  replay: z.object({
    attempts: z.number().int().nonnegative(),
    passes: z.number().int().nonnegative()
  }),
  validationState: z.enum(["candidate", "validated", "rejected"])
});

export const promotionRecordSchema = z.object({
  candidateId: z.string().min(1),
  promotedFlowId: z.string().min(1),
  promotedAt: z.string(),
  replayAttempts: z.number().int().nonnegative(),
  replayPasses: z.number().int().nonnegative(),
  selectorStabilityScore: z.number().min(0).max(1)
});
