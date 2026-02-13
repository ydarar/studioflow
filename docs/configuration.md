# Configuration Reference

StudioFlow does not require a `.env` file.

Runtime configuration is resolved from:

1. CLI flags
2. Project config file: `.studioflow/config.json`
3. User config file: `~/.studioflow/config.json` (or `$STUDIOFLOW_DATA_DIR/config.json`)
4. Bootstrap artifact: `artifacts/bootstrap.json`
5. Built-in defaults

Use `studioflow config show` or `studioflow config check` to inspect effective values.

## Runtime config file fields

Supported keys in `.studioflow/config.json` and `~/.studioflow/config.json`:

- `baseUrl` (string)
  - Example: `"http://localhost:3000"`
  - Default: `http://localhost:4173`

- `startCommand` (string)
  - Example: `"pnpm dev"`
  - Default: unset (runs rely on app already healthy unless bootstrap/flag provides command)

- `healthPath` (string)
  - Example: `"/api/health"`
  - Default: `/api/health`

- `headless` (boolean)
  - Example: `true`
  - Default: `false`

- `runsDir` (string)
  - Example: `".runs"`
  - Default: `.runs`

- `bootstrapReport` (string path)
  - Example: `"artifacts/bootstrap.json"`
  - Default: `artifacts/bootstrap.json`

Example project config:

```json
{
  "baseUrl": "http://localhost:3000",
  "startCommand": "pnpm dev",
  "healthPath": "/api/health",
  "headless": false,
  "runsDir": ".runs"
}
```

## CLI flag overrides (`run`)

`studioflow run --flow ...` supports:

- `--base-url <url>`
- `--start-command <command>`
- `--health-path <path>`
- `--headless <true|false>`
- `--bootstrap-report <path>`
- `--runs-dir <path>`

These override file/bootstrap/default values for that invocation only.

## Config inspection commands

- `studioflow config show`
  - Prints resolved config values plus source for each value.

- `studioflow config show --json`
  - Prints machine-readable resolved config payload.

- `studioflow config check`
  - Validates config parsing and prints warnings for missing startup hints.

## Additional environment variables (advanced)

These are optional advanced controls still read directly from environment:

- `STUDIOFLOW_DATA_DIR` / `STUDIOFLOW_HOME`
  - Data root for user flow files, user config, and setup state.
  - Default: `~/.studioflow`

- `CODEX_HOME`
  - Skill installation base.
  - Default: `~/.codex`

- `CLAUDE_HOME`
  - Claude skill installation base.
  - Default: `~/.claude`

- `STUDIOFLOW_SKILLS_SOURCE`
  - Override source location for bundled skills during install.

- `SCREENSTUDIO_APP_NAME`
- `SCREENSTUDIO_PRE_CONFIRM_DELAY_MS`
- `SCREENSTUDIO_POST_START_DELAY_MS`
- `SCREENSTUDIO_POST_STOP_DELAY_MS`
- `SCREENSTUDIO_EXPORT_DIALOG_CONFIRM_DELAY_MS`
- `SCREENSTUDIO_EXPORT_DELAY_MS`

- `STUDIOFLOW_RENDER_CURSOR`
- `STUDIOFLOW_CURSOR_MOVE_MS`
- `STUDIOFLOW_CURSOR_HIGHLIGHT_MS`
- `STUDIOFLOW_REALISTIC_TYPING`
- `STUDIOFLOW_TYPING_DELAY_MS`
- `STUDIOFLOW_PACING_ADJUSTMENT`
- `STUDIOFLOW_PACING_JITTER`
- `STUDIOFLOW_BROWSER_FULLSCREEN`
  - Controls headed browser launch mode.
  - Default: `true` when `headless` is `false`, otherwise ignored.
  - Set to `false` to force fixed `1440x960` viewport in headed runs.

- `SAMPLE_APP_PORT` (sample app only)

## Resolution notes

- Relative paths in CLI args and config files resolve from workspace root (`INIT_CWD` when present).
- If app is already healthy at `baseUrl + healthPath`, run proceeds without starting a process.
- If app is not healthy and no `startCommand` resolves, run fails with guidance to run bootstrap or pass flags.
