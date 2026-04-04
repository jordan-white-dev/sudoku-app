import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { PuzzleActions } from "@/lib/pages/home/components/puzzle-actions/puzzle-actions";
import {
  getBoardStateWithEnteredDigitsInTargetCells,
  getEmptyRawBoardState,
  getStartingEmptyBoardState,
  getStartingPuzzleHistoryFromBoardState,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";
import {
  getBrandedCellNumber,
  getBrandedSudokuDigit,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type PuzzleHistory,
  type RawBoardState,
} from "@/lib/pages/home/utils/types";

// #region Module Mocks
const mockHandleRedoMove = vi.fn();
const mockHandleUndoMove = vi.fn();

const mockNavigate = vi.fn();
const mockMakePuzzle = vi.fn();

const mockPauseStopwatch = vi.fn();
const mockResetStopwatch = vi.fn();
const mockStartStopwatch = vi.fn();
const mockStartStopwatchIfEnabled = vi.fn();

const mockUseUserSettings = vi.fn();

vi.mock("@/lib/pages/home/utils/actions/actions", () => ({
  handleRedoMove: (...args: Array<unknown>) => mockHandleRedoMove(...args),
  handleUndoMove: (...args: Array<unknown>) => mockHandleUndoMove(...args),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("sudoku", () => ({
  makepuzzle: () => mockMakePuzzle(),
}));

vi.mock(
  "@/lib/pages/home/hooks/use-sudoku-stopwatch/use-sudoku-stopwatch",
  () => ({
    useSudokuStopwatch: () => ({
      formattedStopwatchTime: "03:15",
      isStopwatchRunning: true,
      pauseStopwatch: mockPauseStopwatch,
      pauseStopwatchAndDisable: vi.fn(),
      resetStopwatch: mockResetStopwatch,
      resumeStopwatchAndEnable: vi.fn(),
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
type RenderedPuzzleActions = Awaited<ReturnType<typeof render>>;

const NEW_PUZZLE_ROUTE_REGEX = /^\/puzzle\//;
const TRY_AGAIN_MESSAGE_REGEX = /That doesn't look quite right/i;
const SOLVED_WITH_TIME_REGEX = /You solved the puzzle in 03:15!/;
// #endregion

// #region Puzzle History Factories
const getUnsolvedPuzzleHistory = (): PuzzleHistory =>
  getStartingPuzzleHistoryFromBoardState(getStartingEmptyBoardState());

const getSolvedPuzzleHistory = (): PuzzleHistory => {
  const digitsInAllCells = Array.from({ length: 81 }, (_, index) => {
    const rowIndex = Math.floor(index / 9);
    const columnIndex = index % 9;
    const digitNumber =
      ((rowIndex * 3 + Math.floor(rowIndex / 3) + columnIndex) % 9) + 1;

    return {
      cellNumber: getBrandedCellNumber(index + 1),
      digit: getBrandedSudokuDigit(String(digitNumber)),
    };
  });

  const solvedBoardState =
    getBoardStateWithEnteredDigitsInTargetCells(digitsInAllCells);

  return getStartingPuzzleHistoryFromBoardState(solvedBoardState);
};
// #endregion

// #region Render Puzzle Actions
const renderPuzzleActions = async ({
  isStopwatchDisabled = false,
  puzzleHistory = getUnsolvedPuzzleHistory(),
  rawBoardState,
  setPuzzleHistory,
}: {
  isStopwatchDisabled?: boolean;
  puzzleHistory?: PuzzleHistory;
  rawBoardState?: RawBoardState;
  setPuzzleHistory?: (value: unknown) => void;
} = {}): Promise<{
  renderedPuzzleActions: RenderedPuzzleActions;
  setPuzzleHistorySpy: ReturnType<typeof vi.fn>;
}> => {
  mockUseUserSettings.mockReturnValue({
    userSettings: {
      isConflictCheckerEnabled: false,
      isDashedGridEnabled: false,
      isFlipKeypadEnabled: false,
      isHideStopwatchEnabled: false,
      isShowRowAndColumnLabelsEnabled: false,
      isShowSeenCellsEnabled: false,
      isStopwatchDisabled,
      isStrictHighlightsEnabled: false,
    },
    setUserSettings: vi.fn(),
  });

  const resolvedSetPuzzleHistorySpy = vi.fn(setPuzzleHistory);

  const renderedPuzzleActions = await render(
    <Provider>
      <PuzzleActions
        puzzleHistory={puzzleHistory}
        rawBoardState={rawBoardState ?? getEmptyRawBoardState()}
        setPuzzleHistory={resolvedSetPuzzleHistorySpy}
      />
    </Provider>,
  );

  await waitForReactToFinishUpdating();

  return {
    renderedPuzzleActions,
    setPuzzleHistorySpy: resolvedSetPuzzleHistorySpy,
  };
};
// #endregion

// #region Puzzle Actions Lookup
const getActionButton = async (
  renderedPuzzleActions: RenderedPuzzleActions | Promise<RenderedPuzzleActions>,
  ariaLabel: string,
) => (await renderedPuzzleActions).getByRole("button", { name: ariaLabel });

const openDialogFromActionButton = async (
  renderedPuzzleActions: RenderedPuzzleActions | Promise<RenderedPuzzleActions>,
  ariaLabel: string,
) => {
  await (await getActionButton(renderedPuzzleActions, ariaLabel)).click();
  await waitForReactToFinishUpdating();
};

const getOpenDialogElement = async (
  renderedPuzzleActions: RenderedPuzzleActions | Promise<RenderedPuzzleActions>,
) => (await renderedPuzzleActions).getByRole("dialog");

const clickDialogButtonWithText = async (
  renderedPuzzleActions: RenderedPuzzleActions | Promise<RenderedPuzzleActions>,
  buttonText: string,
) => {
  const openDialogElement = (
    await getOpenDialogElement(renderedPuzzleActions)
  ).element();

  const candidateButton = Array.from(
    openDialogElement.querySelectorAll<HTMLButtonElement>("button"),
  ).find((buttonElement) => {
    const normalizedButtonText =
      buttonElement.textContent?.replace(/\s+/g, " ").trim() ?? "";

    return normalizedButtonText === buttonText;
  });

  if (!candidateButton)
    throw Error(`Could not find a dialog button with text "${buttonText}".`);

  candidateButton.click();
  await waitForReactToFinishUpdating();
};
// #endregion

beforeEach(() => {
  mockHandleRedoMove.mockReset();
  mockHandleUndoMove.mockReset();

  mockNavigate.mockReset();
  mockMakePuzzle.mockReset();
  mockMakePuzzle.mockReturnValue(getEmptyRawBoardState());

  mockPauseStopwatch.mockReset();
  mockResetStopwatch.mockReset();
  mockStartStopwatch.mockReset();
  mockStartStopwatchIfEnabled.mockReset();

  mockUseUserSettings.mockReset();
});

describe("PuzzleActions rendering", () => {
  it("shows all action buttons", async () => {
    // Arrange
    const { renderedPuzzleActions } = await renderPuzzleActions();

    // Assert
    await expect
      .element(
        await getActionButton(renderedPuzzleActions, "Start a new puzzle"),
      )
      .toBeInTheDocument();
    await expect
      .element(
        await getActionButton(renderedPuzzleActions, "Undo the last move"),
      )
      .toBeInTheDocument();
    await expect
      .element(
        await getActionButton(
          renderedPuzzleActions,
          "Redo the last undone move",
        ),
      )
      .toBeInTheDocument();
    await expect
      .element(
        await getActionButton(
          renderedPuzzleActions,
          "Check the current solution",
        ),
      )
      .toBeInTheDocument();
    await expect
      .element(
        await getActionButton(renderedPuzzleActions, "Restart the puzzle"),
      )
      .toBeInTheDocument();
  });
});

describe("Undo and redo actions", () => {
  it("calls handleUndoMove when undo is pressed", async () => {
    // Arrange
    const { renderedPuzzleActions, setPuzzleHistorySpy } =
      await renderPuzzleActions();

    // Act
    await (
      await getActionButton(renderedPuzzleActions, "Undo the last move")
    ).click();

    // Assert
    expect(mockHandleUndoMove).toHaveBeenCalledTimes(1);
    expect(mockHandleUndoMove).toHaveBeenCalledWith(setPuzzleHistorySpy);
  });

  it("calls handleRedoMove when redo is pressed", async () => {
    // Arrange
    const { renderedPuzzleActions, setPuzzleHistorySpy } =
      await renderPuzzleActions();

    // Act
    await (
      await getActionButton(renderedPuzzleActions, "Redo the last undone move")
    ).click();

    // Assert
    expect(mockHandleRedoMove).toHaveBeenCalledTimes(1);
    expect(mockHandleRedoMove).toHaveBeenCalledWith(setPuzzleHistorySpy);
  });
});

describe("New puzzle dialog", () => {
  it("pauses stopwatch when opening and navigates when confirmed", async () => {
    // Arrange
    const { renderedPuzzleActions } = await renderPuzzleActions();

    // Act
    await openDialogFromActionButton(
      renderedPuzzleActions,
      "Start a new puzzle",
    );
    await renderedPuzzleActions
      .getByRole("button", { name: "New Puzzle" })
      .click();

    // Assert
    expect(mockPauseStopwatch).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate.mock.calls[0][0].to).toMatch(NEW_PUZZLE_ROUTE_REGEX);
  });

  it("resumes stopwatch conditionally when canceling", async () => {
    // Arrange
    const { renderedPuzzleActions } = await renderPuzzleActions();
    await openDialogFromActionButton(
      renderedPuzzleActions,
      "Start a new puzzle",
    );

    // Act
    await renderedPuzzleActions.getByRole("button", { name: "Cancel" }).click();

    // Assert
    expect(mockStartStopwatchIfEnabled).toHaveBeenCalledTimes(1);
  });
});

describe("Check solution dialog", () => {
  it("shows Try Again message for unsolved puzzle and resumes stopwatch on Okay when enabled", async () => {
    // Arrange
    const { renderedPuzzleActions } = await renderPuzzleActions({
      isStopwatchDisabled: false,
      puzzleHistory: getUnsolvedPuzzleHistory(),
    });

    // Act
    await openDialogFromActionButton(
      renderedPuzzleActions,
      "Check the current solution",
    );

    // Assert
    await expect
      .element(renderedPuzzleActions.getByText("Try Again"))
      .toBeInTheDocument();
    await expect
      .element(renderedPuzzleActions.getByText(TRY_AGAIN_MESSAGE_REGEX))
      .toBeInTheDocument();

    // Act
    await renderedPuzzleActions.getByRole("button", { name: "Okay" }).click();

    // Assert
    expect(mockStartStopwatch).toHaveBeenCalledTimes(1);
  });

  it("shows solved message with time when stopwatch is enabled", async () => {
    // Arrange
    const { renderedPuzzleActions: solvedWithTime } = await renderPuzzleActions(
      {
        isStopwatchDisabled: false,
        puzzleHistory: getSolvedPuzzleHistory(),
      },
    );

    // Act
    await openDialogFromActionButton(
      solvedWithTime,
      "Check the current solution",
    );

    // Assert
    await expect
      .element(solvedWithTime.getByText("Congratulations"))
      .toBeInTheDocument();
    await expect
      .element(solvedWithTime.getByText(SOLVED_WITH_TIME_REGEX))
      .toBeInTheDocument();

    await solvedWithTime.getByRole("button", { name: "Okay" }).click();
    await waitForReactToFinishUpdating();
  });

  it("shows solved message without time when stopwatch is disabled", async () => {
    // Arrange
    const { renderedPuzzleActions: solvedWithoutTime } =
      await renderPuzzleActions({
        isStopwatchDisabled: true,
        puzzleHistory: getSolvedPuzzleHistory(),
      });

    // Act
    await openDialogFromActionButton(
      solvedWithoutTime,
      "Check the current solution",
    );

    // Assert
    await expect
      .element(solvedWithoutTime.getByText("You solved the puzzle!"))
      .toBeInTheDocument();
  });
});

describe("Restart puzzle dialog", () => {
  it("pauses stopwatch when opening and supports Cancel action", async () => {
    // Arrange
    const { renderedPuzzleActions } = await renderPuzzleActions();

    // Act
    await openDialogFromActionButton(
      renderedPuzzleActions,
      "Restart the puzzle",
    );
    await renderedPuzzleActions.getByRole("button", { name: "Cancel" }).click();

    // Assert
    expect(mockPauseStopwatch).toHaveBeenCalledTimes(1);
    expect(mockStartStopwatchIfEnabled).toHaveBeenCalledTimes(1);
  });

  it("resets puzzle and stopwatch with Restart", async () => {
    // Arrange
    const { renderedPuzzleActions, setPuzzleHistorySpy } =
      await renderPuzzleActions();

    // Act
    await openDialogFromActionButton(
      renderedPuzzleActions,
      "Restart the puzzle",
    );
    await clickDialogButtonWithText(renderedPuzzleActions, "Restart");

    // Assert
    expect(mockResetStopwatch).toHaveBeenCalledTimes(1);
    expect(setPuzzleHistorySpy).toHaveBeenCalledTimes(1);
    expect(setPuzzleHistorySpy.mock.calls[0][0].currentBoardStateIndex).toBe(0);
    expect(setPuzzleHistorySpy.mock.calls[0][0].boardStateHistory).toHaveLength(
      1,
    );
  });

  it("resets puzzle and keeps time with Keep Time", async () => {
    // Arrange
    const { renderedPuzzleActions, setPuzzleHistorySpy } =
      await renderPuzzleActions();

    // Act
    await openDialogFromActionButton(
      renderedPuzzleActions,
      "Restart the puzzle",
    );
    await clickDialogButtonWithText(renderedPuzzleActions, "+ Keep Time");

    // Assert
    expect(mockStartStopwatch).toHaveBeenCalledTimes(1);
    expect(mockResetStopwatch).not.toHaveBeenCalled();
    expect(setPuzzleHistorySpy).toHaveBeenCalledTimes(1);
  });
});
