# Review Report: difficulty-setting — Task 6

**Feature number**: 0001
**Branch**: feature/0001-difficulty-setting
**Review cycle**: r1
**Date**: 2026-05-05

---

## Summary

T6 correctly adds a `PuzzleDifficultyLabel` sub-component to `PuzzleControls` that calls `getDifficultyLevelFromRawBoardState` and renders `"Difficulty: {level}"`. The outer `Stack direction="column"` wrapper is in place, the label is the first child, naming and import ordering are clean, and the two new tests pass with the real function (no mock of `getDifficultyLevelFromRawBoardState`, which is the correct testing strategy here). Two issues require remediation: the README was not updated to document the new label, and the label tests only cover two of the four possible display values.

---

## Findings

### CRITICAL

_(none)_

### HIGH

#### Finding 1

- **Location**: `README.md`
- **Description**: T6 introduces a user-visible "Difficulty: {level}" label rendered above the puzzle controls for every active puzzle. This is a new UI element visible to all users, but `README.md` has no mention of it anywhere — not in "How to Use the App", "Settings", or any other section. The review instructions require the README to be updated whenever a task introduces user-visible behavior changes.
- **Remediation**: Add a short section (or paragraph under "Starting a Puzzle" or a new "Difficulty Label" section) explaining that every puzzle displays its computed difficulty level directly above the controls, and that the level reflects the actual puzzle rather than the user's target preference. Wording should be consistent with the rest of the README's style.

### MEDIUM

_(none)_

### LOW

#### Finding 1

- **Location**: `src/lib/pages/home/components/puzzle-controls/puzzle-controls.test.tsx`, `Difficulty label` describe block
- **Description**: The two new tests cover only Intermediate (81 given-zero cells) and Expert (81 null cells). Standard and Advanced label rendering are untested at the component level. The `getDifficultyLevelFromRawBoardState` function is fully unit-tested in `sudoku.test.ts`, but the component's rendering of "Difficulty: Standard" and "Difficulty: Advanced" text is unverified. A Standard test is achievable by inlining the `SOLVED_RAW_BOARD_STATE` fixture (already defined in `sudoku.test.ts`): pass it as `rawBoardState` and assert `"Difficulty: Standard"`. An Advanced test is harder to construct without mocking and can be omitted, but Standard is straightforward.
- **Remediation**: Add a third test that passes a known deduction-solvable board (e.g., the `SOLVED_RAW_BOARD_STATE` values from `sudoku.test.ts` defined inline) and asserts `"Difficulty: Standard"` is rendered.

---

## Verdict

**CHANGES REQUESTED**

README not updated for a user-visible new UI element (HIGH), and the difficulty label test suite is missing the Standard case (LOW).
