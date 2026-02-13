# Clarification State Template

Use this lightweight state model while resolving open intent.

```yaml
roundsUsed: 0
maxRounds: 2
known:
  target_route: null
  user_goal: null
  done_assertion: null
  data_input: []
  scope_limit: null
missing:
  - target_route
  - user_goal
  - done_assertion
assumptions: []
confidence: low
risks: []
```

## Update rules

1. After each user reply, update `known` and recalculate `missing`.
2. Stop asking follow-ups when required anchors are all known:
   - `target_route`
   - `user_goal`
   - `done_assertion`
3. Do not exceed 2 rounds.
4. If anchors are still missing after round 2:
   - add explicit `assumptions`
   - keep `confidence: low`
   - generate best-effort deterministic `flow.json`

## Handoff summary format

Include in final response:

- `Resolved`: key anchors and selected values
- `Assumptions`: any inferred defaults
- `Confidence`: `high|medium|low`
