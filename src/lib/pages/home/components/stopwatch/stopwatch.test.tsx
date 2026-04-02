import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Stopwatch } from "@/lib/pages/home/components/stopwatch/stopwatch";
import { SudokuStopwatchProvider } from "@/lib/pages/home/hooks/use-sudoku-stopwatch/use-sudoku-stopwatch";
import { UserSettingsProvider } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import {
  getEmptyRawBoardState,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";

// #region Test Doubles and Module Mocks
const mockPauseStopwatch = vi.fn();
const mockResetStopwatch = vi.fn();
const mockStartStopwatch = vi.fn();

type MockStopwatchHookValue = {
  hours: number;
  isRunning: boolean;
  minutes: number;
  pause: () => void;
  reset: (offsetTimestamp?: Date, autoStart?: boolean) => void;
  seconds: number;
  start: () => void;
  totalSeconds: number;
};

const defaultMockStopwatchHookValue: MockStopwatchHookValue = {
  hours: 0,
  isRunning: true,
  minutes: 3,
  pause: mockPauseStopwatch,
  reset: mockResetStopwatch,
  seconds: 15,
  start: mockStartStopwatch,
  totalSeconds: 195,
};

let currentMockStopwatchHookValue = defaultMockStopwatchHookValue;

vi.mock("react-timer-hook", () => ({
  useStopwatch: () => currentMockStopwatchHookValue,
}));
// #endregion

// #region Shared Test Types and Default Configuration
type RenderedStopwatch = Awaited<ReturnType<typeof render>>;

const RESUME_BUTTON_ACCESSIBLE_NAME = /Resume/i;
const STAY_PAUSED_BUTTON_ACCESSIBLE_NAME = /Stay Paused/i;
const GAME_PAUSED_TEXT = "Game Paused";
const PAUSE_STOPWATCH_BUTTON_ACCESSIBLE_NAME = "Pause stopwatch";
const RESUME_STOPWATCH_BUTTON_ACCESSIBLE_NAME = "Resume stopwatch";
const EMPTY_RAW_BOARD_STATE = getEmptyRawBoardState();

const defaultUserSettings = {
  isConflictCheckerEnabled: false,
  isDashedGridEnabled: false,
  isStopwatchDisabled: false,
  isFlipKeypadEnabled: false,
  isHideStopwatchEnabled: false,
  isShowRowAndColumnLabelsEnabled: false,
  isShowSeenCellsEnabled: false,
  isStrictHighlightsEnabled: false,
};
// #endregion

// #region Session Storage Helpers
const USER_SETTINGS_SESSION_STORAGE_KEY = "user-settings";
const getStopwatchSessionStorageKey = () =>
  `sudoku-stopwatch-persisted-total-seconds-${JSON.stringify(EMPTY_RAW_BOARD_STATE)}`;

const setSessionStorageForRender = ({
  persistedStopwatchTotalSeconds = 0,
  userSettings = defaultUserSettings,
}: {
  persistedStopwatchTotalSeconds?: number;
  userSettings?: typeof defaultUserSettings;
}) => {
  window.sessionStorage.setItem(
    USER_SETTINGS_SESSION_STORAGE_KEY,
    JSON.stringify(userSettings),
  );

  window.sessionStorage.setItem(
    getStopwatchSessionStorageKey(),
    JSON.stringify(persistedStopwatchTotalSeconds),
  );
};
// #endregion

// #region Render and Async Update Helpers
const renderStopwatch = async ({
  persistedStopwatchTotalSeconds = 0,
  stopwatchHookValue,
  userSettings = defaultUserSettings,
}: {
  persistedStopwatchTotalSeconds?: number;
  stopwatchHookValue?: Partial<MockStopwatchHookValue>;
  userSettings?: typeof defaultUserSettings;
} = {}): Promise<RenderedStopwatch> => {
  setSessionStorageForRender({
    persistedStopwatchTotalSeconds,
    userSettings,
  });

  currentMockStopwatchHookValue = {
    ...defaultMockStopwatchHookValue,
    ...stopwatchHookValue,
  };

  const renderedStopwatch = await render(
    <Provider>
      <UserSettingsProvider>
        <SudokuStopwatchProvider rawBoardState={EMPTY_RAW_BOARD_STATE}>
          <Stopwatch />
        </SudokuStopwatchProvider>
      </UserSettingsProvider>
    </Provider>,
  );

  await waitForReactToFinishUpdating();

  return renderedStopwatch;
};
// #endregion

// #region Element Lookup Helpers
const getFormattedTimeText = (stopwatchHookValue: MockStopwatchHookValue) => {
  const formattedMinutes = String(stopwatchHookValue.minutes).padStart(2, "0");
  const formattedSeconds = String(stopwatchHookValue.seconds).padStart(2, "0");

  return `${formattedMinutes}:${formattedSeconds}`;
};

const getFormattedTimeLocator = async (
  renderedStopwatch: RenderedStopwatch | Promise<RenderedStopwatch>,
) =>
  (await renderedStopwatch).getByText(
    getFormattedTimeText(currentMockStopwatchHookValue),
  );

const getHiddenStopwatchRootElement = async (
  renderedStopwatch: RenderedStopwatch | Promise<RenderedStopwatch>,
): Promise<HTMLElement> => {
  const resolvedRenderedStopwatch = await renderedStopwatch;
  const formattedTimeText = getFormattedTimeText(currentMockStopwatchHookValue);

  const candidateHiddenRootElement = Array.from(
    resolvedRenderedStopwatch.container.querySelectorAll<HTMLElement>(
      "[hidden]",
    ),
  ).find((element) => element.textContent?.includes(formattedTimeText));

  if (!candidateHiddenRootElement)
    throw Error("Could not find the hidden stopwatch root element.");

  return candidateHiddenRootElement;
};
// #endregion

// #region Dialog Interaction Helpers
const openPauseDialog = async (
  renderedStopwatch: RenderedStopwatch | Promise<RenderedStopwatch>,
) => {
  await (await getFormattedTimeLocator(renderedStopwatch)).click();
  await waitForReactToFinishUpdating();
};

const dispatchEscapeKeyDown = async () => {
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Escape",
    }),
  );

  await waitForReactToFinishUpdating();
};
// #endregion

