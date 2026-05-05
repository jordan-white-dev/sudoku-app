# .github

This folder contains Copilot configuration, project instruction files, agent definitions, and the feature workflow system used to build this app.

## Key File

**`copilot-instructions.md`** — Project-wide rules automatically included in every Copilot session. Covers code style, architecture, build commands, testing conventions, accessibility requirements, and review criteria.

## Subfolders

| Folder          | Purpose                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agents/`       | Agent definition files (`.agent.md`) for Analyst, Architect, Developer, and Reviewer                                                                                                  |
| `artifacts/`    | Generated outputs from feature workflows — requirements documents (`analyst/`), architecture specs (`architect/`), review reports (`reviewer/`), and pull request body files (`pr/`). |
| `instructions/` | Agent-scoped instruction files loaded automatically when the corresponding agent runs                                                                                                 |
| `prompts/`      | Prompt files (`.prompt.md`) for starting feature workflows                                                                                                                            |
| `skills/`       | Detailed skill reference documents (question banks, templates, checklists) cited by agents and instruction files                                                                      |
| `workflows/`    | GitHub Actions workflow definitions                                                                                                                                                   |

## Feature Workflow

Features are built through a four-agent pipeline:

```
Analyst ⇄ Architect ⇄ Developer ⇄ Reviewer
```

> The Analyst ⇄ Architect arc covers requirements gap resolution. The Architect ⇄ Developer arc covers spec clarification. The Developer ⇄ Reviewer arc covers review cycles.

1. **Analyst** conducts a requirements interview and produces a requirements document in `artifacts/analyst/`
2. **Architect** analyzes the codebase and produces an implementation spec with a phased task list in `artifacts/architect/`; may route back to the Analyst to resolve requirements gaps before proceeding
3. **Developer** implements one task at a time using TDD, then hands off to the Reviewer; may route to the Architect to resolve spec ambiguities before proceeding
4. **Reviewer** reviews each task against all project standards and either approves or returns findings; reports are saved in `artifacts/reviewer/`
5. **Developer** (Feature Completion) — after the Reviewer approves the final task, runs the full validation suite, commits a PR body file to `artifacts/pr/`, pushes the feature branch, and opens a pull request via `gh pr create`; merging and branch cleanup are left to the human reviewer

Use [`prompts/start-feature.prompt.md`](prompts/start-feature.prompt.md) to begin a new feature.

### Handoffs

Each agent definition includes one or more **handoffs** — prompts that transition work to the next agent in the pipeline. Handoffs have two modes:

- **`send: true`** — fires automatically when the agent completes its work; the receiving agent begins without manual intervention
- **`send: false`** — presents the handoff prompt for the user to review and approve before the next agent starts; used for four categories of transition:
  - **Primary pipeline advances**: Analyst → Architect after requirements are complete; Architect → Developer after the spec is complete
  - **Exception escalations** (routing to a prior agent to resolve a gap): Architect → Analyst to resolve a requirements gap; Developer → Architect to resolve a spec ambiguity
  - **Return legs after gap resolution**: Analyst → Architect returning the resolved requirements (both the "update spec and resume" and "continue initial spec" variants); Architect → Developer returning after a spec clarification
  - **Human-oversight checkpoints**: Reviewer → Developer when a review cycle has exceeded the automatic iteration limit

## Handoff Reference

Complete list of all handoffs in the pipeline. "Auto" (`send: true`) means the next agent starts immediately; "Manual" (`send: false`) means the prompt is presented for user approval before the next agent starts.

| #   | Owner     | Label                                                            | send:  | Trigger condition                                                               |
| --- | --------- | ---------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| 1   | Analyst   | → Architect: Create implementation spec                          | Manual | Requirements interview complete and user has confirmed understanding            |
| 2   | Analyst   | → Architect: Requirements clarified — update spec and resume     | Manual | Analyst resolved requirements gap while implementation was in progress          |
| 3   | Analyst   | → Architect: Requirements resolved — continue initial spec       | Manual | Analyst resolved requirements gap before any implementation had started         |
| 4   | Architect | → Developer: Implement first task                                | Manual | Spec written and saved; ready for first TDD task                                |
| 5   | Architect | → Analyst: Clarify requirements gap                              | Manual | Unresolvable requirements ambiguity found before any implementation started     |
| 6   | Architect | → Analyst: Clarify requirements gap (implementation in progress) | Manual | Unresolvable requirements ambiguity found after a feature branch already exists |
| 7   | Architect | → Developer: Resume implementation after spec clarification      | Manual | Architect resolved a spec ambiguity raised by the Developer mid-task            |
| 8   | Developer | → Reviewer: Review completed task                                | Auto   | TDD cycle complete, `pnpm check` passes, task committed                         |
| 9   | Developer | → Architect: Request spec clarification                          | Manual | Spec ambiguity blocks implementation or remediation                             |
| 10  | Reviewer  | → Developer: Remediate findings (auto)                           | Auto   | Verdict is CHANGES REQUESTED and R ≤ 3                                          |
| 11  | Reviewer  | → Developer: Remediate findings (manual — approval required)     | Manual | Verdict is CHANGES REQUESTED and R ≥ 4                                          |
| 12  | Reviewer  | → Developer: Task approved — continue to next task               | Auto   | Verdict is APPROVED                                                             |
