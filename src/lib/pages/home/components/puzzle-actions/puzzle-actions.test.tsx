import SuperExpressive from "super-expressive";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { PuzzleActions } from "@/lib/pages/home/components/puzzle-actions/puzzle-actions";
import {
  CELLS_PER_HOUSE,
  TOTAL_CELLS_IN_BOARD,
} from "@/lib/pages/home/utils/constants";
import {
  EMPTY_RAW_BOARD_STATE,
  getBoardStateWithEnteredDigitsInTargetCells,
  getStartingEmptyBoardState,
  getStartingPuzzleStateFromBoardState,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";
import {
  getBrandedCellId,
  getBrandedSudokuDigit,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type PuzzleState,
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

vi.mock(
  "@/lib/pages/home/hooks/use-user-settings/use-user-settings",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/lib/pages/home/hooks/use-user-settings/use-user-settings")
      >();

    return {
      ...original,
      useUserSettings: () => mockUseUserSettings(),
    };
  },
);
// #endregion

// #region Shared Test Types and Constants
type RenderedPuzzleActions = Awaited<ReturnType<typeof render>>;

// Equivalent to: /^\/puzzle\//
const NEW_PUZZLE_ROUTE_REGEX = SuperExpressive()
  .startOfInput.string("/puzzle/")
  .toRegex();
// Equivalent to: /That doesn't look quite right/i
const TRY_AGAIN_MESSAGE_REGEX = SuperExpressive()
  .caseInsensitive.string("That doesn't look quite right")
  .toRegex();
// Equivalent to: /You solved the puzzle in 03:15!/
const SOLVED_WITH_TIME_REGEX = SuperExpressive()
  .string("You solved the puzzle in 03:15!")
  .toRegex();
// Equivalent to: /\s+/g
const WHITESPACE_SEQUENCE_REGEX =
  SuperExpressive().allowMultipleMatches.oneOrMore.whitespaceChar.toRegex();
// #endregion

// #region Puzzle State Factories
const getUnsolvedPuzzleState = (): PuzzleState =>
  getStartingPuzzleStateFromBoardState(getStartingEmptyBoardState());

const getSolvedPuzzleState = (): PuzzleState => {
  const digitsInAllCells = Array.from(
    { length: TOTAL_CELLS_IN_BOARD },
    (_, index) => {
      const rowIndex = Math.floor(index / CELLS_PER_HOUSE);
      const columnIndex = index % CELLS_PER_HOUSE;
      const digitNumber =
        ((rowIndex * 3 + Math.floor(rowIndex / 3) + columnIndex) %
          CELLS_PER_HOUSE) +
        1;

      return {
        cellId: getBrandedCellId(index + 1),
        digit: getBrandedSudokuDigit(String(digitNumber)),
      };
    },
  );

  const solvedBoardState =
    getBoardStateWithEnteredDigitsInTargetCells(digitsInAllCells);

  return getStartingPuzzleStateFromBoardState(solvedBoardState);
};
// #endregion

// #region Render Puzzle Actions
const renderPuzzleActions = async ({
  isStopwatchDisabled = false,
  puzzleState = getUnsolvedPuzzleState(),
  rawBoardState,
  setPuzzleState,
}: {
  isStopwatchDisabled?: boolean;
  puzzleState?: PuzzleState;
  rawBoardState?: RawBoardState;
  setPuzzleState?: (value: unknown) => void;
} = {}): Promise<{
  renderedPuzzleActions: RenderedPuzzleActions;
  setPuzzleStateSpy: ReturnType<typeof vi.fn>;
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

  const resolvedSetPuzzleStateSpy = vi.fn(setPuzzleState);

  const renderedPuzzleActions = await render(
    <Provider>
      <PuzzleActions
        isRowLayout={false}
        puzzleState={puzzleState}
        rawBoardState={rawBoardState ?? EMPTY_RAW_BOARD_STATE}
        setPuzzleState={resolvedSetPuzzleStateSpy}
      />
    </Provider>,
  );

  await waitForReactToFinishUpdating();

  return {
    renderedPuzzleActions,
    setPuzzleStateSpy: resolvedSetPuzzleStateSpy,
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
      buttonElement.textContent
        ?.replace(WHITESPACE_SEQUENCE_REGEX, " ")
        .trim() ?? "";

    return normalizedButtonText === buttonText;
  });

  if (!candidateButton) {
    throw new Error(
      `Could not find a dialog button with text "${buttonText}".`,
    );
  }

  candidateButton.click();
  await waitForReactToFinishUpdating();
};
// #endregion

