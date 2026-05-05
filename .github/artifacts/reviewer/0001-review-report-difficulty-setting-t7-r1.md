# Review Report: difficulty-setting — Task 7

**Feature number**: 0001
**Branch**: feature/difficulty-setting
**Review cycle**: r1
**Date**: 2026-05-05

---

## Summary

Task 7 adds a `DifficultyRadioGroup` sub-component to the Settings menu in `header.tsx`, allowing users to select their preferred difficulty level. The implementation correctly places the group outside `Menu.Item` descendants to avoid auto-close, uses `role="group"` with `aria-labelledby` for accessibility, validates incoming values before updating settings, and updates the README. Two of the four test scenarios required by the spec are missing, and two type assertions in the handler are avoidable with a narrower pattern.

---

## Findings

### CRITICAL

_(none)_

---

### HIGH

#### Finding 1 — Missing test: correct default selection

- **Location**: `src/lib/pages/home/components/header/header.test.tsx`, `describe("Difficulty radio group")`
- **Description**: The spec's "Files to modify" list for `header.test.tsx` explicitly requires a "correct default selection" test, and the acceptance criteria state "The radio group reflects the user's currently stored preference at all times." No test verifies that when a non-default preference (e.g., `"Expert"`) is already stored in localStorage, the corresponding radio option appears checked when the Settings menu is opened.
- **Remediation**: Add a test inside `describe("Difficulty radio group")` that renders the header with `userSettings: { ...defaultUserSettings, preferredDifficultyLevel: "Expert" }`, opens the Settings menu, and asserts that `renderedHeader.getByRole("radio", { name: "Expert" })` is checked (e.g., via `.toBeChecked()` or asserting `aria-checked="true"`).

#### Finding 2 — Missing test: menu stays open after radio selection

- **Location**: `src/lib/pages/home/components/header/header.test.tsx`, `describe("Difficulty radio group")`
- **Description**: The spec explicitly requires a test "that menu stays open on selection." The Design Decision notes that placing `DifficultyRadioGroup` outside `Menu.Item` descendants is specifically intended to prevent menu auto-close; without a test this key behavior is unverified and could silently regress.
- **Remediation**: Add a test that opens the Settings menu, clicks a radio option (e.g., `getByText("Intermediate").click()`), awaits `waitForReactToFinishUpdating()`, and then asserts that the menu content is still visible — for example, that `renderedHeader.getByText("Difficulty")` is still in the document.

---

### MEDIUM

#### Finding 1 — Avoidable type assertions in `handleDifficultyChange`

- **Location**: `src/lib/pages/home/components/header/header.tsx`, `handleDifficultyChange` (lines ~479–495)
- **Description**: The handler uses two type assertions — `puzzleDifficultyLevels as ReadonlyArray<string>` and `value as PuzzleDifficultyLevel` — to work around the fact that `Array.prototype.includes` on a `ReadonlyArray<PuzzleDifficultyLevel>` does not accept a plain `string` argument. The project rules state type assertions are a last resort and that proper narrowing should be used instead. Both assertions are avoidable: `puzzleDifficultyLevels.find((level) => level === value)` returns `PuzzleDifficultyLevel | undefined` with no assertions required.
- **Remediation**: Replace the `isValidLevel` / `selectedLevel as PuzzleDifficultyLevel` block with:
  ```ts
  const matchedLevel = puzzleDifficultyLevels.find((level) => level === value);
  if (matchedLevel === undefined) {
    return;
  }
  setUserSettings((currentUserSettings) => ({
    ...currentUserSettings,
    preferredDifficultyLevel: matchedLevel,
  }));
  ```
  This eliminates both assertions and keeps the handler's intent explicit.

---

### LOW

_(none)_

---

## Verdict

**CHANGES REQUESTED**

Two spec-required tests are absent (correct default selection and menu-stays-open behavior), and the type-assertion pattern in `handleDifficultyChange` violates the project's narrowing rules.
