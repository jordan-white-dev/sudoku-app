import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Cell } from "@/lib/pages/home/components/cell/cell";
import {
  MARKUP_COLOR_BLUE,
  MARKUP_COLOR_GREEN,
  MARKUP_COLOR_RED,
} from "@/lib/pages/home/utils/constants";
import {
  CONFLICT_CELL_HIGHLIGHT_COLOR_TOKEN,
  defaultUserSettings,
  expectConflictCellHighlightToBeVisible,
  expectSeenCellHighlightToBeVisible,
  getBoardStateWithTargetCellsSelected,
  getCellAccessibleName,
  getCellElement,
  getCellLocator,
  getStartingEmptyBoardState,
  getStartingPuzzleHistoryFromBoardState,
  getTargetCellStateFromBoardState,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";
import {
  getBrandedCellNumber,
  getBrandedColumnNumber,
  getBrandedRowNumber,
  getBrandedSudokuDigit,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellNumber,
  type CellState,
  type PuzzleHistory,
} from "@/lib/pages/home/utils/types";

const mockUseUserSettings = vi.fn();

vi.mock("@/lib/pages/home/hooks/use-user-settings/use-user-settings", () => ({
  useUserSettings: () => mockUseUserSettings(),
}));

const SELECTED_CELL_HIGHLIGHT_COLOR_TOKEN = "4ca4ff";

const getBoardStateWithUpdatedTargetCell = (
  boardState: BoardState,
  cellNumber: CellNumber,
  updates: Partial<CellState>,
): BoardState => {
  return boardState.map((cellState) => {
    if (cellState.cellNumber !== cellNumber) return cellState;

    return {
      ...cellState,
      ...updates,
    };
  });
};

const getSelectedCellNumbers = (boardState: BoardState): Array<number> => {
  return boardState
    .filter((cellState) => cellState.isSelected)
    .map((cellState) => Number(cellState.cellNumber))
    .sort(
      (firstCellNumber, secondCellNumber) => firstCellNumber - secondCellNumber,
    );
};

const getNextBoardStateAfterDoubleClick = async ({
  boardState,
  targetCellNumber,
  userSettings,
}: {
  boardState: BoardState;
  targetCellNumber: CellNumber;
  userSettings: typeof defaultUserSettings;
}): Promise<BoardState> => {
  const targetCellState = getTargetCellStateFromBoardState(
    boardState,
    targetCellNumber,
  );
  const setPuzzleHistory = vi.fn();

  const renderedCell = await renderCell({
    boardState,
    cellState: targetCellState,
    setPuzzleHistory,
    userSettings,
  });

  const cellElement = await getCellElement(renderedCell, targetCellNumber);

  cellElement.dispatchEvent(
    new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
    }),
  );

  await waitForReactToFinishUpdating();

  const setPuzzleHistoryUpdater = setPuzzleHistory.mock.calls[0]?.[0];

  if (!setPuzzleHistoryUpdater || typeof setPuzzleHistoryUpdater !== "function")
    throw Error(
      "Expected a puzzle history updater function after double-click.",
    );

  const startingPuzzleHistory =
    getStartingPuzzleHistoryFromBoardState(boardState);
  const nextPuzzleHistory = setPuzzleHistoryUpdater(startingPuzzleHistory);

  return nextPuzzleHistory.boardStateHistory[
    nextPuzzleHistory.currentBoardStateIndex
  ];
};

