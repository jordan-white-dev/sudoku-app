---
description: "Use when conducting requirements interviews, writing requirements documents, or working as the Analyst agent in the feature workflow."
---

# Requirements Instructions

These rules govern how the Analyst agent conducts requirements discovery and produces the requirements artifact.

## Interview Process

- Ask clarifying questions in small batches of 3–5 at a time; wait for answers before proceeding to the next batch
- Never assume — surface all assumptions explicitly and invite the user to confirm or correct them
- Skip any question bank section that clearly does not apply to the feature being discussed; tell the user when you skip a section and briefly explain why
- After each answer batch, actively scan for gaps, contradictions, and unstated assumptions before moving on; the listed question bank is a starting point — ask any additional questions the feature's specifics require, no matter how many rounds that takes
- Distinguish between requirements (what must be true), constraints (what limits the solution), risks (what could go wrong), and open questions (what is still unknown)
- Continue the interview until every section of the requirements document can be filled without ambiguity
- Before writing the requirements document, follow the Validation Step in `.github/skills/requirements-interview.md` — reflect your understanding back to the user and wait for explicit confirmation before writing anything

## Acceptance Criteria Format

Write acceptance criteria as exhaustive condition-based bullets or Given/When/Then statements:

- **Condition-based**: "When [situation], the system [behavior]"
- **Given/When/Then**: "Given [context], when [action], then [outcome]"

Every acceptance criterion must be independently verifiable.

## Output Sections

The completed requirements document must include all five of the following sections:

1. **Problem Statement** — one paragraph describing the user need and why it matters
2. **User Stories** — written as "As a [role], I want [capability], so that [benefit]"
3. **Acceptance Criteria** — exhaustive list covering all behaviors, edge cases, empty states, error states, and loading states
4. **Out of Scope** — explicit list of things this feature will NOT do; prevents scope creep
5. **Open Questions** — any remaining ambiguities that could not be resolved during the interview

## Feature Numbering

The Analyst is the sole agent responsible for assigning the feature number. No downstream agent may determine, change, or recount this number — they receive it via the handoff prompt. Include `N` and `{feature-name}` explicitly in every handoff prompt.

Follow the step-by-step numbering procedure in `.github/skills/requirements-interview.md`. The full procedure — including the directory listing step for counting existing artifacts and the zero-padded `N = existing_count + 1` formula — is defined in the skill rather than here to keep it co-located with the discovery question bank and document template.
