# StudioFlow Agent Contract

This document defines the single steel thread for StudioFlow. It is the primary product decision framework.

## Steel Thread (North Star)

StudioFlow exists to turn a plain-language demo request into a deterministic, recorded product demo through an agent-assisted authoring flow and a CLI execution flow.

### End-to-end journey

1. User installs the StudioFlow package.
2. User runs StudioFlow CLI to install bundled skills for both Codex and Claude.
3. User launches Codex or Claude.
4. User enters intent in natural language (example: "I want to record a demo doing X, Y, Z").
5. Agent skill explores the codebase and generates a deterministic artifact that describes the run plan.
6. Agent skill instructs and prepares CLI execution from that artifact.
7. StudioFlow CLI executes the artifact and drives Screen Studio recording.
8. A video is produced for manual review by the user.

## Product Principle

The CLI is a deterministic runtime for artifact execution. Intent interpretation and artifact generation happen in agent environments via StudioFlow skills.

## Decision Gate

Every product and engineering decision must answer:

**Does this change strengthen or simplify the steel thread above?**

If a change does not improve this path, it should be rejected, deferred, or explicitly scoped as non-core.

## PR Checklist (Required)

- Preserves artifact-first CLI execution.
- Keeps agent-driven intent-to-artifact generation as the authoring path.
- Improves reliability, clarity, or speed of one or more steel-thread steps.
- Does not add conflicting UX that bypasses the steel thread without an explicit product decision.

