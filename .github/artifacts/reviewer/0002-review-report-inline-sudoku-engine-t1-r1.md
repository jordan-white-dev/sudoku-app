# Review Report: inline-sudoku-engine — Task 1

**Feature number**: 0002
**Branch**: feature/0002-inline-sudoku-engine
**Review cycle**: r1
**Date**: 2026-05-05

---

## Summary

Task 1 ports the backtracking solver and wires `solvePuzzle` to the new `solveInternalBoard` implementation, replacing the call to `sudoku.solvepuzzle()`. All new private functions were added in the correct regions, the `InternalBoardState` type and `CellPossibilityMap` alias are correctly placed in the new `// #region Internal Types` section, `buildInitialCellPossibilities` was widened as specified, and `pnpm check` passes in full. Two MEDIUM findings were identified: a non-descriptive variable name in `solveWithBacktracking`, and a new test whose name misrepresents what it actually asserts.

---

## Findings

### CRITICAL

_(none)_

### HIGH

_(none)_

### MEDIUM

#### Finding 1

- **Location**: `src/lib/pages/home/utils/sudoku/sudoku.ts`, line ~363 (`const result = solveWithBacktracking(...)`)
- **Description**: The variable `result` does not describe what it holds. Per project naming rules, every variable must be correct, meaningful, descriptive, and non-ambiguous. In this context `result` is the potential solution found by recursively testing one candidate digit in a backtracking branch — a generic name that gives no indication of what kind of value it carries.
- **Remediation**: Rename `result` to `candidateSolution` to accurately reflect that this is the solution (or null) produced when trying a specific candidate digit in the backtracking branch. Apply the rename consistently at both the assignment and the `if (result !== null)` / `return result` sites.

---

#### Finding 2

- **Location**: `src/lib/pages/home/utils/sudoku/sudoku.test.ts`, lines ~163–172 (test: `"returns the same deterministic solution on every call for the same solvable puzzle"`)
- **Description**: The test description claims to verify that `solvePuzzle` returns the same solution on every call for the same input (i.e., determinism). However, the test body calls `solvePuzzle` exactly once and asserts the result against a hard-coded fixture. It does not call `solvePuzzle` a second time, so it cannot detect non-determinism. Additionally, `SOLVABLE_PUZZLE_BOARD_STATE` has multiple valid solutions (31 clues do not uniquely constrain a sudoku board), so the hard-coded fixture `DETERMINISTIC_SOLUTION_FOR_SOLVABLE_PUZZLE` captures a specific implementation-internal choice rather than a behavioral contract. Per project testing conventions, test descriptions must reflect business behavior rather than implementation details.
- **Remediation**: Replace the test with one that calls `solvePuzzle` twice with the same input and asserts both calls return equal results — this directly tests the determinism property the description claims to verify. Use `SOLVABLE_PUZZLE_BOARD_STATE` as the input (it is still appropriate since a deterministic solver must produce the same output regardless of whether the puzzle is uniquely solvable). Remove the `DETERMINISTIC_SOLUTION_FOR_SOLVABLE_PUZZLE` fixture constant as it will no longer be needed. Rename the test to `"returns the same solution on repeated calls with the same board state"`.

---

### LOW

_(none)_

---

## Verdict

**CHANGES REQUESTED**

Two MEDIUM findings: a non-descriptive `result` variable name in `solveWithBacktracking`, and a test whose description claims to verify determinism but whose body only asserts a hard-coded snapshot value.
