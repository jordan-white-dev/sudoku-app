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
  expectSeenCellHighlightOrNotInTargetCell,
  expectTargetCellToHaveConflictHighlightOrNot,
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

const getSvgLayersFromBackgroundImage = (
  backgroundImage: string,
): Array<string> => {
  const svgUrlMatches = backgroundImage.matchAll(
    /url\("data:image\/svg\+xml,([^"]+)"\)/g,
  );

  return [...svgUrlMatches].map((svgUrlMatch) =>
    decodeURIComponent(svgUrlMatch[1]),
  );
};

const getSvgLayerContainingToken = (
  backgroundImage: string,
  token: string,
): string | undefined => {
  const svgLayers = getSvgLayersFromBackgroundImage(backgroundImage);

  return svgLayers.find((svgLayer) =>
    svgLayer.toLowerCase().includes(token.toLowerCase()),
  );
};

const getRectTagsFromSvgLayer = (svgLayer: string): Array<string> => {
  const rectTagMatches = svgLayer.match(/<rect\b[^>]*>/g);

  return rectTagMatches ?? [];
};

const getCenterMarkupsOfLength = (length: number): CellState["cellContent"] => {
  const centerMarkups = Array.from({ length }, (_, index) => {
    const digit = ((index % 9) + 1).toString();

    return getBrandedSudokuDigit(digit);
  });

  return {
    centerMarkups,
    cornerMarkups: [""],
  };
};

const getCellFontSizeInPixels = (cellElement: HTMLButtonElement): number => {
  const computedFontSize = window.getComputedStyle(cellElement).fontSize;
  const parsedFontSize = Number.parseFloat(computedFontSize);

  if (Number.isNaN(parsedFontSize))
    throw Error(`Failed to parse font size from "${computedFontSize}".`);

  return parsedFontSize;
};

const getBoardStateWithUpdatedTargetCell = (
  cellNumber: CellNumber,
  updates: Partial<CellState>,
  startingBoardState?: BoardState,
): BoardState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

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
    targetCellNumber,
    boardState,
  );
  const setPuzzleHistory = vi.fn();

  const renderedCell = await renderCell({
    startingBoardState: boardState,
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
  cellState,
  startingBoardState,
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
  cellState: CellState;
  startingBoardState?: BoardState;
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

  const boardState = startingBoardState ?? getStartingEmptyBoardState();

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
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({ cellState });

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
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({ cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(cellElement.getAttribute("data-cell-number")).toBe("7");
  });

  it("marks the cell as not selected when it is not selected", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(1);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({ cellState });

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
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      { isSelected: true },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({
      cellState,
      startingBoardState,
    });

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
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({ cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(cellElement.textContent?.trim() ?? "").toBe("");
  });

  it("shows the given digit when the cell contains a given digit", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        cellContent: {
          givenDigit: getBrandedSudokuDigit("7"),
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });

    // Assert
    await expect
      .element(await getCellLocator(renderedCell, targetCellNumber))
      .toHaveTextContent("7");
  });

  it("shows the entered digit when the cell contains an entered digit", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        cellContent: {
          enteredDigit: getBrandedSudokuDigit("5"),
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });

    // Assert
    await expect
      .element(await getCellLocator(renderedCell, targetCellNumber))
      .toHaveTextContent("5");
  });

  it("shows center markups as a sorted sequence of digits", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
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
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });

    // Assert
    await expect
      .element(await getCellLocator(renderedCell, targetCellNumber))
      .toHaveTextContent("135");
  });

  it("renders one corner markup float for each corner markup digit", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
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
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });

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
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        cellContent: {
          centerMarkups: [""],
          cornerMarkups: [""],
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(cellElement.textContent?.trim() ?? "").toBe("");
  });
});

describe("Text color", () => {
  it("displays a given digit in black", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        cellContent: {
          givenDigit: getBrandedSudokuDigit("8"),
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(window.getComputedStyle(cellElement).color).toBe("rgb(9, 9, 11)");
  });

  it("displays an entered digit in blue", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        cellContent: {
          enteredDigit: getBrandedSudokuDigit("8"),
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(window.getComputedStyle(cellElement).color).toBe("rgb(18, 18, 240)");
  });
});

