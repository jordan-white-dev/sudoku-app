import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Board } from "@/lib/pages/home/components/board/board";
import {
  getBoardStateFromRawBoardState,
  getBrandedCellNumber,
  getBrandedSudokuDigit,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellNumber,
  type PuzzleHistory,
  type RawBoardState,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";

// #region Test Doubles and Module Mocks
const mockUseUserSettings = vi.fn();

vi.mock("@/lib/pages/home/hooks/use-user-settings/use-user-settings", () => ({
  useUserSettings: () => mockUseUserSettings(),
}));
// #endregion

// #region Shared Test Types and Default Configuration
type RenderedBoard = Awaited<ReturnType<typeof render>>;

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

const SEEN_CELL_HIGHLIGHT_COLOR_TOKEN = "ffd700";
const CONFLICT_CELL_HIGHLIGHT_COLOR_TOKEN = "179%2c%2058%2c%2058";
// #endregion

// #region Board State Builders and Test Data Factories
const getEmptyRawBoardState = (): RawBoardState =>
  Array.from({ length: 81 }, () => null) as RawBoardState;

const getStartingEmptyBoardState = (): BoardState =>
  getBoardStateFromRawBoardState(getEmptyRawBoardState());

const getStartingPuzzleHistoryFromBoardState = (
  startingBoardState: BoardState,
): PuzzleHistory => ({
  currentBoardStateIndex: 0,
  boardStateHistory: [startingBoardState],
});

const getBoardStateWithSelectedCells = (
  boardState: BoardState,
  selectedCellNumbers: Array<CellNumber>,
): BoardState =>
  boardState.map((cellState) => ({
    ...cellState,
    isSelected: selectedCellNumbers.includes(cellState.cellNumber),
  }));

const getBoardStateWithEnteredDigitInTargetCell = (
  boardState: BoardState,
  cellNumber: CellNumber,
  enteredDigit: SudokuDigit,
): BoardState =>
  boardState.map((cellState) =>
    Number(cellState.cellNumber) === cellNumber
      ? {
          ...cellState,
          cellContent: {
            enteredDigit,
          },
        }
      : cellState,
  );

const getBoardStateWithGivenDigitInTargetCell = (
  boardState: BoardState,
  cellNumber: CellNumber,
  givenDigit: SudokuDigit,
): BoardState =>
  boardState.map((cellState) =>
    Number(cellState.cellNumber) === cellNumber
      ? {
          ...cellState,
          cellContent: {
            givenDigit,
          },
        }
      : cellState,
  );
// #endregion

// #region Board Accessibility and Element Lookup Helpers
const getCellAccessibleName = (cellNumber: CellNumber) => {
  const rowNumber = Math.floor((cellNumber - 1) / 9) + 1;
  const columnNumber = ((cellNumber - 1) % 9) + 1;

  return `Cell ${cellNumber} located in row ${rowNumber}, column ${columnNumber}`;
};

const getCellLocator = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellNumber: CellNumber,
) =>
  (await renderedBoard).getByRole("button", {
    name: getCellAccessibleName(cellNumber),
  });

const getCellElement = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellNumber: CellNumber,
): Promise<HTMLButtonElement> => {
  const resolvedRenderedBoard = await renderedBoard;
  const cellAccessibleName = getCellAccessibleName(cellNumber);

  const candidateCellElement =
    resolvedRenderedBoard.container.querySelector<HTMLButtonElement>(
      `button[aria-label="${cellAccessibleName}"]`,
    );

  if (!candidateCellElement)
    throw Error(`Could not find button for ${cellAccessibleName}.`);

  return candidateCellElement;
};

const getBoardElementContainingAllCells = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
): Promise<HTMLElement> => {
  const firstCellElement = await getCellElement(
    renderedBoard,
    getBrandedCellNumber(1),
  );

  let currentAncestorElement: HTMLElement | null =
    firstCellElement.parentElement;

  while (currentAncestorElement) {
    const boardCellButtonCount = currentAncestorElement.querySelectorAll(
      'button[aria-label^="Cell "]',
    ).length;

    if (boardCellButtonCount === 81) return currentAncestorElement;

    currentAncestorElement = currentAncestorElement.parentElement;
  }

  throw Error("Could not find the board element containing all 81 cells.");
};
// #endregion