const renderCell = async ({
  boardState,
  cellState,
  hasDigitConflict = false,
  isSeenInBox = false,
  isSeenInColumn = false,
  isSeenInRow = false,
  selectedColumnNumber,
  selectedRowNumber,
  handleCellPointerDown = vi.fn(),
  setPuzzleHistory = vi.fn(),
  userSettings = defaultUserSettings,
}: {
  boardState: BoardState;
  cellState: CellState;
  hasDigitConflict?: boolean;
  isSeenInBox?: boolean;
  isSeenInColumn?: boolean;
  isSeenInRow?: boolean;
  selectedColumnNumber?: CellState["columnNumber"];
  selectedRowNumber?: CellState["rowNumber"];
  handleCellPointerDown?: (cellNumber: CellNumber) => void;
  setPuzzleHistory?: (
    value: PuzzleHistory | ((value: PuzzleHistory) => PuzzleHistory),
  ) => void;
  userSettings?: typeof defaultUserSettings;
}) => {
  mockUseUserSettings.mockReturnValue({
    userSettings,
    setUserSettings: vi.fn(),
  });

  const renderedCell = await render(
    <Provider>
      <Cell
        boardState={boardState}
        cellState={cellState}
        handleCellPointerDown={handleCellPointerDown}
        hasDigitConflict={hasDigitConflict}
        isSeenInBox={isSeenInBox}
        isSeenInColumn={isSeenInColumn}
        isSeenInRow={isSeenInRow}
        selectedColumnNumber={selectedColumnNumber}
        selectedRowNumber={selectedRowNumber}
        setPuzzleHistory={setPuzzleHistory}
      />
    </Provider>,
  );

  await waitForReactToFinishUpdating();

  return renderedCell;
};

beforeEach(() => {
  mockUseUserSettings.mockReset();

  if (!HTMLElement.prototype.setPointerCapture)
    HTMLElement.prototype.setPointerCapture = vi.fn(() => undefined);
  else
    vi.spyOn(HTMLElement.prototype, "setPointerCapture").mockImplementation(
      () => undefined,
    );
});

describe("Accessible name", () => {
  it("includes the cell number, row number, and column number in the accessible name", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(23);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });

    // Assert
    await expect
      .element(
        renderedCell.getByRole("button", {
          name: getCellAccessibleName(targetCellNumber),
        }),
      )
      .toBeInTheDocument();
  });
});

describe("Data attributes", () => {
  it("marks the cell with its cell number", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(7);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(cellElement.getAttribute("data-cell-number")).toBe("7");
  });

  it("marks the cell as not selected when it is not selected", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(1);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });

    // Assert
    await expect
      .poll(async () => {
        const cellElement = await getCellElement(
          renderedCell,
          targetCellNumber,
        );

        return cellElement.getAttribute("data-selected");
      })
      .toBe("false");
  });

  it("marks the cell as selected when it is selected", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(1);
    const baseBoardState = getStartingEmptyBoardState();
    const boardState = getBoardStateWithUpdatedTargetCell(
      baseBoardState,
      targetCellNumber,
      { isSelected: true },
    );
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });

    // Assert
    await expect
      .poll(async () => {
        const cellElement = await getCellElement(
          renderedCell,
          targetCellNumber,
        );

        return cellElement.getAttribute("data-selected");
      })
      .toBe("true");
  });
});

