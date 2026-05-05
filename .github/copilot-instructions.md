# Project Guidelines

## Code Style

- Use TypeScript with strict typing. Use the existing `@/*` path alias from `tsconfig.json`.
- Type assertions (`as T`) are a last resort — only use them when there is genuinely no other logical option. Never use `as any` or `as unknown` in production code; these bypass the type system entirely and are always avoidable. Prefer narrowing through `typeof`, `instanceof`, `in`, and `Array.prototype.includes` checks. For reusable narrowing, write a user-defined type guard function that returns `value is T`. When validating parsed or external data, narrow the shape through explicit checks rather than asserting it. Using `: unknown` as a type annotation on parsed or external data (e.g., `const value: unknown = JSON.parse(...)`) is the same escape hatch by a different name — instead, write a validation function that accepts raw input and returns the narrowed concrete type or a safe fallback directly. The sole exception is test files (`*.test.tsx`, `*.test.ts`), where `as any`, `as unknown`, and other assertions are acceptable for constructing invalid or edge-case inputs that exercise runtime validation logic.
- Follow Biome rules in `biome.json`. Avoid barrel files, use inline `type` imports, use generic array syntax, and avoid default exports except where explicitly allowed (e.g., page `index.tsx` files).
- Prefer debuggable longform code over concise inline expressions. Avoid nested ternaries, compressed one-liners, and inline object reconstruction in non-trivial logic. Use well-named intermediate variables and explicit `return` statements.
- Prefer deterministic, functional-style code with small, focused functions.
- Each function should do one thing. When a function handles multiple concerns, extract named helper functions — one per concern — rather than keeping all logic inline.
- Favor `const`, pure functions, derived values, and immutable updates. Avoid `let` bindings and mutation unless clearly justified.
- Use array methods like `map`, `filter`, and `reduce` for data transformations. Avoid manual loops, mutation, and side effects in these operations.
- Preserve import grouping order: package imports, blank line, alias imports, blank line, relative imports.

## Naming

- Every function, variable, constant, type, component, hook, and file must have a name that is correct, meaningful, descriptive, self-documenting, and nonambiguous (i.e. its purpose must be clearly indicated).
- Names should be as long as necessary to be unambiguous; prefer specificity over brevity.
- Single-character names (e.g. `x`, `n`, `e`) are not allowed. The sole exception is `i` as a traditional `for` loop index; array method callback indices must use `index` or a more descriptive name.
- Use camelCase for variables, functions, and hooks; PascalCase for React components, TypeScript types, and interfaces; kebab-case for file and folder names. Use SCREAMING_SNAKE_CASE for module-level constants and named magic numbers (e.g. `BASE_36 = 36`, `MAXIMUM_RETRY_COUNT = 5`).
- Booleans should take the form of isSomething (e.g. isUpgrade, isApproval, isProMember, etc.); actionVerbSomething, where the prefix is any action verb that fits the behavior (e.g. allowsWhitespace, willUpdate, didRestart, canSubmit, shouldReload, doesRequireAuth, etc.); or hasSomething (e.g. hasMoreThanOneWarning, hasMultipleDiscounts, hasException, etc.).
- Integers should take the form of {integer itself} (e.g. age, year, MAXIMUM_ALLOWED_LOGIN_ATTEMPTS, tooltipDelayInMilliseconds, etc.), numberOfSomething (e.g. numberOfRetries, numberOfDescendents, numberOfAccounts, numberOfDaysWithoutRain, etc.), or somethingCount (e.g. failureCount, retryCount, currentCakeInventoryCount, etc.).
- Floating-Point Numbers should take the form of {floating-point itself} (e.g. height, weight, priceInDanishKrone, angleInDegrees, highTemperatureInFahrenheit, etc.) or somethingAmount (e.g. discountAmount, transferAmount, refundAmount, etc.).
- Strings should take the form of {entity itself} (e.g. fullGivenName, city, shortSpeakerBiography, playerSelectedClass, definition, etc.) or somethingAsString (e.g. monthAsString, timeZoneAsString, etc.).
- Collections should take the form of {plural form of thing} (e.g. robots, sentientRobots, discountedProducts, customers, newlyReleasedBooks, etc.) or implementationOfThings (e.g. unorderedListOfCustomers, queueOfFirstPriorityTasks, orderedSetOfTimeStamps, etc.).
- Maps should take the form of keyToValueMap (e.g. bookIdToAuthorMap, customerToOrderTotalMap, productIdToSuppliersMap, etc.).
- Pairs & Tuples should take the form of firstPairAndSecondPair (e.g. lengthAndWidth, setsAndRepetitions, currentAndLifetimeXP, genusAndSpecies, etc.) or firstSecondAndThirdThing (e.g. heightWidthAndDepthInCentimeters, saturatedTransAndTotalFatInGrams, redGreenBlueAndAlpha, etc.).

## Comments

- Comments are only appropriate for genuinely complex or non-obvious logic that cannot be made clear through naming and structure alone. When a comment is needed, prefer a doc comment (`/** */`) that can be surfaced in hover tooltips.
- Do not use `biome-ignore` comments to disable lint rules. Instead, refactor to comply with the rule.
- Do not leave commented-out code, dead code, or unresolved TODO comments in production files.
- Use `// #region {Name}` / `// #endregion` comments to group related code within a file, where `{Name}` is a logical, descriptive label for the contents. Add nested `// #region {Name}` / `// #endregion` blocks when a region contains meaningfully distinct sub-groups.

## Architecture

