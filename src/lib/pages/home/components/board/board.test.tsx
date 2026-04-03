import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Board } from "@/lib/pages/home/components/board/board";
import {
  defaultUserSettings,
  expectCellToBeSelectedOrNot,
  expectConflictCellHighlightInTargetCell,
  expectSeenCellHighlightOrNotInTargetCell,
  getBoardStateWithEnteredDigitInTargetCell,
  getBoardStateWithGivenDigitInTargetCell,
  getBoardStateWithTargetCellsSelected,
  getCellElement,
  getCellLocator,
  getStartingEmptyBoardState,
  getStartingPuzzleHistoryFromBoardState,
  type RenderedBoard,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";
import {
  getBrandedCellNumber,
  getBrandedSudokuDigit,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellNumber,
  type CellState,
  type PuzzleHistory,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";

// #region Module Mocks
const mockUseUserSettings = vi.fn();

vi.mock("@/lib/pages/home/hooks/use-user-settings/use-user-settings", () => ({
  useUserSettings: () => mockUseUserSettings(),
}));
// #endregion

// #region Board Element Lookup
const getBoardElement = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
): Promise<HTMLElement> => {
  const firstCellElement = await getCellElement(
    renderedBoard,
    getBrandedCellNumber(1),
  );

  let currentAncestorElement: HTMLElement | null =
    firstCellElement.parentElement;

  while (currentAncestorElement) {
    const cellsInBoardCount = currentAncestorElement.querySelectorAll(
      'button[aria-label^="Cell "]',
    ).length;

    if (cellsInBoardCount === 81) return currentAncestorElement;

    currentAncestorElement = currentAncestorElement.parentElement;
  }

  throw Error("Could not find a valid board element containing all 81 cells.");
};
// #endregion

// #region Render Board
const renderBoard = async ({
  startingBoardState,
  isMultiselectMode = false,
  userSettings = defaultUserSettings,
}: {
  startingBoardState?: BoardState;
  isMultiselectMode?: boolean;
  userSettings?: typeof defaultUserSettings;
} = {}): Promise<RenderedBoard> => {
  mockUseUserSettings.mockReturnValue({
    userSettings,
    setUserSettings: vi.fn(),
  });

  const boardState = startingBoardState ?? getStartingEmptyBoardState();
  const startingPuzzleHistory =
    getStartingPuzzleHistoryFromBoardState(boardState);

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

// #region Selected Cell Expectations
const expectAllCellsToBeSelected = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
) => {
  for (let cellNumber = 1; cellNumber <= 81; cellNumber++) {
    await expectCellToBeSelectedOrNot(
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
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(cellNumber),
      false,
    );
  }
};
// #endregion

// #region Seen Cell Expectations
const ALL_CELL_NUMBERS = Array.from({ length: 81 }, (_, index) =>
  getBrandedCellNumber(index + 1),
);

const getZeroBasedCellIndex = (cellNumber: CellNumber): number =>
  Number(cellNumber) - 1;

const getRowIndex = (cellNumber: CellNumber): number =>
  Math.floor(getZeroBasedCellIndex(cellNumber) / 9);

const getColumnIndex = (cellNumber: CellNumber): number =>
  getZeroBasedCellIndex(cellNumber) % 9;

const getBoxIndex = (cellNumber: CellNumber): number =>
  Math.floor(getRowIndex(cellNumber) / 3) * 3 +
  Math.floor(getColumnIndex(cellNumber) / 3);

const doCellsShareRowColumnOrBox = (
  firstCellNumber: CellNumber,
  secondCellNumber: CellNumber,
): boolean =>
  getRowIndex(firstCellNumber) === getRowIndex(secondCellNumber) ||
  getColumnIndex(firstCellNumber) === getColumnIndex(secondCellNumber) ||
  getBoxIndex(firstCellNumber) === getBoxIndex(secondCellNumber);

const getCellNumbersSeenByTargetCell = (
  targetCellNumber: CellNumber,
): Array<CellNumber> =>
  ALL_CELL_NUMBERS.filter((cellNumber) =>
    doCellsShareRowColumnOrBox(targetCellNumber, cellNumber),
  );

const getCellNumbersNotSeenByTargetCell = (
  targetCellNumber: CellNumber,
): Array<CellNumber> =>
  ALL_CELL_NUMBERS.filter(
    (cellNumber) => !doCellsShareRowColumnOrBox(targetCellNumber, cellNumber),
  );

const expectSeenCellHighlightOrNotInTargetCells = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellNumbers: Array<CellNumber>,
  shouldHighlightBeVisible: boolean,
): Promise<void> => {
  await Promise.all(
    cellNumbers.map((cellNumber) =>
      expectSeenCellHighlightOrNotInTargetCell(
        renderedBoard,
        cellNumber,
        shouldHighlightBeVisible,
      ),
    ),
  );
};
// #endregion

