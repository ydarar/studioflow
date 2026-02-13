# Documentation Map

This folder is organized to keep one source of truth per topic.

## Principles

- Each document owns a specific concern.
- `README.md` stays minimal and links to canonical references.
- Command details live in `docs/cli-reference.md` only.
- Environment variable definitions live in `docs/configuration.md` only.
- Artifact schemas and file locations live in `docs/artifacts-reference.md` only.

## Document matrix

| File | Primary audience | Purpose | Update when |
| --- | --- | --- | --- |
| `docs/day0-runbook.md` | Operators | First-time setup and first successful run | Onboarding workflow changes |
| `docs/testing-manual-smoke.md` | Release engineers | Pre-release manual validation checklist | Release gate or recorder behavior changes |
| `docs/cli-reference.md` | Operators, contributors | Full CLI command and flag semantics | CLI command contracts change |
| `docs/configuration.md` | Operators | Env vars, defaults, precedence | Env vars or defaults change |
| `docs/flow-authoring.md` | Flow authors | Flow schema, actions, validation constraints | Flow schema or validation logic changes |
| `docs/artifacts-reference.md` | Operators, contributors | Artifact file formats and locations | Artifact schemas or output layout changes |
| `docs/architecture.md` | Engineers | High-level system design and boundaries | Architectural boundaries or runtime stages change |
| `docs/low-level-design.md` | Engineers | Implementation-level behavior by module | Module internals or algorithms change |

## Reading paths

- New operator: `docs/day0-runbook.md` -> `docs/cli-reference.md` -> `docs/configuration.md`
- Flow author: `docs/flow-authoring.md` -> `docs/artifacts-reference.md`
- Contributor: `docs/architecture.md` -> `docs/low-level-design.md` -> `CONTRIBUTING.md`

## Documentation review checklist

Before merging behavior changes:

1. Update exactly one canonical doc for the changed topic.
2. Replace duplicates in other docs with links.
3. Verify command examples still work from repo root.
4. Verify file paths in docs match real output locations.
