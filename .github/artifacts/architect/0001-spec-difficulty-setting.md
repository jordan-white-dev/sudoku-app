# Spec: difficulty-setting

**Feature number**: 0001
**Created**: 2026-05-04
**Version**: 3
**Requirements**: `.github/artifacts/analyst/0001-requirements-difficulty-setting.md`

---

## Summary

This feature adds a four-level difficulty setting (Standard / Intermediate / Advanced / Expert) to the sudoku app. Users select their preferred difficulty via a `RadioGroup` in the existing Settings menu; the preference is persisted in `localStorage` alongside the other user settings. The puzzle generator is updated to accept a target difficulty rating and search up to 100 iterations for an exact match before falling back to the lowest-rated puzzle found. Every active puzzle — whether generated or URL-loaded — displays a "Difficulty: {level}" label computed from the actual puzzle rating, placed directly above the puzzle controls.

---

## Design Decisions

### Decision: Parameterize `makePuzzle` with an explicit target rating

**Context**: `makePuzzle` currently takes no arguments and always targets a rating of 0. Two callers exist: the TanStack Router route loader in `src/routes/index.tsx` (which runs outside React) and the New Puzzle confirmation handler in `puzzle-actions.tsx` (which runs inside a React component).

**Decision**: Change `makePuzzle(targetDifficultyRating: number): RawBoardState`. Every caller is responsible for passing the correct rating. The route loader reads it via `getPreferredDifficultyRatingFromStorage()` exported from `use-user-settings.tsx`; the New Puzzle handler reads it from `useUserSettings`.

**Consequences**: The generator remains a pure, testable function with no hidden dependencies. Both call sites are explicit about intent. The route-loader path requires direct localStorage access (see ADR 3).

---

### Decision: Persist `preferredDifficultyLevel` as a field on `UserSettings`

**Context**: The difficulty preference must survive page reloads. The app already persists all other user preferences in a single `"user-settings"` localStorage key via `useLocalStorageState`.

**Decision**: Add `preferredDifficultyLevel: PuzzleDifficultyLevel` to the `UserSettings` type and default it to `"Standard"` in `defaultUserSettings`.

**Consequences**: The difficulty preference participates in the same read/write lifecycle as the other settings; no new localStorage key is introduced; the existing `setUserSettings` updater pattern handles the new field without modification.

---

### Decision: Read localStorage directly in the route loader

**Context**: The TanStack Router `loader` function in `src/routes/index.tsx` executes synchronously outside of the React tree, making hooks unavailable.

**Decision**: Export `getPreferredDifficultyRatingFromStorage(): number` from `src/lib/pages/home/hooks/use-user-settings/use-user-settings.tsx` as a non-hook named export. It reads `window.localStorage.getItem(USER_SETTINGS_LOCAL_STORAGE_KEY)`, parses the JSON safely, validates the `preferredDifficultyLevel` field against the known `puzzleDifficultyLevels` values, and returns the corresponding numeric rating, defaulting to `0` on any failure. Placing it in `use-user-settings.tsx` keeps it co-located with the `UserSettings` type, `defaultUserSettings`, and the storage key it depends on.

**Consequences**: The loader stays thin; all validation logic is centralised and testable in `use-user-settings.test.tsx`. Untrusted localStorage input is validated before use, satisfying the OWASP input-validation requirement. No new file is required.

---

### Decision: Distribute difficulty utility functions across existing modules rather than creating a new file

**Context**: The feature requires conversion utilities (`getDifficultyLevelFromRating`, `getDifficultyLevelFromRawBoardState`, `DIFFICULTY_RATING_BY_LEVEL`) that do not naturally belong to any single existing module. A new `difficulty.ts` module was considered but ruled out to avoid adding files.

**Decision**: Place `DIFFICULTY_RATING_BY_LEVEL` and `puzzleDifficultyLevels` in `constants.ts` alongside the other domain constants. Place `getDifficultyLevelFromRating` and `getDifficultyLevelFromRawBoardState` in `sudoku.ts` because they are direct consumers of `ratePuzzleDifficulty`, which already lives there. Place `getPreferredDifficultyRatingFromStorage` in `use-user-settings.tsx` because it shares the `USER_SETTINGS_LOCAL_STORAGE_KEY` and `UserSettings` schema with that module.

**Consequences**: No new files are introduced. Each function is co-located with its primary dependency. `sudoku.ts` gains two additional public exports alongside `makePuzzle` and `solvePuzzle`; `use-user-settings.tsx` gains one non-hook named export. Both additions are small and do not change module responsibilities meaningfully.

