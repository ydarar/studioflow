# Contributing

Thanks for contributing to DemoPilot.

## Prerequisites

- Node.js 22+
- pnpm 10+
- macOS for Screen Studio integration testing

## Local setup

```bash
pnpm install
cp .env.example .env
pnpm run doctor
```

## Standard checks

```bash
pnpm run typecheck
pnpm run test
```

If your change affects recorder automation, run `docs/testing-manual-smoke.md`.

## Pull request expectations

1. Keep changes focused and behaviorally clear.
2. Add or update tests for behavior changes when feasible.
3. Update documentation in the same PR when contracts or workflows change.

## Documentation ownership

Use `docs/README.md` as the canonical map.

- CLI behavior changes: `docs/cli-reference.md`
- Env var/default changes: `docs/configuration.md`
- Artifact/schema changes: `docs/artifacts-reference.md`
- Flow schema/validation changes: `docs/flow-authoring.md`
- Architecture/runtime stage changes: `docs/architecture.md` and `docs/low-level-design.md`
- Onboarding/release process changes: `docs/day0-runbook.md` and `docs/testing-manual-smoke.md`

## Community and security

- Conduct policy: `CODE_OF_CONDUCT.md`
- Security reporting: `SECURITY.md`
- Support channels: `SUPPORT.md`
