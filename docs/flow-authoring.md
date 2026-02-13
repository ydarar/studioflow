# Flow Authoring

Flow definitions are deterministic artifacts stored in `packages/flow-registry/flows` as YAML or JSON.

## Flow schema

Top-level fields:

- `id` (required): unique flow identifier.
- `description` (required): operator-facing summary.
- `tags` (optional): string list for grouping.
- `preconditions` (optional): assumptions before execution.
- `estimated_duration_sec` (optional): approximate run duration.
- `pacing` (optional): planner-generated pacing metadata:
  - `profile`: `fast` | `standard` | `cinematic`
  - `targetDurationSec` (optional): soft duration target used at planning time
  - `predictedDurationSec`: estimated duration before runtime adjustment
  - `durationMultiplier`: bounded multiplier (`0.75..1.6`) applied at runtime
  - `strictPacing` (optional): disables runtime jitter when `true`
- `steps` (required): non-empty ordered list.

Step fields:

- `id` (required): unique step ID within the flow.
- `action` (required): one of:
  - `goto`
  - `click`
  - `type`
  - `wait_for`
  - `assert_text`
  - `assert_visible`
  - `screenshot`
  - `recorder_start`
  - `recorder_stop`
  - `recorder_export`
- `target` (optional): selector for DOM-targeted actions.
- `value` (optional): text value, route, or screenshot name depending on action.
- `timeoutMs` (optional): per-step timeout (default 6000).
- `retries` (optional): retry count for the step (default 2 at runtime).
- `preDelayMs`, `postDelayMs`, `mouseMoveMs`, `highlightMs`, `dwellMs` (optional): pacing controls.
- `narrativeCheckpoint` (optional): human-readable narration marker.

## Action semantics

1. `goto`
- Uses `value` as route or URL.
- Relative routes are resolved against `DEMOPILOT_BASE_URL`.

2. `click`
- Requires `target`.
- Clicks first locator match.

3. `type`
- Requires `target`.
- Writes `value` into input.
- May type per-character when `DEMOPILOT_REALISTIC_TYPING=true`.

4. `wait_for`
- Requires `target` or `value`.
- Waits for selector visibility (`target`) or text (`value`).

5. `assert_text`
- Requires `value`.
- Waits until text appears.

6. `assert_visible`
- Requires `target`.
- Waits until selector becomes visible.

7. `screenshot`
- Writes screenshot to `.runs/<run-id>/screenshots/<value>.png`.
- If `value` is missing, falls back to `<step-id>.png`.

8. Recorder actions
- `recorder_start`, `recorder_stop`, `recorder_export` are no-ops in Playwright step execution because recorder lifecycle is orchestrator-driven.

## Validation rules

`demopilot validate` checks:

- Flow has at least one step.
- `click`, `type`, `assert_visible` require `target`.
- `assert_text` requires `value`.
- `wait_for` requires `target` or `value`.

Warnings:
- Any pacing field above `20000ms` emits a warning.

## Authoring guidelines

- Prefer stable selectors: `data-testid` over fragile CSS chains.
- Keep step IDs readable and unique.
- Keep assertions near important transitions.
- Use pacing fields to produce recording-friendly motion.
- Use `screenshot` at key milestones for debugging and demo checkpoints.

## Example flow

```yaml
id: onboarding_billing
description: Run onboarding and billing as a single showcase flow
tags: [onboarding, billing, full-demo]
steps:
  - id: goto-home
    action: goto
    value: /
  - id: click-onboarding
    action: click
    target: '[data-testid="go-onboarding"]'
  - id: fill-company
    action: type
    target: '[data-testid="company-name-input"]'
    value: Acme Incorporated
  - id: continue
    action: click
    target: '[data-testid="complete-onboarding"]'
  - id: choose-plan
    action: click
    target: '[data-testid="plan-pro"]'
  - id: assert-success
    action: assert_visible
    target: '[data-testid="success-title"]'
```