describe("Font size", () => {
  it("uses progressively smaller center-markup font sizes as the center markup count increases", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);

    const boardStateWithFiveCenterMarkups = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        cellContent: getCenterMarkupsOfLength(5),
      },
    );
    const boardStateWithSixCenterMarkups = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        cellContent: getCenterMarkupsOfLength(6),
      },
    );
    const boardStateWithSevenCenterMarkups = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        cellContent: getCenterMarkupsOfLength(7),
      },
    );
    const boardStateWithEightCenterMarkups = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        cellContent: getCenterMarkupsOfLength(8),
      },
    );
    const boardStateWithNineCenterMarkups = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        cellContent: getCenterMarkupsOfLength(9),
      },
    );

    // Act
    const renderedCellWithFiveCenterMarkups = await renderCell({
      startingBoardState: boardStateWithFiveCenterMarkups,
      cellState: getTargetCellStateFromBoardState(
        targetCellNumber,
        boardStateWithFiveCenterMarkups,
      ),
    });
    const renderedCellWithSixCenterMarkups = await renderCell({
      startingBoardState: boardStateWithSixCenterMarkups,
      cellState: getTargetCellStateFromBoardState(
        targetCellNumber,
        boardStateWithSixCenterMarkups,
      ),
    });
    const renderedCellWithSevenCenterMarkups = await renderCell({
      startingBoardState: boardStateWithSevenCenterMarkups,
      cellState: getTargetCellStateFromBoardState(
        targetCellNumber,
        boardStateWithSevenCenterMarkups,
      ),
    });
    const renderedCellWithEightCenterMarkups = await renderCell({
      startingBoardState: boardStateWithEightCenterMarkups,
      cellState: getTargetCellStateFromBoardState(
        targetCellNumber,
        boardStateWithEightCenterMarkups,
      ),
    });
    const renderedCellWithNineCenterMarkups = await renderCell({
      startingBoardState: boardStateWithNineCenterMarkups,
      cellState: getTargetCellStateFromBoardState(
        targetCellNumber,
        boardStateWithNineCenterMarkups,
      ),
    });

    const fontSizeWithFiveCenterMarkups = getCellFontSizeInPixels(
      await getCellElement(renderedCellWithFiveCenterMarkups, targetCellNumber),
    );
    const fontSizeWithSixCenterMarkups = getCellFontSizeInPixels(
      await getCellElement(renderedCellWithSixCenterMarkups, targetCellNumber),
    );
    const fontSizeWithSevenCenterMarkups = getCellFontSizeInPixels(
      await getCellElement(
        renderedCellWithSevenCenterMarkups,
        targetCellNumber,
      ),
    );
    const fontSizeWithEightCenterMarkups = getCellFontSizeInPixels(
      await getCellElement(
        renderedCellWithEightCenterMarkups,
        targetCellNumber,
      ),
    );
    const fontSizeWithNineCenterMarkups = getCellFontSizeInPixels(
      await getCellElement(renderedCellWithNineCenterMarkups, targetCellNumber),
    );

    // Assert
    expect(fontSizeWithFiveCenterMarkups).toBeGreaterThan(
      fontSizeWithSixCenterMarkups,
    );
    expect(fontSizeWithSixCenterMarkups).toBeGreaterThan(
      fontSizeWithSevenCenterMarkups,
    );
    expect(fontSizeWithSevenCenterMarkups).toBeGreaterThan(
      fontSizeWithEightCenterMarkups,
    );
    expect(fontSizeWithEightCenterMarkups).toBeGreaterThan(
      fontSizeWithNineCenterMarkups,
    );
  });
});

