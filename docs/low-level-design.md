# Low-Level Design

This document maps implementation details to source modules.

## CLI dispatch and parsing

Source: `apps/cli/src/index.ts`

- Parses command from `process.argv`.
- Supports `demo` alias for `run`.
- Requires `--flow` for `run`/`demo`; optional `--intent` is a run label only.
- Supports `config show` and `config check` for resolved runtime inspection.
- Normalizes errors into `StudioFlow error: <message>` and exits `1`.

## Path resolution and workspace root

Source: `apps/cli/src/commands/path-utils.ts`

- `workspaceRoot()` returns `INIT_CWD` when present (preferred in pnpm workspace scripts), otherwise `process.cwd()`.
- `resolveFromWorkspace()` resolves relative paths from workspace root.

## Bootstrap internals

Source: `apps/cli/src/commands/bootstrap.ts`

- Detects package manager by lockfile presence.
- Recursively scans source tree excluding generated and dependency directories.
- Detects project type (`nextjs`, `vite-react`, `unknown`) from dependencies and route files.
- Chooses startup command by precedence:
  - `scripts["dev:sample"]`
  - `scripts.dev`
  - `scripts.start`
  - fallback `pnpm dev`
- Default health path is `/api/health` for Next.js, otherwise `/`.

## Runtime config resolution internals

Source: `apps/cli/src/commands/config.ts`

Run-time fields:
- `baseUrl`
- `startCommand`
- `healthPath`
- `headless`
- `runsDir`

Resolution order:
1. CLI flags
2. Project config file `.studioflow/config.json`
3. User config file `~/.studioflow/config.json` (or `$STUDIOFLOW_DATA_DIR/config.json`)
4. Bootstrap artifact (`artifacts/bootstrap.json`)
5. Built-in defaults

## Discovery internals

Source: `apps/cli/src/commands/discover.ts`

Route detection:
- Scans files ending with `/app/**/page.tsx`.
- Converts file paths to routes (`/app/page.tsx -> /`, `/app/onboarding/page.tsx -> /onboarding`).

Component detection:
- Finds files matching `/components/*.(tsx|ts|jsx|js)`.

Graph edge inference:
- Regex extraction from source for:
  - `href="/route"`
  - `router.push("/route")`
  - template-literal `router.push("/route")` patterns
- Creates confidence-scored edges with evidence strings.
- Deduplicates edges by `(from, to, via)` key.

## Flow loading and persistence internals

Source: `packages/flow-registry/src/index.ts`

- Supports `.yaml`, `.yml`, `.json` flow files.
- Parses YAML via `yaml` package and validates with `flowDefinitionSchema`.

## Engine internals

Source: `packages/orchestrator/src/engine.ts`

Execution lifecycle:

1. `createRunContext()` creates run directory and `events.jsonl`.
2. `startBrowser(baseUrl)` creates browser/page session.
   - Headed mode defaults to a maximized window (`--start-maximized`, `viewport: null`) for capture framing.
   - Headless mode and explicit fullscreen disable use fixed `1440x960` viewport.
3. App lifecycle starts via injected `startApp` callback.
4. Recorder starts; browser tab is brought back to front.
5. Each flow step executes with retry wrapper.
6. Recorder stop sequence runs; export runs only when at least one flow step is `recorder_export`.
7. `plan.json` is written.
8. `run.json` is finalized.

Failure handling:
- Emits `run.failed` event.
- Captures failure screenshot.
- Writes failed `run.json`.
- Throws enriched error with `runDir` and `resultPath`.

## Retry policy internals

Source: `packages/orchestrator/src/retry-policy.ts`

- Default retries: `2`.
- Default delay schedule: `[500, 1500, 2500]` ms.
- Delay index clamps to last value for additional retries.

## Browser step execution internals

Source: `packages/adapters-playwright/src/actions.ts`

- Pre-step pacing:
  - Optional `preDelayMs`.
  - Cursor move to selector center for `click`/`type`.
  - Optional highlight pause.
  - Runtime multiplier and deterministic jitter applied unless strict pacing is enabled.

- Action execution:
  - `goto`: absolute URL or baseURL-relative route.
  - `click`: first locator click.
  - `type`: realistic keyboard typing or direct fill.
  - `wait_for`: selector or text wait.
  - Assertions via helper functions.
  - Screenshot writes full-page PNG to run folder.

- Post-step pacing:
  - `postDelayMs` then `dwellMs`.
  - Runtime multiplier and deterministic jitter applied unless strict pacing is enabled.

- Cursor overlay:
  - Injected once per page when enabled.
  - Uses DOM element + CSS animation pulse for click feedback.

## Permission and recorder internals

Sources:
- `packages/adapters-desktop/src/permissions.ts`
- `packages/adapters-screenstudio/src/menu-controls.ts`
- `packages/adapters-screenstudio/src/recorder.ts`

- Permission checks validate:
  - Screen Studio installation path
  - AppleScript accessibility
  - keystroke automation capability
- Recorder control uses AppleScript against Screen Studio `Record` menu.
- Export currently triggers menu action and confirm keypress; output path is not programmatically captured.
