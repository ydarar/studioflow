---
name: studioflow-investigate
description: Investigate an arbitrary web project and generate deterministic StudioFlow artifacts. Use when the user asks to discover app structure, map routes/components/actions, synthesize artifacts/flow.json from natural-language intent, or clarify open/ambiguous intent before authoring a flow.
---

# StudioFlow Investigate

Generate deterministic demo-planning artifacts for any web app.

## Workflow

1. Inspect project root and identify framework, package manager, and startup command.
2. Always collect project context artifacts before intent mapping.

Do this automatically in the skill workflow. Do not ask the user to run these commands manually.

```bash
pnpm bootstrap -- --out artifacts/bootstrap.json
pnpm discover -- --out artifacts
```

Fallback if `pnpm` workspace scripts are unavailable:

```bash
studioflow bootstrap --out artifacts/bootstrap.json
studioflow discover --out artifacts
```

3. Review generated artifacts:
- `artifacts/bootstrap.json`
- `artifacts/structure-report.json`
- `artifacts/navigation-graph.json`

4. Resolve intent specificity before authoring `artifacts/flow.json`.

Open-intent detection:
- Treat intent as open when one or more anchors are missing:
  - `target_route`: where the flow should navigate
  - `user_goal`: what user action/outcome to demonstrate
  - `done_assertion`: what text/element proves completion

Clarification loop:
- Max 2 rounds.
- Ask 1-3 questions per round (adaptive; only missing high-impact fields).
- Question priority: `done_assertion` -> `target_route` -> `user_goal` -> optional inputs/scope.
- If host supports structured question-card requests, emit payloads from `references/question-card-spec.md`.
- If structured cards are not supported, ask equivalent plain-language questions.
- Track known/missing fields using `references/clarification-state.md`.

5. Author `artifacts/flow.json` from intent + discovered structure + clarified answers.

Rules for authored flow:
- Deterministic steps only.
- Prefer stable selectors (`data-testid`).
- Include clear step IDs and assertions at key transitions.
- Include optional pacing fields when useful for recording quality.
- If clarification remains incomplete after 2 rounds, generate best-effort flow with explicit assumptions.

6. Validate candidate flow:

```bash
pnpm validate -- --flow artifacts/flow.json
```

7. If validation fails, edit flow actions/selectors and rerun validation.

## Output Requirements

Always produce these files for handoff to runtime execution:
1. `artifacts/bootstrap.json`
2. `artifacts/structure-report.json`
3. `artifacts/navigation-graph.json`
4. `artifacts/flow.json`

Always include a concise handoff summary in the response:
- resolved intent anchors
- unresolved assumptions (if any)
- confidence (`high|medium|low`)

Use references in:
- `references/artifact-spec.md`
- `references/question-card-spec.md`
- `references/clarification-state.md`
