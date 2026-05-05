# Review Report: difficulty-setting — Task 5

**Feature number**: 0001
**Branch**: feature/0001-difficulty-setting
**Review cycle**: r1
**Date**: 2026-05-05

---

## Summary

Task 5 wires `handleNewPuzzleConfirmation` to accept and use `targetDifficultyRating`, reads `preferredDifficultyLevel` from `useUserSettings` in `NewPuzzleButton`, and adds a test asserting `makePuzzle` receives the correct rating. The logic and test strategy are correct in intent, but a partial application of one of the `multi_replace_string_in_file` edits introduced a duplicate `<Button` opening tag that makes `NewPuzzleDialogFooter` syntactically invalid — the entire file fails to compile. Two secondary findings are also present: dead code left behind in the test file from the pre-existing `vi.mock("sudoku")` block, and a mildly ambiguous mock variable name.

---

## Findings

### CRITICAL

#### Finding 1

- **Location**: [src/lib/pages/home/components/puzzle-actions/puzzle-actions.tsx](src/lib/pages/home/components/puzzle-actions/puzzle-actions.tsx#L212-L225)
- **Description**: `NewPuzzleDialogFooter` contains a duplicate `<Button` opening tag at line 217. The first `<Button>` element is missing its closing `>` and is immediately followed by a second `<Button` element. This makes the JSX syntactically invalid and causes cascading compile errors throughout the rest of the file. The IDE confirms 50+ compile errors originating from this point.
- **Remediation**: Replace the malformed `NewPuzzleDialogFooter` JSX with a correctly structured version — the "New Puzzle" `Dialog.ActionTrigger` block should contain exactly one `<Button>` with the `onClick` prop closed normally: `onClick={() => handleNewPuzzleConfirmation(navigate, targetDifficultyRating)}`, followed by `>`, `New Puzzle`, `</Button>`. Remove the duplicate `<Button` block entirely.

### HIGH

_(none)_

### MEDIUM

#### Finding 1

- **Location**: [src/lib/pages/home/components/puzzle-actions/puzzle-actions.test.tsx](src/lib/pages/home/components/puzzle-actions/puzzle-actions.test.tsx#L39), [src/lib/pages/home/components/puzzle-actions/puzzle-actions.test.tsx](src/lib/pages/home/components/puzzle-actions/puzzle-actions.test.tsx#L79-L81), [src/lib/pages/home/components/puzzle-actions/puzzle-actions.test.tsx](src/lib/pages/home/components/puzzle-actions/puzzle-actions.test.tsx#L273-L274)
- **Description**: `mockMakePuzzle`, `vi.mock("sudoku", ...)`, `mockMakePuzzle.mockReset()`, and `mockMakePuzzle.mockReturnValue(EMPTY_RAW_BOARD_STATE)` are now dead code. Adding `vi.mock("@/lib/pages/home/utils/sudoku/sudoku", ...)` replaces the entire `sudoku.ts` module, so the `sudoku` library is never imported during test execution. The `vi.mock("sudoku", ...)` factory is registered but never executed; the `mockMakePuzzle` setup in `beforeEach` runs but has no observable effect on any test.
- **Remediation**: Remove the `const mockMakePuzzle = vi.fn();` declaration, the `vi.mock("sudoku", () => ({ makepuzzle: () => mockMakePuzzle() }));` block, `mockMakePuzzle.mockReset()`, and `mockMakePuzzle.mockReturnValue(EMPTY_RAW_BOARD_STATE)` from `beforeEach`.

### LOW

#### Finding 1

- **Location**: [src/lib/pages/home/components/puzzle-actions/puzzle-actions.test.tsx](src/lib/pages/home/components/puzzle-actions/puzzle-actions.test.tsx#L40)
- **Description**: `mockMakePuzzleFn` uses a generic "Fn" suffix that does not distinguish which `makePuzzle` is being mocked. In context the file now has two mock variables for similarly-named functions, and "Fn" conveys only "this is a function" rather than identifying the specific module origin.
- **Remediation**: Rename `mockMakePuzzleFn` to `mockMakePuzzleUtility` to make clear it mocks the `makePuzzle` export from `@/lib/pages/home/utils/sudoku/sudoku`. Update all references: the `vi.mock` factory, `mockMakePuzzleFn.mockReset()`, `mockMakePuzzleFn.mockReturnValue(...)`, and the assertion in the new test.

---

## Verdict

**CHANGES REQUESTED**

A duplicate `<Button` tag in `NewPuzzleDialogFooter` renders the entire file syntactically invalid; additionally, dead code was left in the test file and a mock variable name is ambiguous.
