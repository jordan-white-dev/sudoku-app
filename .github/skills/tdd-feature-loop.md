# Skill: TDD Feature Loop

Use this skill to implement one spec task at a time using the red → green → refactor cycle.

---

## Branch Creation

Perform these steps exactly once at the start of a new feature, before writing any code:

1. Confirm the working tree is clean: `git status`
2. Check out main: `git checkout main`
3. Pull latest: `git pull`
4. Switch to the feature branch if it already exists, or create it:
   - Run `git checkout feature/{kebab-case-feature-name}`
   - If that command fails (the branch does not exist yet), run `git checkout -b feature/{kebab-case-feature-name}`
   - Derive the name directly from `{feature-name}` in the spec (e.g. `feature/timer-pause-resume`)
5. Confirm the branch is active: `git branch --show-current`
6. Commit any artifact files already written by the Analyst and Architect so they do not contaminate the task implementation commit:
   - `git add .github/artifacts/`
   - Run `git status` to check whether any files were staged
   - If files are staged, commit: `git commit -m "docs(artifacts): add requirements and spec for {N}-{feature-name}"`
   - If nothing is staged (e.g., the artifacts were already committed on a prior session), skip this commit

On subsequent tasks within the same feature, skip branch creation and confirm you are already on the correct branch.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) for all commits on feature branches:

- **Format**: `<type>(<scope>): <description>`
- **Types**: `feat` (new feature), `fix` (bug fix), `test` (test changes only), `refactor` (no behavior change), `docs` (documentation), `chore` (tooling, dependencies), `style` (formatting), `perf` (performance improvement)
- **Description**: written in the imperative mood ("add timer pause" not "added timer pause"), no period at the end, 72 characters or fewer
- **Body** (optional): separated from the subject by a blank line; explain _why_ the change was made, not _what_
- **Breaking changes**: append `!` after the type/scope (e.g., `feat!:`) or add `BREAKING CHANGE:` in the footer

Examples:

- `feat(stopwatch): add pause and resume controls`
- `fix(puzzle): correct cell validation for empty grids`
- `test(keypad): cover keyboard navigation with arrow keys`
- `refactor(board): extract cell selection logic into hook`

---

## Red Phase — Write the Failing Test

1. Identify the behavior to be tested from the current task description in the spec
2. Write a test that follows all test-writing conventions in `copilot-instructions.md` (behavioral names, Arrange/Act/Assert structure, describe/it naming, no `data-testid`)
3. Run the test suite: `pnpm test`
4. Confirm the new test **fails** — and for the right reason (not a syntax error or missing import)
5. If the test passes without any implementation code, the test is wrong — revise it before continuing

---

## Green Phase — Write Minimum Code

1. Write only the code needed to make the failing test pass
2. Do not add any behavior not required by the test
3. Do not pre-optimize, add error handling for impossible scenarios, or gold-plate
4. Run the test suite: `pnpm test`
5. Confirm the new test **passes** and no existing tests regressed

---

## Refactor Phase — Clean Up

1. Improve naming, structure, and clarity without changing behavior
2. Remove any temporary scaffolding or placeholder code
3. Ensure all new code follows the naming and structure rules in `copilot-instructions.md`
4. If this task introduced or changed any user-visible behavior (new interactions, changed shortcuts, new UI), update the project root `README.md` to reflect it — this change is included in the handoff so the Reviewer can verify it
5. Run the test suite: `pnpm test`
6. Confirm all tests still pass before moving on
7. Commit the completed task using the Conventional Commits format defined above:
   - `git add -A`
   - `git commit -m "<type>(<scope>): <description>"`

---

## Handoff Prompt Template

Run `pnpm check` as required by `.github/instructions/testing.instructions.md`. All commands it invokes must pass before sending this prompt.

If `pnpm check` required any fixes, run `git status` before sending the prompt. If there are uncommitted changes from those fixes, commit them now: `git add -A && git commit -m "fix(<scope>): address pre-handoff validation failures"`

When handing off to the Reviewer, the prompt must include all of the following:

```
Feature number: {N}
Feature name: {feature-name}
Task: {task number and title from the spec}
Review cycle: {R}
Branch: feature/{feature-name}
Additional files modified: {any files touched beyond those listed in the spec's Files: entry, or "none"}

[Brief description of what was implemented or remediated, and any decisions made]
```

