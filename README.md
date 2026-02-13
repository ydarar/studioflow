# StudioFlow

StudioFlow is a CLI-first deterministic demo automation runtime for recording product demos with Screen Studio.

## Platform support

- Primary target: macOS (required for Screen Studio AppleScript automation).
- Node.js: 22+
- Package manager: pnpm 10+

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm setup
# optional strict check + macOS prompt flow:
pnpm run doctor
pnpm screenstudio-prep
pnpm demo -- "show onboarding and billing"
```

For the full first-time setup and artifact pipeline, use `docs/day0-runbook.md`.

## Pacing examples

Use planner pacing flags to avoid fast-forward looking demos:

```bash
pnpm plan -- --intent "show onboarding and billing" --report artifacts/structure-report.json --out artifacts/flow.json --plan-report artifacts/plan-report.json --pacing-profile cinematic --target-duration-sec 75
```

Optional emphasis file (`artifacts/emphasis.json`):

```json
[
  { "scope": "stepId", "value": "choose-plan", "weight": 2 }
]
```

## Monorepo structure

- `apps/cli`: operator-facing CLI commands.
- `apps/sample-app`: deterministic Next.js demo target.
- `packages/contracts`: shared runtime types and schemas.
- `packages/planner`: intent routing.
- `packages/flow-registry`: deterministic flows + learning artifacts.
- `packages/orchestrator`: execution state machine.
- `packages/adapters-playwright`: browser actions and assertions.
- `packages/adapters-screenstudio`: recorder menu automation.
- `packages/adapters-desktop`: AppleScript and permission checks.
- `packages/artifacts`: run artifact writing utilities.
- `docs`: architecture, operations, references, and low-level design.

## Documentation

Documentation is intentionally split by purpose to avoid duplication:

- `docs/README.md`: documentation map and ownership.
- `docs/day0-runbook.md`: first successful end-to-end run.
- `docs/cli-reference.md`: full command and flag reference.
- `docs/configuration.md`: environment variables and precedence.
- `docs/architecture.md`: high-level system model.
- `docs/low-level-design.md`: implementation details by module.
- `docs/artifacts-reference.md`: generated artifacts and schemas.
- `docs/flow-authoring.md`: flow schema and authoring rules.
- `docs/testing-manual-smoke.md`: pre-release manual checklist.

## Open source docs

- `LICENSE`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `SUPPORT.md`
- `GOVERNANCE.md`
- `CHANGELOG.md`
