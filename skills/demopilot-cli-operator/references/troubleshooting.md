# Troubleshooting

## Permission failures
- Error: osascript not allowed to send keystrokes
- Action: approve Terminal/iTerm in macOS Privacy & Security > Accessibility and Automation

## Selector failures
- Error: step action missing target or locator timeout
- Action: patch `artifacts/flow.json` selector and rerun `pnpm validate`

## Browser executable failures
- Error: Playwright Chromium not installed
- Action: `pnpm --filter @demopilot/adapters-playwright exec playwright install chromium`

## Artifact path checks
- Run artifacts under `.runs/<run-id>/`
- Candidate learned flow under `packages/flow-registry/learned/candidates/`
