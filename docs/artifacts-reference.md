# Artifacts Reference

This document describes every artifact DemoPilot emits and where it is stored.

## Bootstrap and planning artifacts (`artifacts/`)

1. `bootstrap.json`
- Producer: `demopilot bootstrap`
- Schema: `bootstrapReportSchema`
- Key fields:
  - `packageManager`, `projectType`
  - `startCommand`, `healthPath`
  - `notes`

2. `structure-report.json`
- Producer: `demopilot discover`
- Schema: `structureReportSchema`
- Key fields:
  - `frameworkHints`, `startCommands`
  - `routes`, `components`
  - `existingFlowIds`

3. `navigation-graph.json`
- Producer: `demopilot discover`
- Schema: `navigationGraphSchema`
- Key fields:
  - `nodes`: route map
  - `edges`: inferred route transitions with confidence and evidence

4. `flow.json`
- Producer: `demopilot plan`
- Schema: `flowDefinitionSchema`
- Purpose: deterministic executable flow artifact.
- Additional pacing metadata:
  - `pacing.profile`
  - optional `pacing.targetDurationSec`
  - `pacing.predictedDurationSec`
  - `pacing.durationMultiplier`
  - optional `pacing.strictPacing`
  - optional emphasis directives

5. `plan-report.json`
- Producer: `demopilot plan`
- Schema: `planReportSchema`
- Key fields:
  - `source` (`heuristic` or `llm-artifact`)
  - `confidence`, `rationale`
  - `selectedFlowId` or `generatedFlowId`
  - optional `pacing` summary (profile, predicted duration, multiplier, emphasis)
  - `needsClarification`, `clarifyingQuestion`

## Run artifacts (`.runs/<run-id>`)

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

## Learning artifacts (`packages/flow-registry/learned`)

1. Candidate artifacts (`learned/candidates/*.json`)
- Producer: orchestrator success path via `writeCandidate`.
- Schema: `learningCandidateSchema`.
- Key fields:
  - `candidateId`, `sourceRunId`, `intent`
  - `flow` (synthesized or persisted flow)
  - `selectorStabilityScore`
  - `replay.attempts` / `replay.passes`
  - `validationState`

2. Promotion records (`learned/promotions/*.json`)
- Producer: `demopilot promote`.
- Schema: `promotionRecordSchema`.
- Key fields:
  - candidate and promoted flow IDs
  - replay stats at promotion time
  - selector stability snapshot

## Deterministic flow registry

- Location: `packages/flow-registry/flows/*.yaml`
- Producers:
  - Hand-authored deterministic flows.
  - `demopilot promote` for approved learned flows.

## Event stream semantics

Common event names in successful runs:

- `start_app.begin`, `start_app.done`
- `recorder.start.begin`, `recorder.start.done`
- `flow.begin`, `step.begin`, `step.done`, `flow.done`
- `recorder.stop.begin`, `recorder.stop.done`
- `recorder.export.begin`, `recorder.export.done`
- `run.done`

Failure runs also include:

- `run.failed`

## Retention guidance

- Keep `.runs` for debugging and auditability in local/dev workflows.
- Candidate and promotion artifacts should be retained when evaluating learning quality over time.
- For CI or disk-constrained environments, prune old run folders while preserving promoted flows and promotion records.