describe("Text shadow", () => {
  it("uses no text shadow for center markup content and uses text shadow for given digits", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);

    const boardStateWithCenterMarkup = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        cellContent: getCenterMarkupsOfLength(2),
      },
    );
    const boardStateWithGivenDigit = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        cellContent: {
          givenDigit: getBrandedSudokuDigit("5"),
        },
      },
    );

    // Act
    const renderedCellWithCenterMarkup = await renderCell({
      startingBoardState: boardStateWithCenterMarkup,
      cellState: getTargetCellStateFromBoardState(
        targetCellNumber,
        boardStateWithCenterMarkup,
      ),
    });
    const renderedCellWithGivenDigit = await renderCell({
      startingBoardState: boardStateWithGivenDigit,
      cellState: getTargetCellStateFromBoardState(
        targetCellNumber,
        boardStateWithGivenDigit,
      ),
    });

    const textShadowWithCenterMarkup = window.getComputedStyle(
      await getCellElement(renderedCellWithCenterMarkup, targetCellNumber),
    ).textShadow;
    const textShadowWithGivenDigit = window.getComputedStyle(
      await getCellElement(renderedCellWithGivenDigit, targetCellNumber),
    ).textShadow;

    // Assert
    expect(textShadowWithCenterMarkup).toBe("none");
    expect(textShadowWithGivenDigit).not.toBe("none");
  });
});

describe("Row and column labels", () => {
  it("shows a row number label for a cell in column 1 when row and column labels are enabled", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
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
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
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
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({ cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(cellElement.textContent?.trim() ?? "").toBe("");
  });

  it("does not show a row label for a cell not in column 1", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(11);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
      cellState,
      userSettings: {
        ...defaultUserSettings,
        isShowRowAndColumnLabelsEnabled: true,
      },
    });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(cellElement.textContent?.trim() ?? "").toBe("");
  });

  it("does not show a column label for a cell not in row 1", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(11);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
      cellState,
      userSettings: {
        ...defaultUserSettings,
        isShowRowAndColumnLabelsEnabled: true,
      },
    });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(cellElement.textContent?.trim() ?? "").toBe("");
  });
});

describe("Border styles", () => {
  it("uses solid borders for all sides when the dashed grid setting is off", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(1);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({ cellState });
    const cellElement = await getCellElement(renderedCell, targetCellNumber);

    // Assert
    expect(window.getComputedStyle(cellElement).borderRightStyle).toBe("solid");
  });

  it("uses a dashed border on the right side of an interior-column cell when dashed grid is enabled", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(11);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
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
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
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

  it("uses 2px left border width on left box edges and 0 elsewhere", async () => {
    // Arrange
    const leftEdgeCellNumber = getBrandedCellNumber(10);
    const interiorCellNumber = getBrandedCellNumber(11);

    // Act
    const renderedLeftEdgeCell = await renderCell({
      cellState: getTargetCellStateFromBoardState(leftEdgeCellNumber),
    });
    const renderedInteriorCell = await renderCell({
      cellState: getTargetCellStateFromBoardState(interiorCellNumber),
    });

    const leftEdgeCell = await getCellElement(
      renderedLeftEdgeCell,
      leftEdgeCellNumber,
    );
    const interiorCell = await getCellElement(
      renderedInteriorCell,
      interiorCellNumber,
    );

    // Assert
    expect(window.getComputedStyle(leftEdgeCell).borderLeftWidth).toBe("2px");
    expect(window.getComputedStyle(interiorCell).borderLeftWidth).toBe("0px");
  });

  it("uses 2px top border width on top box edges and 0 elsewhere", async () => {
    // Arrange
    const topEdgeCellNumber = getBrandedCellNumber(2);
    const interiorCellNumber = getBrandedCellNumber(11);

    // Act
    const renderedTopEdgeCell = await renderCell({
      cellState: getTargetCellStateFromBoardState(topEdgeCellNumber),
    });
    const renderedInteriorCell = await renderCell({
      cellState: getTargetCellStateFromBoardState(interiorCellNumber),
    });

    const topEdgeCell = await getCellElement(
      renderedTopEdgeCell,
      topEdgeCellNumber,
    );
    const interiorCell = await getCellElement(
      renderedInteriorCell,
      interiorCellNumber,
    );

    // Assert
    expect(window.getComputedStyle(topEdgeCell).borderTopWidth).toBe("2px");
    expect(window.getComputedStyle(interiorCell).borderTopWidth).toBe("0px");
  });
});

