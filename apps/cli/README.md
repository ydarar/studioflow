# StudioFlow

StudioFlow turns a plain-language demo request into a deterministic recorded run.

This package includes:
- a CLI runtime (`studioflow`) for deterministic artifact execution
- bundled agent skills for Codex and Claude (`studioflow-investigate`, `studioflow-cli`)

## Requirements

- macOS (Screen Studio automation)
- Screen Studio installed
- Node.js 22+

## Install

```bash
npm install -g studioflow
```

## Setup Runtime + Skills

`setup` installs Playwright Chromium, installs bundled skills for Codex and Claude, and checks permissions.

```bash
studioflow setup
```

## Default Workflow (Agent-First)

You should not need to manually invoke multiple skills or manually run CLI commands for a normal demo request.
Open Codex or Claude in your project and describe the demo you want.

1. Start your agent from the project root.

Codex:

```bash
cd /path/to/your/project
codex
```

Claude Code:

```bash
cd /path/to/your/project
claude
```

If your launcher command differs, start your usual Codex or Claude session in this repo root.

2. Ask for the demo in plain language.

Example:

```text
Record a demo for onboarding and billing.
```

3. StudioFlow skills + CLI handle the rest:
- investigate the codebase
- generate deterministic artifacts (`artifacts/flow.json`, related context artifacts)
- validate the flow
- execute recording through the CLI runtime

`run`/`demo` automatically performs Screen Studio preflight checks. Use manual prep only for troubleshooting.
Headed runs auto-open a maximized browser window for cleaner recording composition.
Runs do not auto-export by default; include `recorder_export` in flow steps only when export is explicitly needed.

## Advanced Manual Mode (Optional)

If you want to run the runtime yourself:

```bash
studioflow validate --flow artifacts/flow.json
studioflow demo --flow artifacts/flow.json --intent "onboarding and billing demo"
```

## Documentation

- Day 0 runbook: https://github.com/ydarar/studioflow/blob/main/docs/day0-runbook.md
- CLI reference: https://github.com/ydarar/studioflow/blob/main/docs/cli-reference.md
- Configuration: https://github.com/ydarar/studioflow/blob/main/docs/configuration.md
- Smoke checklist: https://github.com/ydarar/studioflow/blob/main/docs/testing-manual-smoke.md
- Open intent tests: https://github.com/ydarar/studioflow/blob/main/docs/studioflow-open-intent-tests.md
- Full docs map: https://github.com/ydarar/studioflow/blob/main/docs/README.md
