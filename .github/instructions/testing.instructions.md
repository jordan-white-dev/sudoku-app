---
description: "Use when implementing features with TDD, creating feature branches, or working as the Developer agent in the feature workflow."
---

# Testing Instructions

These rules govern how the Developer agent implements feature tasks. They augment — and do not replace — the testing conventions in `.github/copilot-instructions.md`.

## Branch Creation

Create the feature branch from `main` exactly once per feature, before writing any code. On subsequent tasks within the same feature, confirm you are already on the correct branch — do not create a new branch. Follow the branch creation steps in `.github/skills/tdd-feature-loop.md`.

## TDD Cycle

For every discrete task, strictly follow the red → green → refactor cycle. Do not skip any phase. Follow the detailed phase checklists in `.github/skills/tdd-feature-loop.md`.

## One Task at a Time

- Implement exactly one task from the spec before handing off to the Reviewer
- Do not implement multiple tasks in a single session
- After receiving APPROVED from the Reviewer, return to the spec and implement the next task

## Escalation Threshold

Use the "→ Architect: Request spec clarification" handoff only when a spec ambiguity would lead to implementing the wrong behavior — not for minor style, naming, or structural decisions that a reasonable engineer would make without clarification. When in doubt, choose the more conservative implementation and note the reasoning in the commit message body.

## Accessibility Testing

WCAG 2.1 AA compliance must be verified in tests wherever feasible. Apply these practices:

- **Accessible names**: Verify interactive elements are queryable by their accessible name — `getByRole('button', { name: 'Delete cell' })`. If an element cannot be found by role and name, the element is failing an accessibility requirement.
- **Keyboard interactions**: Test keyboard-driven flows explicitly. Simulate `Tab`, `Enter`, `Space`, and arrow key presses using `userEvent` to verify all interactive paths are operable without a mouse.
- **Focus management**: After dialog open/close events or major navigation changes, assert that focus has moved to the expected element using `toHaveFocus()`.
- **ARIA state and properties**: Assert that dynamic ARIA attributes (`aria-pressed`, `aria-expanded`, `aria-disabled`, `aria-selected`) reflect the correct state after each interaction.
- **Live regions**: For dynamically inserted status messages or error notifications, assert that the element is present in the DOM and carries `role="status"` or `role="alert"` as appropriate.

## Pre-Handoff Validation Suite

Before every handoff to the Reviewer, run `pnpm check`. Every command it invokes must exit with no errors before handing off.

If any command fails, fix the issue and re-run `pnpm check` from the beginning before handing off.

## Review Cycle Tracking

Carry `N`, `{feature-name}`, and review cycle `R` in every handoff prompt to the Reviewer:

- Set `R = 1` for the first review of each new task
- Increment `R` by 1 each time the Reviewer returns CHANGES REQUESTED for the same task
- After receiving APPROVED, use the `Review cycle: 1` value carried in the Reviewer's APPROVED handoff prompt — do not independently compute it
