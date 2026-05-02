# Skill: Requirements Interview

Use this skill to conduct a thorough discovery interview and produce an unambiguous requirements document.

---

## Discovery Question Bank

Use these question areas as a starting point, not a fixed checklist. Skip any section whose questions are clearly not applicable to the feature — briefly tell the user why you're skipping it. Present questions in batches of 3–5 using `vscode/askQuestions`; wait for all answers before proceeding. After each batch, review the answers for gaps, ambiguities, and unstated assumptions, then ask targeted follow-up questions before moving on. You are not limited to the listed questions — ask whatever additional questions are needed to fully resolve ambiguity. The interview has no fixed length; continue until every acceptance criterion can be written without making any assumption.

### Problem & Context

- What problem are you trying to solve? Who experiences it and when?
- What is the current behavior (if any), and why is it insufficient?
- What does success look like from the user's perspective?
- Are there any hard deadlines, regulatory requirements, or external constraints?

### Users & Roles

- Who are the users of this feature? Are there different roles with different permissions or views?
- Are there admin, power, or guest user distinctions that matter?
- Does the feature behave differently for authenticated vs. unauthenticated users?

### Core Behavior

- What are the exact steps a user takes to use this feature?
- What does the system do in response to each user action?
- Are there variations in behavior based on user input, state, or context?

### Edge Cases & Error States

- What happens when the user provides invalid input?
- What happens when a required resource is unavailable (network error, empty data)?
- What is the behavior when the feature is used at its limits (maximum items, zero items)?
- Can actions be undone? What happens if the user navigates away mid-action?

### Empty & Loading States

- What should the UI show before data is available?
- What should the UI show when there is no data (empty state)?
- Are there loading indicators or skeleton states required?

### Mobile & Responsive Behavior

- Does this feature need to work on mobile screen sizes?
- Are there layout or interaction differences between desktop and mobile?

### Success Criteria

- How will we know this feature is working correctly?
- Are there measurable outcomes (performance budgets, error rates, specific user actions)?

---

## Validation Step

Before producing the requirements document, reflect your understanding back to the user:

> "Based on our conversation, here is my understanding of what you want to build: [summary]. Does this accurately capture your intent? Are there any corrections or additions before I write the requirements document?"

Only proceed to writing the document after the user confirms.

In Clarification Mode, the same confirmation requirement applies before updating the existing document. Reflect the resolved understanding — state what the ambiguity was and how it is now resolved — and wait for the user to confirm before making any changes:

> "Based on our discussion, here is how I understand the ambiguity to be resolved: [summary]. Does this accurately capture the answer? I will update the requirements document once you confirm."

---

## Feature Numbering Procedure

Perform this procedure exactly once per feature, immediately before saving the artifact:

1. List `.github/artifacts/analyst/` using the `read` tool (directory listing)
   - If the directory does not exist, treat `existing_count` as `0` and skip to step 3
   - If the `read` listing returns an error but the directory is not confirmed missing (i.e., the error is ambiguous), fall back to `search` with the pattern `.github/artifacts/analyst/*.md` and count the results — do NOT treat `existing_count` as `0` unless the search also returns no results
2. Count the number of files returned (call this `existing_count`)
3. Assign `N = existing_count + 1`, zero-padded to **four** digits
   - Examples: 1 → `0001`, 5 → `0005`, 12 → `0012`
4. State aloud: "Assigning feature number {N} to this feature."
5. Save the artifact as `.github/artifacts/analyst/{N}-requirements-{feature-name}.md`, creating the directory if it does not already exist
   - `{feature-name}` must be a short kebab-case label derived from the problem statement: lowercase letters, digits, and hyphens only. Normalize any spaces to hyphens and remove all other special characters (e.g., "Timer Pause & Resume" → `timer-pause-resume`).
6. In the handoff prompt to the Architect, include: "Feature number: {N}, feature name: {feature-name}"

---

## Requirements Document Template

```markdown
# Requirements: {feature-name}

**Feature number**: {N}
**Created**: {YYYY-MM-DD}
**Version**: 1

---

## Problem Statement

[One paragraph describing the user need and why it matters.]

---

## User Stories

- As a [role], I want [capability], so that [benefit].
- As a [role], I want [capability], so that [benefit].

---

## Acceptance Criteria

- When [situation], the system [behavior].
- Given [context], when [action], then [outcome].

[Cover all behaviors, edge cases, empty states, error states, and loading states.]

---

## Out of Scope

- [Explicit list of things this feature will NOT do.]

---

## Open Questions

- [Any remaining ambiguities that could not be resolved during the interview.]
- If none, write: "None — all questions resolved."
```
