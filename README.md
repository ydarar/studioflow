# StudioFlow

StudioFlow turns natural-language demo intent into deterministic UI run artifacts.

## Requirements

- macOS (Screen Studio automation)
- Screen Studio installed
- Node.js 22+

## Install CLI

```bash
npm install -g studioflow
```

## Install Runtime + Skills

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

## More Docs

- `docs/day0-runbook.md` first end-to-end run
- `docs/cli-reference.md` commands and flags
- `docs/configuration.md` runtime config precedence
- `docs/testing-manual-smoke.md` release smoke checklist
- `docs/studioflow-open-intent-tests.md` open-intent clarification evals
- `docs/README.md` full documentation map
