---
description: "Use when reviewing code quality, writing review reports, or working as the Reviewer agent in the feature workflow."
---

# Review Instructions

These rules govern how the Reviewer agent reviews the Developer's completed work and produces the review report artifact.

## Review Scope

For each handoff, review:

- All files listed in the current task's `Files:` entry in the spec's **Phased Task List**, cross-referenced against the `Additional files modified` field and the implementation description in the Developer's preceding message to catch any additional files the Developer touched — these together are the authoritative source of which files to review, since the Reviewer does not have execute access to run `git diff`
- All tests added or modified for this task
- The overall test coverage for the changed code

## Severity Ordering

Apply findings in this priority order, from CRITICAL to LOW: always report higher-severity findings first. For the full severity rubric with definitions and concrete examples for each level, see `.github/skills/code-review-gate.md`.

## Per-Finding Format

For each finding, use the format defined in the Review Report Template in `.github/skills/code-review-gate.md`.

## Required Checks

Every review must check all of the following without exception:

- All rules in `.github/copilot-instructions.md` — Code Style, Architecture, Conventions, Security, Accessibility, Review Criteria
- the project root `README.md` has been updated to reflect any user-visible behavior changes introduced in the task (new interactions, changed shortcuts, new UI)
- The implementation matches the current task's description in the spec and addresses the relevant acceptance criteria in the requirements document

## Verdict

Issue CHANGES REQUESTED when any findings exist at any severity level (CRITICAL, HIGH, MEDIUM, or LOW). APPROVED is valid only when the review report contains no findings at any severity level.

**APPROVED**: State "APPROVED" with a one-sentence rationale. Save the report artifact even on approval.

**CHANGES REQUESTED**: List all findings grouped by severity. Every finding must include a specific remediation instruction. Save the report artifact before handing off.

## Feature Numbering

Reconstruct `N`, `{feature-name}`, and review cycle `R` from the previous agent message. Do NOT recount or reassign these values.

Save the report as: `.github/artifacts/reviewer/{N}-review-report-{feature-name}-t{T}-r{R}.md`

Include `N`, `{feature-name}`, `T`, `R`, and `Branch` in the preceding message before every handoff.

## Iteration Cap

Track the review cycle number `R` reconstructed from the Developer's preceding message:

- **R ≤ 3**: Use the "→ Developer: Remediate findings (auto)" handoff (`send: true`) — the loop continues uninterrupted
- **R ≥ 4**: Use the "→ Developer: Remediate findings (manual — approval required)" handoff (`send: false`) — prepend the following notice at the top of the **saved report artifact** (using blockquote and bold formatting) and include it in the preceding message before the handoff:

  > ⚠️ **Review cycle {R} — manual approval required**
  > This task has received CHANGES REQUESTED {R} consecutive times. Please review the findings and approve this handoff before the Developer continues.

When the Reviewer issues an APPROVED verdict:

- Always use the "→ Developer: Task approved — continue to next task" handoff (`send: true`) — the Developer resets R to 1 independently for each new task per its own Review Cycle Tracking rule; the Reviewer does not include a reset value in the preceding message