// #region Render and Async Update Helpers
const waitForReactToFinishUpdating = async () => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};

const renderBoard = async ({
  initialBoardState,
  isMultiselectMode = false,
  userSettings = defaultUserSettings,
}: {
  initialBoardState?: BoardState;
  isMultiselectMode?: boolean;
  userSettings?: typeof defaultUserSettings;
} = {}): Promise<RenderedBoard> => {
  mockUseUserSettings.mockReturnValue({
    userSettings,
    setUserSettings: vi.fn(),
  });

  const startingBoardState = initialBoardState ?? getStartingEmptyBoardState();
  const startingPuzzleHistory =
    getStartingPuzzleHistoryFromBoardState(startingBoardState);

  const TestBoard = () => {
    const [puzzleHistory, setPuzzleHistory] = useState<PuzzleHistory>(
      startingPuzzleHistory,
    );

    return (
      <Board
        isMultiselectMode={isMultiselectMode}
        puzzleHistory={puzzleHistory}
        setPuzzleHistory={setPuzzleHistory}
      />
    );
  };

  const renderedBoard = await render(
    <Provider>
      <TestBoard />
    </Provider>,
  );

  await waitForReactToFinishUpdating();

  return renderedBoard;
};
// #endregion

// #region Visual State Inspection Helpers
const getRenderedCellBackgroundImage = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellNumber: CellNumber,
): Promise<string> => {
  const cellElement = await getCellElement(renderedBoard, cellNumber);

  return window.getComputedStyle(cellElement).backgroundImage;
};

const doesBackgroundImageContainToken = (
  backgroundImage: string,
  token: string,
): boolean => backgroundImage.toLowerCase().includes(token.toLowerCase());

const expectCellToBeSelected = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellNumber: CellNumber,
  shouldBeSelected: boolean,
) => {
  const cellElement = await getCellElement(renderedBoard, cellNumber);

  expect(cellElement.getAttribute("data-selected")).toBe(
    String(shouldBeSelected),
  );
};

const expectAllCellsToBeSelected = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
) => {
  for (let cellNumber = 1; cellNumber <= 81; cellNumber++) {
    await expectCellToBeSelected(
      renderedBoard,
      getBrandedCellNumber(cellNumber),
      true,
    );
  }
};

const expectNoCellsToBeSelected = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
) => {
  for (let cellNumber = 1; cellNumber <= 81; cellNumber++) {
    await expectCellToBeSelected(
      renderedBoard,
      getBrandedCellNumber(cellNumber),
      false,
    );
  }
};

const expectSeenCellHighlightToBeVisible = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellNumber: CellNumber,
  shouldBeVisible: boolean,
) => {
  const backgroundImage = await getRenderedCellBackgroundImage(
    renderedBoard,
    cellNumber,
  );

  expect(
    doesBackgroundImageContainToken(
      backgroundImage,
      SEEN_CELL_HIGHLIGHT_COLOR_TOKEN,
    ),
  ).toBe(shouldBeVisible);
};

const expectConflictCellHighlightToBeVisible = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellNumber: CellNumber,
  shouldBeVisible: boolean,
) => {
  const backgroundImage = await getRenderedCellBackgroundImage(
    renderedBoard,
    cellNumber,
  );

  expect(
    doesBackgroundImageContainToken(
      backgroundImage,
      CONFLICT_CELL_HIGHLIGHT_COLOR_TOKEN,
    ),
  ).toBe(shouldBeVisible);
};
// #endregion

// #region Pointer Interaction Helpers
const setBoardBoundsForPointerDrag = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
) => {
  const boardElement = await getBoardElementContainingAllCells(renderedBoard);

  Object.defineProperty(boardElement, "getBoundingClientRect", {
    configurable: true,
    value: (): DOMRect =>
      ({
        bottom: 450,
        height: 450,
        left: 0,
        right: 450,
        top: 0,
        width: 450,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect,
  });
};

const getPointerCoordinatesForCellCenter = (cellNumber: CellNumber) => {
  const zeroBasedCellNumber = cellNumber - 1;
  const rowIndex = Math.floor(zeroBasedCellNumber / 9);
  const columnIndex = zeroBasedCellNumber % 9;

  return {
    clientX: columnIndex * 50 + 25,
    clientY: rowIndex * 50 + 25,
  };
};

const dispatchPointerEvent = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  target: "board" | { cellNumber: CellNumber },
  eventType: string,
  pointerEventInit: PointerEventInit,
) => {
  const eventTarget =
    target === "board"
      ? await getBoardElementContainingAllCells(renderedBoard)
      : await getCellElement(renderedBoard, target.cellNumber);

  eventTarget.dispatchEvent(
    new PointerEvent(eventType, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      ...pointerEventInit,
    }),
  );

  await waitForReactToFinishUpdating();
};
// #endregion