---

### Decision: Place the difficulty label inside `PuzzleControls` above the existing control Stack

**Context**: The difficulty label must appear "directly above the puzzle controls" in both layout modes. In row layout the controls Stack runs column-wise (top-to-bottom); in column layout it runs row-wise (left-to-right). Adding the label as a sibling in `puzzle.tsx` would render it between the board and the controls column in row layout, not above them.

**Decision**: Wrap the existing inner `Stack` in `PuzzleControls` with an outer `Stack direction="column" alignItems="center"` and render a `PuzzleDifficultyLabel` sub-component as the first child of that outer Stack. `PuzzleControls` already receives `rawBoardState`, which is passed to the label.

**Consequences**: The label is always visually above the controls regardless of layout. `PuzzleControls` remains the sole owner of the difficulty-display concern. The outer wrapper introduces one additional DOM element but no structural or sizing regressions to the existing layout (the outer Stack is `alignItems="center"` to match).

---

### Decision: Embed the difficulty radio group inside the existing `Menu` as a non-menu-item section

**Context**: Requirements specify the radio group must appear inside the existing Settings menu dropdown. Menus have `role="menu"`, and standard menu items carry `role="menuitem"` or `role="menuitemcheckbox"`. Adding a custom widget inside a menu requires care to avoid accessibility violations.

**Decision**: Add a `Box` with `role="group"` and `aria-labelledby` pointing to a visible "Difficulty" heading, placed as a non-interactive sibling of the existing `Menu.ItemGroup` elements inside `Menu.Content`. The `RadioGroup` and its four `Radio` items are nested inside this `Box`. Because the `Box` is not a Chakra `Menu.Item` descendant, the menu's auto-close behaviour is not triggered by radio selections.

**Consequences**: The group label is visible and surfaced to assistive technology; the radio inputs function as standard keyboard-navigable radio buttons within the menu context. Keyboard focus management inside the menu's composite widget must be validated during implementation (see Risks).

---

## Architecture Changes

Files to **create**:

_(none)_

Files to **modify**:

- `src/lib/pages/home/utils/types.ts` — add `PuzzleDifficultyLevel` union type (`"Standard" | "Intermediate" | "Advanced" | "Expert"`)
- `src/lib/pages/home/utils/constants.ts` — add `puzzleDifficultyLevels` ordered `as const` array, `USER_SETTINGS_LOCAL_STORAGE_KEY = "user-settings"` string constant, and `DIFFICULTY_RATING_BY_LEVEL` record mapping each `PuzzleDifficultyLevel` to its numeric rating 0–3
- `src/lib/pages/home/utils/sudoku/sudoku.ts` — export `ratePuzzleDifficulty`; add exports `getDifficultyLevelFromRating` and `getDifficultyLevelFromRawBoardState`; change `makePuzzle` signature to `(targetDifficultyRating: number): RawBoardState` and update the generation loop to target the given rating
- `src/lib/pages/home/utils/sudoku/sudoku.test.ts` — add tests for `ratePuzzleDifficulty`, `getDifficultyLevelFromRating`, and `getDifficultyLevelFromRawBoardState`; add tests for the parameterized `makePuzzle` behavior
- `src/lib/pages/home/hooks/use-user-settings/use-user-settings.tsx` — add `preferredDifficultyLevel: PuzzleDifficultyLevel` field to `UserSettings` and `defaultUserSettings`; update the `useLocalStorageState` call to use the exported `USER_SETTINGS_LOCAL_STORAGE_KEY` constant; add `getPreferredDifficultyRatingFromStorage` as a non-hook named export
- `src/lib/pages/home/hooks/use-user-settings/use-user-settings.test.tsx` — add tests for the new `preferredDifficultyLevel` default and persistence behavior, and for `getPreferredDifficultyRatingFromStorage`
- `src/routes/index.tsx` — import `getPreferredDifficultyRatingFromStorage` from `use-user-settings.tsx`; call it at the top of the loader and pass the result to `makePuzzle`
- `src/lib/pages/home/components/puzzle-actions/puzzle-actions.tsx` — pass `DIFFICULTY_RATING_BY_LEVEL[userSettings.preferredDifficultyLevel]` as the target rating to `makePuzzle` inside `handleNewPuzzleConfirmation`
- `src/lib/pages/home/components/puzzle-actions/puzzle-actions.test.tsx` — add a test asserting that the `makePuzzle` mock receives the correct target rating when New Puzzle is confirmed; update the existing mock setup if needed
- `src/lib/pages/home/components/puzzle-controls/puzzle-controls.tsx` — add an outer `Stack direction="column"` wrapper containing a new `PuzzleDifficultyLabel` sub-component above the existing controls Stack; import `getDifficultyLevelFromRawBoardState` from `sudoku.ts`
- `src/lib/pages/home/components/puzzle-controls/puzzle-controls.test.tsx` — add tests asserting the difficulty label renders the correct level for a known puzzle board
- `src/lib/pages/home/components/header/header.tsx` — add a `DifficultyRadioGroup` sub-component inside `SettingsMenu` that renders a labeled `RadioGroup` with four `Radio` options reading from and writing to `userSettings.preferredDifficultyLevel`
- `src/lib/pages/home/components/header/header.test.tsx` — add tests for the difficulty radio group: presence of options, correct default selection, persistence on change, and that menu stays open on selection

