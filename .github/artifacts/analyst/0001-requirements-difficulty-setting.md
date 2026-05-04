# Requirements: difficulty-setting

**Feature number**: 0001
**Created**: 2026-05-04
**Version**: 1

---

## Problem Statement

Players of all skill levels use the sudoku app, but today every puzzle is generated without regard for difficulty. Beginners are frequently confronted with puzzles that feel overwhelming, while experienced solvers find the puzzles too easy to be engaging. Adding a user-controlled difficulty setting lets each player choose the challenge level that matches their skill, making the app meaningfully useful to a wider audience.

---

## User Stories

- As a new player, I want to choose an easy difficulty so that I can learn the game without getting discouraged.
- As an experienced player, I want to select a harder difficulty so that I am consistently challenged.
- As any player, I want my difficulty preference to be remembered across sessions so that I do not have to re-select it every time I open the app.
- As any player, I want to see the actual difficulty of the puzzle I am currently solving so that I know what I am up against.
- As any player, I want changing my difficulty preference to leave my current puzzle untouched so that I can finish what I started.

---

## Acceptance Criteria

**Difficulty levels**

- The app supports exactly four difficulty levels, in order from easiest to hardest: Standard, Intermediate, Advanced, Expert.
- Standard corresponds to a puzzle rating of 0, Intermediate to 1, Advanced to 2, and Expert to 3, as produced by the existing `ratePuzzleDifficulty()` function.

**Settings menu — radio group**

- When the user opens the Settings menu in the header, a Chakra UI Radio group is displayed with a visible "Difficulty" label above the options.
- The radio group contains exactly four options listed in order: Standard, Intermediate, Advanced, Expert.
- When the user selects a radio option, the difficulty preference updates immediately.
- The radio group reflects the user's currently stored preference at all times.

**Persistence and defaults**

- When a user visits the app for the first time (no stored preference), the difficulty defaults to Standard.
- The selected difficulty is persisted in `localStorage` and survives closing and reopening the browser tab.
- When the app loads, the stored difficulty preference is restored and applied to any subsequent puzzle generation.

**Puzzle generation**

- When a new puzzle is generated (on first load to the home page or via the New Puzzle button), the generator targets the user's currently stored difficulty rating.
- The generator attempts up to 100 puzzle-generation iterations to find a puzzle whose `ratePuzzleDifficulty()` result matches the target rating.
- When the generator finds a matching puzzle within 100 iterations, that puzzle is used.
- When no matching puzzle is found within 100 iterations, the puzzle with the lowest computed rating from those iterations is used.

**In-play difficulty label**

- When a puzzle is active (whether generated, URL-loaded, shared-link, or bookmarked), a "Difficulty: {level}" label is displayed directly above the puzzle controls.
- `{level}` is the human-readable name (Standard, Intermediate, Advanced, or Expert) derived from the `ratePuzzleDifficulty()` result for the active puzzle — not the user's target preference.
- The label is computed and displayed for every puzzle; there is no unrated or unknown state.

**Change behavior**

- When the user changes their difficulty preference while a puzzle is in progress, the active puzzle is not affected.
- The new preference takes effect only when the next puzzle is generated or loaded.

**Existing users**

- When the feature ships, users with an in-progress puzzle see no change to their active puzzle.
- The new Difficulty radio group simply appears in the Settings menu on their next visit, defaulting to Standard if no preference is stored.

---

## Out of Scope

- Difficulty-based puzzle browsing or filtering
- Per-puzzle difficulty history or statistics
- Custom or user-defined difficulty levels
- Difficulty-based scoring or time adjustments
- Any change to how in-progress puzzles are stored or migrated

---

## Open Questions

None — all questions resolved.
