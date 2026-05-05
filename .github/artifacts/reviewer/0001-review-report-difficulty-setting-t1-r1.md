# Review Report — 0001 Difficulty Setting — Task 1 — Cycle 1

**Feature:** 0001-difficulty-setting
**Task:** 1 — Add `PuzzleDifficultyLevel` type, constants, and conversion functions
**Branch:** feature/0001-difficulty-setting
**Review cycle:** R1

---

## Verdict

**CHANGES REQUESTED**

---

## Scope Reviewed

- `src/lib/pages/home/utils/constants.ts`
- `src/lib/pages/home/utils/types.ts`
- `src/lib/pages/home/utils/sudoku/sudoku.ts`
- `src/lib/pages/home/utils/sudoku/sudoku.test.ts`

---

## Findings

### CRITICAL

_(none)_

### HIGH

_(none)_

### MEDIUM

#### M1 — `getDifficultyLevelFromRating` tests omit Arrange/Act/Assert structure

**File:** [src/lib/pages/home/utils/sudoku/sudoku.test.ts](src/lib/pages/home/utils/sudoku/sudoku.test.ts#L197-L217)

All five `getDifficultyLevelFromRating` tests collapse Act and Assert into a single inline `expect(getDifficultyLevelFromRating(…)).toBe(…)` expression. The project rule states tests must be structured using Arrange, Act, and Assert. Every other new test block in the same file (`ratePuzzleDifficulty` and `getDifficultyLevelFromRawBoardState`) follows explicit AAA with named intermediate variables and comment labels. These five tests must be updated to extract the function call into a named variable (`// Act`) and assert against it separately (`// Assert`).

**Example — current:**

```ts
it("returns 'Standard' for a rating of 0", () => {
  expect(getDifficultyLevelFromRating(0)).toBe("Standard");
});
```

**Example — required:**

```ts
it("returns 'Standard' for a rating of 0", () => {
  // Act
  const puzzleDifficultyLevel = getDifficultyLevelFromRating(0);

  // Assert
  expect(puzzleDifficultyLevel).toBe("Standard");
});
```

### LOW

#### L1 — Variable `level` is too generic in `getDifficultyLevelFromRating` implementation

**File:** [src/lib/pages/home/utils/sudoku/sudoku.ts](src/lib/pages/home/utils/sudoku/sudoku.ts#L348)

```ts
const level = puzzleDifficultyLevels[cappedRating];
```

The naming rule requires names that are "correct, meaningful, descriptive, self-documenting, and nonambiguous" and prefers specificity over brevity. `level` on its own is too generic. Rename to `puzzleDifficultyLevel`.

#### L2 — Variable `level` is too generic in `getDifficultyLevelFromRawBoardState` tests

**File:** [src/lib/pages/home/utils/sudoku/sudoku.test.ts](src/lib/pages/home/utils/sudoku/sudoku.test.ts#L222-L248)

Both `getDifficultyLevelFromRawBoardState` tests assign the result to `level`. The same naming rule applies. Rename to `puzzleDifficultyLevel` to be consistent with the remediated `getDifficultyLevelFromRating` tests (M1) and with the project naming standard.

#### L3 — Spec task description not fully implemented (documented deviation)

**File:** `.github/artifacts/architect/0001-spec-difficulty-setting.md`

Task 1 in the spec explicitly lists adding `USER_SETTINGS_LOCAL_STORAGE_KEY` and `DIFFICULTY_RATING_BY_LEVEL` to `constants.ts`. Both were deferred to Tasks 2 and 5 to avoid `knip` unused-export failures — a technically sound rationale that is documented in the commit message. No code change is required. The Architect should update the spec's Task 1 description to reflect actual task boundaries before the next review cycle.

---

## Checklist

| Check                                        | Result                                  |
| -------------------------------------------- | --------------------------------------- |
| Implementation matches task spec description | Partial — L3                            |
| All task acceptance criteria met             | Deferred to later tasks — noted         |
| No new files created outside spec            | Pass                                    |
| No unused exports                            | Pass — deferred to avoid violation      |
| Types are strict and correct                 | Pass                                    |
| No `biome-ignore` comments                   | Pass                                    |
| No barrel files introduced                   | Pass                                    |
| No default exports added                     | Pass                                    |
| Naming rules followed                        | Fail — L1, L2                           |
| Test structure follows AAA convention        | Fail — M1                               |
| Test descriptions in correct case            | Pass                                    |
| Tests cover all spec-required scenarios      | Pass                                    |
| No UI changes requiring accessibility review | Pass — no UI changes                    |
| No README update required                    | Pass — no user-visible behavior changes |
| `pnpm check` passed before handoff           | Pass                                    |
