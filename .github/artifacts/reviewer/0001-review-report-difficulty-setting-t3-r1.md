# Review Report: difficulty-setting — Task 3

**Feature number**: 0001
**Branch**: feature/0001-difficulty-setting
**Review cycle**: r1
**Date**: 2026-05-05

---

## Summary

Task 3 updates `makePuzzle` in `sudoku.ts` to accept a `targetDifficultyRating` parameter, replaces the hard-coded `=== 0` early-exit with a parameterized match, and introduces a 100-iteration generation loop with a lowest-rated fallback. The implementation is structurally sound and the primary new test correctly validates the early-exit path via a mock. However, the fallback acceptance criterion ("lowest-rated puzzle when no match found in 100 iterations") has no test, the fallback branch of `selectBestPuzzleOrFallback` duplicates `generateValidatedPuzzleAttempt`, and two minor clarity issues were found in the test and across a function boundary.

---

## Findings

### CRITICAL

_(none)_

### HIGH

#### Finding 1

- **Location**: [src/lib/pages/home/utils/sudoku/sudoku.test.ts](src/lib/pages/home/utils/sudoku/sudoku.test.ts)
- **Description**: The acceptance criterion "When no matching puzzle is found within 100 iterations, the puzzle with the lowest computed rating from those iterations is used" has no test. The only new test added validates the early-exit (matching) path; the fallback path — which is the behaviour that fires in the majority of real-world cases for non-zero target ratings — is entirely untested.
- **Remediation**: Add a test inside `describe("makePuzzle")` that mocks `sudokuLib.makepuzzle` to always return a board whose computed rating never equals the target (e.g., always returns a board that rates as 0, while calling `makePuzzle` with a non-zero target). Assert that: (a) `sudokuLib.makepuzzle` was called exactly `MAX_GENERATION_ATTEMPTS` times (i.e., no early exit occurred), and (b) the returned puzzle is the lowest-rated board produced across the iterations (since all boards in this scenario have the same rating of 0, any returned value proves the fallback ran). Export `MAX_GENERATION_ATTEMPTS` from `sudoku.ts` so the test can reference it by name rather than hardcoding `100`.

### MEDIUM

#### Finding 1

- **Location**: [src/lib/pages/home/utils/sudoku/sudoku.ts](src/lib/pages/home/utils/sudoku/sudoku.ts#L326-L344)
- **Description**: The fallback branch of `selectBestPuzzleOrFallback` (lines 333–342) duplicates the body of `generateValidatedPuzzleAttempt` (lines 315–324) exactly — both call `sudoku.makepuzzle()` and then `validateAndNormalizeBoardState(result, "makepuzzle")`. The project's review criteria prohibit duplication of existing utilities.
- **Remediation**: Replace the `const unvalidatedFallbackPuzzle / validateAndNormalizeBoardState` block in `selectBestPuzzleOrFallback`'s `null` branch with a direct call to `generateValidatedPuzzleAttempt()` and return its result. This eliminates the duplication and keeps the fallback consistent with the generation logic.

### LOW

#### Finding 1

- **Location**: [src/lib/pages/home/utils/sudoku/sudoku.test.ts](src/lib/pages/home/utils/sudoku/sudoku.test.ts#L114)
- **Description**: The test calls `makePuzzle(13)` where `13` is a magic number. Its origin — `SOLVABLE_PUZZLE_BOARD_STATE` has 50 empty cells and `Math.ceil(50 / 4) = 13` — requires mental arithmetic to verify and is not documented anywhere in the test.
- **Remediation**: Introduce a named constant in the test file, e.g. `const SOLVABLE_PUZZLE_EXPECTED_DIFFICULTY_RATING = 13;`, with a brief doc comment explaining the derivation (`Math.ceil(50 / 4)`), and substitute it for the literal `13` in the test body.

#### Finding 2

- **Location**: [src/lib/pages/home/utils/sudoku/sudoku.ts](src/lib/pages/home/utils/sudoku/sudoku.ts#L327) and [src/lib/pages/home/utils/sudoku/sudoku.ts](src/lib/pages/home/utils/sudoku/sudoku.ts#L362)
- **Description**: The local variable in `makePuzzle` is named `bestFoundPuzzle` while the corresponding parameter in `selectBestPuzzleOrFallback` is named `bestPuzzleFound` — the same concept with swapped word order. The inconsistency adds unnecessary cognitive friction when reading across the function boundary.
- **Remediation**: Align both names. Rename the parameter in `selectBestPuzzleOrFallback` from `bestPuzzleFound` to `bestFoundPuzzle` to match the call site.

---

## Verdict

**CHANGES REQUESTED**

One acceptance criterion has no test coverage (fallback path), one function contains a duplication of an existing utility, and two minor naming and clarity issues were found.