beforeEach(() => {
  mockPauseStopwatch.mockReset();
  mockResetStopwatch.mockReset();
  mockStartStopwatch.mockReset();
  currentMockStopwatchHookValue = defaultMockStopwatchHookValue;
  window.sessionStorage.clear();
});

describe("Stopwatch rendering", () => {
  it("shows the formatted stopwatch time from the stopwatch hook", async () => {
    // Arrange
    const renderedStopwatch = await renderStopwatch();

    // Assert
    await expect
      .element(await getFormattedTimeLocator(renderedStopwatch))
      .toBeInTheDocument();
  });

  it("shows a pause stopwatch icon button when the stopwatch is running", async () => {
    // Arrange
    const renderedStopwatch = await renderStopwatch({
      stopwatchHookValue: {
        isRunning: true,
      },
    });

    // Assert
    await expect
      .element(
        renderedStopwatch.getByRole("button", {
          name: PAUSE_STOPWATCH_BUTTON_ACCESSIBLE_NAME,
        }),
      )
      .toBeInTheDocument();
  });

  it("shows a resume stopwatch icon button when the stopwatch is paused", async () => {
    // Arrange
    const renderedStopwatch = await renderStopwatch({
      stopwatchHookValue: {
        isRunning: false,
      },
    });

    // Assert
    await expect
      .element(
        renderedStopwatch.getByRole("button", {
          name: RESUME_STOPWATCH_BUTTON_ACCESSIBLE_NAME,
        }),
      )
      .toBeInTheDocument();
  });

  it("hides the stopwatch when the hide stopwatch setting is enabled", async () => {
    // Arrange
    const renderedStopwatch = await renderStopwatch({
      userSettings: {
        ...defaultUserSettings,
        isHideStopwatchEnabled: true,
      },
    });

    // Assert
    expect(await getHiddenStopwatchRootElement(renderedStopwatch)).toBeTruthy();
  });

  it("keeps the stopwatch visible when the hide stopwatch setting is disabled", async () => {
    // Arrange
    const renderedStopwatch = await renderStopwatch({
      userSettings: {
        ...defaultUserSettings,
        isHideStopwatchEnabled: false,
      },
    });

    // Assert
    expect(renderedStopwatch.container.querySelector("[hidden]")).toBeNull();
  });
});

