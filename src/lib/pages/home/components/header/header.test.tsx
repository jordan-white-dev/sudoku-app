import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Header } from "@/lib/pages/home/components/header/header";
import {
  defaultUserSettings,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";

// #region Module Mocks
const mockPauseStopwatch = vi.fn();
const mockStartStopwatch = vi.fn();
const mockStartStopwatchIfEnabled = vi.fn();

const mockSetUserSettings = vi.fn();
const mockUseUserSettings = vi.fn();

vi.mock("@/lib/pages/home/components/stopwatch/stopwatch", () => ({
  Stopwatch: () => <div>Stopwatch</div>,
}));

vi.mock(
  "@/lib/pages/home/hooks/use-sudoku-stopwatch/use-sudoku-stopwatch",
  () => ({
    useSudokuStopwatch: () => ({
      pauseStopwatch: mockPauseStopwatch,
      startStopwatch: mockStartStopwatch,
      startStopwatchIfEnabled: mockStartStopwatchIfEnabled,
    }),
  }),
);

vi.mock("@/lib/pages/home/hooks/use-user-settings/use-user-settings", () => ({
  useUserSettings: () => mockUseUserSettings(),
}));
// #endregion

// #region Shared Test Types and Constants
type RenderedHeader = Awaited<ReturnType<typeof render>>;

const SELECTION_LABEL_REGEX = /^Selection$/;
const KEYPAD_MODES_LABEL_REGEX = /^Keypad Modes$/;
const NUMBER_ENTRY_LABEL_REGEX = /^Number Entry$/;
const MARKUP_ENTRY_LABEL_REGEX = /^Markup Entry$/;
const HISTORY_LABEL_REGEX = /^History$/;
// #endregion

// #region Render Header
const renderHeader = async ({
  userSettings = defaultUserSettings,
}: {
  userSettings?: typeof defaultUserSettings;
} = {}): Promise<RenderedHeader> => {
  mockUseUserSettings.mockReturnValue({
    userSettings,
    setUserSettings: mockSetUserSettings,
  });

  const renderedHeader = await render(
    <Provider>
      <Header />
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

const getShortcutsMenuTrigger = async (
  renderedHeader: RenderedHeader | Promise<RenderedHeader>,
) => {
  const headerButtons = await getAllHeaderButtons(renderedHeader);

  const triggerButton = headerButtons[0];

  if (!triggerButton)
    throw Error("Could not find the shortcuts menu trigger button.");

  return triggerButton;
};

const getSettingsMenuTrigger = async (
  renderedHeader: RenderedHeader | Promise<RenderedHeader>,
) => {
  const headerButtons = await getAllHeaderButtons(renderedHeader);

  const triggerButton = headerButtons[1];

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
  mockPauseStopwatch.mockReset();
  mockStartStopwatch.mockReset();
  mockStartStopwatchIfEnabled.mockReset();
  mockSetUserSettings.mockReset();
  mockUseUserSettings.mockReset();
});

describe("Header rendering", () => {
  it("shows both top-level menu triggers", async () => {
    // Arrange
    const renderedHeader = await renderHeader();

    // Assert
    const allHeaderButtons = await getAllHeaderButtons(renderedHeader);

    expect(allHeaderButtons).toHaveLength(2);
  });

  it("shows the stopwatch", async () => {
    // Arrange
    const renderedHeader = await renderHeader();

    // Assert
    await expect
      .element(renderedHeader.getByText("Stopwatch"))
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
  it("toggles regular user settings through setUserSettings", async () => {
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
    expect(mockSetUserSettings).toHaveBeenCalledTimes(1);
    const candidateStateUpdater = mockSetUserSettings.mock.calls[0][0];
    if (typeof candidateStateUpdater !== "function")
      throw Error(
        "Expected setUserSettings to be called with a functional updater.",
      );

    const nextUserSettings = candidateStateUpdater(defaultUserSettings);
    expect(nextUserSettings.isConflictCheckerEnabled).toBe(true);
  });

  it("pauses the stopwatch before enabling Disable Stopwatch", async () => {
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

    // Assert
    expect(mockPauseStopwatch).toHaveBeenCalledTimes(1);
    expect(mockStartStopwatch).not.toHaveBeenCalled();
    expect(mockSetUserSettings).toHaveBeenCalledTimes(1);
  });

  it("starts the stopwatch before disabling Disable Stopwatch", async () => {
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

    // Assert
    expect(mockStartStopwatch).toHaveBeenCalledTimes(1);
    expect(mockPauseStopwatch).not.toHaveBeenCalled();
    expect(mockSetUserSettings).toHaveBeenCalledTimes(1);
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
