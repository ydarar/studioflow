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
  "baseUrl": "http://localhost:4280",
  "startCommand": "pnpm dev:demo-lab",
  "healthPath": "/",
  "runtimePacing": {
    "profile": "balanced",
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
- `baseUrl`: runtime host URL.
- `startCommand`: command used when app is not already healthy.
- `healthPath`: health probe path used by runtime.
- `runtimePacing`: optional runtime timing overrides.
  - Allowed fields: `profile`, `cursorMoveMs`, `cursorHighlightMs`, `typingDelayMs`, `clickPulseMs`, `stepPreDelayMs`, `stepPostDelayMs`, `stepDwellMs`.
  - `profile` values: `fast`, `balanced`, `cinematic`.
- `notes`: optional operator notes.

## Invocation contract

When handoff artifact is written, immediately invoke `studioflow-cli` (or equivalent runtime workflow in same agent) to execute:

1. `pnpm validate -- --flow <flowPath>`
2. `pnpm demo -- --flow <flowPath> --intent "<intentSummary>" --base-url <baseUrl> --start-command "<startCommand>" --health-path <healthPath>`
3. If `runtimePacing` exists, set matching `STUDIOFLOW_*` env vars on the demo command.

Do not ask the user to translate the handoff into commands.
