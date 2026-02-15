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
  - Example: `"pnpm run dev:sample"`
  - Default: unset (runs rely on app already healthy unless bootstrap/flag provides command)
  - Security default: command must resolve to a package-manager script in workspace `package.json` unless unsafe override is enabled.

- `healthPath` (string)
  - Example: `"/api/health"`
  - Default: `/api/health`

- `headless` (boolean)
  - Example: `true`
  - Default: `false`

- `recorder` (`quicktime` | `screenstudio`)
  - Example: `"quicktime"`
  - Default: `quicktime`

- `runsDir` (string)
  - Example: `".runs"`
  - Default: `~/.studioflow/runs` (or `$STUDIOFLOW_DATA_DIR/runs`)

- `bootstrapReport` (string path)
  - Example: `"artifacts/bootstrap.json"`
  - Default: `artifacts/bootstrap.json`

Example project config:

```json
{
  "baseUrl": "http://localhost:3000",
  "startCommand": "pnpm run dev:sample",
  "healthPath": "/api/health",
  "headless": false,
  "recorder": "quicktime",
  "runsDir": ".runs"
}
```

## CLI flag overrides (`run`)

`studioflow run --flow ...` supports:

- `--base-url <url>`
- `--start-command <command>`
- `--allow-unsafe-start-command <true|false>`
- `--health-path <path>`
- `--headless <true|false>`
- `--recorder <quicktime|screenstudio>`
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

- `STUDIOFLOW_ALLOW_UNSAFE_START_COMMAND`
  - Set to `true` to allow raw `startCommand` execution outside package-manager script forms.
  - Default: `false`

- `CODEX_HOME`
  - Skill installation base.
  - Default: `~/.codex`

- `CLAUDE_HOME`
  - Claude skill installation base.
  - Default: `~/.claude`

- `SCREENSTUDIO_APP_NAME`
- `SCREENSTUDIO_PRE_CONFIRM_DELAY_MS`
- `SCREENSTUDIO_POST_START_DELAY_MS`
- `SCREENSTUDIO_POST_STOP_DELAY_MS`
- `SCREENSTUDIO_EXPORT_DIALOG_CONFIRM_DELAY_MS`
- `SCREENSTUDIO_EXPORT_DELAY_MS`
  - Used only when a run explicitly requests export via `recorder_export`.

- `QUICKTIME_APP_NAME`
- `QUICKTIME_PRE_CONFIRM_DELAY_MS`
- `QUICKTIME_FORCE_RECORD_ENTIRE_SCREEN`
- `QUICKTIME_FULL_SCREEN_SELECT_DELAY_MS`
- `QUICKTIME_POST_START_DELAY_MS`
- `QUICKTIME_POST_STOP_DELAY_MS`
- `QUICKTIME_EXPORT_DIALOG_CONFIRM_DELAY_MS`
- `QUICKTIME_EXPORT_DELAY_MS`
  - Used only when `recorder` is `quicktime`.
  - Full-screen capture defaults to enabled (`QUICKTIME_FORCE_RECORD_ENTIRE_SCREEN=true`).

- `STUDIOFLOW_RENDER_CURSOR`
- `STUDIOFLOW_CURSOR_MOVE_MS`
- `STUDIOFLOW_CURSOR_HIGHLIGHT_MS`
- `STUDIOFLOW_REALISTIC_TYPING`
- `STUDIOFLOW_TYPING_DELAY_MS`
- `STUDIOFLOW_CLICK_PULSE_MS`
- `STUDIOFLOW_SCREENSHOT_FULL_PAGE`
- `STUDIOFLOW_SCROLL_ANIMATION_MS`
- `STUDIOFLOW_SCROLL_SETTLE_MS`
- `STUDIOFLOW_STEP_PRE_DELAY_MS`
- `STUDIOFLOW_STEP_POST_DELAY_MS`
- `STUDIOFLOW_STEP_DWELL_MS`
- `STUDIOFLOW_PACING_ADJUSTMENT`
- `STUDIOFLOW_PACING_JITTER`
- `STUDIOFLOW_BROWSER_FULLSCREEN`
  - Controls headed browser launch mode.
  - Default: `true` when `headless` is `false`, otherwise ignored.
  - Set to `false` to force fixed `1440x960` viewport in headed runs.

Default pacing profile (when step-level pacing fields are not provided):

- `STUDIOFLOW_CURSOR_MOVE_MS=430`
- `STUDIOFLOW_CURSOR_HIGHLIGHT_MS=170`
- `STUDIOFLOW_TYPING_DELAY_MS=55`
- `STUDIOFLOW_CLICK_PULSE_MS=220`
- `STUDIOFLOW_SCREENSHOT_FULL_PAGE=false`
- `STUDIOFLOW_SCROLL_ANIMATION_MS=340`
- `STUDIOFLOW_SCROLL_SETTLE_MS=180`
- `STUDIOFLOW_STEP_PRE_DELAY_MS=90`
- `STUDIOFLOW_STEP_POST_DELAY_MS=130`
- `STUDIOFLOW_STEP_DWELL_MS=180`

- `SAMPLE_APP_PORT` (sample app only)

## Resolution notes

- Relative paths in CLI args and config files resolve from workspace root (`INIT_CWD` when present).
- If app is already healthy at `baseUrl + healthPath`, run proceeds without starting a process.
- If app is not healthy and no `startCommand` resolves, run fails with guidance to run bootstrap or pass flags.
