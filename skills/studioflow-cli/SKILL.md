---
name: studioflow-cli
description: Execute validated demo artifacts with StudioFlow CLI. Use when the user wants to run a generated flow.json, validate flow artifacts, trigger recording, inspect run artifacts, or troubleshoot deterministic run failures.
---

# StudioFlow CLI

Run validated artifacts through deterministic execution.

## Workflow

0. Resolve handoff input (if present):
- `artifacts/studioflow-cli-handoff.json`

If handoff exists, use it as the source of truth for `flowPath`, `intentSummary`, `baseUrl`, `startCommand`, and `healthPath`.
If present, also consume `runtimePacing` from handoff for runtime timing env values.

1. Confirm artifact presence:
- `artifacts/flow.json`
- `artifacts/bootstrap.json` (recommended)
- optional `artifacts/structure-report.json`
- optional `artifacts/navigation-graph.json`
- optional `artifacts/studioflow-cli-handoff.json`

2. Run doctor checks:

```bash
pnpm run setup
pnpm run doctor
```

If run preflight fails, collect explicit Screen Studio diagnostics:

```bash
pnpm screenstudio-prep
```

3. Validate flow artifact:

```bash
pnpm validate -- --flow artifacts/flow.json
```

4. Execute recording run from artifact:

```bash
STUDIOFLOW_CURSOR_MOVE_MS=<cursorMoveMs> STUDIOFLOW_CURSOR_HIGHLIGHT_MS=<cursorHighlightMs> STUDIOFLOW_TYPING_DELAY_MS=<typingDelayMs> STUDIOFLOW_CLICK_PULSE_MS=<clickPulseMs> STUDIOFLOW_STEP_PRE_DELAY_MS=<stepPreDelayMs> STUDIOFLOW_STEP_POST_DELAY_MS=<stepPostDelayMs> STUDIOFLOW_STEP_DWELL_MS=<stepDwellMs> pnpm demo -- --flow <flowPath> --intent "<intent-summary>" --base-url <baseUrl> --start-command "<startCommand>" --health-path <healthPath>
```

Only set timing env vars that are provided (or implied by selected run-feel profile) in handoff.

5. Inspect outputs:
- `<runsDir>/<run-id>/run.json`
- `<runsDir>/<run-id>/events.jsonl`
- `<runsDir>/<run-id>/screenshots/*`

6. If run fails, inspect error step in `events.jsonl`, patch flow selectors/pacing, and rerun from step 3.

## Execution Behavior (Required)

1. If the skill is invoked for execution, run the commands directly; do not stop at command suggestions.
2. Do not ask the user "how to run the CLI" after handoff has already supplied run parameters.
3. Only ask follow-up questions when required run anchors are missing (`flowPath`, `baseUrl`, or `startCommand`/healthy app).

## Runtime Rules

1. Use artifact execution (`--flow`) only.
2. Keep execution deterministic; do not modify codebase during run unless explicitly requested.
3. Report exact artifact paths and failing step IDs for every failure.

Use references in:
- `references/troubleshooting.md`
- `references/handoff-spec.md`
