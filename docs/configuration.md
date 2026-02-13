# Configuration Reference

StudioFlow behavior is controlled by environment variables loaded via `dotenv` in `apps/cli/src/index.ts`.

## Core runtime variables

- `STUDIOFLOW_RUNS_DIR`
  - Default: `.runs`
  - Purpose: base directory for run artifacts.
  - Behavior: if relative, resolved against `INIT_CWD` when available.

- `STUDIOFLOW_BASE_URL`
  - Default: `http://localhost:4173`
  - Purpose: base URL for `goto` and health checks.

- `STUDIOFLOW_HEADLESS`
  - Default: `false`
  - Purpose: controls Playwright browser headless mode.

- `STUDIOFLOW_START_COMMAND`
  - Default in run command: bootstrap report value, else `pnpm --filter @studioflow/sample-app dev`
  - Purpose: app startup command used by run lifecycle.

- `STUDIOFLOW_HEALTH_PATH`
  - Default in run command: bootstrap report value, else `/api/health`
  - Purpose: health endpoint path polled during startup.

- `STUDIOFLOW_BOOTSTRAP_REPORT`
  - Default: `artifacts/bootstrap.json`
  - Purpose: path to bootstrap hints consumed by run command.

- `STUDIOFLOW_DATA_DIR`
  - Default: `~/.studioflow`
  - Purpose: writable home for promoted flows, learning candidates, promotion records, and setup state.

- `STUDIOFLOW_HOME`
  - Default: unset
  - Purpose: legacy alias for `STUDIOFLOW_DATA_DIR`.
  - Behavior: only used when `STUDIOFLOW_DATA_DIR` is not set.

- `CODEX_HOME`
  - Default: `~/.codex`
  - Purpose: base directory for `install-skills`/`setup` skill installation.

- `STUDIOFLOW_SKILLS_SOURCE`
  - Default: auto-detected bundled `skills` directory
  - Purpose: override source location for bundled skill copy operations.

## Planning variables

- `STUDIOFLOW_PLAN_ARTIFACT`
  - Default: unset
  - Purpose: fallback path for `--llm-plan` if flag is not provided.

- `STUDIOFLOW_PLAN_REPORT_OUT`
  - Default: `artifacts/plan-report.json`
  - Purpose: default output path for `plan-report.json`.

## Screen Studio control variables

- `SCREENSTUDIO_APP_NAME`
  - Default: `Screen Studio`
  - Purpose: target app name for AppleScript activation and menu operations.

- `SCREENSTUDIO_PRE_CONFIRM_DELAY_MS`
  - Default: `800`
  - Purpose: delay between clicking `Record display` and pressing Return.

- `SCREENSTUDIO_POST_START_DELAY_MS`
  - Default: `1200`
  - Purpose: wait after start recording.

- `SCREENSTUDIO_POST_STOP_DELAY_MS`
  - Default: `800`
  - Purpose: wait after stop recording.

- `SCREENSTUDIO_EXPORT_DIALOG_CONFIRM_DELAY_MS`
  - Default: `800`
  - Purpose: wait before confirming export dialog.

- `SCREENSTUDIO_EXPORT_DELAY_MS`
  - Default: `2500`
  - Purpose: wait for export action to settle.

## Realism and pacing variables

- `STUDIOFLOW_RENDER_CURSOR`
  - Default: `true`
  - Purpose: overlays visible cursor for recording clarity.

- `STUDIOFLOW_CURSOR_MOVE_MS`
  - Default: `320`
  - Purpose: cursor movement duration for click/type steps.

- `STUDIOFLOW_CURSOR_HIGHLIGHT_MS`
  - Default: `120`
  - Purpose: hover pause before interaction.

- `STUDIOFLOW_REALISTIC_TYPING`
  - Default: `true`
  - Purpose: type per-character with keyboard events.

- `STUDIOFLOW_TYPING_DELAY_MS`
  - Default: `35`
  - Purpose: per-character delay in realistic typing mode.

- `STUDIOFLOW_PACING_ADJUSTMENT`
  - Default: `true`
  - Purpose: applies flow-level duration multiplier produced by planner.

- `STUDIOFLOW_PACING_JITTER`
  - Default: `true`
  - Purpose: applies small deterministic timing variance unless flow uses `strictPacing`.

## Sample app variable

- `SAMPLE_APP_PORT`
  - Default in `.env.example`: `4173`
  - Purpose: sample app port convention.

## Resolution and precedence rules

1. Run command start/health precedence
- `STUDIOFLOW_START_COMMAND` / `STUDIOFLOW_HEALTH_PATH`
- then bootstrap report (`STUDIOFLOW_BOOTSTRAP_REPORT`)
- then hardcoded defaults

2. Planning LLM artifact precedence
- `--llm-plan` flag
- then `STUDIOFLOW_PLAN_ARTIFACT`

3. Workspace path resolution
- Relative paths resolve from `INIT_CWD` when set.
- Otherwise relative paths resolve from current process working directory.