describe("Pausing the stopwatch from the trigger", () => {
  it("pauses the stopwatch when the formatted time is clicked", async () => {
    // Arrange
    const renderedStopwatch = await renderStopwatch();

    // Act
    await (await getFormattedTimeLocator(renderedStopwatch)).click();

    // Assert
    expect(mockPauseStopwatch).toHaveBeenCalledOnce();
  });

  it("pauses the stopwatch when the icon button is clicked", async () => {
    // Arrange
    const renderedStopwatch = await renderStopwatch();

    // Act
    await renderedStopwatch
      .getByRole("button", {
        name: PAUSE_STOPWATCH_BUTTON_ACCESSIBLE_NAME,
      })
      .click();

    // Assert
    expect(mockPauseStopwatch).toHaveBeenCalledOnce();
  });

  it("opens the pause dialog when the trigger is clicked", async () => {
    // Arrange
    const renderedStopwatch = await renderStopwatch();

    // Act
    await openPauseDialog(renderedStopwatch);

    // Assert
    await expect
      .element(renderedStopwatch.getByText(GAME_PAUSED_TEXT))
      .toBeInTheDocument();
    await expect
      .element(
        renderedStopwatch.getByRole("button", {
          name: RESUME_BUTTON_ACCESSIBLE_NAME,
        }),
      )
      .toBeInTheDocument();
    await expect
      .element(
        renderedStopwatch.getByRole("button", {
          name: STAY_PAUSED_BUTTON_ACCESSIBLE_NAME,
        }),
      )
      .toBeInTheDocument();
  });
});

describe("Choosing a pause dialog action", () => {
  it("starts the stopwatch and enables it again when Resume is clicked", async () => {
    // Arrange
    const renderedStopwatch = await renderStopwatch();

    await openPauseDialog(renderedStopwatch);

    // Act
    await renderedStopwatch
      .getByRole("button", {
        name: RESUME_BUTTON_ACCESSIBLE_NAME,
      })
      .click();

    await waitForReactToFinishUpdating();

    // Assert
    expect(mockStartStopwatch).toHaveBeenCalledOnce();

    const persistedUserSettings = window.sessionStorage.getItem(
      USER_SETTINGS_SESSION_STORAGE_KEY,
    );

    expect(persistedUserSettings).toContain('"isStopwatchDisabled":false');
  });

  it("keeps the stopwatch paused and disables it when Stay Paused is clicked", async () => {
    // Arrange
    const renderedStopwatch = await renderStopwatch();

    await openPauseDialog(renderedStopwatch);

    // Act
    await renderedStopwatch
      .getByRole("button", {
        name: STAY_PAUSED_BUTTON_ACCESSIBLE_NAME,
      })
      .click();

    await waitForReactToFinishUpdating();

    // Assert
    expect(mockPauseStopwatch).toHaveBeenCalledTimes(2);

    const persistedUserSettings = window.sessionStorage.getItem(
      USER_SETTINGS_SESSION_STORAGE_KEY,
    );

    expect(persistedUserSettings).toContain('"isStopwatchDisabled":true');
  });
});

describe("Closing the pause dialog without choosing a footer action", () => {
  it("starts the stopwatch again when Escape closes the dialog and the stopwatch is enabled", async () => {
    // Arrange
    const renderedStopwatch = await renderStopwatch({
      userSettings: {
        ...defaultUserSettings,
        isStopwatchDisabled: false,
      },
    });

    await openPauseDialog(renderedStopwatch);

    // Act
    await dispatchEscapeKeyDown();

    // Assert
    expect(mockStartStopwatch).toHaveBeenCalledOnce();
  });

  it("does not start the stopwatch again when Escape closes the dialog and the stopwatch is disabled", async () => {
    // Arrange
    const renderedStopwatch = await renderStopwatch({
      userSettings: {
        ...defaultUserSettings,
        isStopwatchDisabled: true,
      },
    });

    await openPauseDialog(renderedStopwatch);

    // Act
    await dispatchEscapeKeyDown();

    // Assert
    expect(mockStartStopwatch).not.toHaveBeenCalled();
  });
});
