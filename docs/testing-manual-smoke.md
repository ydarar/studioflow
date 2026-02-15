# Manual Recorder Smoke Checklist

Use this checklist as a release gate after day-0 setup is already working.

## Scope

This doc validates recorder reliability and run success for release readiness.

Do not use this doc for initial environment setup. Use `docs/day0-runbook.md` for first-time setup.

## Preconditions

1. Day-0 runbook has already passed on this machine.
2. QuickTime Player or Screen Studio is available on the machine.
3. Target branch/build is checked out locally.

## Smoke checklist

1. Agent artifact handoff is ready.

```bash
# run intake/router in Codex or Claude skill workflow
# studioflow-investigate decides execute-existing vs patch/create
# studioflow-author generates context artifacts when needed
pnpm validate -- --flow artifacts/flow.json
```

2. Host prerequisites still pass.

```bash
pnpm run doctor
pnpm run config:check
```

3. Optional targeted recorder diagnostics (only when run preflight fails).

```bash
pnpm quicktime-prep
```

If running with Screen Studio:

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
- Recorder output is captured by the selected backend (QuickTime default or Screen Studio).
- Exported media exists only when the flow explicitly includes `recorder_export`.

6. Optional: open-intent clarification quality spot-check.

- Run scenarios from `docs/studioflow-open-intent-tests.md` with `studioflow-investigate`.
- Confirm question rounds are bounded (<=2) and flow output remains deterministic.

## Failure signals

- `doctor` fails installation or permission checks.
- `quicktime-prep` fails to list expected `New Screen Recording` action.
- `screenstudio-prep` fails to list expected `Record` actions.
- `validate` fails for `artifacts/flow.json`.
- Open-intent runs ask excessive questions or skip assertions in generated flow.
- `run.json` reports `failed`.
- No recorder output after run.
- Exported file missing when flow explicitly requests `recorder_export`.

## Triage pointers

- Permission and automation issues: `docs/day0-runbook.md`
- Configuration issues: `docs/configuration.md`
- Command semantics and flags: `docs/cli-reference.md`
