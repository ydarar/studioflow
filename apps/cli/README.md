# StudioFlow

StudioFlow turns a plain-language demo request into a deterministic recorded product run.

This package includes:
- a CLI runtime (`studioflow`) for deterministic artifact execution
- bundled agent skills for Codex and Claude (`studioflow-investigate`, `studioflow-author`, `studioflow-cli`)

StudioFlow supports both QuickTime Player and Screen Studio recording backends.

## Requirements

- macOS (recorder automation is macOS-only)
- Node.js 22+
- QuickTime Player (built into macOS) or Screen Studio

## Install

```bash
npm install -g studioflow
```

## Quickstart (2 Minutes)

1. Setup runtime dependencies and bundled skills:

```bash
studioflow setup
studioflow doctor
studioflow config check
```

2. Open Codex or Claude from your project root:

```bash
cd /path/to/your/project
codex
# or
claude
```

3. Ask in plain language:

```text
Record a demo for onboarding and billing.
```

or

```text
Record a demo for onboarding and billing using Screen Studio.
```

4. Expected successful run output includes:

```text
Run completed successfully.
Run ID: <timestamp-id>
Artifacts: <path-to-run-dir>
```

## Recorder Backends

- `quicktime` (default): no extra app install required.
- `screenstudio`: just specify Screen Studio in your agent request.

Manual CLI mode still supports `--recorder screenstudio` when you want direct runtime control.

## What `setup` Changes

`studioflow setup`:
- installs Playwright Chromium runtime
- installs StudioFlow skills into:
  - Codex: `$CODEX_HOME/skills` or `~/.codex/skills`
  - Claude: `$CLAUDE_HOME/skills` or `~/.claude/skills`
- runs permission diagnostics
- writes setup state under `~/.studioflow` (or `$STUDIOFLOW_DATA_DIR`)

## Command Cheat Sheet

| Task | Command |
| --- | --- |
| Setup runtime + skills | `studioflow setup` |
| Check permissions | `studioflow doctor` |
| Show effective config | `studioflow config show` |
| Validate config health | `studioflow config check` |
| Validate flow artifact | `studioflow validate --flow artifacts/flow.json` |
| Run deterministic demo | `studioflow demo --flow artifacts/flow.json --intent "your demo intent"` |
| List built-in flows | `studioflow list-flows` |
| QuickTime diagnostics | `studioflow quicktime-prep` |
| Screen Studio diagnostics | `studioflow screenstudio-prep` |

## Minimal Manual Flow (Optional)

If you want to run the CLI directly without agent authoring first, start with a minimal artifact:

```json
{
  "id": "landing_capture",
  "description": "Capture the landing page",
  "tags": ["smoke"],
  "steps": [
    { "id": "open-home", "action": "goto", "value": "/" },
    { "id": "capture-home", "action": "screenshot", "value": "home" }
  ]
}
```

Then run:

```bash
studioflow validate --flow artifacts/flow.json
studioflow demo --flow artifacts/flow.json --intent "landing page smoke"
```

## Quick Troubleshooting

- Permission failures:
  - `studioflow doctor` and approve macOS prompts.
- QuickTime preflight failures:
  - `studioflow quicktime-prep`
- Screen Studio preflight failures:
  - `studioflow screenstudio-prep`
- App health timeout:
  - `studioflow config show` and verify `baseUrl`, `startCommand`, `healthPath`.
- Flow validation failures:
  - `studioflow validate --flow <path>`

## Uninstall / Cleanup

```bash
npm uninstall -g studioflow
```

Optional local cleanup:
- remove `~/.studioflow` (or `$STUDIOFLOW_DATA_DIR`)
- remove installed skill folders under `~/.codex/skills` and `~/.claude/skills` if you no longer want them

## Contact

- X: https://x.com/Ydarar_dev (@Ydarar_dev)
- GitHub: https://github.com/ydarar/studioflow/issues
