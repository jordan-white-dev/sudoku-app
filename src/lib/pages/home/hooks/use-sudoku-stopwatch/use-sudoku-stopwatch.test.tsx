import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import {
  SudokuStopwatchProvider,
  useSudokuStopwatch,
} from "@/lib/pages/home/hooks/use-sudoku-stopwatch/use-sudoku-stopwatch";
import { waitForReactToFinishUpdating } from "@/lib/pages/home/utils/testing";

// #region Module Mocks
const mockPauseStopwatch = vi.fn();
const mockReset = vi.fn();
const mockStart = vi.fn();

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
  isRunning: false,
  minutes: 3,
  pause: mockPauseStopwatch,
  reset: mockReset,
  seconds: 15,
  start: mockStart,
  totalSeconds: 195,
};

let currentMockStopwatchHookValue = defaultMockStopwatchHookValue;

vi.mock("react-timer-hook", () => ({
  useStopwatch: () => currentMockStopwatchHookValue,
}));
// #endregion

// #region Test Consumer Components
const FormattedStopwatchTimeDisplay = () => {
  const { formattedStopwatchTime } = useSudokuStopwatch();

  return <span>{formattedStopwatchTime}</span>;
};

const StartStopwatchIfEnabledButton = () => {
  const { startStopwatchIfEnabled } = useSudokuStopwatch();

  return (
    <button type="button" onClick={startStopwatchIfEnabled}>
      Start if enabled
    </button>
  );
};

const PauseStopwatchAndDisableButton = () => {
  const { pauseStopwatchAndDisable } = useSudokuStopwatch();

  return (
    <button type="button" onClick={pauseStopwatchAndDisable}>
      Pause and disable
    </button>
  );
};

const ResumeStopwatchAndEnableButton = () => {
  const { resumeStopwatchAndEnable } = useSudokuStopwatch();

  return (
    <button type="button" onClick={resumeStopwatchAndEnable}>
      Resume and enable
    </button>
  );
};
// #endregion

// #region Render Helper
const renderWithProvider = async ({
  children,
  isStopwatchDisabled = false,
  onIsStopwatchDisabledChange = vi.fn<
    (nextIsStopwatchDisabled: boolean) => void
  >(),
  stopwatchHookValue,
}: {
  children: ReactNode;
  isStopwatchDisabled?: boolean;
  onIsStopwatchDisabledChange?: (nextIsStopwatchDisabled: boolean) => void;
  stopwatchHookValue?: Partial<MockStopwatchHookValue>;
}) => {
  currentMockStopwatchHookValue = {
    ...defaultMockStopwatchHookValue,
    ...stopwatchHookValue,
  };

  const rendered = await render(
    <Provider>
      <SudokuStopwatchProvider
        encodedPuzzleString="test-puzzle"
        isStopwatchDisabled={isStopwatchDisabled}
        onIsStopwatchDisabledChange={onIsStopwatchDisabledChange}
      >
        {children}
      </SudokuStopwatchProvider>
    </Provider>,
  );

  await waitForReactToFinishUpdating();

  return rendered;
};
// #endregion

beforeEach(() => {
  window.sessionStorage.clear();
  mockPauseStopwatch.mockReset();
  mockReset.mockReset();
  mockStart.mockReset();
  currentMockStopwatchHookValue = defaultMockStopwatchHookValue;
});

describe("Formatted stopwatch time", () => {
  it('shows "00" followed by the total elapsed seconds when the time is between 0 and 59 seconds', async () => {
    // Arrange
    const rendered = await renderWithProvider({
      children: <FormattedStopwatchTimeDisplay />,
      stopwatchHookValue: {
        hours: 0,
        minutes: 0,
        seconds: 15,
        totalSeconds: 15,
      },
    });

    // Assert
    await expect.element(rendered.getByText("00:15")).toBeInTheDocument();
  });

  it('shows "0" followed by a one-digit minutes value equal to the total elapsed minutes followed by seconds when the time is between 1 and 9 minutes', async () => {
    // Arrange
    const rendered = await renderWithProvider({
      children: <FormattedStopwatchTimeDisplay />,
      stopwatchHookValue: {
        hours: 0,
        minutes: 3,
        seconds: 15,
        totalSeconds: 195,
      },
    });

    // Assert
    await expect.element(rendered.getByText("03:15")).toBeInTheDocument();
  });

  it("shows a two-digit minutes value equal to the total elapsed minutes followed by seconds when the time is between 60 and 99 minutes", async () => {
    // Arrange
    const rendered = await renderWithProvider({
      children: <FormattedStopwatchTimeDisplay />,
      stopwatchHookValue: {
        hours: 1,
        minutes: 5,
        seconds: 30,
        totalSeconds: 3930,
      },
    });

    // Assert
    await expect.element(rendered.getByText("65:30")).toBeInTheDocument();
  });

  it("shows a three-digit minutes value equal to the total elapsed minutes followed by seconds when the time is between 100 and 999 minutes", async () => {
    // Arrange
    const rendered = await renderWithProvider({
      children: <FormattedStopwatchTimeDisplay />,
      stopwatchHookValue: {
        hours: 1,
        minutes: 45,
        seconds: 0,
        totalSeconds: 6300,
      },
    });

    // Assert
    await expect.element(rendered.getByText("105:00")).toBeInTheDocument();
  });
});