describe("Content display", () => {
  it("shows no digit text when the cell is empty", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(cellElement.textContent?.trim() ?? "").toBe("");
  });

  it("shows the given digit when the cell contains a given digit", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const baseBoardState = getStartingEmptyBoardState();
    const boardState = getBoardStateWithUpdatedTargetCell(
      baseBoardState,
      targetCellNumber,
      {
        cellContent: {
          givenDigit: getBrandedSudokuDigit("7"),
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });

    // Assert
    await expect
      .element(await getCellLocator(renderedCell, targetCellNumber))
      .toHaveTextContent("7");
  });

  it("shows the entered digit when the cell contains an entered digit", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const baseBoardState = getStartingEmptyBoardState();
    const boardState = getBoardStateWithUpdatedTargetCell(
      baseBoardState,
      targetCellNumber,
      {
        cellContent: {
          enteredDigit: getBrandedSudokuDigit("5"),
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });

    // Assert
    await expect
      .element(await getCellLocator(renderedCell, targetCellNumber))
      .toHaveTextContent("5");
  });

  it("shows center markups as a sorted sequence of digits", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const baseBoardState = getStartingEmptyBoardState();
    const boardState = getBoardStateWithUpdatedTargetCell(
      baseBoardState,
      targetCellNumber,
      {
        cellContent: {
          centerMarkups: [
            getBrandedSudokuDigit("3"),
            getBrandedSudokuDigit("1"),
            getBrandedSudokuDigit("5"),
          ],
          cornerMarkups: [""],
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });

    // Assert
    await expect
      .element(await getCellLocator(renderedCell, targetCellNumber))
      .toHaveTextContent("135");
  });

  it("renders one corner markup float for each corner markup digit", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const baseBoardState = getStartingEmptyBoardState();
    const boardState = getBoardStateWithUpdatedTargetCell(
      baseBoardState,
      targetCellNumber,
      {
        cellContent: {
          centerMarkups: [""],
          cornerMarkups: [
            getBrandedSudokuDigit("2"),
            getBrandedSudokuDigit("4"),
          ],
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });

    // Assert
    await expect
      .element(renderedCell.getByText("2", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(renderedCell.getByText("4", { exact: true }))
      .toBeInTheDocument();
  });

  it("shows no corner markup floats when the cell has no corner markups", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const baseBoardState = getStartingEmptyBoardState();
    const boardState = getBoardStateWithUpdatedTargetCell(
      baseBoardState,
      targetCellNumber,
      {
        cellContent: {
          centerMarkups: [""],
          cornerMarkups: [""],
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(cellElement.textContent?.trim() ?? "").toBe("");
  });
});

describe("Text color", () => {
  it("displays a given digit in black", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const baseBoardState = getStartingEmptyBoardState();
    const boardState = getBoardStateWithUpdatedTargetCell(
      baseBoardState,
      targetCellNumber,
      {
        cellContent: {
          givenDigit: getBrandedSudokuDigit("8"),
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(window.getComputedStyle(cellElement).color).toBe("rgb(9, 9, 11)");
  });

  it("displays an entered digit in blue", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const baseBoardState = getStartingEmptyBoardState();
    const boardState = getBoardStateWithUpdatedTargetCell(
      baseBoardState,
      targetCellNumber,
      {
        cellContent: {
          enteredDigit: getBrandedSudokuDigit("8"),
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(window.getComputedStyle(cellElement).color).toBe("rgb(18, 18, 240)");
  });
});

describe("Row and column labels", () => {
  it("shows a row number label for a cell in column 1 when row and column labels are enabled", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({
      boardState,
      cellState,
      userSettings: {
        ...defaultUserSettings,
        isShowRowAndColumnLabelsEnabled: true,
      },
    });

    // Assert
    await expect
      .element(renderedCell.getByText("2", { exact: true }))
      .toBeInTheDocument();
  });

  it("shows a column number label for a cell in row 1 when row and column labels are enabled", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(3);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({
      boardState,
      cellState,
      userSettings: {
        ...defaultUserSettings,
        isShowRowAndColumnLabelsEnabled: true,
      },
    });

    // Assert
    await expect
      .element(renderedCell.getByText("3", { exact: true }))
      .toBeInTheDocument();
  });

  it("does not show row or column labels when the setting is disabled", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });

    // Assert
    expect(renderedCell.container.textContent ?? "").not.toContain("2");
  });

  it("does not show a row label for a cell not in column 1", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(11);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({
      boardState,
      cellState,
      userSettings: {
        ...defaultUserSettings,
        isShowRowAndColumnLabelsEnabled: true,
      },
    });

    // Assert
    expect(renderedCell.container.textContent ?? "").not.toContain("2");
  });

  it("does not show a column label for a cell not in row 1", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({
      boardState,
      cellState,
      userSettings: {
        ...defaultUserSettings,
        isShowRowAndColumnLabelsEnabled: true,
      },
    });

    // Assert
    expect(renderedCell.container.textContent ?? "").not.toContain("1");
  });
});

describe("Border styles", () => {
  it("uses solid borders for all sides when the dashed grid setting is off", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(1);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(window.getComputedStyle(cellElement).borderRightStyle).toBe("solid");
  });

  it("uses a dashed border on the right side of an interior-column cell when dashed grid is enabled", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(11);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({
      boardState,
      cellState,
      userSettings: {
        ...defaultUserSettings,
        isDashedGridEnabled: true,
      },
    });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(window.getComputedStyle(cellElement).borderRightStyle).toBe(
      "dashed",
    );
  });

  it("uses a solid border on the right side of a box-edge column cell even when dashed grid is enabled", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(12);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({
      boardState,
      cellState,
      userSettings: {
        ...defaultUserSettings,
        isDashedGridEnabled: true,
      },
    });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(window.getComputedStyle(cellElement).borderRightStyle).toBe("solid");
  });
});

