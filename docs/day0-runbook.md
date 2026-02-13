# Day 0 Runbook

Use this runbook to reach the first successful deterministic run on a new machine.

## Scope

This doc covers onboarding and first run only.

For command/flag details, use `docs/cli-reference.md`.
For env var tuning, use `docs/configuration.md`.
For release validation, use `docs/testing-manual-smoke.md`.

## Preconditions

1. macOS with Screen Studio installed.
2. Terminal has Automation and Accessibility permissions.
3. Dependencies installed (`pnpm install`).
4. Environment configured (`cp .env.example .env`).

## Step 1: verify host and Screen Studio access

```bash
pnpm run doctor
pnpm screenstudio-prep
```

Pass criteria:
- `doctor` reports all checks as PASS.
- `screenstudio-prep` confirms expected `Record` menu actions.

## Step 2: generate discovery artifacts

```bash
pnpm bootstrap -- --out artifacts/bootstrap.json
pnpm discover -- --out artifacts
```

Required outputs:
- `artifacts/bootstrap.json`
- `artifacts/structure-report.json`
- `artifacts/navigation-graph.json`

## Step 3: build a flow artifact

```bash
pnpm plan -- --intent "demo billing and showcase components" --report artifacts/structure-report.json --out artifacts/flow.json --plan-report artifacts/plan-report.json
```

Optional pacing controls:

```bash
pnpm plan -- --intent "demo billing and showcase components" --report artifacts/structure-report.json --out artifacts/flow.json --plan-report artifacts/plan-report.json --pacing-profile cinematic --target-duration-sec 75 --emphasis artifacts/emphasis.json
```

Optional LLM-assisted plan input:

```bash
pnpm plan -- --intent "demo billing and showcase components" --report artifacts/structure-report.json --out artifacts/flow.json --llm-plan artifacts/llm-plan.json --plan-report artifacts/plan-report.json
```

Required outputs:
- `artifacts/flow.json`
- `artifacts/plan-report.json`

## Step 4: validate flow and execute

```bash
pnpm validate -- --flow artifacts/flow.json
pnpm demo -- --flow artifacts/flow.json --intent "demo billing and showcase components"
```

Alternative intent-only run:

```bash
pnpm demo -- "show onboarding and billing"
```

Pass criteria:
- Run completes successfully and prints run artifact directory.
- `.runs/<run-id>/run.json` has `status: success`.

## Step 5: optional learning promotion path

```bash
pnpm list-candidates
pnpm replay -- --candidate <candidate-id> --attempts 3
pnpm promote -- --candidate <candidate-id> --flow-id <new-flow-id>
```

Expected outputs:
- Promoted flow in `packages/flow-registry/flows/<flow-id>.yaml`.
- Promotion record in `packages/flow-registry/learned/promotions/`.

## Common blockers

- Permission failures: rerun `pnpm run doctor` and approve macOS prompts.
- Health timeout: confirm `DEMOPILOT_BASE_URL`, `DEMOPILOT_START_COMMAND`, and `DEMOPILOT_HEALTH_PATH`.
- Flow validation failures: rerun `pnpm validate -- --flow <path>` and fix missing required fields.
