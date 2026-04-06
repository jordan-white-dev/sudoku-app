import SuperExpressive from "super-expressive";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Header } from "@/lib/pages/home/components/header/header";
import { SudokuStopwatchProvider } from "@/lib/pages/home/hooks/use-sudoku-stopwatch/use-sudoku-stopwatch";
import {
  type UserSettings,
  UserSettingsProvider,
} from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import {
  defaultUserSettings,
  getEmptyRawBoardState,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";

const USER_SETTINGS_SESSION_STORAGE_KEY = "user-settings";

// #region Shared Test Types and Constants
type RenderedHeader = Awaited<ReturnType<typeof render>>;

// Equivalent to: /^Selection$/
const SELECTION_LABEL_REGEX = SuperExpressive()
  .startOfInput.string("Selection")
  .endOfInput.toRegex();
// Equivalent to: /^Keypad Modes$/
const KEYPAD_MODES_LABEL_REGEX = SuperExpressive()
  .startOfInput.string("Keypad Modes")
  .endOfInput.toRegex();
// Equivalent to: /^Number Entry$/
const NUMBER_ENTRY_LABEL_REGEX = SuperExpressive()
  .startOfInput.string("Number Entry")
  .endOfInput.toRegex();
// Equivalent to: /^Markup Entry$/
const MARKUP_ENTRY_LABEL_REGEX = SuperExpressive()
  .startOfInput.string("Markup Entry")
  .endOfInput.toRegex();
// Equivalent to: /^History$/
const HISTORY_LABEL_REGEX = SuperExpressive()
  .startOfInput.string("History")
  .endOfInput.toRegex();
// #endregion

// #region Render Header
const renderHeader = async ({
  userSettings = defaultUserSettings,
}: {
  userSettings?: UserSettings;
} = {}): Promise<RenderedHeader> => {
  window.sessionStorage.setItem(
    USER_SETTINGS_SESSION_STORAGE_KEY,
    JSON.stringify(userSettings),
  );

  const emptyRawBoardState = getEmptyRawBoardState();

  const renderedHeader = await render(
    <Provider>
      <UserSettingsProvider>
        <SudokuStopwatchProvider rawBoardState={emptyRawBoardState}>
          <Header />
        </SudokuStopwatchProvider>
      </UserSettingsProvider>
    </Provider>,
  );

  await waitForReactToFinishUpdating();

  return renderedHeader;
};
// #endregion

// #region Header Lookup
const getAllHeaderButtons = async (
  renderedHeader: RenderedHeader | Promise<RenderedHeader>,
) => {
  const resolvedRenderedHeader = await renderedHeader;
  return resolvedRenderedHeader.getByRole("button").all();
};

const getMenuTriggerButtons = async (
  renderedHeader: RenderedHeader | Promise<RenderedHeader>,
) => {
  const allHeaderButtons = await getAllHeaderButtons(renderedHeader);

  return allHeaderButtons.filter((headerButton) => {
    const ariaLabel = headerButton.element().getAttribute("aria-label");

    return ariaLabel !== "Pause stopwatch" && ariaLabel !== "Resume stopwatch";
  });
};

const getShortcutsMenuTrigger = async (
  renderedHeader: RenderedHeader | Promise<RenderedHeader>,
) => {
  const menuTriggerButtons = await getMenuTriggerButtons(renderedHeader);

  const triggerButton = menuTriggerButtons[0];

  if (!triggerButton)
    throw Error("Could not find the shortcuts menu trigger button.");

  return triggerButton;
};

const getSettingsMenuTrigger = async (
  renderedHeader: RenderedHeader | Promise<RenderedHeader>,
) => {
  const menuTriggerButtons = await getMenuTriggerButtons(renderedHeader);

  const triggerButton = menuTriggerButtons[1];

  if (!triggerButton)
    throw Error("Could not find the settings menu trigger button.");

  return triggerButton;
};

const openShortcutsMenu = async (
  renderedHeader: RenderedHeader | Promise<RenderedHeader>,
) => {
  const shortcutsMenuTrigger = await getShortcutsMenuTrigger(renderedHeader);
  await shortcutsMenuTrigger.click();

  await waitForReactToFinishUpdating();
};

const openSettingsMenu = async (
  renderedHeader: RenderedHeader | Promise<RenderedHeader>,
) => {
  const settingsMenuTrigger = await getSettingsMenuTrigger(renderedHeader);
  await settingsMenuTrigger.click();

  await waitForReactToFinishUpdating();
};
// #endregion

// #region Settings Expectations
const getSettingCheckboxMenuItemLocator = async (
  renderedHeader: RenderedHeader | Promise<RenderedHeader>,
  settingLabel: string,
) =>
  (await renderedHeader).getByRole("menuitemcheckbox", { name: settingLabel });

const getStopwatchToggleButtonLocator = async (
  renderedHeader: RenderedHeader | Promise<RenderedHeader>,
) => {
  const resolvedRenderedHeader = await renderedHeader;

  const pauseButton = resolvedRenderedHeader
    .getByRole("button", {
      name: "Pause stopwatch",
    })
    .query();

  if (pauseButton) return pauseButton;

  const resumeButton = resolvedRenderedHeader
    .getByRole("button", {
      name: "Resume stopwatch",
    })
    .query();

  if (resumeButton) return resumeButton;

  throw Error("Could not find the stopwatch pause/resume button.");
};

const expectSettingToBeCheckedOrNot = async (
  renderedHeader: RenderedHeader | Promise<RenderedHeader>,
  settingLabel: string,
  shouldBeChecked: boolean,
) => {
  const settingCheckbox = await getSettingCheckboxMenuItemLocator(
    renderedHeader,
    settingLabel,
  );

  const ariaChecked = settingCheckbox.element().getAttribute("aria-checked");

  expect(ariaChecked).toBe(String(shouldBeChecked));
};
// #endregion

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("Header rendering", () => {
  it("shows both top-level menu triggers", async () => {
    // Arrange
    const renderedHeader = await renderHeader();

    // Assert
    const menuTriggerButtons = await getMenuTriggerButtons(renderedHeader);

    expect(menuTriggerButtons).toHaveLength(2);
  });

  it("shows the stopwatch", async () => {
    // Arrange
    const renderedHeader = await renderHeader();

    // Assert
    await expect
      .element(await getStopwatchToggleButtonLocator(renderedHeader))
      .toBeInTheDocument();
  });
});

describe("Settings menu checked state", () => {
  it("shows enabled settings as checked and disabled settings as unchecked", async () => {
    // Arrange
    const renderedHeader = await renderHeader({
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
        isShowSeenCellsEnabled: true,
        isStopwatchDisabled: true,
        isHideStopwatchEnabled: true,
      },
    });

    // Act
    await openSettingsMenu(renderedHeader);

    // Assert
    await expectSettingToBeCheckedOrNot(
      renderedHeader,
      "Conflict Checker",
      true,
    );
    await expectSettingToBeCheckedOrNot(
      renderedHeader,
      "Show Seen Cells",
      true,
    );
    await expectSettingToBeCheckedOrNot(
      renderedHeader,
      "Strict Highlights",
      false,
    );
    await expectSettingToBeCheckedOrNot(renderedHeader, "Flip Keypad", false);
    await expectSettingToBeCheckedOrNot(renderedHeader, "Dashed Grid", false);
    await expectSettingToBeCheckedOrNot(
      renderedHeader,
      "Disable Stopwatch",
      true,
    );
    await expectSettingToBeCheckedOrNot(renderedHeader, "Hide Stopwatch", true);
    await expectSettingToBeCheckedOrNot(
      renderedHeader,
      "Show Row + Column Labels",
      false,
    );
  });
});

