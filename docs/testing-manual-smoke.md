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

1. Agent artifact handoff is ready.

```bash
# generate artifacts/flow.json in Codex or Claude skill workflow
# studioflow-investigate auto-generates context artifacts
pnpm validate -- --flow artifacts/flow.json
```

2. Host prerequisites still pass.

```bash
pnpm run doctor
pnpm config check
```

3. Optional targeted Screen Studio diagnostics (only when run preflight fails).

```bash
pnpm screenstudio-prep
```

4. Execute canonical smoke run.

```bash
pnpm demo -- --flow artifacts/flow.json --intent "onboarding and billing smoke"
```

5. Validate artifacts and recorder output.

- `<runsDir>/<run-id>/run.json` exists and reports `status: success`.
- `<runsDir>/<run-id>/events.jsonl` exists and contains completion events.
- `<runsDir>/<run-id>/screenshots/` contains expected screenshots.
- Screen Studio created a new project in `~/Screen Studio Projects`.
- Exported media exists only when the flow explicitly includes `recorder_export`.

6. Optional: open-intent clarification quality spot-check.

- Run scenarios from `docs/studioflow-open-intent-tests.md` with `studioflow-investigate`.
- Confirm question rounds are bounded (<=2) and flow output remains deterministic.

## Failure signals

- `doctor` fails installation or permission checks.
- `screenstudio-prep` fails to list expected `Record` actions.
- `validate` fails for `artifacts/flow.json`.
- Open-intent runs ask excessive questions or skip assertions in generated flow.
- `run.json` reports `failed`.
- No new Screen Studio project after run.
- Exported file missing when flow explicitly requests `recorder_export`.

## Triage pointers

- Permission and automation issues: `docs/day0-runbook.md`
- Configuration issues: `docs/configuration.md`
- Command semantics and flags: `docs/cli-reference.md`