Files to **delete**:

_(none)_

---

## Phased Task List

Tasks are listed in dependency order. Each task is fully implemented and reviewed before the next begins.

1. **Add `PuzzleDifficultyLevel` type, shared constants, and difficulty conversion functions**
   - Files: `src/lib/pages/home/utils/types.ts`, `src/lib/pages/home/utils/constants.ts`, `src/lib/pages/home/utils/sudoku/sudoku.ts`, `src/lib/pages/home/utils/sudoku/sudoku.test.ts`
   - Description: Add the `PuzzleDifficultyLevel` union type to `types.ts`; add `puzzleDifficultyLevels`, `USER_SETTINGS_LOCAL_STORAGE_KEY`, and `DIFFICULTY_RATING_BY_LEVEL` to `constants.ts`; export `ratePuzzleDifficulty` from `sudoku.ts` and add exports `getDifficultyLevelFromRating` (maps a numeric rating to a `PuzzleDifficultyLevel`, capping at `"Expert"` for ratings ≥ 3) and `getDifficultyLevelFromRawBoardState` (calls `ratePuzzleDifficulty` then `getDifficultyLevelFromRating`)
   - Test first: In `sudoku.test.ts`, write tests for `ratePuzzleDifficulty` (returns `0` for a fully given board, returns `> 0` for a board with many empty cells); write tests for `getDifficultyLevelFromRating` asserting each boundary (0 → `"Standard"`, 1 → `"Intermediate"`, 2 → `"Advanced"`, 3 → `"Expert"`, 10 → `"Expert"`)

2. **Add `preferredDifficultyLevel` to `UserSettings` and add `getPreferredDifficultyRatingFromStorage`**
   - Files: `src/lib/pages/home/hooks/use-user-settings/use-user-settings.tsx`, `src/lib/pages/home/hooks/use-user-settings/use-user-settings.test.tsx`
   - Description: Add `preferredDifficultyLevel: PuzzleDifficultyLevel` to the `UserSettings` type with a default of `"Standard"` in `defaultUserSettings`; update the `useLocalStorageState` call to use the exported `USER_SETTINGS_LOCAL_STORAGE_KEY` constant; add `getPreferredDifficultyRatingFromStorage` as a non-hook named export that reads and validates localStorage, returning the correct numeric rating or `0` on any failure
   - Test first: In `use-user-settings.test.tsx`, write a test asserting that when no preferences are stored, `preferredDifficultyLevel` equals `"Standard"`; write a test for `getPreferredDifficultyRatingFromStorage` asserting it returns `0` when localStorage is empty and the correct rating when a valid level is stored

3. **Update `makePuzzle` to accept `targetDifficultyRating`**
   - Files: `src/lib/pages/home/utils/sudoku/sudoku.ts`, `src/lib/pages/home/utils/sudoku/sudoku.test.ts`
   - Description: Change `makePuzzle` to accept `targetDifficultyRating: number`; update the generation loop to return immediately when `puzzleDifficultyScore === targetDifficultyRating` and to track the lowest-rated puzzle for the fallback; remove the hard-coded `=== 0` early-exit
   - Test first: In `sudoku.test.ts`, add a test that mocks `sudoku.makepuzzle` to produce a board with a known computed rating and asserts `makePuzzle(thatRating)` returns it on the first attempt

4. **Update `index.tsx` route loader to pass difficulty to `makePuzzle`**
   - Files: `src/routes/index.tsx`
   - Description: Import `getPreferredDifficultyRatingFromStorage` from `use-user-settings.tsx`; call it at the top of the loader to get the target rating; pass the rating to `makePuzzle`
   - Test first: No dedicated test file for the route loader; correctness of `getPreferredDifficultyRatingFromStorage` is covered by Task 2 tests, and `makePuzzle` by Task 3 tests

