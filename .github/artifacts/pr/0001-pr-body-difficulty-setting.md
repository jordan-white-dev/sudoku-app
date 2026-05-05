# PR: difficulty-setting

**Feature**: 0001 — difficulty-setting

## What

Players of all skill levels use the sudoku app, but previously every puzzle was generated without regard for difficulty. Beginners were frequently confronted with puzzles that felt overwhelming, while experienced solvers found them too easy. This feature adds a four-level difficulty setting — Standard, Intermediate, Advanced, and Expert — allowing each player to choose the challenge level that matches their skill. The preference is persisted in localStorage, restored on every visit, and applied whenever a new puzzle is generated. Every active puzzle also displays a "Difficulty: {level}" label derived from its actual computed rating, so players always know what they are up against.

## Tasks implemented

1. Add `PuzzleDifficultyLevel` type, shared constants, and difficulty conversion functions
2. Add `preferredDifficultyLevel` to `UserSettings` and add `getPreferredDifficultyRatingFromStorage`
3. Update `makePuzzle` to accept `targetDifficultyRating`
4. Update `index.tsx` route loader to pass difficulty to `makePuzzle`
5. Update New Puzzle handler to pass difficulty to `makePuzzle`
6. Add difficulty label to `PuzzleControls`
7. Add difficulty radio group to the Settings menu

## How to verify

1. Open the app and click the Settings (gear) icon. A "Difficulty" radio group should appear below the existing settings, with four options: Standard, Intermediate, Advanced, and Expert. Select "Expert", then use the New Puzzle button to generate a new puzzle — the preference should persist across page reloads and be applied to subsequent puzzle generation.
2. Observe the "Difficulty: Standard" (or whichever level was computed) label displayed directly above the puzzle controls for every puzzle, including puzzles loaded from a URL or bookmark.
