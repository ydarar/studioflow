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
- `notes`: optional operator notes.

## Invocation contract

When handoff artifact is written, immediately invoke `studioflow-cli` (or equivalent runtime workflow in same agent) to execute:

1. `pnpm validate -- --flow <flowPath>`
2. `pnpm demo -- --flow <flowPath> --intent "<intentSummary>" --base-url <baseUrl> --start-command "<startCommand>" --health-path <healthPath>`

Do not ask the user to translate the handoff into commands.
