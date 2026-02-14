---
name: studioflow-investigate
description: Intake and route StudioFlow demo requests. Use when the user asks to run or record a demo from natural language and you must (1) clarify intent anchors, (2) decide whether existing artifacts already fit the request, and (3) route to `studioflow-author` (create/repair) or `studioflow-cli` (execute existing artifacts).
---

# StudioFlow Investigate

Resolve intent and route execution to the right downstream skill.

## Workflow

1. Resolve intent specificity first.

Open-intent detection:
- Treat intent as open when one or more anchors are missing:
  - `target_route`: where the flow should navigate
  - `user_goal`: what user action/outcome to demonstrate
  - `done_assertion`: what text/element proves completion

Recorder selection:
- Detect explicit recorder preference from user wording before authoring handoff:
  - If intent says `screen studio` (or equivalent), set recorder to `screenstudio`.
  - If intent says `quicktime` or `quicktime player`, set recorder to `quicktime`.
  - If not specified, default to `quicktime`.
- Treat explicit user recorder wording as authoritative over defaults.

Clarification loop:
- Max 2 rounds.
- Ask 1-3 questions per round (adaptive; only missing high-impact fields).
- Question priority: `done_assertion` -> `target_route` -> `user_goal` -> optional inputs/scope.
- Infer run feel and pacing automatically from user intent + discovered UI complexity.
- Ask about run-feel preferences only when user intent explicitly asks for a style (for example: `fast`, `standard`, `cinematic`).
- If host supports structured question-card requests, emit payloads from `references/question-card-spec.md`.
- If structured cards are not supported, ask equivalent plain-language questions.
- Track known/missing fields using `references/clarification-state.md`.
- If anchors remain unclear after round 2, make a best-effort route decision with explicit assumptions.

2. Evaluate current artifact readiness after clarification.

Check for:
- `artifacts/flow.json`
- optional `artifacts/studioflow-cli-handoff.json`
- optional `artifacts/bootstrap.json`
- optional `artifacts/structure-report.json`
- optional `artifacts/navigation-graph.json`

3. Run intent-to-artifact fit evaluation using `references/artifact-fit-spec.md`.

Classify route:
- `execute-existing`: artifacts are present and intent fit is high enough to run safely.
- `patch-existing`: artifacts exist but require targeted edits.
- `create-new`: artifacts are missing or intent fit is low.

Write decision trace to:
- `artifacts/intent-fit-report.json`

4. Route deterministically based on classification.

- For `execute-existing`:
  - Invoke `studioflow-cli` immediately with existing artifacts and handoff/default runtime anchors.
- For `patch-existing` or `create-new`:
  - Invoke `studioflow-author` to create/repair deterministic artifacts for this intent.
  - After `studioflow-author` completes, invoke `studioflow-cli` in the same turn.

5. Do not stop at command suggestions when the user asked to run/record a demo.

- If your host supports explicit skill invocation, invoke downstream skills directly.
- If explicit invocation is unavailable, execute equivalent workflows directly.

## Output Requirements

Always produce:
1. `artifacts/intent-fit-report.json`
2. concise route decision (`execute-existing|patch-existing|create-new`)

Always include a concise handoff summary in the response:
- resolved intent anchors
- route decision and reason
- unresolved assumptions (if any)
- confidence (`high|medium|low`)

Use references in:
- `references/question-card-spec.md`
- `references/clarification-state.md`
- `references/artifact-fit-spec.md`