// #region Pointer Interactions
const setBoardBoundsForPointerDrag = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
) => {
  const boardElement = await getBoardElement(renderedBoard);

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

const getPointerCoordinatesForCenterOfCell = (cellNumber: CellNumber) => {
  const zeroBasedCellNumber = cellNumber - 1;
  const rowIndex = Math.floor(zeroBasedCellNumber / 9);
  const columnIndex = zeroBasedCellNumber % 9;

  const pointerCoordinates = {
    clientX: columnIndex * 50 + 25,
    clientY: rowIndex * 50 + 25,
  };

  return pointerCoordinates;
};

const dispatchPointerEvent = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  target: "board" | CellNumber,
  eventType: string,
  pointerEventInit: PointerEventInit,
) => {
  const eventTarget =
    target === "board"
      ? await getBoardElement(renderedBoard)
      : await getCellElement(renderedBoard, target);

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

// #region Dispatch Keyboard Event
const dispatchKeyboardEvent = async (keyboardEventInit: KeyboardEventInit) => {
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

// #region Board State Content
const getBoardStateWithCenterMarkupsInTargetCell = (
  boardState: BoardState,
  cellNumber: CellNumber,
  centerMarkups: Array<SudokuDigit>,
): BoardState => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.cellNumber === cellNumber
        ? {
            ...cellState,
            cellContent: {
              centerMarkups,
              cornerMarkups: [""],
            },
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
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
  it("shows all 81 cells of the board", async () => {
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

describe("Selecting and deselecting cells with the pointer", () => {
  it("selects only a clicked cell when in single select mode and no cells were selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard();
    const cellToClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(1),
    );

    // Act
    await cellToClickLocator.click();

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
  });

  it("deselects a clicked cell when in single select mode and it was the only selected cell", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
    });
    const cellToClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(1),
    );

    // Act
    await cellToClickLocator.click();

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
  });

  it("selects only a clicked cell and deselects the previously selected cell when in single select mode, a single cell was selected, and the clicked cell was a different cell", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
    });
    const cellToClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(2),
    );

    // Act
    await cellToClickLocator.click();

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
  });

  it("selects only a clicked cell and deselects all previously selected cells when in single select mode, multiple cells were selected, and the clicked cell was one of them", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
        getBrandedCellNumber(3),
      ],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await (
      await getCellLocator(renderedBoard, getBrandedCellNumber(2))
    ).click();

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      false,
    );
  });

  it("selects only a clicked cell and deselects all previously selected cells when in single select mode, multiple cells were selected, and the clicked cell was a different cell", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
        getBrandedCellNumber(3),
      ],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await (
      await getCellLocator(renderedBoard, getBrandedCellNumber(4))
    ).click();

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(4),
      true,
    );
  });

  it("selects only a clicked cell when in multiselect mode and no cells were selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      isMultiselectMode: true,
    });
    const cellToClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(1),
    );

    // Act
    await cellToClickLocator.click();

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
  });

  it("deselects a clicked cell when in multiselect mode and it was the only selected cell", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
      isMultiselectMode: true,
    });

    // Act
    await (
      await getCellLocator(renderedBoard, getBrandedCellNumber(1))
    ).click();

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
  });

  it("selects a clicked cell when in multiselect mode, a single cell was selected, and the clicked cell was a different cell", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
      isMultiselectMode: true,
    });

    // Act
    await (
      await getCellLocator(renderedBoard, getBrandedCellNumber(2))
    ).click();

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
  });

  it("deselects a clicked cell when in multiselect mode, multiple cells were selected, and the clicked cell was one of them", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
      isMultiselectMode: true,
    });

    // Act
    await (
      await getCellLocator(renderedBoard, getBrandedCellNumber(1))
    ).click();

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
  });

  it("selects a clicked cell when in multiselect mode, multiple cells were selected, and the clicked cell was a different cell", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
      isMultiselectMode: true,
    });

    // Act
    await (
      await getCellLocator(renderedBoard, getBrandedCellNumber(3))
    ).click();

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      true,
    );
  });
});

