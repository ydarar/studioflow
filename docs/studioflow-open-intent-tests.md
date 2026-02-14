# StudioFlow Open-Intent Test Matrix

Use this matrix to evaluate `studioflow-investigate` as the intake/router skill for ambiguous user intent.

## Goal

Achieve reliable intent-to-flow mapping for most open intents without over-questioning users.

## Loop policy under test

- Max 2 clarification rounds.
- 1-3 follow-up questions per round (adaptive).
- Generate best-effort deterministic flow when details remain sparse.
- Include assumptions and confidence in routing summary.
- Emit `artifacts/intent-fit-report.json` with route decision.

## Core scenarios

1. Resolves in one round
- Input: broad request with one missing anchor (for example missing done assertion).
- Expected:
  - <= 3 questions in round 1
  - no round 2
  - deterministic `artifacts/flow.json` with explicit assertion step.

2. Resolves in two rounds
- Input: broad request missing route + completion criteria.
- Expected:
  - round 1 and round 2 used
  - required anchors resolved by end of round 2
  - deterministic `artifacts/flow.json` passes `pnpm validate`.

3. Minimal user detail after follow-ups
- Input: user keeps answers vague.
- Expected:
  - stop after round 2
  - generate best-effort deterministic flow
  - response includes assumptions and `confidence: low`.

4. Conflicting user answers
- Input: later answer conflicts with earlier answer.
- Expected:
  - latest user answer wins
  - stale assumption removed
  - final flow matches latest confirmed scope.

5. Freeform answer outside options
- Input: user rejects suggested options and gives custom answer.
- Expected:
  - custom answer accepted if deterministic mapping is still possible
  - no forced choice fallback when freeform is valid.

## Pass criteria

- >=80% of open-intent cases produce acceptable deterministic flows.
- Average clarification burden <=4 total questions.
- No increase in flow validation failure rate for generated artifacts.
- Routing decision accuracy (`execute-existing|patch-existing|create-new`) remains high.

## Suggested command sequence

```bash
# use studioflow-investigate to produce intent-fit-report + routing
# use studioflow-author when route is patch-existing/create-new
pnpm validate -- --flow artifacts/flow.json
```

When routed to authoring, the author skill should auto-collect context artifacts before writing `flow.json`; validation confirms output quality.