describe("Pointer down interaction", () => {
  it("calls handleCellPointerDown with the cell number when the cell is pressed", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );
    const handleCellPointerDown = vi.fn();
    const renderedCell = await renderCell({
      boardState,
      cellState,
      handleCellPointerDown,
    });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Act
    cellElement.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 4,
      }),
    );
    await waitForReactToFinishUpdating();

    // Assert
    expect(handleCellPointerDown).toHaveBeenCalledWith(targetCellNumber);
  });

  it("captures the pointer when the cell is pressed", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );
    const renderedCell = await renderCell({ boardState, cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);
    const setPointerCaptureSpy = vi.spyOn(cellElement, "setPointerCapture");

    // Act
    cellElement.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 9,
      }),
    );
    await waitForReactToFinishUpdating();

    // Assert
    expect(setPointerCaptureSpy).toHaveBeenCalledWith(9);
  });
});

describe("Background state: selection", () => {
  it("shows a selection highlight when the cell is selected", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const baseBoardState = getStartingEmptyBoardState();
    const boardState = getBoardStateWithUpdatedTargetCell(
      baseBoardState,
      targetCellNumber,
      { isSelected: true },
    );
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;

    // Assert
    expect(backgroundImage.toLowerCase()).toContain(
      SELECTED_CELL_HIGHLIGHT_COLOR_TOKEN,
    );
  });

  it("does not show a selection highlight when the cell is not selected", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;

    // Assert
    expect(backgroundImage.toLowerCase()).not.toContain(
      SELECTED_CELL_HIGHLIGHT_COLOR_TOKEN,
    );
  });
});

describe("Background state: digit conflicts", () => {
  it("shows a conflict highlight when the cell has a digit conflict", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({
      boardState,
      cellState,
      hasDigitConflict: true,
    });

    // Assert
    await expectConflictCellHighlightToBeVisible(
      renderedCell,
      targetCellNumber,
      true,
    );
  });

  it("does not show a conflict highlight when the cell has no digit conflict", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({
      boardState,
      cellState,
      hasDigitConflict: false,
    });

    // Assert
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;
    expect(backgroundImage.toLowerCase()).not.toContain(
      CONFLICT_CELL_HIGHLIGHT_COLOR_TOKEN,
    );
  });
});

describe("Background state: seen cells", () => {
  it("shows a seen-cell highlight when seen cells are enabled and the cell is in the same row as the selected cell", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(40);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({
      boardState,
      cellState,
      isSeenInRow: true,
      selectedColumnNumber: getBrandedColumnNumber(5),
      selectedRowNumber: getBrandedRowNumber(5),
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });

    // Assert
    await expectSeenCellHighlightToBeVisible(
      renderedCell,
      targetCellNumber,
      true,
    );
  });

  it("shows a seen-cell highlight when seen cells are enabled and the cell is in the same column as the selected cell", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(40);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({
      boardState,
      cellState,
      isSeenInColumn: true,
      selectedColumnNumber: getBrandedColumnNumber(5),
      selectedRowNumber: getBrandedRowNumber(5),
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });

    // Assert
    await expectSeenCellHighlightToBeVisible(
      renderedCell,
      targetCellNumber,
      true,
    );
  });

  it("shows a seen-cell highlight when seen cells are enabled and the cell is in the same box as the selected cell", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(40);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({
      boardState,
      cellState,
      isSeenInBox: true,
      selectedColumnNumber: getBrandedColumnNumber(4),
      selectedRowNumber: getBrandedRowNumber(4),
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });

    // Assert
    await expectSeenCellHighlightToBeVisible(
      renderedCell,
      targetCellNumber,
      true,
    );
  });

  it("does not show a seen-cell highlight when seen cells are disabled, even when the cell is seen", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(40);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({
      boardState,
      cellState,
      isSeenInRow: true,
      selectedColumnNumber: getBrandedColumnNumber(5),
      selectedRowNumber: getBrandedRowNumber(5),
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: false,
      },
    });

    // Assert
    await expectSeenCellHighlightToBeVisible(
      renderedCell,
      targetCellNumber,
      false,
    );
  });
});

