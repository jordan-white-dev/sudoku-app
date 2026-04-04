import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Board } from "@/lib/pages/home/components/board/board";
import {
  defaultUserSettings,
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

// #region Cell Expectations
const ALL_CELL_NUMBERS = Array.from({ length: 81 }, (_, index) =>
  getBrandedCellNumber(index + 1),
);

// #region Selected Cell Expectations
const expectTargetCellToBeSelectedOrNot = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  targetCellNumber: CellNumber,
  shouldCellBeSelected: boolean,
) => {
  const cellElement = await getCellElement(renderedBoard, targetCellNumber);

  expect(cellElement.getAttribute("data-selected")).toBe(
    String(shouldCellBeSelected),
  );
};

const expectTargetCellsToBeSelectedOrNot = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  targetCellNumbers: Array<CellNumber>,
  shouldCellBeSelected: boolean,
): Promise<void> => {
  await Promise.all(
    targetCellNumbers.map((cellNumber) =>
      expectTargetCellToBeSelectedOrNot(
        renderedBoard,
        cellNumber,
        shouldCellBeSelected,
      ),
    ),
  );
};

const expectAllCellsToBeSelected = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
) => {
  await expectTargetCellsToBeSelectedOrNot(
    renderedBoard,
    ALL_CELL_NUMBERS,
    true,
  );
};

const expectNoCellsToBeSelected = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
) => {
  await expectTargetCellsToBeSelectedOrNot(
    renderedBoard,
    ALL_CELL_NUMBERS,
    false,
  );
};

const expectOnlyTargetCellsToBeSelected = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  selectedCellNumbers: Array<CellNumber>,
) => {
  const notSelectedCellNumbers = ALL_CELL_NUMBERS.filter(
    (cellNumber) => !selectedCellNumbers.includes(cellNumber),
  );

  await expectTargetCellsToBeSelectedOrNot(
    renderedBoard,
    selectedCellNumbers,
    true,
  );
  await expectTargetCellsToBeSelectedOrNot(
    renderedBoard,
    notSelectedCellNumbers,
    false,
  );
};

const expectOnlyTargetCellsToNotBeSelected = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  notSelectedCellNumbers: Array<CellNumber>,
) => {
  const selectedCellNumbers = ALL_CELL_NUMBERS.filter(
    (cellNumber) => !notSelectedCellNumbers.includes(cellNumber),
  );

  await expectTargetCellsToBeSelectedOrNot(
    renderedBoard,
    selectedCellNumbers,
    true,
  );
  await expectTargetCellsToBeSelectedOrNot(
    renderedBoard,
    notSelectedCellNumbers,
    false,
  );
};
// #endregion

// #region Seen Cell Expectations
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

const expectTargetCellsToHaveSeenCellHighlightOrNot = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  targetCellNumbers: Array<CellNumber>,
  shouldHighlightBeVisible: boolean,
): Promise<void> => {
  await Promise.all(
    targetCellNumbers.map((cellNumber) =>
      expectSeenCellHighlightOrNotInTargetCell(
        renderedBoard,
        cellNumber,
        shouldHighlightBeVisible,
      ),
    ),
  );
};

const expectNoCellsToHaveSeenCellHighlight = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
) => {
  await expectTargetCellsToHaveSeenCellHighlightOrNot(
    renderedBoard,
    ALL_CELL_NUMBERS,
    false,
  );
};

const expectOnlySeenCellsOfTargetCellToBeHighlighted = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  targetCellNumber: CellNumber,
) => {
  const cellNumbersSeenByTargetCell =
    getCellNumbersSeenByTargetCell(targetCellNumber);
  const cellNumbersNotSeenByTargetCell = ALL_CELL_NUMBERS.filter(
    (cellNumber) => !cellNumbersSeenByTargetCell.includes(cellNumber),
  );

  await expectTargetCellsToHaveSeenCellHighlightOrNot(
    renderedBoard,
    cellNumbersSeenByTargetCell,
    true,
  );
  await expectTargetCellsToHaveSeenCellHighlightOrNot(
    renderedBoard,
    cellNumbersNotSeenByTargetCell,
    false,
  );
};
// #endregion

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
    for (const cellNumber of ALL_CELL_NUMBERS) {
      const cellLocator = await getCellLocator(
        renderedBoard,
        getBrandedCellNumber(cellNumber),
      );

      await expect.element(cellLocator).toBeInTheDocument();
    }
  });
});