// #region Keyboard Event Helpers
const dispatchWindowKeyDown = async (keyboardEventInit: KeyboardEventInit) => {
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ...keyboardEventInit,
    }),
  );

  await waitForReactToFinishUpdating();
};
// #endregion

beforeEach(() => {
  mockUseUserSettings.mockReset();

  if (!HTMLElement.prototype.setPointerCapture)
    HTMLElement.prototype.setPointerCapture = vi.fn(() => undefined);
  else
    vi.spyOn(HTMLElement.prototype, "setPointerCapture").mockImplementation(
      () => undefined,
    );
});

describe("Board rendering", () => {
  it("shows all 81 cells of the puzzle board", async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    // Assert
    for (let cellNumber = 1; cellNumber <= 81; cellNumber++) {
      await expect
        .element(
          await getCellLocator(renderedBoard, getBrandedCellNumber(cellNumber)),
        )
        .toBeInTheDocument();
    }
  });
});

describe("Selecting cells with the pointer", () => {
  it("allows a single cell to be selected when single selection mode is active", async () => {
    // Arrange
    const renderedBoard = await renderBoard();
    const firstCellLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(1),
    );

    // Act
    await firstCellLocator.click();

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
  });

  it("allows the selected cell to be deselected when it is clicked again in single selection mode", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );
    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });
    const firstCellLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(1),
    );

    // Act
    await firstCellLocator.click();

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), false);
  });

  it("keeps only the newly chosen cell selected when a different cell is clicked in single selection mode", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    const secondCellLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(2),
    );

    // Act
    await secondCellLocator.click();

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), false);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), true);

    return;
  });

  it("keeps only the chosen cell selected when several cells were selected and a single-selection choice is made", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
        getBrandedCellNumber(3),
      ],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      isMultiselectMode: false,
    });

    // Act
    await (
      await getCellLocator(renderedBoard, getBrandedCellNumber(2))
    ).click();

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), false);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(3), false);

    return;
  });

  it("allows a cell to be added to the selection when multiselect mode is active", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );
    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      isMultiselectMode: true,
    });

    // Act
    await (
      await getCellLocator(renderedBoard, getBrandedCellNumber(2))
    ).click();

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), true);
  });

  it("allows an already selected cell to be removed from the selection when multiselect mode is active", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );
    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      isMultiselectMode: true,
    });

    // Act
    await (
      await getCellLocator(renderedBoard, getBrandedCellNumber(1))
    ).click();

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), false);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), true);
  });
});

describe("Showing seen cells", () => {
  it("highlights cells that share the row, column, or box of the single selected cell when that setting is enabled", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });

    // Assert
    await expectSeenCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectSeenCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(10),
      true,
    );
    await expectSeenCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(11),
      true,
    );
    await expectSeenCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(40),
      false,
    );
  });

  it("does not highlight any related cells when nothing is selected, even if the feature is enabled", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });

    // Assert
    await expectSeenCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectSeenCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
    await expectSeenCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(10),
      false,
    );

    return;
  });

  it("does not highlight related cells when the seen cells setting is disabled", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: false,
      },
    });

    // Assert
    await expectSeenCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
    await expectSeenCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(10),
      false,
    );
    await expectSeenCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(11),
      false,
    );
  });

  it("does not highlight related cells when more than one cell is selected", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });

    // Assert
    await expectSeenCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(3),
      false,
    );
    await expectSeenCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(10),
      false,
    );
    await expectSeenCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(11),
      false,
    );
  });
});

