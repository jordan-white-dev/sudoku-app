import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import {
  defaultUserSettings,
  type UserSettings,
  UserSettingsProvider,
  useUserSettings,
} from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import { waitForReactToFinishUpdating } from "@/lib/pages/home/utils/testing";

const USER_SETTINGS_SESSION_STORAGE_KEY = "user-settings";

// #region Test Consumer Components
const AllSettingsDisplay = () => {
  const { userSettings, setUserSettings } = useUserSettings();

  const makeToggle = (key: keyof UserSettings) => {
    return () => {
      setUserSettings((current) => ({
        ...current,
        [key]: !current[key],
      }));
    };
  };

  return (
    <>
      <button
        type="button"
        aria-pressed={userSettings.isConflictCheckerEnabled}
        onClick={makeToggle("isConflictCheckerEnabled")}
      >
        Conflict Checker
      </button>
      <button
        type="button"
        aria-pressed={userSettings.isDashedGridEnabled}
        onClick={makeToggle("isDashedGridEnabled")}
      >
        Dashed Grid
      </button>
      <button
        type="button"
        aria-pressed={userSettings.isFlipKeypadEnabled}
        onClick={makeToggle("isFlipKeypadEnabled")}
      >
        Flip Keypad
      </button>
      <button
        type="button"
        aria-pressed={userSettings.isHideStopwatchEnabled}
        onClick={makeToggle("isHideStopwatchEnabled")}
      >
        Hide Stopwatch
      </button>
      <button
        type="button"
        aria-pressed={userSettings.isShowRowAndColumnLabelsEnabled}
        onClick={makeToggle("isShowRowAndColumnLabelsEnabled")}
      >
        Show Row and Column Labels
      </button>
      <button
        type="button"
        aria-pressed={userSettings.isShowSeenCellsEnabled}
        onClick={makeToggle("isShowSeenCellsEnabled")}
      >
        Show Seen Cells
      </button>
      <button
        type="button"
        aria-pressed={userSettings.isStopwatchDisabled}
        onClick={makeToggle("isStopwatchDisabled")}
      >
        Disable Stopwatch
      </button>
      <button
        type="button"
        aria-pressed={userSettings.isStrictHighlightsEnabled}
        onClick={makeToggle("isStrictHighlightsEnabled")}
      >
        Strict Highlights
      </button>
    </>
  );
};
// #endregion

// #region Render Helper
const renderAllSettings = async (preloadedSettings?: Partial<UserSettings>) => {
  if (preloadedSettings) {
    window.sessionStorage.setItem(
      USER_SETTINGS_SESSION_STORAGE_KEY,
      JSON.stringify({ ...defaultUserSettings, ...preloadedSettings }),
    );
  }

  const rendered = await render(
    <Provider>
      <UserSettingsProvider>
        <AllSettingsDisplay />
      </UserSettingsProvider>
    </Provider>,
  );

  await waitForReactToFinishUpdating();

  return rendered;
};
// #endregion

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("Default user settings", () => {
  it("defaults all eight gameplay and display options to off when no preferences have been saved", async () => {
    // Arrange
    const rendered = await renderAllSettings();

    // Assert
    await expect
      .element(rendered.getByRole("button", { name: "Conflict Checker" }))
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(rendered.getByRole("button", { name: "Dashed Grid" }))
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(rendered.getByRole("button", { name: "Flip Keypad" }))
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(rendered.getByRole("button", { name: "Hide Stopwatch" }))
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(
        rendered.getByRole("button", { name: "Show Row and Column Labels" }),
      )
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(rendered.getByRole("button", { name: "Show Seen Cells" }))
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(rendered.getByRole("button", { name: "Disable Stopwatch" }))
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(rendered.getByRole("button", { name: "Strict Highlights" }))
      .toHaveAttribute("aria-pressed", "false");
  });
});

describe("Restoring saved settings", () => {
  it("restores saved setting values from a previous page load", async () => {
    // Arrange
    const rendered = await renderAllSettings({
      isConflictCheckerEnabled: true,
      isShowSeenCellsEnabled: true,
    });

    // Assert
    await expect
      .element(rendered.getByRole("button", { name: "Conflict Checker" }))
      .toHaveAttribute("aria-pressed", "true");
    await expect
      .element(rendered.getByRole("button", { name: "Show Seen Cells" }))
      .toHaveAttribute("aria-pressed", "true");
    await expect
      .element(rendered.getByRole("button", { name: "Dashed Grid" }))
      .toHaveAttribute("aria-pressed", "false");
  });
});

describe("Updating a setting", () => {
  it("reflects the new setting value in the ui immediately", async () => {
    // Arrange
    const rendered = await renderAllSettings();

    // Act
    await rendered.getByRole("button", { name: "Conflict Checker" }).click();
    await waitForReactToFinishUpdating();

    // Assert
    await expect
      .element(rendered.getByRole("button", { name: "Conflict Checker" }))
      .toHaveAttribute("aria-pressed", "true");
  });

  it("preserves all other settings when a single setting is updated", async () => {
    // Arrange
    const rendered = await renderAllSettings({ isShowSeenCellsEnabled: true });

    // Act
    await rendered.getByRole("button", { name: "Conflict Checker" }).click();
    await waitForReactToFinishUpdating();

    // Assert
    await expect
      .element(rendered.getByRole("button", { name: "Dashed Grid" }))
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(rendered.getByRole("button", { name: "Flip Keypad" }))
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(rendered.getByRole("button", { name: "Hide Stopwatch" }))
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(
        rendered.getByRole("button", { name: "Show Row and Column Labels" }),
      )
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(rendered.getByRole("button", { name: "Show Seen Cells" }))
      .toHaveAttribute("aria-pressed", "true");
    await expect
      .element(rendered.getByRole("button", { name: "Disable Stopwatch" }))
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(rendered.getByRole("button", { name: "Strict Highlights" }))
      .toHaveAttribute("aria-pressed", "false");
  });

  it("persists the new setting value so it survives a page refresh", async () => {
    // Arrange
    const rendered = await renderAllSettings();

    // Act
    await rendered.getByRole("button", { name: "Conflict Checker" }).click();
    await waitForReactToFinishUpdating();

    // Assert
    const storedRaw = window.sessionStorage.getItem(
      USER_SETTINGS_SESSION_STORAGE_KEY,
    );
    const storedSettings = JSON.parse(storedRaw ?? "{}");

    expect(storedSettings.isConflictCheckerEnabled).toBe(true);
  });
});