describe("Show seen cells highlights", () => {
  it("highlights only a selected cell and all cells that share a row, column, or box with it when in single select mode, show seen cells is enabled, and only one cell is selected", async () => {
    // Arrange
    const selectedCellNumber = getBrandedCellNumber(1);
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [selectedCellNumber],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });
    const seenCellNumbers = getCellNumbersSeenByTargetCell(selectedCellNumber);
    const notSeenCellNumbers =
      getCellNumbersNotSeenByTargetCell(selectedCellNumber);

    // Assert
    await expectSeenCellHighlightOrNotInTargetCells(
      renderedBoard,
      seenCellNumbers,
      true,
    );
    await expectSeenCellHighlightOrNotInTargetCells(
      renderedBoard,
      notSeenCellNumbers,
      false,
    );
  });

  it("highlights only a selected cell and all cells that share a row, column, or box with it when in multiselect mode, show seen cells is enabled, and only one cell is selected", async () => {
    // Arrange
    const selectedCellNumber = getBrandedCellNumber(1);
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [selectedCellNumber],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
      isMultiselectMode: true,
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });
    const seenCellNumbers = getCellNumbersSeenByTargetCell(selectedCellNumber);
    const notSeenCellNumbers =
      getCellNumbersNotSeenByTargetCell(selectedCellNumber);

    // Assert
    await expectSeenCellHighlightOrNotInTargetCells(
      renderedBoard,
      seenCellNumbers,
      true,
    );
    await expectSeenCellHighlightOrNotInTargetCells(
      renderedBoard,
      notSeenCellNumbers,
      false,
    );
  });

  it("highlights no cells when no cells are selected and show seen cells is enabled", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });

    // Assert
    await expectSeenCellHighlightOrNotInTargetCells(
      renderedBoard,
      ALL_CELL_NUMBERS,
      false,
    );
  });

  it("highlights no cells when no cells are selected and show seen cells is disabled", async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    // Assert
    await expectSeenCellHighlightOrNotInTargetCells(
      renderedBoard,
      ALL_CELL_NUMBERS,
      false,
    );
  });

  it("highlights no cells when a single cell is selected and show seen cells is disabled", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Assert
    await expectSeenCellHighlightOrNotInTargetCells(
      renderedBoard,
      ALL_CELL_NUMBERS,
      false,
    );
  });

  it("highlights no cells when multiple cells are selected and show seen cells is enabled", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });

    // Assert
    await expectSeenCellHighlightOrNotInTargetCells(
      renderedBoard,
      ALL_CELL_NUMBERS,
      false,
    );
  });

  it("highlights no cells when multiple cells are selected and show seen cells is disabled", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Assert
    await expectSeenCellHighlightOrNotInTargetCells(
      renderedBoard,
      ALL_CELL_NUMBERS,
      false,
    );
  });
});