beforeEach(() => {
  mockHandleRedoMove.mockReset();
  mockHandleUndoMove.mockReset();

  mockNavigate.mockReset();
  mockMakePuzzle.mockReset();
  mockMakePuzzle.mockReturnValue(EMPTY_RAW_BOARD_STATE);

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
  it("disables the undo button when there are no moves to undo", async () => {
    // Arrange
    const puzzleState: PuzzleState = {
      historyIndex: 0,
      puzzleHistory: [getStartingEmptyBoardState()],
    };

    // Act
    const { renderedPuzzleActions } = await renderPuzzleActions({
      puzzleState,
    });

    // Assert
    await expect
      .element(
        await getActionButton(renderedPuzzleActions, "Undo the last move"),
      )
      .toBeDisabled();
  });

  it("disables the redo button when there are no moves to redo", async () => {
    // Arrange
    const puzzleState: PuzzleState = {
      historyIndex: 1,
      puzzleHistory: [
        getStartingEmptyBoardState(),
        getStartingEmptyBoardState(),
      ],
    };

    // Act
    const { renderedPuzzleActions } = await renderPuzzleActions({
      puzzleState,
    });

    // Assert
    await expect
      .element(
        await getActionButton(
          renderedPuzzleActions,
          "Redo the last undone move",
        ),
      )
      .toBeDisabled();
  });

  it("calls handleUndoMove when undo is pressed", async () => {
    // Arrange
    const puzzleState: PuzzleState = {
      historyIndex: 1,
      puzzleHistory: [
        getStartingEmptyBoardState(),
        getStartingEmptyBoardState(),
      ],
    };
    const { renderedPuzzleActions, setPuzzleStateSpy } =
      await renderPuzzleActions({ puzzleState });

    // Act
    await (
      await getActionButton(renderedPuzzleActions, "Undo the last move")
    ).click();

    // Assert
    expect(mockHandleUndoMove).toHaveBeenCalledTimes(1);
    expect(mockHandleUndoMove).toHaveBeenCalledWith(setPuzzleStateSpy);
  });

  it("calls handleRedoMove when redo is pressed", async () => {
    // Arrange
    const puzzleState: PuzzleState = {
      historyIndex: 0,
      puzzleHistory: [
        getStartingEmptyBoardState(),
        getStartingEmptyBoardState(),
      ],
    };
    const { renderedPuzzleActions, setPuzzleStateSpy } =
      await renderPuzzleActions({ puzzleState });

    // Act
    await (
      await getActionButton(renderedPuzzleActions, "Redo the last undone move")
    ).click();

    // Assert
    expect(mockHandleRedoMove).toHaveBeenCalledTimes(1);
    expect(mockHandleRedoMove).toHaveBeenCalledWith(setPuzzleStateSpy);
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
      puzzleState: getUnsolvedPuzzleState(),
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
        puzzleState: getSolvedPuzzleState(),
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
        puzzleState: getSolvedPuzzleState(),
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
    const { renderedPuzzleActions, setPuzzleStateSpy } =
      await renderPuzzleActions();

    // Act
    await openDialogFromActionButton(
      renderedPuzzleActions,
      "Restart the puzzle",
    );
    await clickDialogButtonWithText(renderedPuzzleActions, "Restart");

    // Assert
    expect(mockResetStopwatch).toHaveBeenCalledTimes(1);
    expect(setPuzzleStateSpy).toHaveBeenCalledTimes(1);
    expect(setPuzzleStateSpy.mock.calls[0][0].historyIndex).toBe(0);
    expect(setPuzzleStateSpy.mock.calls[0][0].puzzleHistory).toHaveLength(1);
  });

  it("resets puzzle and keeps time with Keep Time", async () => {
    // Arrange
    const { renderedPuzzleActions, setPuzzleStateSpy } =
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
    expect(setPuzzleStateSpy).toHaveBeenCalledTimes(1);
  });
});