---

## Feature Completion

Perform these steps after the Reviewer issues APPROVED on the final task in the spec:

1. Confirm all spec tasks have been reviewed and approved. Read `.github/artifacts/architect/{N}-spec-{feature-name}.md` to enumerate the task numbers `T` defined in the Phased Task List. Then list `.github/artifacts/reviewer/` and verify that at least one file matching `{N}-review-report-{feature-name}-t{T}-r*.md` exists for each of those task numbers. This is a defensive integrity check to catch any workflow gaps — because this step is only reachable via the APPROVED → no-next-task path, confirming a matching report file exists for each task number is sufficient.
2. Run the full validation suite: `pnpm check`. All commands it invokes must pass before pushing. Fix any failures before continuing. If any fixes were required, run `git status` and commit any uncommitted changes before pushing: `git add -A && git commit -m "fix(<scope>): address pre-push validation failures"`
3. Write the PR body to `.github/artifacts/pr/{N}-pr-body-{feature-name}.md`, creating the directory if it does not already exist. The body must include, as plain text — include artifact paths as plain reference text, not as markdown hyperlinks (the PR body should be clean prose, not a navigation document):
   - **Feature number and name** — `{N}` and `{feature-name}`
   - **What** — a one-paragraph summary drawn from the Problem Statement in `.github/artifacts/analyst/{N}-requirements-{feature-name}.md`
   - **Tasks implemented** — a numbered list matching the Phased Task List in `.github/artifacts/architect/{N}-spec-{feature-name}.md` (e.g., `1. Add pause/resume controls`, `2. Persist timer state`)
   - **How to verify** — one or two steps a reviewer can follow to manually confirm the feature works, drawn from the Acceptance Criteria in the requirements document

   Use this template:

   ```markdown
   # PR: {feature-name}

   **Feature**: {N} — {feature-name}

   ## What

   [One-paragraph summary drawn from the Problem Statement in the requirements document.]

   ## Tasks implemented

   1. [First task title from the Phased Task List]
   2. [Second task title]

   ## How to verify

   1. [Step drawn from Acceptance Criteria]
   2. [Step drawn from Acceptance Criteria]
   ```

4. Commit the PR body file: `git add .github/artifacts/pr/{N}-pr-body-{feature-name}.md && git commit -m "docs(artifacts): add PR body for {N}-{feature-name}"`

5. Push the feature branch: `git push -u origin feature/{feature-name}`
   - If the push fails (e.g., remote rejection, authentication error, no upstream configured), do not proceed — report the exact error output to the user, provide the branch name and a one-line summary of each commit since `main` (`git log main..HEAD --oneline`), and instruct them to push manually before creating the PR. Once they confirm the push succeeded, continue to step 6.
6. Open a pull request targeting `main` using the GitHub CLI:
   - Title: a short imperative sentence describing the change, no longer than 72 characters. Derive it from `{feature-name}` by: (1) replacing all hyphens with spaces to form a noun phrase, (2) prepending an appropriate imperative verb that matches the nature of the change, (3) adjusting the phrase for natural readability (e.g., adding conjunctions where appropriate), (4) ensuring the resulting title starts with a capital letter (e.g., `timer-pause-resume` → `Add timer pause and resume`). Cross-check the resulting title against the Problem Statement in `.github/artifacts/analyst/{N}-requirements-{feature-name}.md` to confirm it accurately describes the change.
   - Command: `gh pr create --base main --title "<title>" --body-file .github/artifacts/pr/{N}-pr-body-{feature-name}.md`
   - If the command fails (e.g., `gh` is not installed or not authenticated), present the path `.github/artifacts/pr/{N}-pr-body-{feature-name}.md` and its full contents to the user, and instruct them to open the pull request manually via the GitHub web interface targeting `main`. Then proceed to step 7.
7. Present the pull request URL to the user (from the terminal output or the manually created PR) along with a confirmation that the workflow is complete and the PR is ready for human review. If the PR was created manually in step 6, ask the user to share the URL before presenting the confirmation.

The agent session ends here. The PR requires human review and approval before merging. Branch cleanup after merge is a manual step.
