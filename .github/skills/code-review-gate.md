# Skill: Code Review Gate

Use this skill to conduct a structured review of completed developer work and produce a review report artifact.

---

## Severity Rubric

| Severity     | Definition                                                                                               | Examples                                                                                                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CRITICAL** | Defects that cause incorrect behavior, data loss, or security vulnerabilities                            | Logic bug producing wrong output; unhandled rejection that crashes the app; XSS vulnerability; incorrect state mutation                                                                                                                              |
| **HIGH**     | Regressions, missing test coverage, accessibility violations, type errors, missing documentation updates | A previously passing test now fails; an acceptance criterion has no test; a component lacks keyboard support; `any` type used in non-trivial logic; a task introduced user-visible behavior changes but the project root `README.md` was not updated |
| **MEDIUM**   | Naming violations, code duplication, style rule violations, structural clarity issues                    | Function name does not describe its purpose; logic duplicated from an existing utility; nested ternary used; `let` used where `const` suffices; barrel file created                                                                                  |
| **LOW**      | Minor clarity improvements that do not affect correctness or compliance                                  | Variable name slightly ambiguous but not misleading; an intermediate value whose identity would be clearer with a named variable                                                                                                                     |

---

## Review Report Template

Extract `T` from the `Task:` field in the Developer's preceding message (e.g., `Task: 3 — Add keyboard navigation` → `T = 3`).

```markdown
# Review Report: {feature-name} — Task {task-number}

**Feature number**: {N}
**Branch**: feature/{feature-name}
**Review cycle**: r{R}
**Date**: {YYYY-MM-DD}

---

## Summary

[One paragraph describing what was reviewed and the overall finding.]

---

## Findings

[List findings by severity. Under any severity heading with no findings, write `_(none)_` as the only line. If ALL severity headings are empty, replace the entire block below the `## Findings` heading with a single `_(none)_`.]

### CRITICAL

#### Finding 1

- **Location**: `path/to/file.ts`, line {line}
- **Description**: [What is wrong and why it matters]
- **Remediation**: [Specific, actionable instruction for the Developer]

### HIGH

#### Finding 1

...

### MEDIUM

...

### LOW

...

---

## Verdict

**[APPROVED / CHANGES REQUESTED]**

[One sentence rationale.]
```

---

## Naming Review Checklist

For every function, variable, constant, type, component, hook, and file that was added or changed:

- [ ] The name describes the **purpose** of the thing, not its type or implementation detail
- [ ] The name is not misleading — it does not imply different behavior than what the code actually does
- [ ] The name is specific enough to be unambiguous in context
- [ ] The name is as long as necessary to be clear, even if longer than typical
- [ ] File names match the primary export they contain

---

## Duplication Check Procedure

Before filing a duplication finding, verify the existing equivalent actually exists:

1. Use `grep_search` to search for the logic pattern or function name across the project
2. Use `semantic_search` to search for the concept or behavior description
3. Use `file_search` to check for existing utility or helper files in `src/lib/pages/home/utils/` and related folders
4. Only file the finding if you found a concrete existing equivalent and the new code does not reuse it

---

## Pre-Approval Checklist

Before issuing any verdict, verify the following in addition to all per-category checks:

- [ ] Every required check in `review.instructions.md` was applied — no category was skipped
- [ ] The review report artifact has been saved to `.github/artifacts/reviewer/{N}-review-report-{feature-name}-t{T}-r{R}.md`, creating the directory if it does not already exist
- [ ] The correct handoff was selected based on the verdict and `R` value (see Iteration Cap rules in `review.instructions.md`)
- [ ] When R ≥ 4, the ⚠️ notice has been prepended to the top of the saved report artifact
- [ ] Project root `README.md` was verified: updated if the task introduced user-visible behavior changes, or confirmed unchanged if not
