# CLI Handoff Spec

Use this artifact to hand execution from `studioflow-investigate` to `studioflow-cli`.

Path:

- `artifacts/studioflow-cli-handoff.json`

## JSON shape

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
  "notes": [
    "Use deterministic artifact execution only."
  ]
}
```

## Field rules

- `version`: integer, currently `1`.
- `intentSummary`: concise run label for CLI `--intent`.
- `flowPath`: deterministic artifact path. Default: `artifacts/flow.json`.
- `recorder`: recorder backend used by CLI `--recorder`.
  - Allowed values: `quicktime`, `screenstudio`.
  - Selection rule: if user explicitly requests Screen Studio/QuickTime, preserve that; otherwise default `quicktime`.
- `baseUrl`: runtime host URL.
- `startCommand`: command used when app is not already healthy.
- `healthPath`: health probe path used by runtime.
- `runtimePacing`: required runtime timing overrides derived from authored flow pacing.
  - Allowed fields: `profile`, `cursorMoveMs`, `cursorHighlightMs`, `typingDelayMs`, `clickPulseMs`, `stepPreDelayMs`, `stepPostDelayMs`, `stepDwellMs`.
  - `profile` values: `fast`, `standard`, `cinematic`.
- `notes`: optional operator notes.

## Invocation contract

When handoff artifact is written, immediately invoke `studioflow-cli` (or equivalent runtime workflow in same agent) to execute:

1. `pnpm validate -- --flow <flowPath>`
2. `pnpm demo -- --flow <flowPath> --intent "<intentSummary>" --recorder <recorder> --base-url <baseUrl> --start-command "<startCommand>" --health-path <healthPath>`
3. Set matching `STUDIOFLOW_*` env vars from `runtimePacing` on the demo command.

Do not ask the user to translate the handoff into commands.