describe("Selecting and deselecting cells by clicking", () => {
  it("selects only a clicked cell when in single select mode and no cells are selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard();
    const cellToClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(1),
    );

    // Act
    await cellToClickLocator.click();

    // Assert
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(1),
    ]);
  });

  it("deselects a clicked cell when in single select mode and it's the only selected cell", async () => {
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
    await expectNoCellsToBeSelected(renderedBoard);
  });

  it("selects only a clicked cell and deselects the previously selected cell when in single select mode, a single cell is selected, and the clicked cell is a different cell", async () => {
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
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(2),
    ]);
  });

  it("selects only a clicked cell and deselects all previously selected cells when in single select mode, multiple cells are selected, and the clicked cell is one of them", async () => {
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
    const cellToClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(2),
    );

    // Act
    await cellToClickLocator.click();

    // Assert
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(2),
    ]);
  });

  it("selects only a clicked cell and deselects all previously selected cells when in single select mode, multiple cells are selected, and the clicked cell is a different cell", async () => {
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
    const celltoClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(4),
    );

    // Act
    await celltoClickLocator.click();

    // Assert
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(4),
    ]);
  });

  it("selects only a clicked cell when in multiselect mode and no cells are selected", async () => {
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
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(1),
    ]);
  });

  it("deselects a clicked cell when in multiselect mode and it's the only selected cell", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
      isMultiselectMode: true,
    });
    const celltoClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(1),
    );

    // Act
    await celltoClickLocator.click();

    // Assert
    await expectNoCellsToBeSelected(renderedBoard);
  });

  it("selects a clicked cell when in multiselect mode, a single cell is selected, and the clicked cell is a different cell", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
      isMultiselectMode: true,
    });
    const celltoClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(2),
    );

    // Act
    await celltoClickLocator.click();

    // Assert
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(1),
      getBrandedCellNumber(2),
    ]);
  });

  it("deselects a clicked cell when in multiselect mode, multiple cells are selected, and the clicked cell is one of them", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
      isMultiselectMode: true,
    });
    const celltoClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(1),
    );

    // Act
    await celltoClickLocator.click();

    // Assert
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(2),
    ]);
  });

  it("selects a clicked cell when in multiselect mode, multiple cells are selected, and the clicked cell is a different cell", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(1), getBrandedCellNumber(2)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
      isMultiselectMode: true,
    });
    const celltoClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(3),
    );

    // Act
    await celltoClickLocator.click();

    // Assert
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(1),
      getBrandedCellNumber(2),
      getBrandedCellNumber(3),
    ]);
  });
});

