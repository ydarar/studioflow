# Day 0 Runbook

Use this runbook to reach the first successful deterministic run on a new machine.

## Scope

This doc covers onboarding and first run only.

For command/flag details, use `docs/cli-reference.md`.
For runtime configuration tuning, use `docs/configuration.md`.
For release validation, use `docs/testing-manual-smoke.md`.

## Preconditions

1. macOS with Screen Studio installed.
2. Terminal has Automation and Accessibility permissions.
3. Dependencies installed (`pnpm install`).
4. Optional project config prepared at `.studioflow/config.json` (if you need runtime overrides).

## Step 1: verify host and Screen Studio access

```bash
pnpm run setup
pnpm run doctor
pnpm config check
```

Pass criteria:
- `doctor` reports all checks as PASS.
- `config check` reports expected runtime sources.
- `setup` installs bundled skills for both Codex and Claude by default.

Note:
- `pnpm demo` runs Screen Studio preflight automatically.
- Use `pnpm screenstudio-prep` only when diagnosing preflight failures.

## Step 2: generate `artifacts/flow.json` in agent environment

StudioFlow CLI does not convert intent text into flows.
Use Codex or Claude with StudioFlow skills to produce a deterministic flow artifact from user intent.
`studioflow-investigate` automatically collects project context artifacts before writing `flow.json`.

For open intent, `studioflow-investigate` should run a short clarification loop:
- max 2 rounds
- 1-3 high-impact questions per round
- fallback to best-effort deterministic flow with assumptions when details stay sparse

Recommended handoff to agent:

```bash
I want to record a demo doing onboarding and billing.
Explore this repo and generate artifacts/flow.json for StudioFlow CLI execution.
```

Required output:
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
- Screen Studio preflight failures: run `pnpm screenstudio-prep` to inspect Record menu actions directly.
- Health timeout: run `pnpm config show` and confirm `baseUrl`, `startCommand`, and `healthPath`.
- Flow validation failures: rerun `pnpm validate -- --flow <path>` and fix missing required fields.
