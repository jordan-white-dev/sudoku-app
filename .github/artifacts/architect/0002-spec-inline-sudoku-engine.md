# Spec: inline-sudoku-engine

**Feature number**: 0002
**Created**: 2026-05-05
**Version**: 1
**Requirements**: `.github/artifacts/analyst/0002-requirements-inline-sudoku-engine.md`

---

## Summary

The `sudoku@0.0.3` npm package is removed and its logic ported directly into `src/lib/pages/home/utils/sudoku/sudoku.ts` as fully standards-compliant TypeScript. The package provides two behaviors the project consumes — random puzzle generation and puzzle solving — which are currently reached through `sudoku.makepuzzle()` and `sudoku.solvepuzzle()`. Both are replaced with private engine functions written with strict types, descriptive names, functional style where applicable, and no bitwise operators. The public API (`makePuzzle`, `solvePuzzle`) and its behavioral contracts are preserved exactly, including the runtime validation layer. No other files change.

---

## Design Decisions

### Decision: Set-based representation instead of the package's bitmask representation

**Context**: The package's internal solver and generator use 9-bit bitmasks with bitwise operators (`|`, `&`, `^`, `<<`) for the sudoku constraint representation. Biome enforces `noBitwiseOperators: error` across the entire `src/` directory, and `biome-ignore` comments are explicitly forbidden by project rules.

**Decision**: Port the _algorithmic structure_ (constraint propagation, backtracking search, clue minimization) but represent the constraint state as `CellPossibilityMap` (`Array<Set<number>>`) — the same type already used in the file for difficulty evaluation — rather than as bitmask integers. The `Set` operations (`.add()`, `.delete()`, `.has()`, `.size`) exactly parallel the bitwise operations and produce identical results.

**Consequences**: All bitwise operations are eliminated. The existing constraint propagation infrastructure (`isConstraintPropagationSuccessful` and its helpers) is reused directly by the new solver, eliminating duplication. There is a minor performance trade-off (Set heap allocations vs. integer arithmetic), but puzzle generation and solving each run at most once per navigation, making this inconsequential for the application.

---

### Decision: Extend `buildInitialCellPossibilities` to accept an unbranded internal board type

**Context**: The new solver and generator work with `InternalBoardState = Array<number | null>` (unbranded digits), while the existing `buildInitialCellPossibilities` function accepts `RawBoardState` (branded digits). The two types are structurally identical; `RawGivenDigit` is `Branded<number, "RawGivenDigit">` which is a structural subtype of `number`. All existing callers pass `RawBoardState`, which is assignable to `Array<number | null>` via structural subtyping.

**Decision**: Widen the parameter type of `buildInitialCellPossibilities` from `RawBoardState` to `InternalBoardState`. No call site needs to change. The solver and generator call it directly with `InternalBoardState` values. The `CellPossibilityMap` it produces is the same regardless of whether the input digits are branded.

**Consequences**: A single function covers both the difficulty-evaluation path (called with `RawBoardState`) and the solver/generator path (called with `InternalBoardState`). No duplicate initialization logic is introduced.

---

### Decision: Adapt `validateAndNormalizeBoardState` to accept `InternalBoardState` and narrow to `RawBoardState` via type guard

**Context**: The current function accepts `unknown` (because the package output cannot be trusted at the type level) and performs runtime length and per-cell value checks. After the port, all callers pass typed `InternalBoardState` values from internal functions. The requirement is to keep the validation layer — it becomes an invariant assertion that also serves as the branding step.

**Decision**: Change the parameter type from `unknown` to `InternalBoardState`. Retain both checks (length === 81, each cell passes `isRawGivenDigit`). Because `isRawGivenDigit` is a type guard narrowing `number` to `RawGivenDigit`, the `.map()` callback's return type is inferred as `RawGivenDigit | null` = `RawCellState`, making the result `Array<RawCellState>` = `RawBoardState` without any type assertion. Rename the second parameter from the union `"makepuzzle" | "solvepuzzle"` to `string` (since function names are now internal and could change). Rename the `// #region Sudoku Package Validation` region to `// #region Board State Validation`.