describe("Show conflicted digit highlights", () => {
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
      startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(11),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
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
      startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(10),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
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
      startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
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
      startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
  });

  it("highlights every cell that breaks the rule when more than two matching digits appear in the same house", async () => {
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
      startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(3),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(4),
      false,
    );
  });

  it("does not mark cells as conflicting when the digits in the same house are different", async () => {
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
      startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
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
      startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: false,
      },
    });

    // Assert
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
  });

  it("highlights cells with matching digits in the same row across different boxes when conflict checking is enabled", async () => {
    // Arrange
    // Cells 1 and 4 are in row 1 but in different boxes (box 1 and box 2).
    const startingBoardState = getBoardStateWithEnteredDigitInTargetCell(
      getBoardStateWithEnteredDigitInTargetCell(
        getStartingEmptyBoardState(),
        getBrandedCellNumber(1),
        getBrandedSudokuDigit("3"),
      ),
      getBrandedCellNumber(4),
      getBrandedSudokuDigit("3"),
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(4),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(5),
      false,
    );
  });

  it("highlights cells with matching digits in the same column across different boxes when conflict checking is enabled", async () => {
    // Arrange
    // Cells 1 and 28 are in column 1 but in different boxes (box 1 and box 4).
    const startingBoardState = getBoardStateWithEnteredDigitInTargetCell(
      getBoardStateWithEnteredDigitInTargetCell(
        getStartingEmptyBoardState(),
        getBrandedCellNumber(1),
        getBrandedSudokuDigit("6"),
      ),
      getBrandedCellNumber(28),
      getBrandedSudokuDigit("6"),
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(28),
      true,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(10),
      false,
    );
  });

  it("does not flag cells containing only markup digits as conflicting when the same digit appears twice in the same house", async () => {
    // Arrange
    // Cells 1 and 2 share row 1 and box 1, and both carry center markup "5",
    // but neither has a given or entered digit, so the conflict checker should not fire.
    const startingBoardState = getBoardStateWithCenterMarkupsInTargetCell(
      getBoardStateWithCenterMarkupsInTargetCell(
        getStartingEmptyBoardState(),
        getBrandedCellNumber(1),
        [getBrandedSudokuDigit("5")],
      ),
      getBrandedCellNumber(2),
      [getBrandedSudokuDigit("5")],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
      userSettings: {
        ...defaultUserSettings,
        isConflictCheckerEnabled: true,
      },
    });

    // Assert
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectConflictCellHighlightInTargetCell(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
  });
});

describe("Moving selection with the keyboard", () => {
  it("moves a single selected cell one space to the right when → is pressed", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowRight}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
  });

  it("moves a single selected cell one space to the left when ← is pressed", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowLeft}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
  });

  it("wraps selection to the end of the row when moving left from the first cell in a row", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowLeft}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(9),
      true,
    );
  });

  it("wraps selection to the bottom row when moving up from the top row", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(9)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowUp}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(9),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(81),
      true,
    );
  });

  it("adds a cell to the selection when Ctrl + → is used", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{Control>}{ArrowRight}{/Control}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
  });

  it("adds a cell to the selection when Shift + → is used", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(10),
      true,
    );
  });

  it("wraps selection to the first column when moving right from the last cell in a row", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(9)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowRight}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(9),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
  });

  it("wraps selection to the top row when moving down from the bottom row", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(73)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowDown}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(73),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
  });

  it("extends from the most recently selected cell when several cells are already selected", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{Control>}{ArrowRight}{/Control}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      true,
    );
  });

  it("continues from the cell the player most recently chose when extending the selection with the keyboard", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
      isMultiselectMode: true,
    });

    // Act
    await (
      await getCellLocator(renderedBoard, getBrandedCellNumber(5))
    ).click();
    await userEvent.keyboard("{Control>}{ArrowRight}{/Control}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(5),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(6),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
  });

  it("falls back to the remaining selected cell when the last keyboard anchor is no longer selected", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
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
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(5),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(6),
      false,
    );
  });

  it("does not create a selection when no cells are selected and an arrow key is pressed", async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    // Act
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowRight}");

    // Assert
    await expectNoCellsToBeSelected(renderedBoard);
  });

  it("ignores arrow keys pressed from the numpad", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      key: "ArrowRight",
      location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
    });

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
  });

  it("moves a single selected cell one space downward when ↓ is pressed", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowDown}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(10),
      true,
    );
  });

  it("moves a single selected cell one space upward when ↑ is pressed", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(10)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{ArrowUp}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(10),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
  });

  it("adds a cell to the selection when Ctrl + ← is used", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{Control>}{ArrowLeft}{/Control}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
  });

  it("adds a cell to the selection when Ctrl + ↑ is used", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(10)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{Control>}{ArrowUp}{/Control}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(10),
      true,
    );
  });

  it("adds a cell to the selection when Ctrl + ↓ is used", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{Control>}{ArrowDown}{/Control}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(10),
      true,
    );
  });

  it("adds a cell to the selection when Shift + ← is used", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{Shift>}{ArrowLeft}{/Shift}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
  });

  it("adds a cell to the selection when Shift + → is used", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
  });

  it("adds a cell to the selection when Shift + ↑ is used", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(10)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(10),
      true,
    );
  });
});