describe("Resuming the stopwatch", () => {
  it("starts counting when the stopwatch is enabled by the player", async () => {
    // Arrange
    const rendered = await renderWithProvider({
      children: <StartStopwatchIfEnabledButton />,
      isStopwatchDisabled: false,
    });

    // Act
    await rendered.getByRole("button", { name: "Start if enabled" }).click();
    await waitForReactToFinishUpdating();

    // Assert
    expect(mockStart).toHaveBeenCalledOnce();
  });

  it("stops counting when the stopwatch is disabled by the player", async () => {
    // Arrange
    const rendered = await renderWithProvider({
      children: <StartStopwatchIfEnabledButton />,
      isStopwatchDisabled: true,
    });

    // Act
    await rendered.getByRole("button", { name: "Start if enabled" }).click();
    await waitForReactToFinishUpdating();

    // Assert
    expect(mockStart).not.toHaveBeenCalled();
  });
});

describe("Disabling the stopwatch", () => {
  it("stops counting and disables the stopwatch when the player clicks the pause button", async () => {
    // Arrange
    const mockOnChange = vi.fn<(nextIsStopwatchDisabled: boolean) => void>();
    const rendered = await renderWithProvider({
      children: <PauseStopwatchAndDisableButton />,
      onIsStopwatchDisabledChange: mockOnChange,
    });

    // Act
    await rendered.getByRole("button", { name: "Pause and disable" }).click();
    await waitForReactToFinishUpdating();

    // Assert
    expect(mockPauseStopwatch).toHaveBeenCalledOnce();
    expect(mockOnChange).toHaveBeenCalledOnce();
    expect(mockOnChange).toHaveBeenCalledWith(true);
  });
});

describe("Re-enabling the stopwatch", () => {
  it("resumes counting and enables the stopwatch when the player clicks the resume button", async () => {
    // Arrange
    const mockOnChange = vi.fn<(nextIsStopwatchDisabled: boolean) => void>();
    const rendered = await renderWithProvider({
      children: <ResumeStopwatchAndEnableButton />,
      onIsStopwatchDisabledChange: mockOnChange,
    });

    // Act
    await rendered.getByRole("button", { name: "Resume and enable" }).click();
    await waitForReactToFinishUpdating();

    // Assert
    expect(mockStart).toHaveBeenCalledOnce();
    expect(mockOnChange).toHaveBeenCalledOnce();
    expect(mockOnChange).toHaveBeenCalledWith(false);
  });
});

describe("Page visibility", () => {
  it("pauses the stopwatch when the page becomes hidden while it is running", async () => {
    // Arrange
    await renderWithProvider({
      children: <FormattedStopwatchTimeDisplay />,
      stopwatchHookValue: { isRunning: true },
    });

    mockPauseStopwatch.mockReset();

    // Act
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await waitForReactToFinishUpdating();

    // Assert
    expect(mockPauseStopwatch).toHaveBeenCalledOnce();

    // Cleanup
    Object.defineProperty(document, "hidden", {
      value: false,
      configurable: true,
    });
  });

  it("does not pause the stopwatch when the page becomes hidden while it is not running", async () => {
    // Arrange
    await renderWithProvider({
      children: <FormattedStopwatchTimeDisplay />,
      stopwatchHookValue: { isRunning: false },
    });

    mockPauseStopwatch.mockReset();

    // Act
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await waitForReactToFinishUpdating();

    // Assert
    expect(mockPauseStopwatch).not.toHaveBeenCalled();

    // Cleanup
    Object.defineProperty(document, "hidden", {
      value: false,
      configurable: true,
    });
  });

  it("resumes the stopwatch when the page becomes visible again if it was running before being hidden", async () => {
    // Arrange
    await renderWithProvider({
      children: <FormattedStopwatchTimeDisplay />,
      stopwatchHookValue: { isRunning: true },
    });

    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await waitForReactToFinishUpdating();

    mockStart.mockReset();

    // Act
    Object.defineProperty(document, "hidden", {
      value: false,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await waitForReactToFinishUpdating();

    // Assert
    expect(mockStart).toHaveBeenCalledOnce();
  });

  it("does not resume the stopwatch when the page becomes visible if it was not running when hidden", async () => {
    // Arrange
    await renderWithProvider({
      children: <FormattedStopwatchTimeDisplay />,
      stopwatchHookValue: { isRunning: false },
    });

    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await waitForReactToFinishUpdating();

    mockStart.mockReset();

    // Act
    Object.defineProperty(document, "hidden", {
      value: false,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await waitForReactToFinishUpdating();

    // Assert
    expect(mockStart).not.toHaveBeenCalled();
  });
});

describe("Hook error boundary", () => {
  it("throws when useSudokuStopwatch is used outside SudokuStopwatchProvider", async () => {
    // Arrange
    const ThrowingComponent = () => {
      useSudokuStopwatch();

      return null;
    };

    // Assert
    await expect(
      render(
        <Provider>
          <ThrowingComponent />
        </Provider>,
      ),
    ).rejects.toThrow(
      "useSudokuStopwatch must be used inside SudokuStopwatchProvider",
    );
  });
});
