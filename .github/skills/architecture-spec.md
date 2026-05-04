# Skill: Architecture Spec

Use this skill to analyze requirements, design a solution, and produce an implementation spec with a phased task list.

---

## Codebase Analysis Checklist

Before writing a single line of design, complete this analysis:

- [ ] Read `.github/artifacts/analyst/{N}-requirements-{feature-name}.md` in full
- [ ] Search the codebase for any existing functionality that could be reused or extended (`semantic_search`, `grep_search`)
- [ ] Identify all files that will likely need to change (components, hooks, utilities, routes, types, tests)
- [ ] Note existing naming conventions, folder structure, and patterns in the affected area
- [ ] Identify any existing test helpers, fixtures, or mocks relevant to the feature
- [ ] Check for related accessibility patterns already in use

---

## ADR Format

For each significant design decision, write an Architecture Decision Record:

```
### Decision: [Short title]
**Context**: Why is this decision necessary? What forces are in play?
**Decision**: What was chosen and why?
**Consequences**: What are the trade-offs? What becomes easier or harder?
```

Write one ADR per decision. Do not bundle multiple decisions into one ADR.

---

## Task Decomposition Rubric

A well-formed task satisfies all of the following criteria:

| Criterion        | Description                                                   |
| ---------------- | ------------------------------------------------------------- |
| **Atomic**       | Implements exactly one independently testable behavior change |
| **File-scoped**  | Explicitly names every file to be created or modified         |
| **TDD-friendly** | Can be implemented by writing a failing test first            |
| **Sequenced**    | Depends only on tasks listed before it in the plan            |
| **Describable**  | Can be summarized in one sentence without losing meaning      |

Split any task that violates any of these criteria.

---

## Risk Categories

For the Risks & Considerations section, evaluate the feature against each of these categories:

- **Technical complexity**: Non-trivial algorithms, state interactions, or async flows
- **Accessibility gaps**: Interactions requiring careful ARIA handling, focus management, or keyboard support
- **Test coverage**: Behaviors difficult to test (timing, animations, browser APIs, third-party integrations)
- **Performance**: Potential render bottlenecks, large bundle additions, or excessive re-renders
- **Security**: Input handling at system boundaries (URL params, localStorage values, user-provided data); verify that untrusted input is not rendered or evaluated unsafely

---

## Spec Template

```markdown
# Spec: {feature-name}

**Feature number**: {N}
**Created**: {YYYY-MM-DD}
**Version**: 1
**Requirements**: `.github/artifacts/analyst/{N}-requirements-{feature-name}.md`

---

## Summary

[One paragraph describing what will be built and why.]

---

## Design Decisions

[One ADR per significant decision.]

### Decision: [Title]

**Context**: ...
**Decision**: ...
**Consequences**: ...

---

## Architecture Changes

Files to **create**:

- `path/to/file.ts` — [what it contains and why]

Files to **modify**:

- `path/to/file.ts` — [what changes and why]

Files to **delete**:

_(none)_

---

## Phased Task List

Tasks are listed in dependency order. Each task is fully implemented and reviewed before the next begins.

1. **[Task title]**
   - Files: `path/to/file.ts`, `path/to/file.test.ts`
   - Description: [One sentence describing the behavior change]
   - Test first: [One sentence describing the failing test to write first]

2. **[Task title]**
   - Files: ...
   - Description: ...
   - Test first: ...

---

## Risks & Considerations

- **[Category]**: [Description of risk and mitigation approach]
```