describe("Changing all selected cells with keyboard shortcuts", () => {
  it('selects all cells when Ctrl+"a" is pressed', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      key: "a",
    });

    // Assert
    await expectAllCellsToBeSelected(renderedBoard);
  });

  it('selects all cells when Ctrl+"A" is pressed because the shortcut is case-insensitive', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      key: "A",
    });

    // Assert
    await expectAllCellsToBeSelected(renderedBoard);
  });

  it('clears the current selection when Ctrl+Shift+"a" is pressed', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      shiftKey: true,
      key: "a",
    });

    // Assert
    await expectNoCellsToBeSelected(renderedBoard);
  });

  it('clears the current selection when Ctrl+Shift+"A" is pressed because the shortcut is case-insensitive', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      shiftKey: true,
      key: "A",
    });

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(81),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(40),
      false,
    );
  });

  it('inverts the current selection when Ctrl+"i" is pressed', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      key: "i",
    });

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      true,
    );
  });

  it('inverts the current selection when Ctrl+"I" is pressed because the shortcut is case-insensitive', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      key: "I",
    });

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      true,
    );
  });

  it('does not select all cells when Ctrl+"a" is pressed with Meta', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      key: "a",
      metaKey: true,
    });

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(81),
      false,
    );
  });

  it('does not select all cells when Ctrl+"A" is pressed with Meta', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      key: "A",
      metaKey: true,
    });

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(81),
      false,
    );
  });

  it('does not clear the current selection when Ctrl+Shift+"a" is pressed with Meta', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      shiftKey: true,
      key: "a",
      metaKey: true,
    });

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      false,
    );
  });

  it('does not clear the current selection when Ctrl+Shift+"A" is pressed with Meta', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      shiftKey: true,
      key: "A",
      metaKey: true,
    });

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      false,
    );
  });

  it('does not invert the current selection when Ctrl+"i" is pressed with Meta', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      key: "i",
      metaKey: true,
    });

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      false,
    );
  });

  it('does not invert the current selection when Ctrl+"I" is pressed with Meta', async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      key: "I",
      metaKey: true,
    });

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      false,
    );
  });

  it('keeps all cells selected when Ctrl+"a" is pressed and every cell is already selected', async () => {
    // Arrange
    const allCellNumbers = Array.from({ length: 81 }, (_, index) =>
      getBrandedCellNumber(index + 1),
    );
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      allCellNumbers,
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      key: "a",
    });

    // Assert
    await expectAllCellsToBeSelected(renderedBoard);
  });

  it('keeps no cells selected when Ctrl+Shift+"a" is pressed and no cells are selected', async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      shiftKey: true,
      key: "a",
    });

    // Assert
    await expectNoCellsToBeSelected(renderedBoard);
  });

  it('selects no cells when Ctrl+"i" is pressed and all cells are already selected', async () => {
    // Arrange
    const allCellNumbers = Array.from({ length: 81 }, (_, index) =>
      getBrandedCellNumber(index + 1),
    );
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      allCellNumbers,
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
    });

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      key: "i",
    });

    // Assert
    await expectNoCellsToBeSelected(renderedBoard);
  });

  it('selects all cells when Ctrl+"i" is pressed and no cells are selected', async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    // Act
    await dispatchKeyboardEvent({
      ctrlKey: true,
      key: "i",
    });

    // Assert
    await expectAllCellsToBeSelected(renderedBoard);
  });
});

