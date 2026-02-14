# Artifact Fit Spec

Use this rubric to decide whether existing artifacts satisfy the clarified demo intent.

## Inputs

- Clarified intent anchors:
  - `target_route`
  - `user_goal`
  - `done_assertion`
  - `recorder_backend`
  - optional run-feel/profile
- Existing artifacts (if present):
  - `artifacts/flow.json`
  - `artifacts/studioflow-cli-handoff.json`
  - `artifacts/bootstrap.json`
  - `artifacts/structure-report.json`
  - `artifacts/navigation-graph.json`

## Fit dimensions

Score each dimension as `pass|partial|fail`.

1. Route coverage:
- `flow.json` steps reach the intended route/workspace.

2. Goal coverage:
- Steps demonstrate the requested business outcome, not just generic navigation.

3. Completion evidence:
- Assertions/screenshots prove the requested done state.

4. Runtime anchors:
- `baseUrl`, `healthPath`, `startCommand` can be resolved from handoff/bootstrap/config.

5. Recorder and style alignment:
- Recorder preference (`quicktime|screenstudio`) and pacing profile are preserved.

## Route decision rules

- `execute-existing`:
  - no `fail` dimensions
  - at most one `partial`
- `patch-existing`:
  - artifacts exist and deterministic edits are enough (selectors, assertions, pacing, minor scope drift)
- `create-new`:
  - artifacts missing
  - or core route/goal/done coverage is `fail`

## Required output

Write `artifacts/intent-fit-report.json`:

```json
{
  "version": 1,
  "decision": "execute-existing",
  "confidence": "high",
  "intentAnchors": {
    "targetRoute": "/flows/crm",
    "userGoal": "advance and create a CRM lead",
    "doneAssertion": "Created L-300 for Aurora Systems.",
    "recorder": "quicktime"
  },
  "dimensions": [
    { "name": "route_coverage", "result": "pass", "notes": "Flow reaches /flows/crm." },
    { "name": "goal_coverage", "result": "pass", "notes": "Includes lead advance and creation." }
  ],
  "reasons": ["Existing flow already matches clarified scope."]
}
```

Keep notes concrete and tie them to selectors/steps whenever possible.
