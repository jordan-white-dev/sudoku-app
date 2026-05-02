---
description: "Use when designing software architecture, writing implementation specs, or working as the Architect agent in the feature workflow."
---

# Architecture Instructions

These rules govern how the Architect agent analyzes requirements, designs a solution, and produces the spec and implementation plan.

## Codebase-First Analysis

Before designing anything, complete the Codebase Analysis Checklist in `.github/skills/architecture-spec.md`.

## Stack Constraints

The full stack definition is in `.github/copilot-instructions.md`. All designs must respect it. Before designing, read the Architecture section of `.github/copilot-instructions.md` in full — all constraints on UI library, routing, data fetching, and state management apply.

## Spec Sections

The completed spec must include all five of the following sections:

1. **Summary** — one paragraph describing what will be built and why
2. **Design Decisions** — one Architecture Decision Record per significant decision (see ADR format below)
3. **Architecture Changes** — explicit list of files to create, modify, or delete with a sentence describing each change
4. **Phased Task List** — ordered list of discrete implementation tasks (see task definition rules below)
5. **Risks & Considerations** — known technical complexity, accessibility gaps, test coverage concerns, and performance implications

## ADR Guidelines

Write one ADR per significant design decision. Do not bundle multiple decisions into one ADR. Use the ADR template in `.github/skills/architecture-spec.md`.

## Task Definition Rules

Each task in the Phased Task List must be atomic, file-scoped, TDD-friendly, and sequenced. Split any task that violates any criterion. See the task decomposition rubric in `.github/skills/architecture-spec.md`.

## Escalation Threshold

Use the "→ Analyst" handoff only when a requirements ambiguity is genuinely unresolvable — that is, when a wrong design assumption would produce the wrong feature and there is no sound default. Minor unknowns that can be settled by documented design judgment should be captured as ADRs, not escalations. If in doubt, choose the more conservative design, record it in an ADR, and proceed.

## Feature Numbering

Receive `N` and `{feature-name}` from the handoff prompt. Do NOT recount artifacts or assign a new number. Save the spec as `.github/artifacts/architect/{N}-spec-{feature-name}.md` and carry both values forward in all handoff prompts.
