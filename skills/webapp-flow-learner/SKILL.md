---
name: webapp-flow-learner
description: Learn an arbitrary web project and generate navigation artifacts for DemoPilot. Use when the user asks to discover app structure, map routes/components/actions, generate structure-report.json/navigation-graph.json, or synthesize a candidate flow.json from natural-language demo intent.
---

# Webapp Flow Learner

Generate deterministic demo-planning artifacts for any web app.

## Workflow

1. Inspect project root and identify framework, package manager, and startup command.
2. Generate a bootstrap artifact:

```bash
pnpm bootstrap -- --out artifacts/bootstrap.json
```

3. Generate a project structure report using the DemoPilot CLI:

```bash
pnpm discover -- --out artifacts
```

4. Review generated artifacts:
- `artifacts/bootstrap.json`
- `artifacts/structure-report.json`
- `artifacts/navigation-graph.json`

5. Generate a candidate flow from user intent:

```bash
pnpm plan -- --intent "<user-intent>" --report artifacts/structure-report.json --out artifacts/flow.json --plan-report artifacts/plan-report.json
# optional: --llm-plan artifacts/llm-plan.json
# optional: --pacing-profile cinematic --target-duration-sec 75 --emphasis artifacts/emphasis.json
```

6. Validate candidate flow:

```bash
pnpm validate -- --flow artifacts/flow.json
```

7. If validation fails, edit flow actions/selectors and rerun validation.
8. If `plan-report.json` indicates clarification is needed, ask one concise clarifying question and regenerate flow.

## Output Requirements

Always produce these files for handoff to runtime execution:
1. `artifacts/bootstrap.json`
2. `artifacts/structure-report.json`
3. `artifacts/navigation-graph.json`
4. `artifacts/flow.json`
5. `artifacts/plan-report.json`

Use references in `references/artifact-spec.md` for expected content.
