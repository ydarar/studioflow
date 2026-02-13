# StudioFlow Monorepo

This repository contains the StudioFlow runtime, adapters, deterministic flow assets, sample apps, and agent skills used to turn natural-language demo intent into deterministic recorded runs.

If you are an end user installing from npm, use the CLI README:
- `apps/cli/README.md`

## Repository Purpose

StudioFlow's steel thread is:
1. Agent interprets intent and authors deterministic artifact(s).
2. CLI validates and executes those artifacts.
3. Screen Studio records the run for review.

This repo is optimized for developing and maintaining that runtime path.

## Monorepo Layout

- `apps/cli`
  - Publishable npm package (`studioflow`)
  - CLI entrypoint, command layer, packaging scripts
- `packages/*`
  - Internal runtime modules (contracts, orchestrator, adapters, artifact writer, flow registry)
  - Treated as implementation details and bundled into CLI release artifact
- `skills/*`
  - Bundled Codex/Claude skills shipped by CLI setup/install flows
- `docs/*`
  - Canonical product and engineering docs
- `apps/sample-app`, `apps/demo-lab`
  - Local demo targets for deterministic flow development and testing
- `tests/*`
  - Integration/e2e verification for runtime behavior

## Developer Quick Start

Prerequisites:
- Node.js 22+
- pnpm 10+
- macOS for Screen Studio integration paths

Install and run checks:

```bash
pnpm install
pnpm run typecheck
pnpm run test
```

For local runtime validation:

```bash
pnpm run setup
pnpm run doctor
pnpm demo -- --flow artifacts/flow.json --intent "local smoke"
```

## Release Model

- Public npm package: `studioflow` from `apps/cli`
- Internal `@studioflow/*` workspace packages are private and bundled into the CLI build
- Every npm publish requires a matching git tag (`v<version>`) on the exact published commit

## Documentation Index

Start here for docs ownership and reading order:
- `docs/README.md`

Key docs:
- `docs/day0-runbook.md`
- `docs/cli-reference.md`
- `docs/configuration.md`
- `docs/flow-authoring.md`
- `docs/artifacts-reference.md`
- `docs/architecture.md`
- `docs/low-level-design.md`
- `docs/testing-manual-smoke.md`
- `docs/studioflow-open-intent-tests.md`

Contributor and policy docs:
- `CONTRIBUTING.md`
- `AGENTS.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
