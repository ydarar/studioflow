# Question Card Spec

Use this when intent is open and the host supports structured question-card UI.

If structured cards are unavailable, ask equivalent plain-language questions.

## Payload shape

```json
{
  "cardId": "target-route",
  "reason": "Need primary destination to map deterministic steps.",
  "question": "Which route should the demo focus on first?",
  "required": true,
  "options": [
    { "label": "Onboarding", "value": "/onboarding" },
    { "label": "Billing", "value": "/billing" },
    { "label": "Home", "value": "/" }
  ],
  "freeformAllowed": true,
  "mapsTo": "target_route"
}
```

## Fields

- `cardId`: stable identifier for this question.
- `reason`: single-sentence rationale.
- `question`: user-facing prompt.
- `required`: whether this question is mandatory for mapping.
- `options`: 2-4 suggested choices from discovered app routes/actions when possible.
- `freeformAllowed`: allow custom response if choices do not fit.
- `mapsTo`: one of:
  - `target_route`
  - `user_goal`
  - `done_assertion`
  - `data_input`
  - `scope_limit`

## Round constraints

- Max 2 rounds total.
- Ask 1-3 cards/questions per round.
- Ask only missing high-impact fields.