describe("Pointer down interaction", () => {
  it("calls handleCellPointerDown with the cell number when the cell is pressed", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);
    const handleCellPointerDown = vi.fn();
    const renderedCell = await renderCell({
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
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);
    const renderedCell = await renderCell({ cellState });
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
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      { isSelected: true },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
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
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({ cellState });
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
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
      cellState,
      hasDigitConflict: true,
    });

    // Assert
    await expectTargetCellToHaveConflictHighlightOrNot(
      renderedCell,
      targetCellNumber,
      true,
    );
  });

  it("does not show a conflict highlight when the cell has no digit conflict", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
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
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
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
    await expectSeenCellHighlightOrNotInTargetCell(
      renderedCell,
      targetCellNumber,
      true,
    );
  });

  it("shows a seen-cell highlight when seen cells are enabled and the cell is in the same column as the selected cell", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(40);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
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
    await expectSeenCellHighlightOrNotInTargetCell(
      renderedCell,
      targetCellNumber,
      true,
    );
  });

  it("shows a seen-cell highlight when seen cells are enabled and the cell is in the same box as the selected cell", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(40);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
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
    await expectSeenCellHighlightOrNotInTargetCell(
      renderedCell,
      targetCellNumber,
      true,
    );
  });

  it("does not show a seen-cell highlight when seen cells are disabled, even when the cell is seen", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(40);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
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
    await expectSeenCellHighlightOrNotInTargetCell(
      renderedCell,
      targetCellNumber,
      false,
    );
  });

  it("uses a single full-cell seen rectangle when row, column, and box highlights all apply", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(40);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
      cellState,
      isSeenInBox: true,
      isSeenInColumn: true,
      isSeenInRow: true,
      selectedColumnNumber: getBrandedColumnNumber(5),
      selectedRowNumber: getBrandedRowNumber(5),
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;
    const seenCellSvgLayer = getSvgLayerContainingToken(
      backgroundImage,
      "#ffd700",
    );

    // Assert
    expect(seenCellSvgLayer).toBeDefined();

    if (!seenCellSvgLayer)
      throw Error("Expected a seen-cell SVG layer for full seen highlighting.");

    const rectTags = getRectTagsFromSvgLayer(seenCellSvgLayer);

    expect(rectTags).toHaveLength(1);
    expect(rectTags[0]).toContain('x="0"');
    expect(rectTags[0]).toContain('y="0"');
    expect(rectTags[0]).toContain('width="100"');
    expect(rectTags[0]).toContain('height="100"');
  });

  it("suppresses the seen-column band at puzzle top edge when the cell is inside the selected box", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(2);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
      cellState,
      isSeenInColumn: true,
      selectedColumnNumber: getBrandedColumnNumber(2),
      selectedRowNumber: getBrandedRowNumber(2),
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;

    // Assert
    expect(getSvgLayerContainingToken(backgroundImage, "#ffd700")).toBe(
      undefined,
    );
  });

  it("suppresses the seen-row band at puzzle left edge when the cell is inside the selected box", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
      cellState,
      isSeenInRow: true,
      selectedColumnNumber: getBrandedColumnNumber(2),
      selectedRowNumber: getBrandedRowNumber(2),
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;

    // Assert
    expect(getSvgLayerContainingToken(backgroundImage, "#ffd700")).toBe(
      undefined,
    );
  });

  it("insets the seen-box rectangle along the top and left box edges", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(1);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({
      cellState,
      isSeenInBox: true,
      selectedColumnNumber: getBrandedColumnNumber(2),
      selectedRowNumber: getBrandedRowNumber(2),
      userSettings: {
        ...defaultUserSettings,
        isShowSeenCellsEnabled: true,
      },
    });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;
    const seenCellSvgLayer = getSvgLayerContainingToken(
      backgroundImage,
      "#ffd700",
    );

    // Assert
    expect(seenCellSvgLayer).toBeDefined();

    if (!seenCellSvgLayer)
      throw Error("Expected a seen-cell SVG layer for seen-box highlighting.");

    const rectTags = getRectTagsFromSvgLayer(seenCellSvgLayer);

    expect(rectTags).toHaveLength(1);
    expect(rectTags[0]).toContain('x="8"');
    expect(rectTags[0]).toContain('y="8"');
    expect(rectTags[0]).toContain('width="92"');
    expect(rectTags[0]).toContain('height="92"');
  });
});