describe("Background state: markup colors", () => {
  it("shows a conic-gradient background when the cell has at least one markup color applied", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const baseBoardState = getStartingEmptyBoardState();
    const boardState = getBoardStateWithUpdatedTargetCell(
      baseBoardState,
      targetCellNumber,
      { markupColors: [MARKUP_COLOR_RED] },
    );
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;

    // Assert
    expect(backgroundImage.toLowerCase()).toContain("conic-gradient");
  });

  it("shows no conic-gradient background when the cell has no markup colors", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const boardState = getStartingEmptyBoardState();
    const cellState = getTargetCellStateFromBoardState(
      boardState,
      targetCellNumber,
    );

    // Act
    const renderedCell = await renderCell({ boardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;

    // Assert
    expect(backgroundImage.toLowerCase()).not.toContain("conic-gradient");
  });
});

describe("Double-click selection (partial highlight mode)", () => {
  it("selects all cells sharing the same given digit when a given-digit cell is double-clicked", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const matchingCellNumber = getBrandedCellNumber(20);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      sourceCellNumber,
      {
        cellContent: { givenDigit: getBrandedSudokuDigit("5") },
      },
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      matchingCellNumber,
      {
        cellContent: { givenDigit: getBrandedSudokuDigit("5") },
      },
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellNumber: sourceCellNumber,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(getSelectedCellNumbers(nextBoardState)).toEqual([10, 20]);
  });

  it("selects all cells sharing the same entered digit when an entered-digit cell is double-clicked", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const matchingCellNumber = getBrandedCellNumber(30);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      sourceCellNumber,
      {
        cellContent: { enteredDigit: getBrandedSudokuDigit("7") },
      },
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      matchingCellNumber,
      {
        cellContent: { enteredDigit: getBrandedSudokuDigit("7") },
      },
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellNumber: sourceCellNumber,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(getSelectedCellNumbers(nextBoardState)).toEqual([10, 30]);
  });

  it("selects cells that share any center markup digit", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const matchingCellNumber = getBrandedCellNumber(40);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      sourceCellNumber,
      {
        cellContent: {
          centerMarkups: [
            getBrandedSudokuDigit("1"),
            getBrandedSudokuDigit("2"),
          ],
          cornerMarkups: [""],
        },
      },
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      matchingCellNumber,
      {
        cellContent: {
          centerMarkups: [
            getBrandedSudokuDigit("2"),
            getBrandedSudokuDigit("9"),
          ],
          cornerMarkups: [""],
        },
      },
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellNumber: sourceCellNumber,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(getSelectedCellNumbers(nextBoardState)).toEqual([10, 40]);
  });

  it("selects cells that share any corner markup digit", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const matchingCellNumber = getBrandedCellNumber(50);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      sourceCellNumber,
      {
        cellContent: {
          centerMarkups: [""],
          cornerMarkups: [
            getBrandedSudokuDigit("3"),
            getBrandedSudokuDigit("8"),
          ],
        },
      },
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      matchingCellNumber,
      {
        cellContent: {
          centerMarkups: [""],
          cornerMarkups: [getBrandedSudokuDigit("8")],
        },
      },
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellNumber: sourceCellNumber,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(getSelectedCellNumbers(nextBoardState)).toEqual([10, 50]);
  });

  it("selects cells that share any markup color when both cells have only markup colors and no digit content", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const matchingCellNumber = getBrandedCellNumber(60);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      sourceCellNumber,
      {
        markupColors: [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
      },
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      matchingCellNumber,
      {
        markupColors: [MARKUP_COLOR_RED],
      },
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellNumber: sourceCellNumber,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(getSelectedCellNumbers(nextBoardState)).toEqual([10, 60]);
  });

  it("does not select empty cells when double-clicking a non-empty cell", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const emptyCellNumber = getBrandedCellNumber(70);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      sourceCellNumber,
      {
        cellContent: { enteredDigit: getBrandedSudokuDigit("4") },
      },
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellNumber: sourceCellNumber,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(
      getTargetCellStateFromBoardState(nextBoardState, emptyCellNumber)
        .isSelected,
    ).toBe(false);
  });

  it("clears any existing selection before applying the double-click selection", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const previouslySelectedCellNumber = getBrandedCellNumber(1);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithTargetCellsSelected(boardState, [
      previouslySelectedCellNumber,
    ]);
    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      sourceCellNumber,
      {
        cellContent: { givenDigit: getBrandedSudokuDigit("9") },
      },
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellNumber: sourceCellNumber,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(
      getTargetCellStateFromBoardState(
        nextBoardState,
        previouslySelectedCellNumber,
      ).isSelected,
    ).toBe(false);
  });
});