describe("Settings menu interactions", () => {
  it("toggles regular user settings in session storage", async () => {
    // Arrange
    const renderedHeader = await renderHeader();
    await openSettingsMenu(renderedHeader);

    // Act
    const conflictCheckerOption = await getSettingCheckboxMenuItemLocator(
      renderedHeader,
      "Conflict Checker",
    );
    await conflictCheckerOption.click();

    // Assert
    const userSettingsInSessionStorage = window.sessionStorage.getItem(
      USER_SETTINGS_SESSION_STORAGE_KEY,
    );

    if (!userSettingsInSessionStorage)
      throw Error("Could not find user settings in session storage.");

    const parsedUserSettings = JSON.parse(userSettingsInSessionStorage);

    expect(parsedUserSettings.isConflictCheckerEnabled).toBe(true);
  });

  it("pauses the stopwatch and enables Disable Stopwatch", async () => {
    // Arrange
    const renderedHeader = await renderHeader({
      userSettings: {
        ...defaultUserSettings,
        isStopwatchDisabled: false,
      },
    });
    await openSettingsMenu(renderedHeader);

    // Act
    const disableStopwatchOption = await getSettingCheckboxMenuItemLocator(
      renderedHeader,
      "Disable Stopwatch",
    );
    await disableStopwatchOption.click();
    await waitForReactToFinishUpdating();

    // Assert
    await expect
      .element(
        renderedHeader.getByRole("button", {
          name: "Resume stopwatch",
        }),
      )
      .toBeInTheDocument();

    const userSettingsInSessionStorage = window.sessionStorage.getItem(
      USER_SETTINGS_SESSION_STORAGE_KEY,
    );

    if (!userSettingsInSessionStorage)
      throw Error("Could not find user settings in session storage.");

    const parsedUserSettings = JSON.parse(userSettingsInSessionStorage);
    expect(parsedUserSettings.isStopwatchDisabled).toBe(true);
  });

  it("starts the stopwatch and disables Disable Stopwatch", async () => {
    // Arrange
    const renderedHeader = await renderHeader({
      userSettings: {
        ...defaultUserSettings,
        isStopwatchDisabled: true,
      },
    });
    await openSettingsMenu(renderedHeader);

    // Act
    const disableStopwatchOption = await getSettingCheckboxMenuItemLocator(
      renderedHeader,
      "Disable Stopwatch",
    );
    await disableStopwatchOption.click();
    await waitForReactToFinishUpdating();

    // Assert
    await expect
      .element(
        renderedHeader.getByRole("button", {
          name: "Pause stopwatch",
        }),
      )
      .toBeInTheDocument();

    const userSettingsInSessionStorage = window.sessionStorage.getItem(
      USER_SETTINGS_SESSION_STORAGE_KEY,
    );

    if (!userSettingsInSessionStorage)
      throw Error("Could not find user settings in session storage.");

    const parsedUserSettings = JSON.parse(userSettingsInSessionStorage);
    expect(parsedUserSettings.isStopwatchDisabled).toBe(false);
  });
});

describe("Shortcuts menu content", () => {
  it("shows major shortcut group labels and representative shortcuts", async () => {
    // Arrange
    const renderedHeader = await renderHeader();

    // Act
    await openShortcutsMenu(renderedHeader);

    // Assert
    await expect
      .element(renderedHeader.getByText(SELECTION_LABEL_REGEX))
      .toBeInTheDocument();
    await expect
      .element(renderedHeader.getByText(KEYPAD_MODES_LABEL_REGEX))
      .toBeInTheDocument();
    await expect
      .element(renderedHeader.getByText(NUMBER_ENTRY_LABEL_REGEX))
      .toBeInTheDocument();
    await expect
      .element(renderedHeader.getByText(MARKUP_ENTRY_LABEL_REGEX))
      .toBeInTheDocument();
    await expect
      .element(renderedHeader.getByText(HISTORY_LABEL_REGEX))
      .toBeInTheDocument();

    await expect
      .element(renderedHeader.getByText("Move Selection"))
      .toBeInTheDocument();
    await expect.element(renderedHeader.getByText("Undo")).toBeInTheDocument();
    await expect.element(renderedHeader.getByText("Redo")).toBeInTheDocument();
  });
});
