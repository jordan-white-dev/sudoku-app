# Requirements: Inline Sudoku Engine

| Field   | Value                |
| ------- | -------------------- |
| Feature | 0002                 |
| Name    | inline-sudoku-engine |
| Version | 1                    |
| Date    | 2026-05-05           |
| Status  | Approved             |

---

## Problem Statement

The project depends on the third-party `sudoku@0.0.3` npm package solely for puzzle generation and solving. The package is written in ES5 JavaScript with no TypeScript types, uses naming and structural patterns that violate project standards, and cannot be modified to comply with those standards. Inlining a fully refactored version of the package logic eliminates the external dependency, brings the code under the project's full type safety and style standards, and removes the awkward runtime validation layer that currently exists only because the package's output cannot be trusted at the type level.

---

## User Stories

- As a developer, I want the sudoku generation and solving logic to live directly in the project source so that I can read, debug, and maintain it using the same conventions as every other file in the codebase.
- As a developer, I want the `sudoku` npm package removed from `package.json` so that the dependency tree is smaller and no unmaintained third-party code is silently executed at runtime.

---

## Acceptance Criteria

### Dependency Removal

- When the change is complete, `sudoku` does not appear in `package.json` dependencies.
- When the change is complete, no file in `src/` imports from the `"sudoku"` package.

### File Changes

- Only `src/lib/pages/home/utils/sudoku/sudoku.ts` and `src/lib/pages/home/utils/sudoku/sudoku.test.ts` are modified; no other source files change.
- `sudoku.ts` does not contain an `import … from "sudoku"` statement after the change.
- `sudoku.ts` exports exactly two public symbols: `makePuzzle` and `solvePuzzle`, with the same type signatures they have today.

### Code Standards Compliance

- Every identifier in `sudoku.ts` — variables, functions, constants, types — follows project naming conventions (camelCase for functions/variables, PascalCase for types, SCREAMING_SNAKE_CASE for module-level constants, descriptive names, no single-character names).
- All logic is written in TypeScript with strict types; no `as any`, `as unknown`, or untyped `unknown` annotations appear in the production code.
- No type assertions (`as T`) are used unless there is genuinely no other option; where used, a justification comment must accompany them.
- Imperative `for` loops are replaced with functional array methods (`map`, `filter`, `reduce`, `every`, `some`, `find`, etc.) wherever the operation is a data transformation; loops that represent inherently stateful algorithms (e.g., backtracking search) may remain as explicit loops if that is clearer.
- Each function has a single, clearly described responsibility; multi-concern functions are split into named helper functions.
- `const` is used throughout; `let` is used only where mutation is clearly required by algorithm state.
- `// #region {Name}` / `// #endregion` comments group related code; nested regions are used where a region contains meaningfully distinct sub-groups.
- No barrel files, no default exports, no inline `type` import violations (type-only imports use the `type` keyword).
- Import grouping order is preserved: package imports → blank line → alias imports → blank line → relative imports.
- No `biome-ignore` comments.
- No commented-out code, dead code, or unresolved TODO comments.

### Behavioral Equivalence

- The refactored `makePuzzle` function produces a valid 81-cell sudoku puzzle (`RawBoardState`) using the same generation and best-puzzle-selection strategy as the current implementation (up to 100 attempts, returning the puzzle with the lowest difficulty score or the first deduction-only-solvable puzzle found).
- The refactored `solvePuzzle` function accepts a `RawBoardState` and returns a solved `RawBoardState` or `null`, with the same semantics as the current implementation.
- The runtime validation layer (array length check, per-cell value check) is preserved; it may be adapted to use internal typed return values rather than validating unknown output, but it must not be silently removed.
- All existing behavioral tests in `sudoku.test.ts` pass after the change; tests may be updated to reflect the new internal structure, and new tests covering previously untested behaviors may be added.

### Build and Tooling

- `pnpm check` passes in full (Biome, TypeScript, Vitest, build, Knip) after the change.
- Knip reports no unused dependencies and no unused exports after the `sudoku` package is removed.

---

## Out of Scope

- Changes to any file other than `sudoku.ts`, `sudoku.test.ts`, and `package.json` (and the lock file updated automatically by `pnpm`).
- Changes to the public API of `makePuzzle` or `solvePuzzle` (parameter types, return types, function names).
- Exporting or re-exposing `ratepuzzle`, `posfor`, or any other internal helper from the package.
- Adding new features to the puzzle generator or solver beyond what currently exists.
- Changing puzzle difficulty behavior (the rating and selection strategy is preserved as-is).

---

## Open Questions

_(none)_