**Consequences**: The validation layer doubles as the branded-type boundary between the internal `InternalBoardState` world and the public `RawBoardState` world. Runtime invariants are enforced at both public API exit points. No `as` assertion is needed anywhere in the file.

---

### Decision: Implement `selectMinimalCluesFromSolvedBoard` with local mutation for the iterative clue-removal step

**Context**: The package's `makepuzzle(board)` uses an imperative backwards loop with array mutation (`removeElement` + conditional `push`) to iteratively test and remove clues. A purely functional rewrite using `reduce` or repeated filtering would obscure the intent (test removal of each element, restore if uniqueness breaks) and introduce `O(n²)` array copies.

**Decision**: Use a `const`-declared local `Array<PositionedDigit>` whose elements are mutated via `splice` during the clue-removal loop, matching the project's "mutation is allowed when clearly justified" exception for stateful algorithms. Mutation is confined entirely to the private function body.

**Consequences**: The algorithm is clear top-to-bottom; no `let`-binding of a new array on each iteration. Callers are not exposed to any mutable state.

---

### Decision: Separate solver (`solveWithBacktracking`) from solution counter (`countSolutionsUpToMaximum`)

**Context**: Two distinct behaviors are needed: (1) find the first solution, optionally randomizing candidate order (for `solvePuzzle` and `generateRandomSolvedBoard`); (2) count solutions up to a maximum (for uniqueness verification in `hasPuzzleUniqueSolutionMatchingBoard`). These could share a single function via a callback or flag, but combining them would violate the single-concern rule and add complexity.

**Decision**: Implement two separate recursive functions. `solveWithBacktracking(cellPossibilities, shouldRandomizeCandidates)` returns the first solution found (or `null`). `countSolutionsUpToMaximum(cellPossibilities, maximumSolutionCount)` counts solutions without randomization and returns early once the maximum is reached.

**Consequences**: Each function is small and independently testable. The parameter count stays at two per function.

---

## Architecture Changes

Files to **create**:

_(none)_

Files to **modify**:

- `src/lib/pages/home/utils/sudoku/sudoku.ts` — remove `import sudoku from "sudoku"`; add `InternalBoardState` and `PositionedDigit` private types; widen `buildInitialCellPossibilities` parameter; add solver infrastructure, backtracking solver, puzzle generation utilities, uniqueness validation, and generator functions; update `solvePuzzle` and the `makePuzzle` helper chain to use the new internal functions; adapt `validateAndNormalizeBoardState`; add and reorganize `// #region` blocks
- `src/lib/pages/home/utils/sudoku/sudoku.test.ts` — update or expand tests to cover the new internal behaviors now exposed by the ported engine
- `package.json` — remove `"sudoku": "^0.0.3"` from `dependencies`

Files to **delete**:

_(none)_

---

## Phased Task List

Tasks are listed in dependency order. Each task is fully implemented and reviewed before the next begins.

---

### Task 1: Port the backtracking solver and update `solvePuzzle`

- **Files**: `src/lib/pages/home/utils/sudoku/sudoku.ts`, `src/lib/pages/home/utils/sudoku/sudoku.test.ts`
- **Description**: Add the `InternalBoardState` type, widen `buildInitialCellPossibilities`, and implement the solver infrastructure and recursive backtracking solver private functions; update `solvePuzzle` to call the new `solveInternalBoard` instead of `sudoku.solvepuzzle`.
- **Test first**: Add a `solvePuzzle` test that passes the known `SOLVED_RAW_BOARD_STATE` with the first 50 cells cleared (the existing `SOLVABLE_PUZZLE_BOARD_STATE` fixture) and asserts the returned solution equals `SOLVED_RAW_BOARD_STATE`; this test will remain red until the new solver is wired in.

#### New types (added to a new `// #region Internal Types` section)

| Name                 | Shape                   | Purpose                                                                                                                                                          |
| -------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `InternalBoardState` | `Array<number \| null>` | Unbranded working representation used throughout the engine; `RawBoardState` is a structural subtype so existing callers of widened functions require no changes |

#### Modified functions

