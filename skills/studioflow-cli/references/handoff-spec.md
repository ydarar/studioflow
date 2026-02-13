# Handoff Input Spec

`studioflow-cli` accepts a runtime handoff file from `studioflow-investigate`:

- `artifacts/studioflow-cli-handoff.json`

## Expected payload

```json
{
  "version": 1,
  "intentSummary": "Record only onboarding + CRM in Demo Lab",
  "flowPath": "artifacts/flow.json",
  "baseUrl": "http://localhost:4280",
  "startCommand": "pnpm dev:demo-lab",
  "healthPath": "/",
  "notes": []
}
```

## Required keys

- `version`
- `intentSummary`
- `flowPath`
- `baseUrl`
- `healthPath`

`startCommand` is recommended. If omitted, runtime can still proceed when app is already healthy.

## Execution mapping

From payload, execute:

1. `pnpm validate -- --flow <flowPath>`
2. `pnpm demo -- --flow <flowPath> --intent "<intentSummary>" --base-url <baseUrl> --start-command "<startCommand>" --health-path <healthPath>`

If payload is missing, fall back to explicit user arguments or repo defaults.
