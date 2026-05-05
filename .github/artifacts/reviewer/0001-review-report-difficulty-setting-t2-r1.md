# Review Report: difficulty-setting — Task 2

**Feature number**: 0001
**Branch**: feature/0001-difficulty-setting
**Review cycle**: r1
**Date**: 2026-05-05

---

## Summary

Reviewed `use-user-settings.tsx`, `use-user-settings.test.tsx`, `constants.ts`, and `header.tsx`. The core implementation is correct: `preferredDifficultyLevel` defaults to `"Standard"`, `USER_SETTINGS_LOCAL_STORAGE_KEY` is introduced and used, and `getPreferredDifficultyRatingFromStorage` correctly validates untrusted localStorage input before returning a rating. One finding: the function uses `as unknown`, which is explicitly prohibited in production code by the project rules, and causes two further unnecessary downstream assertions.

---

## Findings

### CRITICAL

_(none)_

### HIGH

_(none)_

### MEDIUM

#### Finding 1

- **Location**: `src/lib/pages/home/hooks/use-user-settings/use-user-settings.tsx`, lines 83–109
- **Description**: `getPreferredDifficultyRatingFromStorage` uses `JSON.parse(rawStoredValue) as unknown`, which is explicitly prohibited in production code by the project rule: _"Never use `as any` or `as unknown` in production code; these bypass the type system entirely and are always avoidable."_ This unnecessary cast forces two further `as` assertions downstream — `as Record<string, unknown>` and `as PuzzleDifficultyLevel` — which are also violations of the "last resort only" rule. All three are avoidable because `JSON.parse` already returns `any`, so the narrowing checks (`typeof`, `=== null`) and property access work without any assertion.
- **Remediation**: Remove `as unknown` from the `JSON.parse` call so that `parsedStoredValue` retains its natural `any` type. Then remove `as Record<string, unknown>` from the property access (access `.preferredDifficultyLevel` directly on the `any`-typed value) and remove both `as PuzzleDifficultyLevel` assertions from the `includes` and `indexOf` calls. The validation logic and runtime behavior are unchanged.

### LOW

_(none)_

---

## Verdict

**CHANGES REQUESTED**

One MEDIUM finding: three unnecessary type assertions (`as unknown`, `as Record<string, unknown>`, `as PuzzleDifficultyLevel`) that violate the project's explicit prohibition on `as unknown` in production code and the "last resort only" rule for other assertions.
