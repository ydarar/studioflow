# Artifact Spec

## structure-report.json
- generatedAt
- projectRoot
- packageManager
- frameworkHints[]
- startCommands[]
- routes[]
- components[]
- existingFlowIds[]
- notes[]

## navigation-graph.json
- generatedAt
- nodes[] with id/route/file
- edges[] with from/to/via/confidence

## flow.json
Use StudioFlow FlowDefinition schema:
- id
- description
- tags[]
- preconditions[] optional
- steps[]

Flow steps may include pacing fields:
- preDelayMs
- postDelayMs
- mouseMoveMs
- highlightMs
- dwellMs
- narrativeCheckpoint

Authoring intelligence rules:
- Prefer setting pacing fields for click/type/assert transition steps by default, not only on outliers.
- Anticipate scroll-sensitive interactions (below fold, nested overflow containers) and add deterministic setup steps (`wait_for` container/section) before click/type actions.
- Keep selectors stable (`data-testid`) and avoid positional selectors for scroll-sensitive regions.

Recorder note:
- Include `recorder_export` only when user explicitly asks to export at run completion.
- Without `recorder_export`, StudioFlow stops recording and completes the run without export.
- Recorder software selection is not encoded in `flow.json`; include it in `studioflow-cli-handoff.json` as `recorder`.

## Fallback note

When clarification inputs remain incomplete, still generate deterministic `flow.json` and include assumptions + confidence in handoff summary.