describe("Showing digit conflicts", () => {
  it("highlights cells with matching given or entered digits in the same box when conflict checking is enabled", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithEnteredDigitInTargetCell(
      getBoardStateWithEnteredDigitInTargetCell(
        getStartingEmptyBoardState(),
        getBrandedCellNumber(1),
        getBrandedSudokuDigit("9"),
      ),
      getBrandedCellNumber(11),
      getBrandedSudokuDigit("9"),
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(11),
      true,
    );
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(20),
      false,
    );
  });

  it("highlights cells with matching given or entered digits in the same column when conflict checking is enabled", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithEnteredDigitInTargetCell(
      getBoardStateWithEnteredDigitInTargetCell(
        getStartingEmptyBoardState(),
        getBrandedCellNumber(1),
        getBrandedSudokuDigit("7"),
      ),
      getBrandedCellNumber(10),
      getBrandedSudokuDigit("7"),
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(10),
      true,
    );
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(11),
      false,
    );
  });

  it("highlights cells with matching given or entered digits in the same row when conflict checking is enabled", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithEnteredDigitInTargetCell(
      getBoardStateWithEnteredDigitInTargetCell(
        getStartingEmptyBoardState(),
        getBrandedCellNumber(1),
        getBrandedSudokuDigit("5"),
      ),
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("5"),
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(3),
      false,
    );
  });

  it("treats given digits and entered digits as conflicting with each other", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithEnteredDigitInTargetCell(
      getBoardStateWithGivenDigitInTargetCell(
        getStartingEmptyBoardState(),
        getBrandedCellNumber(1),
        getBrandedSudokuDigit("5"),
      ),
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("5"),
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
  });

  it("highlights every cell that breaks the rule when more than two matching digits appear in the same region", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithEnteredDigitInTargetCell(
      getBoardStateWithEnteredDigitInTargetCell(
        getBoardStateWithEnteredDigitInTargetCell(
          getStartingEmptyBoardState(),
          getBrandedCellNumber(1),
          getBrandedSudokuDigit("4"),
        ),
        getBrandedCellNumber(2),
        getBrandedSudokuDigit("4"),
      ),
      getBrandedCellNumber(3),
      getBrandedSudokuDigit("4"),
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(3),
      true,
    );
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(4),
      false,
    );

    return;
  });

  it("does not mark cells as conflicting when the digits in the same region are different", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithEnteredDigitInTargetCell(
      getBoardStateWithEnteredDigitInTargetCell(
        getStartingEmptyBoardState(),
        getBrandedCellNumber(1),
        getBrandedSudokuDigit("5"),
      ),
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("6"),
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );

    return;
  });

  it("does not highlight matching digits when conflict checking is disabled", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithEnteredDigitInTargetCell(
      getBoardStateWithEnteredDigitInTargetCell(
        getStartingEmptyBoardState(),
        getBrandedCellNumber(1),
        getBrandedSudokuDigit("5"),
      ),
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("5"),
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: false,
      },
    });

    // Assert
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectConflictCellHighlightToBeVisible(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
  });
});

describe("Moving selection with the keyboard", () => {
  it("moves a single selected cell one space to the right when the right arrow key is pressed", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowRight}");

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), false);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), true);
  });

  it("moves a single selected cell one space to the left when the left arrow key is pressed", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowLeft}");

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), false);
  });

  it("wraps selection to the end of the row when moving left from the first cell in a row", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowLeft}");

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), false);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(9), true);
  });

  it("wraps selection to the bottom row when moving up from the top row", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(9)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowUp}");

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(9), false);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(81), true);
  });

  it("adds a cell to the selection when Ctrl plus an arrow key is used", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await userEvent.keyboard("{Control>}{ArrowRight}{/Control}");

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), true);
  });

  it("adds a cell to the selection when Shift plus an arrow key is used", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}");

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(10), true);
  });

  it("wraps selection to the first column when moving right from the last cell in a row", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(9)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowRight}");

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(9), false);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);

    return;
  });

  it("wraps selection to the top row when moving down from the bottom row", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(73)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowDown}");

    // Assert
    await expectCellToBeSelected(
      renderedBoard,
      getBrandedCellNumber(73),
      false,
    );
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);

    return;
  });

  it("extends from the most recently selected cell when several cells are already selected", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await userEvent.keyboard("{Control>}{ArrowRight}{/Control}");

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(3), true);

    return;
  });

  it("continues from the cell the player most recently chose when extending the selection with the keyboard", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      isMultiselectMode: true,
    });

    // Act
    await (
      await getCellLocator(renderedBoard, getBrandedCellNumber(5))
    ).click();
    await userEvent.keyboard("{Control>}{ArrowRight}{/Control}");

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(5), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(6), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), false);

    return;
  });

  it("falls back to the remaining selected cell when the last keyboard anchor is no longer selected", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      isMultiselectMode: true,
    });

    // Act
    await (
      await getCellLocator(renderedBoard, getBrandedCellNumber(5))
    ).click();
    await (
      await getCellLocator(renderedBoard, getBrandedCellNumber(5))
    ).click();
    await userEvent.keyboard("{Control>}{ArrowRight}{/Control}");

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(5), false);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(6), false);

    return;
  });

  it("does not create a selection when no cell is selected and an arrow key is pressed", async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    // Act
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{ArrowDown}");

    // Assert
    await expectNoCellsToBeSelected(renderedBoard);
  });

  it("ignores arrow keys pressed from the numpad", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await dispatchWindowKeyDown({
      key: "ArrowRight",
      location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
    });

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), false);
  });
});

