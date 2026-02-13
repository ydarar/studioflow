# StudioFlow CLI

StudioFlow turns natural-language demo intent into deterministic UI run artifacts and executes them through Screen Studio.

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

Bundled skills include:
- `studioflow-investigate` (intent -> deterministic artifacts, including `artifacts/flow.json`)
- `studioflow-cli` (artifact execution workflow)

## Quick Start

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

2. Trigger `studioflow-investigate` to generate `artifacts/flow.json`.

Paste this prompt:

```text
Use StudioFlow skill studioflow-investigate.
Intent: "Record a demo for onboarding and billing."
Generate artifacts/flow.json for this repo.
If intent details are missing, ask concise follow-up questions before authoring the flow.
```

`studioflow-investigate` automatically collects project context artifacts before creating the flow.

3. Validate and run:

```bash
studioflow validate --flow artifacts/flow.json
studioflow demo --flow artifacts/flow.json --intent "onboarding and billing demo"
```

`run`/`demo` automatically performs Screen Studio preflight checks. Use manual prep only for troubleshooting.
Headed runs auto-open a maximized browser window for cleaner recording composition.
Runs do not auto-export by default; include `recorder_export` in flow steps only when export is explicitly needed.

## Optional: Trigger Runtime Skill In Agent

If you want the agent to drive execution too, use:

```text
Use StudioFlow skill studioflow-cli.
Validate artifacts/flow.json, run the demo, and report run artifact paths.
```

## Documentation

- Day 0 runbook: https://github.com/ydarar/studioflow/blob/main/docs/day0-runbook.md
- CLI reference: https://github.com/ydarar/studioflow/blob/main/docs/cli-reference.md
- Configuration: https://github.com/ydarar/studioflow/blob/main/docs/configuration.md
- Smoke checklist: https://github.com/ydarar/studioflow/blob/main/docs/testing-manual-smoke.md
- Open intent tests: https://github.com/ydarar/studioflow/blob/main/docs/studioflow-open-intent-tests.md
- Full docs map: https://github.com/ydarar/studioflow/blob/main/docs/README.md
