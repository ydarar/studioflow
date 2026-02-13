---
name: studioflow-cli
description: Execute validated demo artifacts with StudioFlow CLI. Use when the user wants to run a generated flow.json, validate flow artifacts, trigger recording, inspect run artifacts, or troubleshoot deterministic run failures.
---

# StudioFlow CLI

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
pnpm demo -- --flow artifacts/flow.json --intent "<intent-summary>"
```

5. Inspect outputs:
- `.runs/<run-id>/run.json`
- `.runs/<run-id>/events.jsonl`
- `.runs/<run-id>/screenshots/*`

6. If run fails, inspect error step in `events.jsonl`, patch flow selectors/pacing, and rerun from step 3.

## Runtime Rules

1. Use artifact execution (`--flow`) only.
2. Keep execution deterministic; do not modify codebase during run unless explicitly requested.
3. Report exact artifact paths and failing step IDs for every failure.

Use references in `references/troubleshooting.md` for common failures.
