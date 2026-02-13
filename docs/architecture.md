# DemoPilot Architecture

## Purpose

DemoPilot is a deterministic demo automation runtime that maps operator intent to known flows, executes browser actions with pacing, and controls Screen Studio recording on macOS.

## System layers

1. CLI and command orchestration (`apps/cli`)
- Parses commands and flags.
- Resolves flow input from intent (`routeIntent`) or artifact (`--flow`).
- Discovers project context, plans flow artifacts, validates flow definitions.
- Invokes the orchestrator only after flow validation.

2. Contracts and schema validation (`packages/contracts`)
- Defines runtime types and Zod schemas for:
  - Flow definitions and steps.
  - Discovery and bootstrap reports.
  - Plan reports.
  - Run indexes.
  - Learning candidates and promotion records.

3. Planning and flow registry (`packages/planner`, `packages/flow-registry`)
- Planner routes intent to deterministic flow IDs with rule-first matching.
- Flow registry loads YAML/JSON flows and persists learned candidates + promotions.

4. Execution engine (`packages/orchestrator`)
- Creates run context and event stream.
- Runs explicit state machine for app startup, recorder control, flow execution, and artifact verification.
- Synthesizes a learned candidate flow after successful runs.

5. Adapters
- Browser adapter (`packages/adapters-playwright`): Playwright launch + step execution.
- Recorder adapter (`packages/adapters-screenstudio`): Screen Studio menu automation and export trigger.
- Desktop adapter (`packages/adapters-desktop`): AppleScript execution and permission checks.

6. Artifact writer (`packages/artifacts`)
- Creates `.runs/<run-id>` structure.
- Writes `events.jsonl`, `plan.json`, `run.json`, and screenshots.

## Runtime sequence

1. Operator runs `demopilot run \"<intent>\"` or `demopilot run --flow <file>`.
2. CLI resolves flows and validates each flow definition.
3. Engine creates run context (`.runs/<run-id>`) and launches browser.
4. Engine starts app lifecycle (reuse existing app if health endpoint is already healthy).
5. Engine starts Screen Studio recording.
6. Engine executes every step in every selected flow with per-step retry policy.
7. Engine stops recorder and triggers export.
8. Engine writes run artifacts (`plan.json`, `run.json`, `events.jsonl`).
9. Engine synthesizes and stores a learning candidate under `packages/flow-registry/learned/candidates`.

## Engine state machine

`INIT -> START_APP -> START_RECORDER -> RUN_FLOW -> STOP_RECORDER -> EXPORT -> VERIFY_ARTIFACTS -> DONE`

Failure path:
- Any unrecoverable error transitions to `FAILED`.
- A failure screenshot is captured to `.runs/<run-id>/screenshots/failure.png`.
- `run.json` is still written with status `failed`.

## Determinism and safety controls

- Flow action schema is constrained (`goto`, `click`, `type`, `wait_for`, `assert_text`, `assert_visible`, `screenshot`, recorder actions).
- `validateFlowDefinition` blocks execution for invalid step payloads.
- Retry behavior is bounded (`retries`, backoff array defaults).
- Learning candidate promotion is explicit and gated (`replay` + stability thresholds).

## Learning loop

1. Successful run creates candidate flow with namespaced step IDs.
2. `replay` command evaluates candidate validation and selector resolvability.
3. Candidate accumulates attempts/passes and updated stability score.
4. `promote` requires minimum replay passes and selector stability.
5. Promotion writes deterministic flow YAML and promotion record.

## Boundary assumptions

- macOS is required for Screen Studio AppleScript automation.
- Screen Studio must expose expected `Record` menu items.
- Demo flow selectors are expected to be stable (`data-testid` preferred).