| Function                        | Change                                                       |
| ------------------------------- | ------------------------------------------------------------ |
| `buildInitialCellPossibilities` | Widen parameter from `RawBoardState` to `InternalBoardState` |
| `CellPossibilityMap` type alias | Move into the new `// #region Internal Types` section        |

#### New private functions (added after `// #region Difficulty Evaluation`)

**`// #region Solver Infrastructure`**

| Function                                               | Signature                                                       | Description                                                                                                                                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deepCloneCellPossibilityMap`                          | `(cellPossibilities: CellPossibilityMap) => CellPossibilityMap` | Returns a new `Array<Set<number>>` where each Set is a copy of the corresponding source Set; required before every guess attempt so backtracking can restore state                                                         |
| `isCellPossibilityMapFullySolved`                      | `(cellPossibilities: CellPossibilityMap) => boolean`            | Returns `true` when every cell's candidate Set has exactly one element (the puzzle is fully solved)                                                                                                                        |
| `findCellPositionWithFewestCandidates`                 | `(cellPossibilities: CellPossibilityMap) => number \| null`     | Iterates over all 81 positions and returns the position of the first unresolved cell (size > 1) with the fewest candidates; returns `null` if no unresolved cell exists; implements the Minimum Remaining Values heuristic |
| `extractInternalBoardStateFromSolvedCellPossibilities` | `(cellPossibilities: CellPossibilityMap) => InternalBoardState` | Converts a fully-solved `CellPossibilityMap` (all Sets of size 1) into a flat `InternalBoardState` by extracting each Set's single element; caller is responsible for verifying the map is solved before calling           |

**`// #region Backtracking Solver`**

| Function                | Signature                                                                                                   | Description                                                                                                                                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `solveWithBacktracking` | `(cellPossibilities: CellPossibilityMap, shouldRandomizeCandidates: boolean) => InternalBoardState \| null` | Deep-clones the map, runs `isConstraintPropagationSuccessful`; if contradiction returns `null`; if fully solved returns the board; otherwise finds the MRV cell, optionally shuffles its candidates, and recurses into each candidate returning the first non-null result |
| `solveInternalBoard`    | `(boardState: InternalBoardState) => InternalBoardState \| null`                                            | Builds a `CellPossibilityMap` from `boardState` and delegates to `solveWithBacktracking` with `shouldRandomizeCandidates = false`; the deterministic entry point for the public `solvePuzzle`                                                                             |

#### Updated public function

`solvePuzzle`: replace `sudoku.solvepuzzle(rawBoardState)` call with `solveInternalBoard(rawBoardState)`. The null-check and `validateAndNormalizeBoardState` call are unchanged. (The package `import` remains in the file at this stage; it is still referenced by the `makePuzzle` path.)

---

### Task 2: Port the puzzle generator and update `makePuzzle`

- **Files**: `src/lib/pages/home/utils/sudoku/sudoku.ts`, `src/lib/pages/home/utils/sudoku/sudoku.test.ts`
- **Description**: Add generation utilities, uniqueness validation, and the full puzzle generator; update the `makePuzzle` helper chain to use the new internal functions; remove `import sudoku from "sudoku"`; adapt `validateAndNormalizeBoardState`.
- **Test first**: Add a `makePuzzle` test that asserts the returned puzzle has exactly one solution (call `countSolutionsUpToMaximum` via `solvePuzzle` — i.e., solve the puzzle, then for each cell in the solution, verify no other digit produces a valid board; or more directly, write a test that generates 5 puzzles and asserts each returns a non-null `solvePuzzle` result that cannot be re-solved from a different angle); this remains red until `generateInternalPuzzleAttempt` replaces `sudoku.makepuzzle()`.

#### New type (added to `// #region Internal Types`)

| Name              | Shape                                                       | Purpose                                                                                                         |
| ----------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `PositionedDigit` | `{ readonly cellPosition: number; readonly digit: number }` | A clue entry pairing a cell position with its digit value; used to build the clue list during puzzle generation |

#### New private functions

**`// #region Puzzle Generation Utilities`** (added after `// #region Backtracking Solver`)