describe("Changing all selected cells with keyboard shortcuts", () => {
  it('selects all cells when Ctrl+"a" is pressed', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await dispatchWindowKeyDown({
      ctrlKey: true,
      key: "a",
    });

    // Assert
    await expectAllCellsToBeSelected(renderedBoard);
  });

  it('selects all cells when Ctrl+"A" is pressed because the shortcut is case-insensitive', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await dispatchWindowKeyDown({
      ctrlKey: true,
      key: "A",
    });

    // Assert
    await expectAllCellsToBeSelected(renderedBoard);

    return;
  });

  it('clears the current selection when Ctrl+Shift+"a" is pressed', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await dispatchWindowKeyDown({
      ctrlKey: true,
      shiftKey: true,
      key: "a",
    });

    // Assert
    await expectNoCellsToBeSelected(renderedBoard);
  });

  it('clears the current selection when Ctrl+Shift+"A" is pressed because the shortcut is case-insensitive', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await dispatchWindowKeyDown({
      ctrlKey: true,
      shiftKey: true,
      key: "A",
    });

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), false);
    await expectCellToBeSelected(
      renderedBoard,
      getBrandedCellNumber(81),
      false,
    );
    await expectCellToBeSelected(
      renderedBoard,
      getBrandedCellNumber(40),
      false,
    );
  });

  it('inverts the current selection when Ctrl+"i" is pressed', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await dispatchWindowKeyDown({
      ctrlKey: true,
      key: "i",
    });

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), false);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), false);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(3), true);
  });

  it('inverts the current selection when Ctrl+"I" is pressed because the shortcut is case-insensitive', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await dispatchWindowKeyDown({
      ctrlKey: true,
      key: "I",
    });

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), false);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), false);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(3), true);

    return;
  });

  it('does not select all cells when Ctrl+"a" is pressed with Meta', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await dispatchWindowKeyDown({
      ctrlKey: true,
      key: "a",
      metaKey: true,
    });

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), false);
    await expectCellToBeSelected(
      renderedBoard,
      getBrandedCellNumber(81),
      false,
    );
  });

  it('does not select all cells when Ctrl+"A" is pressed with Meta', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
    });

    // Act
    await dispatchWindowKeyDown({
      ctrlKey: true,
      key: "A",
      metaKey: true,
    });

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), false);
    await expectCellToBeSelected(
      renderedBoard,
      getBrandedCellNumber(81),
      false,
    );
  });
});