describe("Double-click selection (strict highlight mode)", () => {
  it("selects only cells with exactly the same given digit, not cells with a different digit", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const matchingCellNumber = getBrandedCellNumber(20);
    const nonMatchingCellNumber = getBrandedCellNumber(30);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      sourceCellNumber,
      {
        cellContent: { givenDigit: getBrandedSudokuDigit("6") },
      },
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      matchingCellNumber,
      {
        cellContent: { givenDigit: getBrandedSudokuDigit("6") },
      },
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      nonMatchingCellNumber,
      {
        cellContent: { givenDigit: getBrandedSudokuDigit("7") },
      },
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellNumber: sourceCellNumber,
      userSettings: {
        ...defaultUserSettings,
        isStrictHighlightsEnabled: true,
      },
    });

    // Assert
    expect(getSelectedCellNumbers(nextBoardState)).toEqual([10, 20]);
  });

  it("selects only cells with exactly the same markup color set, not cells with only partial overlap", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const exactMatchCellNumber = getBrandedCellNumber(20);
    const partialMatchCellNumber = getBrandedCellNumber(30);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      sourceCellNumber,
      {
        markupColors: [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
      },
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      exactMatchCellNumber,
      {
        markupColors: [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
      },
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      partialMatchCellNumber,
      {
        markupColors: [MARKUP_COLOR_RED],
      },
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellNumber: sourceCellNumber,
      userSettings: {
        ...defaultUserSettings,
        isStrictHighlightsEnabled: true,
      },
    });

    // Assert
    expect(getSelectedCellNumbers(nextBoardState)).toEqual([10, 20]);
  });

  it("selects only cells with exactly matching center and corner markup digits", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const exactMatchCellNumber = getBrandedCellNumber(20);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      sourceCellNumber,
      {
        cellContent: {
          centerMarkups: [
            getBrandedSudokuDigit("1"),
            getBrandedSudokuDigit("2"),
          ],
          cornerMarkups: [getBrandedSudokuDigit("3")],
        },
      },
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      exactMatchCellNumber,
      {
        cellContent: {
          centerMarkups: [
            getBrandedSudokuDigit("2"),
            getBrandedSudokuDigit("1"),
          ],
          cornerMarkups: [getBrandedSudokuDigit("3")],
        },
      },
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellNumber: sourceCellNumber,
      userSettings: {
        ...defaultUserSettings,
        isStrictHighlightsEnabled: true,
      },
    });

    // Assert
    expect(getSelectedCellNumbers(nextBoardState)).toEqual([10, 20]);
  });

  it("does not select cells that match only partially when strict mode is on", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const partialMatchCellNumber = getBrandedCellNumber(20);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      sourceCellNumber,
      {
        cellContent: {
          centerMarkups: [
            getBrandedSudokuDigit("1"),
            getBrandedSudokuDigit("2"),
          ],
          cornerMarkups: [""],
        },
      },
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      partialMatchCellNumber,
      {
        cellContent: {
          centerMarkups: [getBrandedSudokuDigit("2")],
          cornerMarkups: [""],
        },
      },
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellNumber: sourceCellNumber,
      userSettings: {
        ...defaultUserSettings,
        isStrictHighlightsEnabled: true,
      },
    });

    // Assert
    expect(
      getTargetCellStateFromBoardState(nextBoardState, partialMatchCellNumber)
        .isSelected,
    ).toBe(false);
  });

  it("does not select empty cells when strict mode is on", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const emptyCellNumber = getBrandedCellNumber(20);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      boardState,
      sourceCellNumber,
      {
        markupColors: [MARKUP_COLOR_GREEN],
      },
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellNumber: sourceCellNumber,
      userSettings: {
        ...defaultUserSettings,
        isStrictHighlightsEnabled: true,
      },
    });

    // Assert
    expect(
      getTargetCellStateFromBoardState(nextBoardState, emptyCellNumber)
        .isSelected,
    ).toBe(false);
  });
});
