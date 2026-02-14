---
name: studioflow-author
description: Create or repair deterministic StudioFlow artifacts for a clarified demo intent. Use when `studioflow-investigate` routes to `patch-existing` or `create-new`, or when the user explicitly asks to generate/edit `artifacts/flow.json` and runtime handoff.
---

# StudioFlow Author

Author and validate deterministic artifacts for runtime execution.

## Workflow

1. Consume clarified intent + routing context.

Expected upstream context:
- resolved anchors (`target_route`, `user_goal`, `done_assertion`)
- recorder preference (`quicktime` or `screenstudio`)
- route decision (`patch-existing` or `create-new`)

2. Collect project context artifacts automatically. Do not ask the user to run these commands manually.

```bash
pnpm bootstrap -- --out artifacts/bootstrap.json
pnpm discover -- --out artifacts
```

Fallback if workspace scripts are unavailable:

```bash
studioflow bootstrap --out artifacts/bootstrap.json
studioflow discover --out artifacts
```

3. Review:
- `artifacts/bootstrap.json`
- `artifacts/structure-report.json`
- `artifacts/navigation-graph.json`
- existing `artifacts/flow.json` if present

4. Author `artifacts/flow.json` for the clarified intent.

Rules:
- Deterministic steps only.
- Prefer stable selectors (`data-testid`).
- Include clear step IDs and assertions at key transitions.
- Always synthesize pacing fields (`preDelayMs`, `postDelayMs`, `mouseMoveMs`, `highlightMs`, `dwellMs`) for interaction-heavy steps to keep demos human-looking.
- Model scroll risk explicitly. For below-fold or overflow-container targets, add deterministic setup/wait steps before interaction.
- Add `recorder_export` only when user explicitly asks for export at run completion.
- If clarification context is still incomplete, generate best-effort deterministic flow with explicit assumptions.

5. Validate the authored artifact:

```bash
pnpm validate -- --flow artifacts/flow.json
```

6. If validation fails, patch flow selectors/actions/pacing and rerun validation.

7. Emit runtime handoff for `studioflow-cli`.

Write:
- `artifacts/studioflow-cli-handoff.json`

Use `references/cli-handoff-spec.md`.
Always include:
- `runtimePacing`
- `recorder`

8. Handoff to `studioflow-cli` immediately when the user intent is to run/record now.

## Output Requirements

Always produce:
1. `artifacts/bootstrap.json`
2. `artifacts/structure-report.json`
3. `artifacts/navigation-graph.json`
4. `artifacts/flow.json`
5. `artifacts/studioflow-cli-handoff.json`

Include a concise authoring summary:
- what changed (new vs patched)
- assumptions
- confidence (`high|medium|low`)

Use references in:
- `references/artifact-spec.md`
- `references/cli-handoff-spec.md`
