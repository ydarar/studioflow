# CLI Reference

StudioFlow CLI entrypoint: `apps/cli/src/index.ts`

Use via workspace scripts from repo root:

```bash
pnpm demo -- "show onboarding and billing"
pnpm discover -- --out artifacts
```

## Core command model

- Default command is `run` if no command is provided.
- `run` and `demo` are aliases.
- For `run`/`demo`, `--flow` switches execution from intent-routing to artifact-driven execution.

## Commands

1. `run` / `demo`

Intent mode:

```bash
studioflow run "<intent>"
```

Flow artifact mode:

```bash
studioflow run --flow <path/to/flow.json|yaml> [--intent "<label>"]
```

Behavior:
- Auto-installs Playwright Chromium on first run if missing.
- Ensures automation permissions.
- Validates selected flows before execution.
- Resolves app start command and health path.
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

4. `plan`

```bash
studioflow plan --intent "<intent>" [--report artifacts/structure-report.json] [--out artifacts/flow.json] [--llm-plan artifacts/llm-plan.json] [--plan-report artifacts/plan-report.json] [--pacing-profile fast|standard|cinematic] [--target-duration-sec <int>] [--emphasis <path/to/emphasis.json>]
```

Selection order:
- LLM-selected existing flow ID (if valid).
- LLM-generated flow artifact.
- Deterministic `routeIntent` mapping (`confidence >= 0.9`).
- Heuristic token scoring over registered flows.
- Generated fallback flow.

Output:
- Flow artifact (`flow.json` by default).
- Plan report (`plan-report.json`).
- Flow/report pacing metadata:
  - profile (`fast`/`standard`/`cinematic`)
  - optional soft duration target
  - computed duration multiplier
  - optional emphasis directives

5. `validate`

```bash
studioflow validate --flow <path/to/flow.json|yaml>
```

Behavior:
- Loads and schema-validates flow.
- Runs additional semantic checks (`validateFlowDefinition`).
- Prints warnings and fails on validation errors.

6. `doctor`

```bash
studioflow doctor
```

Behavior:
- Checks Screen Studio installation.
- Checks AppleScript and keystroke automation access.
- On failure, triggers permission prompts and opens system settings panes.

7. `screenstudio-prep`

```bash
studioflow screenstudio-prep [--app-name "Screen Studio"]
```

Behavior:
- Ensures automation permissions.
- Activates Screen Studio and verifies `Record` menu actions.

8. `list-flows`

```bash
studioflow list-flows
```

Behavior:
- Lists deterministic flows from registry.

9. `list-candidates`

```bash
studioflow list-candidates
```

Behavior:
- Lists learned candidates with validation state, replay pass ratio, and selector stability score.

10. `replay`

```bash
studioflow replay [--candidate <candidate-id|path>] [--attempts <n>]
```

Behavior:
- Resolves candidate by ID, path, or latest candidate.
- Re-validates candidate flow.
- Computes selector resolvability score from source corpus.
- Increments replay attempts/passes and updates validation state.

11. `promote`

```bash
studioflow promote [--candidate <candidate-id|path>] [--flow-id <id>] [--min-passes <n>] [--min-stability <0..1>]
```

Behavior:
- Enforces replay pass and stability thresholds.
- Writes promoted flow into deterministic registry.
- Writes promotion record and persists candidate state.

12. `setup`

```bash
studioflow setup [--skip-skills] [--force-skills] [--skills-target <dir>]
```

Behavior:
- Ensures Playwright Chromium is installed.
- Installs bundled StudioFlow skills to `$CODEX_HOME/skills` or `~/.codex/skills`.
- Runs non-blocking permission diagnostics and writes setup state.

13. `install-skills`

```bash
studioflow install-skills [--force] [--target <dir>]
```

Behavior:
- Copies bundled skills (`studioflow-cli-operator`, `webapp-flow-learner`) into Codex skills directory.
- Skips existing skills unless `--force` is set.

## Exit behavior

- Unknown command or command failure prints `StudioFlow error: <message>` and exits with code `1`.
- Successful commands print file paths or run metadata for operator inspection.