describe("Selecting cells by dragging across the board", () => {
  it("selects each cell crossed while dragging in a straight line", async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    await setBoardBoundsForPointerDrag(renderedBoard);

    const secondCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(2),
    );
    const thirdCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(3),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      getBrandedCellNumber(1),
      "pointerdown",
      getPointerCoordinatesForCenterOfCell(getBrandedCellNumber(1)),
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
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(4),
      false,
    );
  });

  it("selects interpolated cells while dragging diagonally across the board", async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    await setBoardBoundsForPointerDrag(renderedBoard);

    const diagonalTargetPointerCoordinates =
      getPointerCoordinatesForCenterOfCell(getBrandedCellNumber(21));

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      getBrandedCellNumber(1),
      "pointerdown",
      getPointerCoordinatesForCenterOfCell(getBrandedCellNumber(1)),
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
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(11),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(21),
      true,
    );
  });

  it("continues adding crossed cells to the existing selection while dragging in multiselect mode", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(9)],
    );

    const renderedBoard = await renderBoard({
      startingBoardState,
      isMultiselectMode: true,
    });

    await setBoardBoundsForPointerDrag(renderedBoard);

    const secondCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(2),
    );
    const thirdCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(3),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      getBrandedCellNumber(1),
      "pointerdown",
      getPointerCoordinatesForCenterOfCell(getBrandedCellNumber(1)),
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
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(9),
      true,
    );
  });

  it("does not add any new cells while the pointer is outside the board boundaries", async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    await setBoardBoundsForPointerDrag(renderedBoard);

    const pointerCoordinatesOutsideTheBoard = {
      clientX: 500,
      clientY: 500,
    };

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      getBrandedCellNumber(1),
      "pointerdown",
      getPointerCoordinatesForCenterOfCell(getBrandedCellNumber(1)),
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
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(10),
      false,
    );
  });

  it("stops extending the selection after the pointer is released", async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    await setBoardBoundsForPointerDrag(renderedBoard);

    const secondCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(2),
    );
    const thirdCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(3),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      getBrandedCellNumber(1),
      "pointerdown",
      getPointerCoordinatesForCenterOfCell(getBrandedCellNumber(1)),
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
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      false,
    );
  });

  it("stops extending the selection after pointer cancellation", async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    await setBoardBoundsForPointerDrag(renderedBoard);

    const secondCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(2),
    );
    const thirdCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(3),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      getBrandedCellNumber(1),
      "pointerdown",
      getPointerCoordinatesForCenterOfCell(getBrandedCellNumber(1)),
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
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      false,
    );
  });

  it("stops extending the selection after pointer capture is lost", async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    await setBoardBoundsForPointerDrag(renderedBoard);

    const secondCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(2),
    );
    const thirdCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(3),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      getBrandedCellNumber(1),
      "pointerdown",
      getPointerCoordinatesForCenterOfCell(getBrandedCellNumber(1)),
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
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      true,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(3),
      false,
    );
  });

  it("does not select any cells when the pointer moves across the board without a prior pointer down", async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    await setBoardBoundsForPointerDrag(renderedBoard);

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      getPointerCoordinatesForCenterOfCell(getBrandedCellNumber(2)),
    );

    // Assert
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(1),
      false,
    );
    await expectCellToBeSelectedOrNot(
      renderedBoard,
      getBrandedCellNumber(2),
      false,
    );
  });
});
