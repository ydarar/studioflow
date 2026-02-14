# Day 0 Runbook

Use this runbook to reach the first successful deterministic run on a new machine.

## Scope

This doc covers onboarding and first run only.

For command/flag details, use `docs/cli-reference.md`.
For runtime configuration tuning, use `docs/configuration.md`.
For release validation, use `docs/testing-manual-smoke.md`.

## Preconditions

1. macOS with QuickTime Player (built in) or Screen Studio installed.
2. Terminal has Automation and Accessibility permissions.
3. Dependencies installed (`pnpm install`).
4. Optional project config prepared at `.studioflow/config.json` (if you need runtime overrides).

## Step 1: verify host and recorder access

```bash
pnpm run setup
pnpm run doctor
pnpm config check
```

Pass criteria:
- `doctor` reports AppleScript and keystroke checks as PASS (Screen Studio check may be WARN if not installed).
- `config check` reports expected runtime sources.
- `setup` installs bundled skills for both Codex and Claude by default.

Note:
- `pnpm demo` runs recorder preflight automatically.
- QuickTime is default; use `pnpm quicktime-prep` for QuickTime diagnostics.
- Use `pnpm screenstudio-prep` only when diagnosing Screen Studio-specific failures.

## Step 2: generate `artifacts/flow.json` in agent environment

StudioFlow CLI does not convert intent text into flows.
Use Codex or Claude with StudioFlow skills to produce a deterministic flow artifact from user intent.
`studioflow-investigate` is the intake/router skill:
- clarifies intent anchors
- decides whether existing artifacts already fit
- routes to `studioflow-author` when creation/repair is needed

For open intent, `studioflow-investigate` should run a short clarification loop:
- max 2 rounds
- 1-3 high-impact questions per round
- fallback to best-effort route decision with assumptions when details stay sparse

Recommended handoff to agent:

```bash
I want to record a demo doing onboarding and billing.
Figure out whether existing artifacts already fit this intent; if not, generate/update artifacts and run it.
```

Required output:
- `artifacts/intent-fit-report.json`
- and, when routing requires authoring:
  - `artifacts/bootstrap.json`
  - `artifacts/structure-report.json`
  - `artifacts/navigation-graph.json`
  - `artifacts/flow.json`

## Step 3: validate flow and execute

```bash
pnpm validate -- --flow artifacts/flow.json
pnpm demo -- --flow artifacts/flow.json --intent "demo billing and showcase components"
```

Pass criteria:
- Run completes successfully and prints run artifact directory.
- `<runsDir>/<run-id>/run.json` has `status: success`.
- Export only runs when flow includes `recorder_export`.

## Common blockers

- Permission failures: rerun `pnpm run doctor` and approve macOS prompts.
- QuickTime preflight failures: run `pnpm quicktime-prep` to inspect File menu actions directly.
- Screen Studio preflight failures: run `pnpm screenstudio-prep` to inspect Record menu actions directly.
- Health timeout: run `pnpm config show` and confirm `baseUrl`, `startCommand`, and `healthPath`.
- Flow validation failures: rerun `pnpm validate -- --flow <path>` and fix missing required fields.