describe("Background state: selected outline geometry", () => {
  it("draws four outline segments for an isolated selected cell", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(40);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      { isSelected: true },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;
    const selectedCellSvgLayer = getSvgLayerContainingToken(
      backgroundImage,
      "#4ca4ff",
    );

    // Assert
    expect(selectedCellSvgLayer).toBeDefined();

    if (!selectedCellSvgLayer)
      throw Error("Expected a selected-cell SVG layer for selected outlines.");

    const rectTags = getRectTagsFromSvgLayer(selectedCellSvgLayer);

    expect(rectTags).toHaveLength(4);
  });

  it("removes the left outline segment when the cell to the left is also selected", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(40);
    let startingBoardState = getStartingEmptyBoardState();

    startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        isSelected: true,
      },
      startingBoardState,
    );
    startingBoardState = getBoardStateWithUpdatedTargetCell(
      getBrandedCellNumber(39),
      {
        isSelected: true,
      },
      startingBoardState,
    );

    const cellState = getTargetCellStateFromBoardState(
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;
    const selectedCellSvgLayer = getSvgLayerContainingToken(
      backgroundImage,
      "#4ca4ff",
    );

    // Assert
    expect(selectedCellSvgLayer).toBeDefined();

    if (!selectedCellSvgLayer)
      throw Error("Expected a selected-cell SVG layer for selected outlines.");

    const rectTags = getRectTagsFromSvgLayer(selectedCellSvgLayer);

    expect(rectTags).toHaveLength(3);
    expect(
      rectTags.some(
        (rectTag) =>
          rectTag.includes('x="0"') &&
          rectTag.includes('y="0"') &&
          rectTag.includes('width="8"') &&
          rectTag.includes('height="100"'),
      ),
    ).toBe(false);
  });

  it("adds a top-left corner patch when top and left neighbors are selected but top-left is not", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(40);
    let startingBoardState = getStartingEmptyBoardState();

    startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        isSelected: true,
      },
      startingBoardState,
    );
    startingBoardState = getBoardStateWithUpdatedTargetCell(
      getBrandedCellNumber(31),
      {
        isSelected: true,
      },
      startingBoardState,
    );
    startingBoardState = getBoardStateWithUpdatedTargetCell(
      getBrandedCellNumber(39),
      {
        isSelected: true,
      },
      startingBoardState,
    );

    const cellState = getTargetCellStateFromBoardState(
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;
    const selectedCellSvgLayer = getSvgLayerContainingToken(
      backgroundImage,
      "#4ca4ff",
    );

    // Assert
    expect(selectedCellSvgLayer).toBeDefined();

    if (!selectedCellSvgLayer)
      throw Error("Expected a selected-cell SVG layer for selected outlines.");

    const rectTags = getRectTagsFromSvgLayer(selectedCellSvgLayer);

    expect(
      rectTags.some(
        (rectTag) =>
          rectTag.includes('x="0"') &&
          rectTag.includes('y="0"') &&
          rectTag.includes('width="8"') &&
          rectTag.includes('height="8"'),
      ),
    ).toBe(true);
  });

  it("removes the selected outline layer completely when all neighboring cells are selected", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(40);
    let startingBoardState = getStartingEmptyBoardState();

    startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      {
        isSelected: true,
      },
      startingBoardState,
    );

    const surroundingSelectedCellNumbers = [
      getBrandedCellNumber(30),
      getBrandedCellNumber(31),
      getBrandedCellNumber(32),
      getBrandedCellNumber(39),
      getBrandedCellNumber(41),
      getBrandedCellNumber(48),
      getBrandedCellNumber(49),
      getBrandedCellNumber(50),
    ];

    for (const surroundingCellNumber of surroundingSelectedCellNumbers)
      startingBoardState = getBoardStateWithUpdatedTargetCell(
        surroundingCellNumber,
        { isSelected: true },
        startingBoardState,
      );

    const cellState = getTargetCellStateFromBoardState(
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;

    // Assert
    expect(getSvgLayerContainingToken(backgroundImage, "#4ca4ff")).toBe(
      undefined,
    );
  });
});