describe("Selecting cells by dragging across the board", () => {
  it("selects each cell crossed while dragging in a straight line", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      isMultiselectMode: false,
    });

    await setBoardBoundsForPointerDrag(renderedBoard);

    const secondCellPointerCoordinates = getPointerCoordinatesForCellCenter(
      getBrandedCellNumber(2),
    );
    const thirdCellPointerCoordinates = getPointerCoordinatesForCellCenter(
      getBrandedCellNumber(3),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      { cellNumber: getBrandedCellNumber(1) },
      "pointerdown",
      getPointerCoordinatesForCellCenter(getBrandedCellNumber(1)),
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      secondCellPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      thirdCellPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointerup",
      thirdCellPointerCoordinates,
    );

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(3), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(4), false);
  });

  it("selects interpolated cells while dragging diagonally across the board", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      isMultiselectMode: false,
    });

    await setBoardBoundsForPointerDrag(renderedBoard);

    const diagonalTargetPointerCoordinates = getPointerCoordinatesForCellCenter(
      getBrandedCellNumber(21),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      { cellNumber: getBrandedCellNumber(1) },
      "pointerdown",
      getPointerCoordinatesForCellCenter(getBrandedCellNumber(1)),
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      diagonalTargetPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointerup",
      diagonalTargetPointerCoordinates,
    );

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(11), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(21), true);
  });

  it("continues adding crossed cells to the existing selection while dragging in multiselect mode", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithSelectedCells(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(9)],
    );

    const renderedBoard = await renderBoard({
      initialBoardState: startingBoardState,
      isMultiselectMode: true,
    });

    await setBoardBoundsForPointerDrag(renderedBoard);

    const secondCellPointerCoordinates = getPointerCoordinatesForCellCenter(
      getBrandedCellNumber(2),
    );
    const thirdCellPointerCoordinates = getPointerCoordinatesForCellCenter(
      getBrandedCellNumber(3),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      { cellNumber: getBrandedCellNumber(1) },
      "pointerdown",
      getPointerCoordinatesForCellCenter(getBrandedCellNumber(1)),
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      secondCellPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      thirdCellPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointerup",
      thirdCellPointerCoordinates,
    );

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(3), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(9), true);

    return;
  });

  it("does not add any new cells while the pointer is outside the board boundaries", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      isMultiselectMode: false,
    });

    await setBoardBoundsForPointerDrag(renderedBoard);

    const pointerCoordinatesOutsideTheBoard = {
      clientX: 500,
      clientY: 500,
    };

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      { cellNumber: getBrandedCellNumber(1) },
      "pointerdown",
      getPointerCoordinatesForCellCenter(getBrandedCellNumber(1)),
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      pointerCoordinatesOutsideTheBoard,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointerup",
      pointerCoordinatesOutsideTheBoard,
    );

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), false);
    await expectCellToBeSelected(
      renderedBoard,
      getBrandedCellNumber(10),
      false,
    );

    return;
  });

  it("stops extending the selection after the pointer is released", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      isMultiselectMode: false,
    });

    await setBoardBoundsForPointerDrag(renderedBoard);

    const secondCellPointerCoordinates = getPointerCoordinatesForCellCenter(
      getBrandedCellNumber(2),
    );
    const thirdCellPointerCoordinates = getPointerCoordinatesForCellCenter(
      getBrandedCellNumber(3),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      { cellNumber: getBrandedCellNumber(1) },
      "pointerdown",
      getPointerCoordinatesForCellCenter(getBrandedCellNumber(1)),
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      secondCellPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointerup",
      secondCellPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      thirdCellPointerCoordinates,
    );

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(3), false);
  });

  it("stops extending the selection after pointer cancellation", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      isMultiselectMode: false,
    });

    await setBoardBoundsForPointerDrag(renderedBoard);

    const secondCellPointerCoordinates = getPointerCoordinatesForCellCenter(
      getBrandedCellNumber(2),
    );
    const thirdCellPointerCoordinates = getPointerCoordinatesForCellCenter(
      getBrandedCellNumber(3),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      { cellNumber: getBrandedCellNumber(1) },
      "pointerdown",
      getPointerCoordinatesForCellCenter(getBrandedCellNumber(1)),
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      secondCellPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointercancel",
      secondCellPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      thirdCellPointerCoordinates,
    );

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(3), false);
  });

  it("stops extending the selection after pointer capture is lost", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      isMultiselectMode: false,
    });

    await setBoardBoundsForPointerDrag(renderedBoard);

    const secondCellPointerCoordinates = getPointerCoordinatesForCellCenter(
      getBrandedCellNumber(2),
    );
    const thirdCellPointerCoordinates = getPointerCoordinatesForCellCenter(
      getBrandedCellNumber(3),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      { cellNumber: getBrandedCellNumber(1) },
      "pointerdown",
      getPointerCoordinatesForCellCenter(getBrandedCellNumber(1)),
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      secondCellPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "lostpointercapture",
      secondCellPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      thirdCellPointerCoordinates,
    );

    // Assert
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(1), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(2), true);
    await expectCellToBeSelected(renderedBoard, getBrandedCellNumber(3), false);
  });
});
