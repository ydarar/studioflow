# Changelog

All notable changes to this project are documented here.

The format follows Keep a Changelog.

## [Unreleased]

### Changed

- Reorganized repository documentation to reduce duplication and clarify ownership boundaries.
- Split onboarding (`docs/day0-runbook.md`) from release smoke validation (`docs/testing-manual-smoke.md`).
- Simplified root `README.md` to project orientation and canonical doc links.
- Switched CLI runtime to artifact-only execution (`run`/`demo` require `--flow`) and removed intent/planning command surface.
- Removed `.env` dependency from CLI startup and introduced file/flag-driven runtime configuration with `studioflow config show|check`.
- Added open-intent clarification-loop guidance for `studioflow-investigate` with bounded follow-up questions and best-effort fallback assumptions.
