export type FlowAction =
  | "goto"
  | "click"
  | "type"
  | "wait_for"
  | "assert_text"
  | "assert_visible"
  | "screenshot"
  | "recorder_start"
  | "recorder_stop"
  | "recorder_export";

export type PacingProfile = "fast" | "standard" | "cinematic";
export type EmphasisScope = "flowId" | "tag" | "stepId" | "route" | "action";
export type RecorderBackend = "quicktime" | "screenstudio";

export interface PacingEmphasisDirective {
  scope: EmphasisScope;
  value: string;
  weight: number;
}

export interface PacingDirectives {
  profile?: PacingProfile;
  targetDurationSec?: number;
  emphasis?: PacingEmphasisDirective[];
  strictPacing?: boolean;
}

export interface FlowPacingMetadata {
  profile: PacingProfile;
  targetDurationSec?: number;
  predictedDurationSec: number;
  durationMultiplier: number;
  strictPacing?: boolean;
  emphasis?: PacingEmphasisDirective[];
}

export interface FlowStep {
  id: string;
  action: FlowAction;
  target?: string;
  value?: string;
  timeoutMs?: number;
  retries?: number;
  preDelayMs?: number;
  postDelayMs?: number;
  mouseMoveMs?: number;
  highlightMs?: number;
  dwellMs?: number;
  narrativeCheckpoint?: string;
}

export interface FlowDefinition {
  id: string;
  description: string;
  tags: string[];
  preconditions?: string[];
  estimated_duration_sec?: number;
  pacing?: FlowPacingMetadata;
  steps: FlowStep[];
}

export interface IntentMapping {
  intent: string;
  selectedFlowIds: string[];
  confidence: number;
  rationale: string;
}

export interface SelectorCandidate {
  selector: string;
  confidence: number;
  source: "testid" | "href" | "role" | "css" | "text";
}

export interface StructureReport {
  generatedAt: string;
  projectRoot: string;
  packageManager: string;
  projectType?: "nextjs" | "vite-react" | "unknown";
  frameworkHints: string[];
  startCommands: string[];
  routes: Array<{ route: string; file: string }>;
  components: Array<{ name: string; file: string }>;
  existingFlowIds: string[];
  notes: string[];
}

export interface NavigationGraph {
  generatedAt: string;
  nodes: Array<{ id: string; route: string; file?: string }>;
  edges: Array<{ from: string; to: string; via: string; confidence: number; evidence?: string }>;
}

export interface BootstrapReport {
  generatedAt: string;
  projectRoot: string;
  packageManager: "pnpm" | "npm" | "yarn" | "unknown";
  projectType: "nextjs" | "vite-react" | "unknown";
  startCommand: string;
  healthPath: string;
  notes: string[];
}

export interface PlanReport {
  generatedAt: string;
  intent: string;
  confidence: number;
  rationale: string;
  source: "llm-artifact" | "heuristic";
  selectedFlowId?: string;
  generatedFlowId?: string;
  pacing?: FlowPacingMetadata;
  needsClarification: boolean;
  clarifyingQuestion?: string;
}

export interface RunArtifactIndex {
  runId: string;
  status: "success" | "failed";
  startedAt: string;
  endedAt: string;
  files: Record<string, string>;
}