- This is a Vite React 19 app using Chakra UI 3 and TanStack Router file-based routes. React Query is available via `QueryClientProvider` but is not currently used for active data fetching — introduce `useQuery` or `useMutation` only when a feature clearly warrants server state management.
- Routing lives under `src/routes`. The root route provides layout and metadata, `/` redirects to a generated puzzle URL, and `puzzle.$encodedPuzzleString.tsx` validates and loads puzzle data before rendering the home page.
- Main game logic lives under `src/lib/pages/home`. UI components, hooks, utilities, and tests are organized by feature folder rather than by generic shared layers.
- App state is mostly local to the puzzle feature and persisted with `use-session-storage-state` and `use-local-storage-state`. Reuse the existing providers and utility functions before introducing new global state.
- Do not hand-edit `src/routeTree.gen.ts`; it is generated by TanStack Router.
- Prefer editing existing feature folders over creating new top-level structure unless the current layout clearly no longer fits.
- Keep puzzle behavior, keyboard interactions, and user-facing rules aligned with the project root `README.md` rather than duplicating that documentation here.
- Use Chakra components and the existing theme/provider setup instead of introducing a parallel styling approach.
- Treat `src/lib/components/ui/**/*` and other generated or framework-managed files as stable unless the task specifically requires changing them.

## Build

- Use `pnpm` for all package management.
- Target Node `24.x` as declared in `package.json`.
- Common commands:
  - `pnpm dev`
  - `pnpm biome:check`
  - `pnpm type:check`
  - `pnpm test`
  - `pnpm build`
  - `pnpm knip`
  - `pnpm check` — shorthand that runs `biome:check`, `type:check`, `test`, `build`, and `knip` in sequence

## Testing

- Tests run with Vitest in browser mode through Playwright. Prefer updating or adding collocated tests when changing behavior, especially in `src/lib/pages/home`.
- Collocate `*.test.tsx` files beside their corresponding implementation. Structure tests using Arrange, Act, and Assert.
- Write "describe" blocks in sentence case and "it" blocks in lowercase. Ensure test descriptions reflect business behavior rather than implementation details.
- Prefer tests that cover one behavior or scenario at a time. Write tests to cover all behaviors and reasonable edge and corner cases.
- Favor minimal mocking and test helpers; ensure tests reflect real usage. Do not use data-testid; instead, query elements by role, label text, or visible content.

## Security

- Treat all data from untrusted sources as potentially malicious: URL parameters, `localStorage` values, and user-provided input must be validated and sanitized before use.
- Never render untrusted content as raw HTML (e.g., avoid `dangerouslySetInnerHTML` with unvalidated input).
- Do not store sensitive data in `localStorage` or `sessionStorage`.
- Keep dependencies up to date and avoid introducing packages with known vulnerabilities.
- Follow OWASP Top 10 guidelines when handling input and output encoding.

## Accessibility

- Meet WCAG 2.1 AA as the minimum standard for all UI changes.
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<header>`, etc.) in preference to generic `<div>` or `<span>` elements wherever the element has a meaningful role.
- Every interactive element must be keyboard-focusable and operable via keyboard alone (Tab, Enter, Space, arrow keys as appropriate).
- Every interactive element must have a clear, descriptive accessible name — either from visible text, an `aria-label`, or `aria-labelledby`. Avoid generic labels like "button" or "click here".
- Color must never be the sole means of conveying information; always pair color cues with text, icons, or other non-color indicators.
- Maintain a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text and UI components.
- All images and icons that convey meaning must have meaningful `alt` text; decorative images must use `alt=""`.
- Dynamic content changes (errors, status updates, live regions) must be communicated to screen readers via `aria-live`, `role="alert"`, or equivalent.
- Focus management must be explicit when dialogs open or close, or when the user navigates between major sections.

## Review Criteria

- **Self-documenting code:** Code structure and naming should make intent clear without relying on inline comments.
- **No duplication:** Before adding any new function, hook, utility, or component, verify that equivalent or near-equivalent functionality does not already exist — within the same file and across the entire project. Reuse or extend existing code rather than duplicating it.
- **Code clarity:** Prefer explicit, flat code structures over clever, compact, or deeply nested ones. Logic should be easy to follow top-to-bottom.
- **Rule compliance:** No rule in this file may be silently waived; if a rule cannot be followed for a specific, justified reason, that reason must be stated explicitly.

The structured severity rubric, naming review checklist, and duplication check procedure used to enforce these criteria during code review are in `.github/skills/code-review-gate.md`.

## Artifact Style

These conventions apply to all markdown artifacts written to `.github/artifacts/` (requirements documents, implementation specs, and review reports). Use them consistently across every file and every agent invocation.

| Element               | Use                                         | Never use                                              |
| --------------------- | ------------------------------------------- | ------------------------------------------------------ |
| Italic                | `_text_` (underscores)                      | `*text*` (asterisks)                                   |
| Bold                  | `**text**` (double asterisks)               | `__text__` (double underscores)                        |
| Bold-italic           | `**_text_**`                                | `***text***` or `_**text**_`                           |
| Unordered list marker | `-`                                         | `*` or `+`                                             |
| Horizontal rule       | `---`                                       | `***` or `___`                                         |
| Empty section         | `_(none)_` as the sole line in that section | `*(none)*`, `(none)`, or omitting the content entirely |

The `_(none)_` rule applies to every section or list in every artifact that has nothing to list: individual severity headings in review reports, an entirely empty Findings section, "Files to delete" in specs, "Out of Scope" in requirements, and any other section that is intentionally empty.
