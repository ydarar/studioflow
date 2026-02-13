# Artifacts Reference

This document describes every artifact StudioFlow emits and where it is stored.

## Bootstrap and discovery artifacts (`artifacts/`)

1. `bootstrap.json`
- Producer: `studioflow bootstrap`
- Schema: `bootstrapReportSchema`
- Key fields:
  - `packageManager`, `projectType`
  - `startCommand`, `healthPath`
  - `notes`

2. `structure-report.json`
- Producer: `studioflow discover`
- Schema: `structureReportSchema`
- Key fields:
  - `frameworkHints`, `startCommands`
  - `routes`, `components`
  - `existingFlowIds`

3. `navigation-graph.json`
- Producer: `studioflow discover`
- Schema: `navigationGraphSchema`
- Key fields:
  - `nodes`: route map
  - `edges`: inferred route transitions with confidence and evidence

## Input artifacts (agent-generated)

1. `flow.json` (or `flow.yaml`)
- Producer: agent workflow (Codex/Claude skill flow).
- Schema: `flowDefinitionSchema`.
- Purpose: deterministic executable flow artifact consumed by:
  - `studioflow validate --flow ...`
  - `studioflow run --flow ...`
- Optional pacing metadata (if included in artifact):
  - `pacing.profile`
  - optional `pacing.targetDurationSec`
  - `pacing.predictedDurationSec`
  - `pacing.durationMultiplier`
  - optional `pacing.strictPacing`
  - optional emphasis directives
- Recommended handoff metadata in assistant response (not schema fields):
  - resolved intent anchors
  - assumptions used for open-intent fallback
  - confidence (`high|medium|low`)

## Run artifacts (`<runsDir>/<run-id>`)

Produced by orchestrator run engine.

Files:

- `events.jsonl`
  - Append-only line-delimited event stream.
  - Includes timestamp, state, event name, and contextual payload.

- `plan.json`
  - Intent label and selected flow IDs for this run.
  - Runtime pacing snapshot:
    - whether pacing adjustment was enabled
    - per-flow profile, multiplier, strict mode, and target/predicted duration

- `run.json`
  - Final run index (`runArtifactIndexSchema`).
  - Includes status (`success` or `failed`) and file map.

- `screenshots/`
  - Step screenshots and failure screenshot (`failure.png`) on fatal errors.

## Deterministic flow registry

- Built-in flow location: `packages/flow-registry/flows/*.yaml`
- User flow location: `~/.studioflow/flows/*.yaml` (or `$STUDIOFLOW_DATA_DIR/flows`)
- Producers:
  - Hand-authored deterministic flows (built-in).
  - User-managed deterministic flows (user flow directory).

## Event stream semantics

Common event names in successful runs:

- `start_app.begin`, `start_app.done`
- `recorder.start.begin`, `recorder.start.done`
- `flow.begin`, `step.begin`, `step.done`, `flow.done`
- `recorder.stop.begin`, `recorder.stop.done`
- `run.done`

Export events are emitted only when at least one selected flow step uses `recorder_export`:

- `recorder.export.begin`, `recorder.export.done`

Failure runs also include:

- `run.failed`

## Retention guidance

- Default `runsDir` is `~/.studioflow/runs` (or `$STUDIOFLOW_DATA_DIR/runs`).
- Keep run artifacts for debugging and auditability in local/dev workflows.
- For CI or disk-constrained environments, prune old run folders while preserving deterministic flow artifacts you rely on.