| Function                         | Signature                                                                      | Description                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createShuffledCopy`             | `<ItemType>(items: Array<ItemType>) => Array<ItemType>`                        | Returns a new array with the same elements in a uniformly random order; uses `.map(item => ({ item, sortKey: Math.random() })).sort(...).map(({ item }) => item)` to avoid the bias of a raw `sort(() => Math.random() - 0.5)` comparator                                                                                                                                                                           |
| `buildBoardFromPositionedDigits` | `(positionedDigits: Array<PositionedDigit>) => InternalBoardState`             | Starts with 81 `null` values and fills in each positioned digit; equivalent to the package's `boardforentries`                                                                                                                                                                                                                                                                                                      |
| `doInternalBoardsMatch`          | `(firstBoard: InternalBoardState, secondBoard: InternalBoardState) => boolean` | Returns `true` when every cell at the same index has the same value in both boards; uses `.every()`                                                                                                                                                                                                                                                                                                                 |
| `deduceAllReachableCellValues`   | `(boardState: InternalBoardState) => InternalBoardState`                       | Builds a `CellPossibilityMap` from `boardState`, runs `isConstraintPropagationSuccessful` (ignoring the boolean result — this is always called with a consistent partial assignment), then extracts a new `InternalBoardState` where each cell with a size-1 Set holds its deduced digit and cells with size > 1 remain `null`; used during clue-set construction to avoid re-adding cells that are already implied |

**`// #region Puzzle Uniqueness Validation`** (added after `// #region Puzzle Generation Utilities`)

| Function                               | Signature                                                                           | Description                                                                                                                                                                                                                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `countSolutionsUpToMaximum`            | `(cellPossibilities: CellPossibilityMap, maximumSolutionCount: number) => number`   | Recursive deterministic backtracking counter; deep-clones and propagates, returns 0 on contradiction, 1 on full solution, otherwise accumulates counts from each candidate branch; short-circuits once `maximumSolutionCount` is reached; does NOT randomize candidates                     |
| `hasPuzzleUniqueSolutionMatchingBoard` | `(candidatePuzzle: InternalBoardState, solvedBoard: InternalBoardState) => boolean` | Returns `true` when (1) `solveInternalBoard(candidatePuzzle)` returns a non-null solution that `doInternalBoardsMatch`es `solvedBoard`, and (2) `countSolutionsUpToMaximum` with `maximumSolutionCount = 2` returns exactly 1; used to validate each candidate clue set during minimization |

#### Updated `// #region Puzzle Generation Strategy`

The existing `generateValidatedPuzzleAttempt` and `selectBestPuzzleOrFallback` functions are replaced by a chain that uses the ported generator:

| Function                            | Signature                                                 | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateRandomSolvedBoard`         | `() => InternalBoardState`                                | Calls `solveWithBacktracking` on an empty `CellPossibilityMap` (all 81 cells set to `new Set([0,1,2,3,4,5,6,7,8])`) with `shouldRandomizeCandidates = true`; always returns a valid board because a valid solution exists for an empty sudoku grid                                                                                                                                                                                                                                                    |
| `selectMinimalCluesFromSolvedBoard` | `(solvedBoard: InternalBoardState) => InternalBoardState` | Implements the clue minimization algorithm: (1) shuffles all 81 positions; (2) iterates in shuffled order — for each position not yet covered by deduction, adds it to the clue list and runs `deduceAllReachableCellValues` to propagate; (3) shuffles the clue list; (4) iterates backwards — for each clue, temporarily removes it via `splice`, tests `hasPuzzleUniqueSolutionMatchingBoard`, restores via `push` if invalid; returns `buildBoardFromPositionedDigits` of the minimized clue list |
| `generateInternalPuzzleAttempt`     | `() => InternalBoardState`                                | Calls `generateRandomSolvedBoard()`, passes the result to `selectMinimalCluesFromSolvedBoard`, and returns the resulting puzzle; replaces the old `generateValidatedPuzzleAttempt` which called `sudoku.makepuzzle()`                                                                                                                                                                                                                                                                                 |

`selectBestPuzzleOrFallback` is updated to call `generateInternalPuzzleAttempt()` instead of `sudoku.makepuzzle()` for the fallback path.

#### Updated `// #region Board State Validation`

