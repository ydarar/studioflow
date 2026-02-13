# Manual Screen Studio Smoke Checklist

Use this checklist as a release gate after day-0 setup is already working.

## Scope

This doc validates recorder reliability and run success for release readiness.

Do not use this doc for initial environment setup. Use `docs/day0-runbook.md` for first-time setup.

## Preconditions

1. Day-0 runbook has already passed on this machine.
2. Screen Studio is installed and running.
3. Target branch/build is checked out locally.

## Smoke checklist

1. Host prerequisites still pass.

```bash
pnpm run doctor
```

2. Screen Studio menu automation still passes.

```bash
pnpm screenstudio-prep
```

3. Execute canonical smoke run.

```bash
pnpm demo -- "show onboarding and billing"
```

4. Validate artifacts and recorder output.

- `.runs/<run-id>/run.json` exists and reports `status: success`.
- `.runs/<run-id>/events.jsonl` exists and contains completion events.
- `.runs/<run-id>/screenshots/` contains expected screenshots.
- Screen Studio created a new project in `~/Screen Studio Projects`.
- Exported media exists in configured destination.

## Failure signals

- `doctor` fails installation or permission checks.
- `screenstudio-prep` fails to list expected `Record` actions.
- `run.json` reports `failed`.
- No new Screen Studio project or exported file after run.

## Triage pointers

- Permission and automation issues: `docs/day0-runbook.md`
- Configuration issues: `docs/configuration.md`
- Command semantics and flags: `docs/cli-reference.md`
