# Low-Level Design

This document maps implementation details to source modules.

## CLI dispatch and parsing

Source: `apps/cli/src/index.ts`

- Parses command from `process.argv`.
- Supports `demo` alias for `run`.
- Special handling for `--flow` and `--intent` in run command.
- Validates numeric flags for `replay` and `promote`.
- Normalizes errors into `DemoPilot error: <message>` and exits `1`.

## Path resolution and workspace root

Source: `apps/cli/src/commands/path-utils.ts`

- `workspaceRoot()` returns `INIT_CWD` when present (preferred in pnpm workspace scripts), otherwise `process.cwd()`.
- `resolveFromWorkspace()` resolves relative paths from workspace root.

## Bootstrap internals

Source: `apps/cli/src/commands/bootstrap.ts`

- Detects package manager by lockfile presence.
- Recursively scans source tree excluding generated and dependency directories.
- Detects project type (`nextjs`, `vite-react`, `unknown`) from dependencies and route files.
- Chooses startup command by precedence:
  - `DEMOPILOT_START_COMMAND`
  - `scripts["dev:sample"]`
  - `scripts.dev`
  - `scripts.start`
  - fallback `pnpm dev`
- Default health path is `/api/health` for Next.js, otherwise `/`.

## Discovery internals

Source: `apps/cli/src/commands/discover.ts`

Route detection:
- Scans files ending with `/app/**/page.tsx`.
- Converts file paths to routes (`/app/page.tsx -> /`, `/app/onboarding/page.tsx -> /onboarding`).

Component detection:
- Finds files matching `/components/*.(tsx|ts|jsx|js)`.

Graph edge inference:
- Regex extraction from source for:
  - `href="/route"`
  - `router.push("/route")`
  - template-literal `router.push("/route")` patterns
- Creates confidence-scored edges with evidence strings.
- Deduplicates edges by `(from, to, via)` key.

## Planning internals

Source: `apps/cli/src/commands/plan.ts`

Flow selection order:

1. LLM-selected flow ID if valid.
2. LLM-generated flow artifact.
3. Deterministic intent mapping when confidence >= 0.9.
4. Heuristic token scoring against flow metadata.
5. Generated fallback flow with low confidence and clarification prompt.

LLM artifact parser accepts:
- `selectedFlowId`
- `generatedFlow`
- `confidence`
- `rationale`
- `needsClarification`
- `clarifyingQuestion`
- pacing directives:
  - `pacingDirectives.profile`
  - `pacingDirectives.targetDurationSec`
  - `pacingDirectives.emphasis`
  - `pacingDirectives.strictPacing`

Planner pacing compiler:
- Applies profile baselines (`fast`, `standard`, `cinematic`) by action type.
- Adds narrative beat pauses for transitions/checkpoints.
- Applies emphasis weights by scope (`flowId`, `tag`, `stepId`, `route`, `action`).
- Computes predicted duration and bounded soft multiplier (`0.75..1.6`) for target-duration runs.
- Stores pacing metadata in both `flow.json` and `plan-report.json`.

## Intent routing internals

Source: `packages/planner/src/intent-router.ts`

Rule-first strategy:
- If intent includes onboarding and billing keywords and combined flow exists -> `onboarding_billing` at `0.98` confidence.
- Onboarding-only -> `onboarding` at `0.94`.
- Billing or plan keywords -> `billing` at `0.92`.
- Fallback -> first known flow at `0.55`.

## Flow loading and persistence internals

Source: `packages/flow-registry/src/index.ts`

- Supports `.yaml`, `.yml`, `.json` flow files.
- Parses YAML via `yaml` package and validates with `flowDefinitionSchema`.
- Candidate writes:
  - filename format: `<timestamp>-<name>.json`
- Promotion writes:
  - deterministic flow: `flows/<id>.yaml`
  - promotion record: `learned/promotions/<timestamp>-<candidate-id>.json`

## Engine internals

Source: `packages/orchestrator/src/engine.ts`

Execution lifecycle:

1. `createRunContext()` creates run directory and `events.jsonl`.
2. `startBrowser(baseUrl)` creates browser/page session.
3. App lifecycle starts via injected `startApp` callback.
4. Recorder starts; browser tab is brought back to front.
5. Each flow step executes with retry wrapper.
6. Recorder stop/export sequence runs.
7. `plan.json` and learned candidate are written.
8. `run.json` is finalized.

Failure handling:
- Emits `run.failed` event.
- Captures failure screenshot.
- Writes failed `run.json`.
- Throws enriched error with `runDir` and `resultPath`.

## Retry policy internals

Source: `packages/orchestrator/src/retry-policy.ts`

- Default retries: `2`.
- Default delay schedule: `[500, 1500, 2500]` ms.
- Delay index clamps to last value for additional retries.

## Browser step execution internals

Source: `packages/adapters-playwright/src/actions.ts`

- Pre-step pacing:
  - Optional `preDelayMs`.
  - Cursor move to selector center for `click`/`type`.
  - Optional highlight pause.
  - Runtime multiplier and deterministic jitter applied unless strict pacing is enabled.

- Action execution:
  - `goto`: absolute URL or baseURL-relative route.
  - `click`: first locator click.
  - `type`: realistic keyboard typing or direct fill.
  - `wait_for`: selector or text wait.
  - Assertions via helper functions.
  - Screenshot writes full-page PNG to run folder.

- Post-step pacing:
  - `postDelayMs` then `dwellMs`.
  - Runtime multiplier and deterministic jitter applied unless strict pacing is enabled.

- Cursor overlay:
  - Injected once per page when enabled.
  - Uses DOM element + CSS animation pulse for click feedback.

## Selector stability and replay internals

Source: `apps/cli/src/commands/replay.ts`

- Extracts `data-testid` tokens from selectors.
- Scans workspace source files and checks if tokens exist in corpus.
- Score outcomes:
  - no selectors: `1.0`
  - selectors but no detectable test IDs: `0.6`
  - otherwise ratio of resolvable test IDs
- Pass threshold: `0.75` plus flow validation success.
- Updates cumulative replay counters and averaged stability score.

## Promotion internals

Source: `apps/cli/src/commands/promote.ts`

- Enforces configurable thresholds:
  - minimum replay passes (default `3`)
  - minimum stability (default `0.7`)
- Sanitizes flow IDs to `[a-z0-9_-]` with hyphen normalization.
- Appends `promoted` tag (de-duplicated set).
- Persists updated candidate as `validated`.

## Permission and recorder internals

Sources:
- `packages/adapters-desktop/src/permissions.ts`
- `packages/adapters-screenstudio/src/menu-controls.ts`
- `packages/adapters-screenstudio/src/recorder.ts`

- Permission checks validate:
  - Screen Studio installation path
  - AppleScript accessibility
  - keystroke automation capability
- Recorder control uses AppleScript against Screen Studio `Record` menu.
- Export currently triggers menu action and confirm keypress; output path is not programmatically captured.
