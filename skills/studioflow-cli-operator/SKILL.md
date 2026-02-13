---
name: studioflow-cli-operator
description: Execute validated demo artifacts with StudioFlow CLI. Use when the user wants to run a generated flow.json, validate flow artifacts, trigger recording, inspect run artifacts, or troubleshoot deterministic run failures.
---

# StudioFlow CLI Operator

Run validated artifacts through deterministic execution.

## Workflow

1. Confirm artifact presence:
- `artifacts/flow.json`
- `artifacts/bootstrap.json` (recommended)
- optional `artifacts/structure-report.json`
- optional `artifacts/navigation-graph.json`

2. Run doctor checks:

```bash
pnpm setup
pnpm run doctor
pnpm screenstudio-prep
```

3. Validate flow artifact:

```bash
pnpm validate -- --flow artifacts/flow.json
```

4. Execute recording run from artifact:

```bash
pnpm demo -- --flow artifacts/flow.json --intent "<intent-summary>"
```

Optional pacing-specific planning rerun:

```bash
pnpm plan -- --intent "<intent-summary>" --report artifacts/structure-report.json --out artifacts/flow.json --plan-report artifacts/plan-report.json --pacing-profile cinematic --target-duration-sec 75 --emphasis artifacts/emphasis.json
pnpm validate -- --flow artifacts/flow.json
```

5. Inspect outputs:
- `.runs/<run-id>/run.json`
- `.runs/<run-id>/events.jsonl`
- `.runs/<run-id>/screenshots/*`

6. If run fails, inspect error step in `events.jsonl`, patch flow selectors/pacing, and rerun from step 3.
7. For candidate lifecycle:

```bash
pnpm list-candidates
pnpm replay -- --candidate <candidate-id> --attempts 3
pnpm promote -- --candidate <candidate-id> --flow-id <new-flow-id>
```

## Runtime Rules

1. Prefer artifact execution (`--flow`) over ad-hoc intent mapping.
2. Keep execution deterministic; do not modify codebase during run unless explicitly requested.
3. Report exact artifact paths and failing step IDs for every failure.

Use references in `references/troubleshooting.md` for common failures.
