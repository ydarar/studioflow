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

Recorder note:
- Include `recorder_export` only when user explicitly asks to export at run completion.
- Without `recorder_export`, StudioFlow stops recording and completes the run without export.

## Open-intent fallback note

When the user intent remains open after clarification rounds, the assistant should still generate deterministic `flow.json` and include assumptions + confidence in the response handoff.