describe("Show seen cells highlights", () => {
  it("highlights only a selected cell and all cells that share a row, column, or box with it when in single select mode, show seen cells is enabled, and only one cell is selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });
    const cellToClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(1),
    );

    // Act
    await cellToClickLocator.click();

    // Assert
    await expectOnlySeenCellsOfTargetCellToBeHighlighted(
      renderedBoard,
      getBrandedCellNumber(1),
    );
  });

  it("highlights only a selected cell and all cells that share a row, column, or box with it when in multiselect mode, show seen cells is enabled, and only one cell is selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      isMultiselectMode: true,
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });
    const cellToClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(1),
    );

    // Act
    await cellToClickLocator.click();

    // Assert
    await expectOnlySeenCellsOfTargetCellToBeHighlighted(
      renderedBoard,
      getBrandedCellNumber(1),
    );
  });

  it("highlights no cells when in single select mode, show seen cells is disabled, and only one cell is selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard();
    const cellToClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(1),
    );

    // Act
    await cellToClickLocator.click();

    // Assert
    await expectNoCellsToHaveSeenCellHighlight(renderedBoard);
  });

  it("highlights no cells when in multiselect mode, show seen cells is disabled, and only one cell is selected", async () => {
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
    await expectNoCellsToHaveSeenCellHighlight(renderedBoard);
  });

  it("highlights no cells when in single select mode, show seen cells is enabled, and no cells are selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });

    // Assert
    await expectNoCellsToHaveSeenCellHighlight(renderedBoard);
  });

  it("highlights no cells when in single select mode, show seen cells is disabled, and no cells are selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard();

    // Assert
    await expectNoCellsToHaveSeenCellHighlight(renderedBoard);
  });

  it("highlights no cells when in multiselect mode, show seen cells is enabled, and no cells are selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      isMultiselectMode: true,
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });

    // Assert
    await expectNoCellsToHaveSeenCellHighlight(renderedBoard);
  });

  it("highlights no cells when in multiselect mode, show seen cells is disabled, and no cells are selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard({ isMultiselectMode: true });

    // Assert
    await expectNoCellsToHaveSeenCellHighlight(renderedBoard);
  });

  it("highlights no cells when in single select mode, show seen cells is enabled, and multiple cells are selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });
    await setBoardBoundsForPointerDrag(renderedBoard);
    const firstCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(1),
    );
    const secondCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(2),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      getBrandedCellNumber(1),
      "pointerdown",
      firstCellPointerCoordinates,
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

    // Assert
    await expectNoCellsToHaveSeenCellHighlight(renderedBoard);
  });

  it("highlights no cells when in single select mode, show seen cells is disabled, and multiple cells are selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard();
    await setBoardBoundsForPointerDrag(renderedBoard);
    const firstCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(1),
    );
    const secondCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(2),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      getBrandedCellNumber(1),
      "pointerdown",
      firstCellPointerCoordinates,
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

    // Assert
    await expectNoCellsToHaveSeenCellHighlight(renderedBoard);
  });

  it("highlights no cells when in multiselect mode, show seen cells is enabled, and multiple cells are selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      isMultiselectMode: true,
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });
    const firstCellToClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(1),
    );
    const secondCellToClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(2),
    );

    // Act
    await firstCellToClickLocator.click();
    await secondCellToClickLocator.click();

    // Assert
    await expectNoCellsToHaveSeenCellHighlight(renderedBoard);
  });

  it("highlights no cells when in multiselect mode, show seen cells is disabled, and multiple cells are selected", async () => {
    // Arrange
    const renderedBoard = await renderBoard({
      isMultiselectMode: true,
    });
    const firstCellToClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(1),
    );
    const secondCellToClickLocator = await getCellLocator(
      renderedBoard,
      getBrandedCellNumber(2),
    );

    // Act
    await firstCellToClickLocator.click();
    await secondCellToClickLocator.click();

    // Assert
    await expectNoCellsToHaveSeenCellHighlight(renderedBoard);
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

describe("Moving selected cells with the keyboard", () => {
  describe("Arrow keys", () => {
    it("selects the non-edge cell above a starting selected cell and deselects the starting selected cell when in single select mode, ↑ is pressed, and the starting selected cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(10)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        key: "ArrowUp",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
      ]);
    });

    it("selects the non-edge cell below a starting selected cell and deselects the starting selected cell when in single select mode, ↓ is pressed, and the starting selected cell is the only selected cell", async () => {
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
        key: "ArrowDown",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(10),
      ]);
    });

    it("selects the non-edge cell to the left of a starting selected cell and deselects the starting selected cell when in single select mode, ← is pressed, and the starting selected cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(2)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        key: "ArrowLeft",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
      ]);
    });

    it("selects the non-edge cell to the right of a starting selected cell and deselects the starting selected cell when in single select mode, → is pressed, and the starting selected cell is the only selected cell", async () => {
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
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(2),
      ]);
    });

    it("selects the bottom cell of a column and deselects the top cell of a column when in single select mode, ↑ is pressed, and the top cell of the column is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(9)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        key: "ArrowUp",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(81),
      ]);
    });

    it("selects the top cell of a column and deselects the bottom cell of a column when in single select mode, ↓ is pressed, and the bottom cell of the column is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(73)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        key: "ArrowDown",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
      ]);
    });

    it("selects the last cell of a row and deselects the first cell of a row when in single select mode, ← is pressed, and the first cell of the row is the only selected cell", async () => {
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
        key: "ArrowLeft",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(9),
      ]);
    });

    it("selects the first cell of a row and deselects the last cell of a row when in single select mode, → is pressed, and the last cell of the row is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(9)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
      ]);
    });

    it("selects the non-edge cell above a starting selected cell and deselects the starting selected cell when in multiselect mode, ↑ is pressed, and the starting selected cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(10)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        key: "ArrowUp",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
      ]);
    });

    it("selects the non-edge cell below a starting selected cell and deselects the starting selected cell when in multiselect mode, ↓ is pressed, and the starting selected cell is the only selected cell", async () => {
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
      await dispatchKeyboardEvent({
        key: "ArrowDown",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(10),
      ]);
    });

    it("selects the non-edge cell to the left of a starting selected cell and deselects the starting selected cell when in multiselect mode, ← is pressed, and the starting selected cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(2)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        key: "ArrowLeft",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
      ]);
    });

    it("selects the non-edge cell to the right of a starting selected cell and deselects the starting selected cell when in multiselect mode, → is pressed, and the starting selected cell is the only selected cell", async () => {
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
      await dispatchKeyboardEvent({
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(2),
      ]);
    });

    it("selects the bottom cell of a column and deselects the top cell of a column when in multiselect mode, ↑ is pressed, and the top cell of the column is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(9)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        key: "ArrowUp",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(81),
      ]);
    });

    it("selects the top cell of a column and deselects the bottom cell of a column when in multiselect mode, ↓ is pressed, and the bottom cell of the column is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(73)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        key: "ArrowDown",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
      ]);
    });

    it("selects the last cell of a row and deselects the first cell of a row when in multiselect mode, ← is pressed, and the first cell of the row is the only selected cell", async () => {
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
      await dispatchKeyboardEvent({
        key: "ArrowLeft",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(9),
      ]);
    });

    it("selects the first cell of a row and deselects the last cell of a row when in multiselect mode, → is pressed, and the last cell of the row is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(9)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
      ]);
    });

    it("selects no cells when an arrow key is pressed while no cells are selected", async () => {
      // Arrange
      const renderedBoard = await renderBoard();

      // Act
      await dispatchKeyboardEvent({
        key: "ArrowUp",
      });
      await dispatchKeyboardEvent({
        key: "ArrowDown",
      });
      await dispatchKeyboardEvent({
        key: "ArrowLeft",
      });
      await dispatchKeyboardEvent({
        key: "ArrowRight",
      });

      // Assert
      await expectNoCellsToBeSelected(renderedBoard);
    });

    it("selects no cells when a numpad arrow key is pressed while no cells are selected", async () => {
      // Arrange
      const renderedBoard = await renderBoard();

      // Act
      await dispatchKeyboardEvent({
        key: "ArrowUp",
        location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
      });
      await dispatchKeyboardEvent({
        key: "ArrowDown",
        location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
      });
      await dispatchKeyboardEvent({
        key: "ArrowLeft",
        location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
      });
      await dispatchKeyboardEvent({
        key: "ArrowRight",
        location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
      });

      // Assert
      await expectNoCellsToBeSelected(renderedBoard);
    });

    it("selects no cells when a numpad arrow key is pressed while a cell is selected", async () => {
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
        key: "ArrowUp",
        location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
      });
      await dispatchKeyboardEvent({
        key: "ArrowDown",
        location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
      });
      await dispatchKeyboardEvent({
        key: "ArrowLeft",
        location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
      });
      await dispatchKeyboardEvent({
        key: "ArrowRight",
        location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
      ]);
    });

    it("selects a cell next to the first selected cell and deselects the first selected cell when in multiselect mode, a second cell is selected and then deselected, and then an arrow key is pressed while the first cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(1)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });
      const cellToClickLocator = await getCellLocator(
        renderedBoard,
        getBrandedCellNumber(5),
      );

      // Act
      await cellToClickLocator.click();
      await cellToClickLocator.click();
      await dispatchKeyboardEvent({
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(2),
      ]);
    });
  });

  describe("Ctrl + Arrow keys", () => {
    it("selects the non-edge cell above a starting selected cell when in single select mode, Ctrl + ↑ is pressed, and the starting selected cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(10)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowUp",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(10),
      ]);
    });

    it("selects the non-edge cell below a starting selected cell when in single select mode, Ctrl + ↓ is pressed, and the starting selected cell is the only selected cell", async () => {
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
        key: "ArrowDown",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(10),
      ]);
    });

    it("selects the non-edge cell to the left of a starting selected cell when in single select mode, Ctrl + ← is pressed, and the starting selected cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(2)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowLeft",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });

    it("selects the non-edge cell to the right of a starting selected cell when in single select mode, Ctrl + → is pressed, and the starting selected cell is the only selected cell", async () => {
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
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });

    it("selects the bottom cell of a column when in single select mode, Ctrl + ↑ is pressed, and the top cell of the column is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(9)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowUp",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(9),
        getBrandedCellNumber(81),
      ]);
    });

    it("selects the top cell of a column when in single select mode, Ctrl + ↓ is pressed, and the bottom cell of the column is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(73)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowDown",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(73),
      ]);
    });

    it("selects the last cell of a row when in single select mode, Ctrl + ← is pressed, and the first cell of the row is the only selected cell", async () => {
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
        key: "ArrowLeft",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(9),
      ]);
    });

    it("selects the first cell of a row when in single select mode, Ctrl + → is pressed, and the last cell of the row is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(9)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(9),
      ]);
    });

    it("selects the non-edge cell above a starting selected cell when in multiselect mode, Ctrl + ↑ is pressed, and the starting selected cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(10)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowUp",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(10),
      ]);
    });

    it("selects the non-edge cell below a starting selected cell when in multiselect mode, Ctrl + ↓ is pressed, and the starting selected cell is the only selected cell", async () => {
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
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowDown",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(10),
      ]);
    });

    it("selects the non-edge cell to the left of a starting selected cell when in multiselect mode, Ctrl + ← is pressed, and the starting selected cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(2)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowLeft",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });

    it("selects the non-edge cell to the right of a starting selected cell when in multiselect mode, Ctrl + → is pressed, and the starting selected cell is the only selected cell", async () => {
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
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });

    it("selects the bottom cell of a column when in multiselect mode, Ctrl + ↑ is pressed, and the top cell of the column is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(9)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowUp",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(9),
        getBrandedCellNumber(81),
      ]);
    });

    it("selects the top cell of a column when in multiselect mode, Ctrl + ↓ is pressed, and the bottom cell of the column is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(73)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowDown",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(73),
      ]);
    });

    it("selects the last cell of a row when in multiselect mode, Ctrl + ← is pressed, and the first cell of the row is the only selected cell", async () => {
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
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowLeft",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(9),
      ]);
    });

    it("selects the first cell of a row when in multiselect mode, Ctrl + → is pressed, and the last cell of the row is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(9)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(9),
      ]);
    });

    it("selects a cell next to the most recently selected cell when in single select mode, Ctrl and an arrow key is pressed, and multiple cells are selected", async () => {
      // Arrange
      const renderedBoard = await renderBoard();
      await setBoardBoundsForPointerDrag(renderedBoard);
      const firstCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
        getBrandedCellNumber(1),
      );
      const secondCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
        getBrandedCellNumber(2),
      );

      // Act
      await dispatchPointerEvent(
        renderedBoard,
        getBrandedCellNumber(1),
        "pointerdown",
        firstCellPointerCoordinates,
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
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
        getBrandedCellNumber(3),
      ]);
    });

    it("selects a cell next to the most recently selected cell when in multiselect mode, Ctrl and an arrow key is pressed, and multiple cells are selected", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(1)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });
      const cellToClickLocator = await getCellLocator(
        renderedBoard,
        getBrandedCellNumber(5),
      );

      // Act
      await cellToClickLocator.click();
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(5),
        getBrandedCellNumber(6),
      ]);
    });

    it("selects a cell next to the first selected cell when in multiselect mode, a second cell is selected and then deselected, and then Ctrl and an arrow key is pressed while the first cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(1)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });
      const cellToClickLocator = await getCellLocator(
        renderedBoard,
        getBrandedCellNumber(5),
      );

      // Act
      await cellToClickLocator.click();
      await cellToClickLocator.click();
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });
  });

  describe("Shift + Arrow keys", () => {
    it("selects the non-edge cell above a starting selected cell when in single select mode, Shift + ↑ is pressed, and the starting selected cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(10)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        shiftKey: true,
        key: "ArrowUp",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(10),
      ]);
    });

    it("selects the non-edge cell below a starting selected cell when in single select mode, Shift + ↓ is pressed, and the starting selected cell is the only selected cell", async () => {
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
        shiftKey: true,
        key: "ArrowDown",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(10),
      ]);
    });

    it("selects the non-edge cell to the left of a starting selected cell when in single select mode, Shift + ← is pressed, and the starting selected cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(2)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        shiftKey: true,
        key: "ArrowLeft",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });

    it("selects the non-edge cell to the right of a starting selected cell when in single select mode, Shift + → is pressed, and the starting selected cell is the only selected cell", async () => {
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
        shiftKey: true,
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });

    it("selects the bottom cell of a column when in single select mode, Shift + ↑ is pressed, and the top cell of the column is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(9)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        shiftKey: true,
        key: "ArrowUp",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(9),
        getBrandedCellNumber(81),
      ]);
    });

    it("selects the top cell of a column when in single select mode, Shift + ↓ is pressed, and the bottom cell of the column is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(73)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        shiftKey: true,
        key: "ArrowDown",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(73),
      ]);
    });

    it("selects the last cell of a row when in single select mode, Shift + ← is pressed, and the first cell of the row is the only selected cell", async () => {
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
        shiftKey: true,
        key: "ArrowLeft",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(9),
      ]);
    });

    it("selects the first cell of a row when in single select mode, Shift + → is pressed, and the last cell of the row is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(9)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
      });

      // Act
      await dispatchKeyboardEvent({
        shiftKey: true,
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(9),
      ]);
    });

    it("selects the non-edge cell above a starting selected cell when in multiselect mode, Shift + ↑ is pressed, and the starting selected cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(10)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        shiftKey: true,
        key: "ArrowUp",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(10),
      ]);
    });

    it("selects the non-edge cell below a starting selected cell when in multiselect mode, Shift + ↓ is pressed, and the starting selected cell is the only selected cell", async () => {
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
      await dispatchKeyboardEvent({
        shiftKey: true,
        key: "ArrowDown",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(10),
      ]);
    });

    it("selects the non-edge cell to the left of a starting selected cell when in multiselect mode, Shift + ← is pressed, and the starting selected cell is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(2)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        shiftKey: true,
        key: "ArrowLeft",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });

    it("selects the non-edge cell to the right of a starting selected cell when in multiselect mode, Shift + → is pressed, and the starting selected cell is the only selected cell", async () => {
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
      await dispatchKeyboardEvent({
        shiftKey: true,
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });

    it("selects the bottom cell of a column when in multiselect mode, Shift + ↑ is pressed, and the top cell of the column is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(9)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        shiftKey: true,
        key: "ArrowUp",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(9),
        getBrandedCellNumber(81),
      ]);
    });

    it("selects the top cell of a column when in multiselect mode, Shift + ↓ is pressed, and the bottom cell of the column is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(73)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        shiftKey: true,
        key: "ArrowDown",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(73),
      ]);
    });

    it("selects the last cell of a row when in multiselect mode, Shift + ← is pressed, and the first cell of the row is the only selected cell", async () => {
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
      await dispatchKeyboardEvent({
        shiftKey: true,
        key: "ArrowLeft",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(9),
      ]);
    });

    it("selects the first cell of a row when in multiselect mode, Shift + → is pressed, and the last cell of the row is the only selected cell", async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        [getBrandedCellNumber(9)],
      );
      const renderedBoard = await renderBoard({
        startingBoardState,
        isMultiselectMode: true,
      });

      // Act
      await dispatchKeyboardEvent({
        shiftKey: true,
        key: "ArrowRight",
      });

      // Assert
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(9),
      ]);
    });
  });
});

