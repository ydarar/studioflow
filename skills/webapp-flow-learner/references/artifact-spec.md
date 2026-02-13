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
Use DemoPilot FlowDefinition schema:
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