describe("Background state: markup colors", () => {
  it("shows a conic-gradient background when the cell has at least one markup color applied", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellNumber,
      { markupColors: [MARKUP_COLOR_RED] },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellNumber,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellNumber),
    ).backgroundImage;

    // Assert
    expect(backgroundImage.toLowerCase()).toContain("conic-gradient");
  });

  it("shows no conic-gradient background when the cell has no markup colors", async () => {
    // Arrange
    const targetCellNumber = getBrandedCellNumber(10);
    const cellState = getTargetCellStateFromBoardState(targetCellNumber);

    // Act
    const renderedCell = await renderCell({ cellState });
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
    let startingBoardState = getStartingEmptyBoardState();

    startingBoardState = getBoardStateWithUpdatedTargetCell(
      sourceCellNumber,
      {
        cellContent: { givenDigit: getBrandedSudokuDigit("5") },
      },
      startingBoardState,
    );
    startingBoardState = getBoardStateWithUpdatedTargetCell(
      matchingCellNumber,
      {
        cellContent: { givenDigit: getBrandedSudokuDigit("5") },
      },
      startingBoardState,
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState: startingBoardState,
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
      sourceCellNumber,
      {
        cellContent: { enteredDigit: getBrandedSudokuDigit("7") },
      },
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      matchingCellNumber,
      {
        cellContent: { enteredDigit: getBrandedSudokuDigit("7") },
      },
      boardState,
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
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
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
      boardState,
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
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      matchingCellNumber,
      {
        cellContent: {
          centerMarkups: [""],
          cornerMarkups: [getBrandedSudokuDigit("8")],
        },
      },
      boardState,
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
      sourceCellNumber,
      {
        markupColors: [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
      },
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      matchingCellNumber,
      {
        markupColors: [MARKUP_COLOR_RED],
      },
      boardState,
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
      sourceCellNumber,
      {
        cellContent: { enteredDigit: getBrandedSudokuDigit("4") },
      },
      boardState,
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellNumber: sourceCellNumber,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(
      getTargetCellStateFromBoardState(emptyCellNumber, nextBoardState)
        .isSelected,
    ).toBe(false);
  });

  it("clears any existing selection before applying the double-click selection", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const previouslySelectedCellNumber = getBrandedCellNumber(1);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithTargetCellsSelected(
      [previouslySelectedCellNumber],
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      sourceCellNumber,
      {
        cellContent: { givenDigit: getBrandedSudokuDigit("9") },
      },
      boardState,
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
        previouslySelectedCellNumber,
        nextBoardState,
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
      sourceCellNumber,
      {
        cellContent: { givenDigit: getBrandedSudokuDigit("6") },
      },
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      matchingCellNumber,
      {
        cellContent: { givenDigit: getBrandedSudokuDigit("6") },
      },
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      nonMatchingCellNumber,
      {
        cellContent: { givenDigit: getBrandedSudokuDigit("7") },
      },
      boardState,
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
      sourceCellNumber,
      {
        markupColors: [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
      },
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      exactMatchCellNumber,
      {
        markupColors: [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
      },
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      partialMatchCellNumber,
      {
        markupColors: [MARKUP_COLOR_RED],
      },
      boardState,
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
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
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
      boardState,
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
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      partialMatchCellNumber,
      {
        cellContent: {
          centerMarkups: [getBrandedSudokuDigit("2")],
          cornerMarkups: [""],
        },
      },
      boardState,
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
      getTargetCellStateFromBoardState(partialMatchCellNumber, nextBoardState)
        .isSelected,
    ).toBe(false);
  });

  it("does not select empty cells when strict mode is on", async () => {
    // Arrange
    const sourceCellNumber = getBrandedCellNumber(10);
    const emptyCellNumber = getBrandedCellNumber(20);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      sourceCellNumber,
      {
        markupColors: [MARKUP_COLOR_GREEN],
      },
      boardState,
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
      getTargetCellStateFromBoardState(emptyCellNumber, nextBoardState)
        .isSelected,
    ).toBe(false);
  });
});
