# CLI Reference

StudioFlow CLI entrypoint: `apps/cli/src/index.ts`

Use via workspace scripts from repo root:

```bash
pnpm demo -- --flow artifacts/flow.json --intent "billing demo"
pnpm discover -- --out artifacts
```

## Core command model

- Default command is `run` if no command is provided.
- `run` and `demo` are aliases.
- Runtime execution is artifact-only. `--flow` is required.
- Natural-language open intent should be resolved in agent skill workflow (`studioflow-investigate`) before CLI execution.

## Commands

1. `run` / `demo`

```bash
studioflow run --flow <path/to/flow.json|yaml> [--intent "<label>"]
```

Optional per-run overrides:

```bash
studioflow run --flow <path/to/flow.json|yaml> [--intent "<label>"] [--base-url <url>] [--start-command "<command>"] [--health-path <path>] [--headless <true|false>] [--bootstrap-report <path>] [--runs-dir <path>]
```

Behavior:
- Auto-installs Playwright Chromium on first run if missing.
- Ensures automation permissions.
- Runs Screen Studio Record-menu preflight before execution.
- Validates provided flow artifact before execution.
- Resolves runtime config from flags, config files, bootstrap report, and defaults.
- Reuses an already-healthy app when possible; if app is not healthy and no `startCommand` resolves, run fails with guidance.
- Runs orchestrator engine and prints artifact location.

2. `bootstrap`

```bash
studioflow bootstrap [--out artifacts/bootstrap.json]
```

Behavior:
- Detects package manager, project type, start command, and health path.
- Writes `bootstrap.json` using `bootstrapReportSchema`.

3. `discover`

```bash
studioflow discover [--out artifacts]
```

Behavior:
- Scans project files (excluding `node_modules`, `.next`, `.git`, `dist`, `.runs`).
- Detects routes, components, framework hints, start commands, and existing flow IDs.
- Infers navigation graph edges from `href` and `router.push` usage.
- Writes `structure-report.json` and `navigation-graph.json`.

4. `validate`

```bash
studioflow validate --flow <path/to/flow.json|yaml>
```

Behavior:
- Loads and schema-validates flow.
- Runs additional semantic checks (`validateFlowDefinition`).
- Prints warnings and fails on validation errors.

5. `doctor`

```bash
studioflow doctor
```

Behavior:
- Checks Screen Studio installation.
- Checks AppleScript and keystroke automation access.
- On failure, triggers permission prompts and opens system settings panes.

6. `screenstudio-prep`

```bash
studioflow screenstudio-prep [--app-name "Screen Studio"]
```

Behavior:
- Ensures automation permissions.
- Activates Screen Studio and verifies `Record` menu actions.
- Intended for manual diagnostics; normal `run`/`demo` already performs this preflight.

7. `list-flows`

```bash
studioflow list-flows
```

Behavior:
- Lists deterministic flows from registry.

8. `setup`

```bash
studioflow setup [--skip-skills] [--force-skills] [--skills-target <dir>] [--skills-agent <codex|claude|all>] [--codex-skills-target <dir>] [--claude-skills-target <dir>]
```

Behavior:
- Ensures Playwright Chromium is installed.
- Installs bundled StudioFlow skills to both agents by default:
  - Codex: `$CODEX_HOME/skills` or `~/.codex/skills`
  - Claude: `$CLAUDE_HOME/skills` or `~/.claude/skills`
- Runs non-blocking permission diagnostics and writes setup state.

9. `install-skills`

```bash
studioflow install-skills [--force] [--agent <codex|claude|all>] [--codex-target <dir>] [--claude-target <dir>] [--target <dir>]
```

Behavior:
- Copies bundled skills (`studioflow-cli`, `studioflow-investigate`) into both Codex and Claude skills directories by default.
- Skips existing skills unless `--force` is set.
- `--target` installs to one explicit directory (for custom environments); do not combine with agent-target flags.

10. `config`

```bash
studioflow config show [--json] [--base-url <url>] [--start-command <command>] [--health-path <path>] [--headless <true|false>] [--bootstrap-report <path>] [--runs-dir <path>]
studioflow config check [--json] [--base-url <url>] [--start-command <command>] [--health-path <path>] [--headless <true|false>] [--bootstrap-report <path>] [--runs-dir <path>]
```

Behavior:
- `show`: prints effective runtime configuration and source for each value.
- `check`: validates configuration and prints warnings if startup hints are incomplete.

## Exit behavior

- Unknown command or command failure prints `StudioFlow error: <message>` and exits with code `1`.
- Successful commands print file paths or run metadata for operator inspection.
