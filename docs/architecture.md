# StudioFlow Architecture

## Purpose

StudioFlow is a deterministic demo automation runtime that executes provided flow artifacts, drives browser actions with pacing, and controls recorder automation on macOS (QuickTime by default, Screen Studio optional).

## System layers

1. CLI and command orchestration (`apps/cli`)
- Parses commands and flags.
- Resolves flow input from artifact (`--flow`).
- Resolves runtime configuration from flags/config files/bootstrap defaults.
- Discovers project context and validates flow definitions.
- Invokes the orchestrator only after flow validation.

2. Contracts and schema validation (`packages/contracts`)
- Defines runtime types and Zod schemas for:
  - Flow definitions and steps.
  - Discovery and bootstrap reports.
  - Run indexes.

3. Flow registry (`packages/flow-registry`)
- Flow registry loads YAML/JSON flows.

4. Execution engine (`packages/orchestrator`)
- Creates run context and event stream.
- Runs explicit state machine for app startup, recorder control, flow execution, and artifact verification.

5. Adapters
- Browser adapter (`packages/adapters-playwright`): Playwright launch + step execution.
- Recorder adapter (`packages/adapters-screenstudio`): Screen Studio menu automation and optional export trigger.
- Desktop adapter (`packages/adapters-desktop`): AppleScript execution, permission checks, and QuickTime recorder automation.

6. Artifact writer (`packages/artifacts`)
- Creates `<runsDir>/<run-id>` structure.
- Writes `events.jsonl`, `plan.json`, `run.json`, and screenshots.

7. Agent skill workflow (Codex/Claude skills)
- Generates deterministic `flow.json` from natural-language intent.
- Runs open-intent clarification loop (bounded follow-up questions) before authoring flow when needed.

## Runtime sequence

1. Operator runs `studioflow run --flow <file>`.
2. CLI resolves flows and validates each flow definition.
3. Engine creates run context (`<runsDir>/<run-id>`) and launches browser.
4. Engine starts app lifecycle (reuse existing app if health endpoint is already healthy).
5. Engine starts selected recorder backend (`quicktime` default, `screenstudio` optional).
6. Engine executes every step in every selected flow with per-step retry policy.
7. Engine stops recorder and only exports when flow steps explicitly request `recorder_export`.
8. Engine writes run artifacts (`plan.json`, `run.json`, `events.jsonl`).

## Engine state machine

`INIT -> START_APP -> START_RECORDER -> RUN_FLOW -> STOP_RECORDER -> (optional EXPORT) -> VERIFY_ARTIFACTS -> DONE`

Failure path:
- Any unrecoverable error transitions to `FAILED`.
- A failure screenshot is captured to `<runsDir>/<run-id>/screenshots/failure.png`.
- `run.json` is still written with status `failed`.

## Determinism and safety controls

- Flow action schema is constrained (`goto`, `click`, `type`, `wait_for`, `assert_text`, `assert_visible`, `screenshot`, recorder actions).
- `validateFlowDefinition` blocks execution for invalid step payloads.
- Retry behavior is bounded (`retries`, backoff array defaults).

## Boundary assumptions

- macOS is required for AppleScript-based recorder automation.
- QuickTime File menu must expose `New Screen Recording` (or Screen Studio must expose expected `Record` menu items when selected).
- Demo flow selectors are expected to be stable (`data-testid` preferred).
- Intent-to-flow conversion is outside CLI runtime and is handled in agent skill workflow.