describe("Selecting and deselecting cells with keyboard shortcuts", () => {
  describe("Select all cells shortcut (Ctrl + A)", () => {
    it('selects all cells when Ctrl + "a" is pressed and no cells are selected', async () => {
      // Arrange
      const renderedBoard = await renderBoard();

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "a",
      });

      // Assert
      await expectAllCellsToBeSelected(renderedBoard);
    });

    it('selects all cells when Ctrl + "A" is pressed and no cells are selected', async () => {
      // Arrange
      const renderedBoard = await renderBoard();

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "A",
      });

      // Assert
      await expectAllCellsToBeSelected(renderedBoard);
    });

    it('selects all cells when Ctrl + "a" is pressed and multiple cells are selected', async () => {
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

    it('selects all cells when Ctrl + "A" is pressed and multiple cells are selected', async () => {
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
        key: "A",
      });

      // Assert
      await expectAllCellsToBeSelected(renderedBoard);
    });

    it('keeps all cells selected when Ctrl + "a" is pressed while all cells are already selected', async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        ALL_CELL_NUMBERS,
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

    it('keeps all cells selected when Ctrl + "A" is pressed while all cells are already selected', async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        ALL_CELL_NUMBERS,
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

    it('does not select or deselect cells when Ctrl + Meta + "a" is pressed', async () => {
      // Arrange
      const renderedBoard = await renderBoard();

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "a",
        metaKey: true,
      });

      // Assert
      await expectNoCellsToBeSelected(renderedBoard);
    });

    it('does not select or deselect cells when Ctrl + Meta + "A" is pressed', async () => {
      // Arrange
      const renderedBoard = await renderBoard();

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "A",
        metaKey: true,
      });

      // Assert
      await expectNoCellsToBeSelected(renderedBoard);
    });
  });

  describe("Deselect all cells shortcut (Ctrl + Shift + A)", () => {
    it('deselects all cells when Ctrl + Shift + "a" is pressed while all cells are already selected', async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        ALL_CELL_NUMBERS,
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

    it('deselects all cells when Ctrl + Shift + "A" is pressed while all cells are already selected', async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        ALL_CELL_NUMBERS,
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
      await expectNoCellsToBeSelected(renderedBoard);
    });

    it('deselects all cells when Ctrl + Shift + "a" is pressed and multiple cells are selected', async () => {
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

    it('deselects all cells when Ctrl + Shift + "A" is pressed and multiple cells are selected', async () => {
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
      await expectNoCellsToBeSelected(renderedBoard);
    });

    it('keeps no cells selected when Ctrl + Shift + "a" is pressed and no cells are selected', async () => {
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

    it('keeps no cells selected when Ctrl + Shift + "A" is pressed and no cells are selected', async () => {
      // Arrange
      const renderedBoard = await renderBoard();

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        shiftKey: true,
        key: "A",
      });

      // Assert
      await expectNoCellsToBeSelected(renderedBoard);
    });

    it('does not select or deselect cells when Ctrl + Shift + Meta + "a" is pressed', async () => {
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
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });

    it('does not select or deselect cells when Ctrl + Shift + Meta + "A" is pressed', async () => {
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
      await expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });
  });

  describe("Invert selected cells shortcut (Ctrl + I)", () => {
    it('deselects all currently selected cells and selects all other cells when Ctrl + "i" is pressed while multiple cells are selected', async () => {
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
      expectOnlyTargetCellsToNotBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });

    it('deselects all currently selected cells and selects all other cells when Ctrl + "I" is pressed while multiple cells are selected', async () => {
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
      expectOnlyTargetCellsToNotBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });

    it('deselects all cells when Ctrl + "i" is pressed while all cells are already selected', async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        ALL_CELL_NUMBERS,
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

    it('deselects all cells when Ctrl + "I" is pressed while all cells are already selected', async () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getStartingEmptyBoardState(),
        ALL_CELL_NUMBERS,
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
      await expectNoCellsToBeSelected(renderedBoard);
    });

    it('selects all cells when Ctrl + "i" is pressed while no cells are selected', async () => {
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

    it('selects all cells when Ctrl + "I" is pressed while no cells are selected', async () => {
      // Arrange
      const renderedBoard = await renderBoard();

      // Act
      await dispatchKeyboardEvent({
        ctrlKey: true,
        key: "I",
      });

      // Assert
      await expectAllCellsToBeSelected(renderedBoard);
    });

    it('does not select or deselect cells when Ctrl + Meta + "i" is pressed', async () => {
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
      expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });

    it('does not select or deselect cells when Ctrl + Meta + "I" is pressed', async () => {
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
      expectOnlyTargetCellsToBeSelected(renderedBoard, [
        getBrandedCellNumber(1),
        getBrandedCellNumber(2),
      ]);
    });
  });
});

describe("Selecting cells by clicking and dragging", () => {
  it("selects each cell crossed in a straight line while clicking and dragging in single select mode", async () => {
    // Arrange
    const renderedBoard = await renderBoard();
    await setBoardBoundsForPointerDrag(renderedBoard);
    const firstCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(1),
    );
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
      firstCellPointerCoordinates,
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
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(1),
      getBrandedCellNumber(2),
      getBrandedCellNumber(3),
    ]);
  });

  it("selects each cell crossed diagonally while clicking and dragging in single select mode", async () => {
    // Arrange
    const renderedBoard = await renderBoard();
    await setBoardBoundsForPointerDrag(renderedBoard);
    const startingCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(1),
    );
    const diagonalCellTargetPointerCoordinates =
      getPointerCoordinatesForCenterOfCell(getBrandedCellNumber(21));

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      getBrandedCellNumber(1),
      "pointerdown",
      startingCellPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      diagonalCellTargetPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointerup",
      diagonalCellTargetPointerCoordinates,
    );

    // Assert
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(1),
      getBrandedCellNumber(11),
      getBrandedCellNumber(21),
    ]);
  });

  it("selects each cell crossed in a straight line while clicking and dragging in multiselect mode", async () => {
    // Arrange
    const renderedBoard = await renderBoard({ isMultiselectMode: true });
    await setBoardBoundsForPointerDrag(renderedBoard);
    const firstCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(1),
    );
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
      firstCellPointerCoordinates,
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
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(1),
      getBrandedCellNumber(2),
      getBrandedCellNumber(3),
    ]);
  });

  it("selects each cell crossed diagonally while clicking and dragging in multiselect mode", async () => {
    // Arrange
    const renderedBoard = await renderBoard({ isMultiselectMode: true });
    await setBoardBoundsForPointerDrag(renderedBoard);
    const startingCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(1),
    );
    const diagonalCellTargetPointerCoordinates =
      getPointerCoordinatesForCenterOfCell(getBrandedCellNumber(21));

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      getBrandedCellNumber(1),
      "pointerdown",
      startingCellPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      diagonalCellTargetPointerCoordinates,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointerup",
      diagonalCellTargetPointerCoordinates,
    );

    // Assert
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(1),
      getBrandedCellNumber(11),
      getBrandedCellNumber(21),
    ]);
  });

  it("selects each cell crossed while clicking and dragging when in multiselect mode and a non-adjacent cell is already selected", async () => {
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
    const firstCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(1),
    );
    const secondCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(3),
    );
    const thirdCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(13),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      getBrandedCellNumber(1),
      "pointerdown",
      firstCellPointerCoordinates,
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
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(1),
      getBrandedCellNumber(2),
      getBrandedCellNumber(3),
      getBrandedCellNumber(9),
      getBrandedCellNumber(13),
    ]);
  });

  it("selects each cell crossed while clicking and dragging when in multiselect mode and multiple non-adjacent cells are already selected", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected(
      getStartingEmptyBoardState(),
      [getBrandedCellNumber(9), getBrandedCellNumber(18)],
    );
    const renderedBoard = await renderBoard({
      startingBoardState,
      isMultiselectMode: true,
    });
    await setBoardBoundsForPointerDrag(renderedBoard);
    const firstCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(1),
    );
    const secondCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(3),
    );
    const thirdCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(13),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      getBrandedCellNumber(1),
      "pointerdown",
      firstCellPointerCoordinates,
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
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(1),
      getBrandedCellNumber(2),
      getBrandedCellNumber(3),
      getBrandedCellNumber(9),
      getBrandedCellNumber(13),
      getBrandedCellNumber(18),
    ]);
  });

  it("selects no cells while clicking and dragging outside the board boundaries", async () => {
    // Arrange
    const renderedBoard = await renderBoard();
    await setBoardBoundsForPointerDrag(renderedBoard);
    const firstPointerCoordinatesOutsideTheBoard = {
      clientX: 500,
      clientY: 500,
    };
    const secondPointerCoordinatesOutsideTheBoard = {
      clientX: 550,
      clientY: 550,
    };

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointerdown",
      firstPointerCoordinatesOutsideTheBoard,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      secondPointerCoordinatesOutsideTheBoard,
    );
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointerup",
      secondPointerCoordinatesOutsideTheBoard,
    );

    // Assert
    await expectNoCellsToBeSelected(renderedBoard);
  });

  it("selects each cell crossed while clicking and dragging, then selects no cells crossed after releasing the click", async () => {
    // Arrange
    const renderedBoard = await renderBoard();
    await setBoardBoundsForPointerDrag(renderedBoard);
    const firstCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(1),
    );
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
      firstCellPointerCoordinates,
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
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(1),
      getBrandedCellNumber(2),
    ]);
  });

  it("selects each cell crossed while clicking and dragging, then selects no cells crossed after the browser cancels the click", async () => {
    // Arrange
    const renderedBoard = await renderBoard();
    await setBoardBoundsForPointerDrag(renderedBoard);
    const firstCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(1),
    );
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
      firstCellPointerCoordinates,
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
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(1),
      getBrandedCellNumber(2),
    ]);
  });

  it("selects each cell crossed while clicking and dragging, then selects no cells crossed after the click is lost", async () => {
    // Arrange
    const renderedBoard = await renderBoard();
    await setBoardBoundsForPointerDrag(renderedBoard);
    const firstCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(1),
    );
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
      firstCellPointerCoordinates,
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
    await expectOnlyTargetCellsToBeSelected(renderedBoard, [
      getBrandedCellNumber(1),
      getBrandedCellNumber(2),
    ]);
  });

  it("selects no cells crossed when moving without clicking", async () => {
    // Arrange
    const renderedBoard = await renderBoard();
    await setBoardBoundsForPointerDrag(renderedBoard);
    const firstCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(2),
    );
    const secondCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(3),
    );
    const thirdCellPointerCoordinates = getPointerCoordinatesForCenterOfCell(
      getBrandedCellNumber(13),
    );

    // Act
    await dispatchPointerEvent(
      renderedBoard,
      "board",
      "pointermove",
      firstCellPointerCoordinates,
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

    // Assert
    await expectNoCellsToBeSelected(renderedBoard);
  });
});