`validateAndNormalizeBoardState` is updated:

- Rename region from `// #region Sudoku Package Validation` to `// #region Board State Validation`
- Change first parameter type from `unknown` to `InternalBoardState`
- Change second parameter type from `"makepuzzle" | "solvepuzzle"` to `string`; update error message strings to match the new internal function names (`"generateInternalPuzzleAttempt"` and `"solveInternalBoard"`)
- The length check and per-cell `isRawGivenDigit` guard are preserved; the map callback return type is inferred as `RawGivenDigit | null` via the type guard, so the function's declared return type `RawBoardState` is satisfied without any type assertion

#### Removal

Remove `import sudoku from "sudoku"` (it is no longer referenced anywhere after these changes).

---

### Task 3: Remove the `sudoku` dependency from `package.json`

- **Files**: `package.json`
- **Description**: Delete the `"sudoku": "^0.0.3"` entry from `dependencies` and run `pnpm install` to update the lock file; verify that `pnpm check` passes in full.
- **Test first**: Before making the change, confirm that `pnpm knip` reports `sudoku` as an unused dependency (the import was already removed in Task 2); the change is complete when `pnpm knip` passes without the `sudoku` entry.

---

## Risks & Considerations

- **Technical complexity**: The backtracking solver (`solveWithBacktracking`) is recursive and shares constraint propagation with the existing difficulty-evaluation path. If `isConstraintPropagationSuccessful` mutates a Set that was expected to be clean, backtracking correctness is compromised. The mitigation is `deepCloneCellPossibilityMap` before every propagation attempt; the test suite verifies end-to-end correctness for both `makePuzzle` and `solvePuzzle`.

- **Technical complexity**: `selectMinimalCluesFromSolvedBoard` calls `hasPuzzleUniqueSolutionMatchingBoard` once per candidate clue (up to ~35 clues per puzzle attempt), and each call runs the full solver twice (once to find a solution, once to count solutions). With up to 100 generation attempts in `makePuzzle`, worst-case call count is approximately 100 × 35 × 2 = 7 000 solver invocations. In practice, hard puzzles (most clues needed) complete fewer attempts and constraint propagation eliminates most branches quickly. If generation proves slow in testing, the `MAX_GENERATION_ATTEMPTS` constant can be lowered — but this is not expected to be necessary.

- **Technical complexity**: `generateRandomSolvedBoard` passes a fully empty board (all 81 cells with 9 candidates each) to `solveWithBacktracking` with randomized candidates. The solver must not infinite-loop or return `null` for the empty board. This is guaranteed by the structure of the backtracking algorithm (it always terminates because the search space is finite), but should be covered by a dedicated test asserting that `generateRandomSolvedBoard` returns a valid complete board.

- **Test coverage**: The `sudoku.test.ts` test suite currently covers `makePuzzle` and `solvePuzzle` at the public API level. The new private functions (`solveWithBacktracking`, `countSolutionsUpToMaximum`, `selectMinimalCluesFromSolvedBoard`, etc.) are not directly exported. The Developer should add tests for observable behaviors implied by these functions — e.g., `makePuzzle` produces unique-solution puzzles, `solvePuzzle` returns `null` for puzzles with multiple solutions and a non-null solution for uniquely solvable ones — rather than testing implementation details.

- **Performance**: `createShuffledCopy` uses the `.map().sort().map()` pattern which allocates intermediate objects proportional to the array size. For arrays of 81 elements (cell positions or clue lists), this is negligible. Using `Math.random()` as the sort key is statistically unbiased (the sort key is assigned before sorting, unlike a raw comparator callback that calls `Math.random()` during comparisons, which can be biased depending on the sort algorithm's comparison count).

- **Security**: No security implications. All inputs to the solver and generator are internal values (integers 0–8, null) derived from the application's own board state. The validation layer at the public API boundary continues to guard against malformed `RawBoardState` inputs entering the system.
