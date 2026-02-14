# Handoff Input Spec

`studioflow-cli` accepts a runtime handoff file from `studioflow-author` (or from `studioflow-investigate` when reusing existing artifacts):

- `artifacts/studioflow-cli-handoff.json`

## Expected payload

```json
{
  "version": 1,
  "intentSummary": "Record only onboarding + CRM in Demo Lab",
  "flowPath": "artifacts/flow.json",
  "recorder": "screenstudio",
  "baseUrl": "http://localhost:4280",
  "startCommand": "pnpm dev:demo-lab",
  "healthPath": "/",
  "runtimePacing": {
    "profile": "standard",
    "cursorMoveMs": 430,
    "cursorHighlightMs": 170,
    "typingDelayMs": 55,
    "clickPulseMs": 220,
    "stepPreDelayMs": 90,
    "stepPostDelayMs": 130,
    "stepDwellMs": 180
  },
  "notes": []
}
```

## Required keys

- `version`
- `intentSummary`
- `flowPath`
- `recorder`
- `baseUrl`
- `healthPath`

`startCommand` is recommended. If omitted, runtime can still proceed when app is already healthy.
`recorder` values: `quicktime`, `screenstudio`. If missing, default to `quicktime`.
When intent explicitly names recorder software, preserve that recorder in handoff and execution.
`runtimePacing` should be present for investigate-generated handoff and should drive timing env vars directly.
Use `runtimePacing.profile` values `fast`, `standard`, `cinematic`.

## Execution mapping

From payload, execute:

1. `pnpm validate -- --flow <flowPath>`
2. `pnpm demo -- --flow <flowPath> --intent "<intentSummary>" --recorder <recorder> --base-url <baseUrl> --start-command "<startCommand>" --health-path <healthPath>`
3. If `runtimePacing` exists, set mapped env vars on the `pnpm demo` command:
   - `STUDIOFLOW_CURSOR_MOVE_MS`
   - `STUDIOFLOW_CURSOR_HIGHLIGHT_MS`
   - `STUDIOFLOW_TYPING_DELAY_MS`
   - `STUDIOFLOW_CLICK_PULSE_MS`
   - `STUDIOFLOW_STEP_PRE_DELAY_MS`
   - `STUDIOFLOW_STEP_POST_DELAY_MS`
   - `STUDIOFLOW_STEP_DWELL_MS`

Preflight diagnostics mapping:
- `recorder=quicktime` -> `pnpm quicktime-prep`
- `recorder=screenstudio` -> `pnpm screenstudio-prep`

If payload is missing, fall back to explicit user arguments or repo defaults.