5. **Update New Puzzle handler to pass difficulty to `makePuzzle`**
   - Files: `src/lib/pages/home/components/puzzle-actions/puzzle-actions.tsx`, `src/lib/pages/home/components/puzzle-actions/puzzle-actions.test.tsx`
   - Description: Import `DIFFICULTY_RATING_BY_LEVEL` from `constants.ts`; add a `targetDifficultyRating: number` parameter to `handleNewPuzzleConfirmation` and pass it to `makePuzzle`; read `userSettings.preferredDifficultyLevel` from `useUserSettings` in `NewPuzzleButton` and derive the rating to pass down the call chain
   - Test first: In `puzzle-actions.test.tsx`, write a test asserting that confirming the New Puzzle dialog calls the `makePuzzle` mock with the rating corresponding to the stored `preferredDifficultyLevel` (e.g., `3` when `"Expert"` is stored)

6. **Add difficulty label to `PuzzleControls`**
   - Files: `src/lib/pages/home/components/puzzle-controls/puzzle-controls.tsx`, `src/lib/pages/home/components/puzzle-controls/puzzle-controls.test.tsx`
   - Description: Add a `PuzzleDifficultyLabel` sub-component that receives `rawBoardState` and renders `"Difficulty: {level}"` using `getDifficultyLevelFromRawBoardState`; wrap the existing inner `Stack` in an outer `Stack direction="column" alignItems="center"` and place `PuzzleDifficultyLabel` as its first child
   - Test first: In `puzzle-controls.test.tsx`, write a test that passes a known all-null `rawBoardState` (or any board whose computed level is known) and asserts the rendered element contains the expected "Difficulty: …" text

7. **Add difficulty radio group to the Settings menu**
   - Files: `src/lib/pages/home/components/header/header.tsx`, `src/lib/pages/home/components/header/header.test.tsx`
   - Description: Add a `DifficultyRadioGroup` sub-component in `header.tsx` that renders a `Box role="group"` with a visible "Difficulty" label and a Chakra UI `RadioGroup` containing four `Radio` items (Standard, Intermediate, Advanced, Expert); place it in a new section inside `SettingsMenu` separated by a `Menu.Separator`; on value change, call `setUserSetting("preferredDifficultyLevel", selectedLevel)` and persist the new preference
   - Test first: In `header.test.tsx`, write a test that opens the Settings menu and asserts the "Difficulty" group label and all four radio option labels are present; write a second test asserting that selecting a different option updates `preferredDifficultyLevel` in `localStorage`

---

## Risks & Considerations

- **Technical complexity**: `makePuzzle` returns a rating-0 puzzle somewhat reliably today, but ratings 1–3 are theoretically impossible with the current `sudoku.makepuzzle` library (which generates puzzles with ~50 empty cells, producing ratings of 9–18). In practice, Intermediate, Advanced, and Expert will almost always fall back to the lowest-rated puzzle found, which is typically a rating-0 (Standard) puzzle. The display label will therefore show "Standard" even when the user's preference is higher. This is the behavior explicitly specified in the requirements; no change to the spec is warranted, but it should be communicated clearly in the PR description.

- **Accessibility — radio group inside a menu**: Embedding a `RadioGroup` inside a `role="menu"` element is a non-standard pattern. Screen readers may announce the group as part of the menu's item list rather than as a composite widget. The Developer must verify keyboard navigation (Tab to reach the group, arrow keys within the group) and ensure the visible "Difficulty" label is correctly associated with the group via `aria-labelledby`.

- **Test coverage — route loader**: `src/routes/index.tsx` has no test file and runs inside the TanStack Router framework. The difficulty-reading logic is fully covered by `use-user-settings.test.tsx`; only the wiring in the loader itself is untested. This is an accepted gap consistent with the rest of the route test strategy in the project.

- **Security**: `getPreferredDifficultyRatingFromStorage` reads from `localStorage`, an untrusted source. The implementation must parse the JSON inside a `try/catch`, validate the `preferredDifficultyLevel` field against the known `puzzleDifficultyLevels` array before using it, and return the safe default `0` on any validation failure. It must never pass an unvalidated value to `makePuzzle`.

- **Performance**: `getDifficultyLevelFromRawBoardState` calls `ratePuzzleDifficulty`, which runs constraint propagation across the full 81-cell board. This computation is synchronous and fast (< 1 ms for typical boards), occurring once per puzzle render. No memoisation is required.
