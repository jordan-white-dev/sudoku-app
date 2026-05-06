# PR: inline-sudoku-engine

**Feature**: 0002 — inline-sudoku-engine

## What

The project previously depended on the third-party `sudoku@0.0.3` npm package solely for puzzle generation and solving. The package is written in ES5 JavaScript with no TypeScript types, uses naming and structural patterns that violate project standards, and could not be modified to comply with those standards. This PR removes that dependency and replaces it with a fully refactored, inline TypeScript implementation of the same logic in `src/lib/pages/home/utils/sudoku/sudoku.ts`. The public API (`makePuzzle` and `solvePuzzle`) is preserved exactly. The new implementation uses `Set`-based constraint representation instead of the package's bitmask arithmetic (required by `noBitwiseOperators: error` in Biome), and introduces a uniqueness-verified clue minimization algorithm that guarantees every generated puzzle has exactly one solution.

## Tasks implemented

1. Port the backtracking solver and update `solvePuzzle` — added `InternalBoardState` type, widened `buildInitialCellPossibilities`, implemented solver infrastructure (`deepCloneCellPossibilityMap`, `isCellPossibilityMapFullySolved`, `findCellPositionWithFewestCandidates`, `extractInternalBoardStateFromSolvedCellPossibilities`) and the recursive `solveWithBacktracking` / `solveInternalBoard` functions; wired `solvePuzzle` to the new engine.
2. Port the puzzle generator and update `makePuzzle` — added `PositionedDigit` type, puzzle generation utilities (`createShuffledCopy`, `buildBoardFromPositionedDigits`, `doInternalBoardsMatch`, `deduceAllReachableCellValues`), uniqueness validation (`countSolutionsUpToMaximum`, `hasPuzzleUniqueSolutionMatchingBoard`), full generator chain (`generateRandomSolvedBoard` → `selectMinimalCluesFromSolvedBoard` → `generateInternalPuzzleAttempt`); updated `validateAndNormalizeBoardState`; removed `import sudoku from "sudoku"`.
3. Remove the `sudoku` dependency from `package.json` — deleted `"sudoku": "^0.0.3"` from dependencies and ran `pnpm install` to update the lockfile.

## How to verify

1. Run `pnpm check` — all commands (Biome, TypeScript, Vitest, build, Knip) should pass in full with no errors or warnings.
2. Run the app locally with `pnpm dev`, navigate to a puzzle, and confirm a new puzzle loads on each visit and can be solved to completion — verifying that `makePuzzle` generates valid, playable puzzles and `solvePuzzle` correctly solves them.

## Artifacts

Requirements: .github/artifacts/analyst/0002-requirements-inline-sudoku-engine.md
Spec: .github/artifacts/architect/0002-spec-inline-sudoku-engine.md
Review reports: .github/artifacts/reviewer/0002-review-report-inline-sudoku-engine-t1-r1.md, t1-r2.md, t2-r1.md
