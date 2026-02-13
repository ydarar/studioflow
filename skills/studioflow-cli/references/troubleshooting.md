# Troubleshooting

## Permission failures
- Error: osascript not allowed to send keystrokes
- Action: approve Terminal/iTerm in macOS Privacy & Security > Accessibility and Automation

## Selector failures
- Error: step action missing target or locator timeout
- Action: patch `artifacts/flow.json` selector and rerun `pnpm validate`

## Browser executable failures
- Error: Playwright Chromium not installed
- Action: `studioflow setup` (or `pnpm run setup` in this repo)

## Artifact path checks
- Run artifacts under `<runsDir>/<run-id>/`
