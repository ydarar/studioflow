# Demo Lab (Frontend Only)

A complex, deterministic `Next.js` app intended for automation and demo recording.

## Run

From repo root:

```bash
pnpm dev:demo-lab
```

The app runs on `http://localhost:4280`.

## Why this app exists

- No backend dependencies.
- Rich route graph and many UI interactions.
- Stable selectors via `data-testid` for repeatable scripts.

## Route Map

- `/` landing with flow catalog
- `/login` seeded auth form with role/region/mfa toggles
- `/workspace` scenario launcher + KPI/status card
- `/flows` flow index
- `/flows/onboarding` multi-step wizard with progress and completion state
- `/flows/crm` pipeline board, stage movement, owner filtering, lead creation
- `/flows/commerce` catalog, cart updates, coupon rules, shipping, order completion
- `/flows/support` ticket triage, macros, escalation, resolution, ticket creation
- `/flows/analytics` metric switching, period filters, channel toggles, exports, notes
- `/flows/settings` tabbed admin controls (profile, notifications, security, billing, team)
- `/flows/qa` release checklist with pass/fail paths and incident log drafting

## Selector Convention

Selectors are route-scoped and deterministic:

- `onboarding-*` for onboarding flow controls
- `crm-*` for CRM interactions
- `commerce-*` for checkout and cart
- `support-*` for queue/detail actions
- `analytics-*` for chart/filter actions
- `settings-*` for tabbed admin controls
- `qa-*` for release and incident actions

Example:

- `data-testid="crm-owner-filter"`
- `data-testid="commerce-complete-order"`
- `data-testid="support-send-reply"`
- `data-testid="qa-fail-next"`

## Validation

Build command used:

```bash
pnpm --filter @studioflow/demo-lab run build
```
