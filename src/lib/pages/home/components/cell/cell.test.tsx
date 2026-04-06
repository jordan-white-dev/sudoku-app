import SuperExpressive from "super-expressive";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Cell } from "@/lib/pages/home/components/cell/cell";
import {
  defaultUserSettings,
  type UserSettings,
  UserSettingsProvider,
} from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import {
  MARKUP_COLOR_BLUE,
  MARKUP_COLOR_GREEN,
  MARKUP_COLOR_RED,
} from "@/lib/pages/home/utils/constants";
import {
  CONFLICT_CELL_HIGHLIGHT_COLOR_TOKEN,
  expectSeenCellHighlightOrNotInTargetCell,
  expectTargetCellToHaveConflictHighlightOrNot,
  getBoardStateWithTargetCellsSelected,
  getCellAccessibleName,
  getCellElement,
  getCellLocator,
  getStartingEmptyBoardState,
  getStartingPuzzleStateFromBoardState,
  getTargetCellStateFromBoardState,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";
import {
  getBrandedCellId,
  getBrandedColumnNumber,
  getBrandedRowNumber,
  getBrandedSudokuDigit,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellContent,
  type CellId,
  type CellState,
  type ColumnNumber,
  type PuzzleState,
  type RowNumber,
} from "@/lib/pages/home/utils/types";

const USER_SETTINGS_SESSION_STORAGE_KEY = "user-settings";

const SELECTED_CELL_HIGHLIGHT_COLOR_TOKEN = "4ca4ff";

// Equivalent to: /url\("data:image\/svg\+xml,([^"]+)"\)/g
const SVG_DATA_URL_REGEX = SuperExpressive()
  .allowMultipleMatches.string('url("data:image/svg+xml,')
  .capture.oneOrMore.anythingButChars('"')
  .end()
  .string('")')
  .toRegex();

const getSvgLayersFromBackgroundImage = (
  backgroundImage: string,
): Array<string> => {
  const svgUrlMatches = backgroundImage.matchAll(SVG_DATA_URL_REGEX);

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

// Equivalent to: /<rect\b[^>]*>/g
const SVG_RECT_TAG_REGEX = SuperExpressive()
  .allowMultipleMatches.string("<rect")
  .wordBoundary.zeroOrMore.anythingButChars(">")
  .string(">")
  .toRegex();

const getRectTagsFromSvgLayer = (svgLayer: string): Array<string> => {
  const rectTagMatches = svgLayer.match(SVG_RECT_TAG_REGEX);

  return rectTagMatches ?? [];
};

const getCenterMarkupsOfLength = (length: number): CellContent => {
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
  cellId: CellId,
  updates: Partial<CellState>,
  startingBoardState?: BoardState,
): BoardState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  return boardState.map((cellState) => {
    if (cellState.id !== cellId) return cellState;

    return {
      ...cellState,
      ...updates,
    };
  });
};

const getSelectedCellIds = (boardState: BoardState): Array<number> => {
  return boardState
    .filter((cellState) => cellState.isSelected)
    .map((cellState) => Number(cellState.id))
    .sort((firstCellId, secondCellId) => firstCellId - secondCellId);
};

const getNextBoardStateAfterDoubleClick = async ({
  boardState,
  targetCellId,
  userSettings,
}: {
  boardState: BoardState;
  targetCellId: CellId;
  userSettings: UserSettings;
}): Promise<BoardState> => {
  const targetCellState = getTargetCellStateFromBoardState(
    targetCellId,
    boardState,
  );
  const setPuzzleState = vi.fn();

  const renderedCell = await renderCell({
    startingBoardState: boardState,
    cellState: targetCellState,
    setPuzzleState,
    userSettings,
  });

  const cellElement = await getCellElement(renderedCell, targetCellId);

  cellElement.dispatchEvent(
    new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
    }),
  );

  await waitForReactToFinishUpdating();

  const setPuzzleStateUpdater = setPuzzleState.mock.calls[0]?.[0];

  if (!setPuzzleStateUpdater || typeof setPuzzleStateUpdater !== "function")
    throw Error("Expected a puzzle state updater function after double-click.");

  const startingPuzzleState = getStartingPuzzleStateFromBoardState(boardState);
  const nextPuzzleState = setPuzzleStateUpdater(startingPuzzleState);

  return nextPuzzleState.puzzleHistory[nextPuzzleState.historyIndex];
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
  setPuzzleState = vi.fn(),
  userSettings = defaultUserSettings,
}: {
  cellState: CellState;
  startingBoardState?: BoardState;
  hasDigitConflict?: boolean;
  isSeenInBox?: boolean;
  isSeenInColumn?: boolean;
  isSeenInRow?: boolean;
  selectedColumnNumber?: ColumnNumber;
  selectedRowNumber?: RowNumber;
  handleCellPointerDown?: (cellId: CellId) => void;
  setPuzzleState?: (
    value: PuzzleState | ((value: PuzzleState) => PuzzleState),
  ) => void;
  userSettings?: UserSettings;
}) => {
  window.sessionStorage.setItem(
    USER_SETTINGS_SESSION_STORAGE_KEY,
    JSON.stringify(userSettings),
  );

  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const renderedCell = await render(
    <Provider>
      <UserSettingsProvider>
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
          setPuzzleState={setPuzzleState}
        />
      </UserSettingsProvider>
    </Provider>,
  );

  await waitForReactToFinishUpdating();

  return renderedCell;
};

beforeEach(() => {
  window.sessionStorage.clear();

  if (!HTMLElement.prototype.setPointerCapture)
    HTMLElement.prototype.setPointerCapture = vi.fn(() => undefined);
  else
    vi.spyOn(HTMLElement.prototype, "setPointerCapture").mockImplementation(
      () => undefined,
    );
});

describe("Accessible name", () => {
  it("includes the cell id, row number, and column number in the accessible name", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(23);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({ cellState });

    // Assert
    await expect
      .element(
        renderedCell.getByRole("button", {
          name: getCellAccessibleName(targetCellId),
        }),
      )
      .toBeInTheDocument();
  });
});

describe("Data attributes", () => {
  it("marks the cell with its cell id", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(7);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({ cellState });
    const cellElement = await getCellElement(renderedCell, targetCellId);

    // Assert
    expect(cellElement.getAttribute("data-cell-number")).toBe("7");
  });

  it("marks the cell as not selected when it is not selected", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(1);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({ cellState });

    // Assert
    await expect
      .poll(async () => {
        const cellElement = await getCellElement(renderedCell, targetCellId);

        return cellElement.getAttribute("data-selected");
      })
      .toBe("false");
  });

  it("marks the cell as selected when it is selected", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(1);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      { isSelected: true },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellId,
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
        const cellElement = await getCellElement(renderedCell, targetCellId);

        return cellElement.getAttribute("data-selected");
      })
      .toBe("true");
  });
});

describe("Content display", () => {
  it("shows no digit text when the cell is empty", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({ cellState });
    const cellElement = await getCellElement(renderedCell, targetCellId);

    // Assert
    expect(cellElement.textContent?.trim() ?? "").toBe("");
  });

  it("shows the given digit when the cell contains a given digit", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: {
          givenDigit: getBrandedSudokuDigit("7"),
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellId,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });

    // Assert
    await expect
      .element(await getCellLocator(renderedCell, targetCellId))
      .toHaveTextContent("7");
  });

  it("shows the entered digit when the cell contains an entered digit", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: {
          enteredDigit: getBrandedSudokuDigit("5"),
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellId,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });

    // Assert
    await expect
      .element(await getCellLocator(renderedCell, targetCellId))
      .toHaveTextContent("5");
  });

  it("shows center markups as a sorted sequence of digits", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: {
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
      targetCellId,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });

    // Assert
    await expect
      .element(await getCellLocator(renderedCell, targetCellId))
      .toHaveTextContent("135");
  });

  it("renders one corner markup float for each corner markup digit", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: {
          centerMarkups: [""],
          cornerMarkups: [
            getBrandedSudokuDigit("2"),
            getBrandedSudokuDigit("4"),
          ],
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellId,
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
    const targetCellId = getBrandedCellId(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: {
          centerMarkups: [""],
          cornerMarkups: [""],
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellId,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const cellElement = await getCellElement(renderedCell, targetCellId);

    // Assert
    expect(cellElement.textContent?.trim() ?? "").toBe("");
  });
});

describe("Text color", () => {
  it("displays a given digit in black", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: {
          givenDigit: getBrandedSudokuDigit("8"),
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellId,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const cellElement = await getCellElement(renderedCell, targetCellId);

    // Assert
    expect(window.getComputedStyle(cellElement).color).toBe("rgb(9, 9, 11)");
  });

  it("displays an entered digit in blue", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: {
          enteredDigit: getBrandedSudokuDigit("8"),
        },
      },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellId,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const cellElement = await getCellElement(renderedCell, targetCellId);

    // Assert
    expect(window.getComputedStyle(cellElement).color).toBe("rgb(18, 18, 240)");
  });
});

describe("Font size", () => {
  it("uses progressively smaller center-markup font sizes as the center markup count increases", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);

    const boardStateWithFiveCenterMarkups = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: getCenterMarkupsOfLength(5),
      },
    );
    const boardStateWithSixCenterMarkups = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: getCenterMarkupsOfLength(6),
      },
    );
    const boardStateWithSevenCenterMarkups = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: getCenterMarkupsOfLength(7),
      },
    );
    const boardStateWithEightCenterMarkups = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: getCenterMarkupsOfLength(8),
      },
    );
    const boardStateWithNineCenterMarkups = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: getCenterMarkupsOfLength(9),
      },
    );

    // Act
    const renderedCellWithFiveCenterMarkups = await renderCell({
      startingBoardState: boardStateWithFiveCenterMarkups,
      cellState: getTargetCellStateFromBoardState(
        targetCellId,
        boardStateWithFiveCenterMarkups,
      ),
    });
    const renderedCellWithSixCenterMarkups = await renderCell({
      startingBoardState: boardStateWithSixCenterMarkups,
      cellState: getTargetCellStateFromBoardState(
        targetCellId,
        boardStateWithSixCenterMarkups,
      ),
    });
    const renderedCellWithSevenCenterMarkups = await renderCell({
      startingBoardState: boardStateWithSevenCenterMarkups,
      cellState: getTargetCellStateFromBoardState(
        targetCellId,
        boardStateWithSevenCenterMarkups,
      ),
    });
    const renderedCellWithEightCenterMarkups = await renderCell({
      startingBoardState: boardStateWithEightCenterMarkups,
      cellState: getTargetCellStateFromBoardState(
        targetCellId,
        boardStateWithEightCenterMarkups,
      ),
    });
    const renderedCellWithNineCenterMarkups = await renderCell({
      startingBoardState: boardStateWithNineCenterMarkups,
      cellState: getTargetCellStateFromBoardState(
        targetCellId,
        boardStateWithNineCenterMarkups,
      ),
    });

    const fontSizeWithFiveCenterMarkups = getCellFontSizeInPixels(
      await getCellElement(renderedCellWithFiveCenterMarkups, targetCellId),
    );
    const fontSizeWithSixCenterMarkups = getCellFontSizeInPixels(
      await getCellElement(renderedCellWithSixCenterMarkups, targetCellId),
    );
    const fontSizeWithSevenCenterMarkups = getCellFontSizeInPixels(
      await getCellElement(renderedCellWithSevenCenterMarkups, targetCellId),
    );
    const fontSizeWithEightCenterMarkups = getCellFontSizeInPixels(
      await getCellElement(renderedCellWithEightCenterMarkups, targetCellId),
    );
    const fontSizeWithNineCenterMarkups = getCellFontSizeInPixels(
      await getCellElement(renderedCellWithNineCenterMarkups, targetCellId),
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
    const targetCellId = getBrandedCellId(10);

    const boardStateWithCenterMarkup = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: getCenterMarkupsOfLength(2),
      },
    );
    const boardStateWithGivenDigit = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        content: {
          givenDigit: getBrandedSudokuDigit("5"),
        },
      },
    );

    // Act
    const renderedCellWithCenterMarkup = await renderCell({
      startingBoardState: boardStateWithCenterMarkup,
      cellState: getTargetCellStateFromBoardState(
        targetCellId,
        boardStateWithCenterMarkup,
      ),
    });
    const renderedCellWithGivenDigit = await renderCell({
      startingBoardState: boardStateWithGivenDigit,
      cellState: getTargetCellStateFromBoardState(
        targetCellId,
        boardStateWithGivenDigit,
      ),
    });

    const textShadowWithCenterMarkup = window.getComputedStyle(
      await getCellElement(renderedCellWithCenterMarkup, targetCellId),
    ).textShadow;
    const textShadowWithGivenDigit = window.getComputedStyle(
      await getCellElement(renderedCellWithGivenDigit, targetCellId),
    ).textShadow;

    // Assert
    expect(textShadowWithCenterMarkup).toBe("none");
    expect(textShadowWithGivenDigit).not.toBe("none");
  });
});

describe("Row and column labels", () => {
  it("shows a row number label for a cell in column 1 when row and column labels are enabled", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

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
    const targetCellId = getBrandedCellId(3);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

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
    const targetCellId = getBrandedCellId(10);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({ cellState });
    const cellElement = await getCellElement(renderedCell, targetCellId);

    // Assert
    expect(cellElement.textContent?.trim() ?? "").toBe("");
  });

  it("does not show a row label for a cell not in column 1", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(11);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({
      cellState,
      userSettings: {
        ...defaultUserSettings,
        isShowRowAndColumnLabelsEnabled: true,
      },
    });
    const cellElement = await getCellElement(renderedCell, targetCellId);

    // Assert
    expect(cellElement.textContent?.trim() ?? "").toBe("");
  });

  it("does not show a column label for a cell not in row 1", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(11);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({
      cellState,
      userSettings: {
        ...defaultUserSettings,
        isShowRowAndColumnLabelsEnabled: true,
      },
    });
    const cellElement = await getCellElement(renderedCell, targetCellId);

    // Assert
    expect(cellElement.textContent?.trim() ?? "").toBe("");
  });
});

describe("Border styles", () => {
  it("uses solid borders for all sides when the dashed grid setting is off", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(1);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({ cellState });
    const cellElement = await getCellElement(renderedCell, targetCellId);

    // Assert
    expect(window.getComputedStyle(cellElement).borderRightStyle).toBe("solid");
  });

  it("uses a dashed border on the right side of an interior-column cell when dashed grid is enabled", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(11);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({
      cellState,
      userSettings: {
        ...defaultUserSettings,
        isDashedGridEnabled: true,
      },
    });
    const cellElement = await getCellElement(renderedCell, targetCellId);

    // Assert
    expect(window.getComputedStyle(cellElement).borderRightStyle).toBe(
      "dashed",
    );
  });

  it("uses a solid border on the right side of a box-edge column cell even when dashed grid is enabled", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(12);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({
      cellState,
      userSettings: {
        ...defaultUserSettings,
        isDashedGridEnabled: true,
      },
    });
    const cellElement = await getCellElement(renderedCell, targetCellId);

    // Assert
    expect(window.getComputedStyle(cellElement).borderRightStyle).toBe("solid");
  });

  it("uses 2px left border width on left box edges and 0 elsewhere", async () => {
    // Arrange
    const leftEdgeCellId = getBrandedCellId(10);
    const interiorCellId = getBrandedCellId(11);

    // Act
    const renderedLeftEdgeCell = await renderCell({
      cellState: getTargetCellStateFromBoardState(leftEdgeCellId),
    });
    const renderedInteriorCell = await renderCell({
      cellState: getTargetCellStateFromBoardState(interiorCellId),
    });

    const leftEdgeCell = await getCellElement(
      renderedLeftEdgeCell,
      leftEdgeCellId,
    );
    const interiorCell = await getCellElement(
      renderedInteriorCell,
      interiorCellId,
    );

    // Assert
    expect(window.getComputedStyle(leftEdgeCell).borderLeftWidth).toBe("2px");
    expect(window.getComputedStyle(interiorCell).borderLeftWidth).toBe("0px");
  });

  it("uses 2px top border width on top box edges and 0 elsewhere", async () => {
    // Arrange
    const topEdgeCellId = getBrandedCellId(2);
    const interiorCellId = getBrandedCellId(11);

    // Act
    const renderedTopEdgeCell = await renderCell({
      cellState: getTargetCellStateFromBoardState(topEdgeCellId),
    });
    const renderedInteriorCell = await renderCell({
      cellState: getTargetCellStateFromBoardState(interiorCellId),
    });

    const topEdgeCell = await getCellElement(
      renderedTopEdgeCell,
      topEdgeCellId,
    );
    const interiorCell = await getCellElement(
      renderedInteriorCell,
      interiorCellId,
    );

    // Assert
    expect(window.getComputedStyle(topEdgeCell).borderTopWidth).toBe("2px");
    expect(window.getComputedStyle(interiorCell).borderTopWidth).toBe("0px");
  });
});

describe("Pointer down interaction", () => {
  it("calls handleCellPointerDown with the cell id when the cell is pressed", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const cellState = getTargetCellStateFromBoardState(targetCellId);
    const handleCellPointerDown = vi.fn();
    const renderedCell = await renderCell({
      cellState,
      handleCellPointerDown,
    });
    const cellElement = await getCellElement(renderedCell, targetCellId);

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
    expect(handleCellPointerDown).toHaveBeenCalledWith(targetCellId);
  });

  it("captures the pointer when the cell is pressed", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const cellState = getTargetCellStateFromBoardState(targetCellId);
    const renderedCell = await renderCell({ cellState });
    const cellElement = await getCellElement(renderedCell, targetCellId);
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
    const targetCellId = getBrandedCellId(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      { isSelected: true },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellId,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellId),
    ).backgroundImage;

    // Assert
    expect(backgroundImage.toLowerCase()).toContain(
      SELECTED_CELL_HIGHLIGHT_COLOR_TOKEN,
    );
  });

  it("does not show a selection highlight when the cell is not selected", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({ cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellId),
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
    const targetCellId = getBrandedCellId(10);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({
      cellState,
      hasDigitConflict: true,
    });

    // Assert
    await expectTargetCellToHaveConflictHighlightOrNot(
      renderedCell,
      targetCellId,
      true,
    );
  });

  it("does not show a conflict highlight when the cell has no digit conflict", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({
      cellState,
      hasDigitConflict: false,
    });

    // Assert
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellId),
    ).backgroundImage;
    expect(backgroundImage.toLowerCase()).not.toContain(
      CONFLICT_CELL_HIGHLIGHT_COLOR_TOKEN,
    );
  });
});

describe("Background state: seen cells", () => {
  it("shows a seen-cell highlight when seen cells are enabled and the cell is in the same row as the selected cell", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(40);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

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
      targetCellId,
      true,
    );
  });

  it("shows a seen-cell highlight when seen cells are enabled and the cell is in the same column as the selected cell", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(40);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

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
      targetCellId,
      true,
    );
  });

  it("shows a seen-cell highlight when seen cells are enabled and the cell is in the same box as the selected cell", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(40);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

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
      targetCellId,
      true,
    );
  });

  it("does not show a seen-cell highlight when seen cells are disabled, even when the cell is seen", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(40);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

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
      targetCellId,
      false,
    );
  });

  it("uses a single full-cell seen rectangle when row, column, and box highlights all apply", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(40);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

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
      await getCellElement(renderedCell, targetCellId),
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
    const targetCellId = getBrandedCellId(2);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

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
      await getCellElement(renderedCell, targetCellId),
    ).backgroundImage;

    // Assert
    expect(getSvgLayerContainingToken(backgroundImage, "#ffd700")).toBe(
      undefined,
    );
  });

  it("suppresses the seen-row band at puzzle left edge when the cell is inside the selected box", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

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
      await getCellElement(renderedCell, targetCellId),
    ).backgroundImage;

    // Assert
    expect(getSvgLayerContainingToken(backgroundImage, "#ffd700")).toBe(
      undefined,
    );
  });

  it("insets the seen-box rectangle along the top and left box edges", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(1);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

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
      await getCellElement(renderedCell, targetCellId),
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
    const targetCellId = getBrandedCellId(40);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      { isSelected: true },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellId,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellId),
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
    const targetCellId = getBrandedCellId(40);
    let startingBoardState = getStartingEmptyBoardState();

    startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        isSelected: true,
      },
      startingBoardState,
    );
    startingBoardState = getBoardStateWithUpdatedTargetCell(
      getBrandedCellId(39),
      {
        isSelected: true,
      },
      startingBoardState,
    );

    const cellState = getTargetCellStateFromBoardState(
      targetCellId,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellId),
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
    const targetCellId = getBrandedCellId(40);
    let startingBoardState = getStartingEmptyBoardState();

    startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        isSelected: true,
      },
      startingBoardState,
    );
    startingBoardState = getBoardStateWithUpdatedTargetCell(
      getBrandedCellId(31),
      {
        isSelected: true,
      },
      startingBoardState,
    );
    startingBoardState = getBoardStateWithUpdatedTargetCell(
      getBrandedCellId(39),
      {
        isSelected: true,
      },
      startingBoardState,
    );

    const cellState = getTargetCellStateFromBoardState(
      targetCellId,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellId),
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
    const targetCellId = getBrandedCellId(40);
    let startingBoardState = getStartingEmptyBoardState();

    startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      {
        isSelected: true,
      },
      startingBoardState,
    );

    const surroundingSelectedCellIds = [
      getBrandedCellId(30),
      getBrandedCellId(31),
      getBrandedCellId(32),
      getBrandedCellId(39),
      getBrandedCellId(41),
      getBrandedCellId(48),
      getBrandedCellId(49),
      getBrandedCellId(50),
    ];

    for (const surroundingCellId of surroundingSelectedCellIds)
      startingBoardState = getBoardStateWithUpdatedTargetCell(
        surroundingCellId,
        { isSelected: true },
        startingBoardState,
      );

    const cellState = getTargetCellStateFromBoardState(
      targetCellId,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellId),
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
    const targetCellId = getBrandedCellId(10);
    const startingBoardState = getBoardStateWithUpdatedTargetCell(
      targetCellId,
      { markupColors: [MARKUP_COLOR_RED] },
    );
    const cellState = getTargetCellStateFromBoardState(
      targetCellId,
      startingBoardState,
    );

    // Act
    const renderedCell = await renderCell({ startingBoardState, cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellId),
    ).backgroundImage;

    // Assert
    expect(backgroundImage.toLowerCase()).toContain("conic-gradient");
  });

  it("shows no conic-gradient background when the cell has no markup colors", async () => {
    // Arrange
    const targetCellId = getBrandedCellId(10);
    const cellState = getTargetCellStateFromBoardState(targetCellId);

    // Act
    const renderedCell = await renderCell({ cellState });
    const backgroundImage = window.getComputedStyle(
      await getCellElement(renderedCell, targetCellId),
    ).backgroundImage;

    // Assert
    expect(backgroundImage.toLowerCase()).not.toContain("conic-gradient");
  });
});

describe("Double-click selection (partial highlight mode)", () => {
  it("selects all cells sharing the same given digit when a given-digit cell is double-clicked", async () => {
    // Arrange
    const sourceCellId = getBrandedCellId(10);
    const matchingCellId = getBrandedCellId(20);
    let startingBoardState = getStartingEmptyBoardState();

    startingBoardState = getBoardStateWithUpdatedTargetCell(
      sourceCellId,
      {
        content: { givenDigit: getBrandedSudokuDigit("5") },
      },
      startingBoardState,
    );
    startingBoardState = getBoardStateWithUpdatedTargetCell(
      matchingCellId,
      {
        content: { givenDigit: getBrandedSudokuDigit("5") },
      },
      startingBoardState,
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState: startingBoardState,
      targetCellId: sourceCellId,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(getSelectedCellIds(nextBoardState)).toEqual([10, 20]);
  });

  it("selects all cells sharing the same entered digit when an entered-digit cell is double-clicked", async () => {
    // Arrange
    const sourceCellId = getBrandedCellId(10);
    const matchingCellId = getBrandedCellId(30);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      sourceCellId,
      {
        content: { enteredDigit: getBrandedSudokuDigit("7") },
      },
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      matchingCellId,
      {
        content: { enteredDigit: getBrandedSudokuDigit("7") },
      },
      boardState,
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellId: sourceCellId,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(getSelectedCellIds(nextBoardState)).toEqual([10, 30]);
  });

  it("selects cells that share any center markup digit", async () => {
    // Arrange
    const sourceCellId = getBrandedCellId(10);
    const matchingCellId = getBrandedCellId(40);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      sourceCellId,
      {
        content: {
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
      matchingCellId,
      {
        content: {
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
      targetCellId: sourceCellId,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(getSelectedCellIds(nextBoardState)).toEqual([10, 40]);
  });

  it("selects cells that share any corner markup digit", async () => {
    // Arrange
    const sourceCellId = getBrandedCellId(10);
    const matchingCellId = getBrandedCellId(50);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      sourceCellId,
      {
        content: {
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
      matchingCellId,
      {
        content: {
          centerMarkups: [""],
          cornerMarkups: [getBrandedSudokuDigit("8")],
        },
      },
      boardState,
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellId: sourceCellId,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(getSelectedCellIds(nextBoardState)).toEqual([10, 50]);
  });

  it("selects cells that share any markup color when both cells have only markup colors and no digit content", async () => {
    // Arrange
    const sourceCellId = getBrandedCellId(10);
    const matchingCellId = getBrandedCellId(60);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      sourceCellId,
      {
        markupColors: [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
      },
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      matchingCellId,
      {
        markupColors: [MARKUP_COLOR_RED],
      },
      boardState,
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellId: sourceCellId,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(getSelectedCellIds(nextBoardState)).toEqual([10, 60]);
  });

  it("does not select empty cells when double-clicking a non-empty cell", async () => {
    // Arrange
    const sourceCellId = getBrandedCellId(10);
    const emptyCellId = getBrandedCellId(70);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      sourceCellId,
      {
        content: { enteredDigit: getBrandedSudokuDigit("4") },
      },
      boardState,
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellId: sourceCellId,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(
      getTargetCellStateFromBoardState(emptyCellId, nextBoardState).isSelected,
    ).toBe(false);
  });

  it("clears any existing selection before applying the double-click selection", async () => {
    // Arrange
    const sourceCellId = getBrandedCellId(10);
    const previouslySelectedCellId = getBrandedCellId(1);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithTargetCellsSelected(
      [previouslySelectedCellId],
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      sourceCellId,
      {
        content: { givenDigit: getBrandedSudokuDigit("9") },
      },
      boardState,
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellId: sourceCellId,
      userSettings: defaultUserSettings,
    });

    // Assert
    expect(
      getTargetCellStateFromBoardState(previouslySelectedCellId, nextBoardState)
        .isSelected,
    ).toBe(false);
  });
});

describe("Double-click selection (strict highlight mode)", () => {
  it("selects only cells with exactly the same given digit, not cells with a different digit", async () => {
    // Arrange
    const sourceCellId = getBrandedCellId(10);
    const matchingCellId = getBrandedCellId(20);
    const nonMatchingCellId = getBrandedCellId(30);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      sourceCellId,
      {
        content: { givenDigit: getBrandedSudokuDigit("6") },
      },
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      matchingCellId,
      {
        content: { givenDigit: getBrandedSudokuDigit("6") },
      },
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      nonMatchingCellId,
      {
        content: { givenDigit: getBrandedSudokuDigit("7") },
      },
      boardState,
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellId: sourceCellId,
      userSettings: {
        ...defaultUserSettings,
        isStrictHighlightsEnabled: true,
      },
    });

    // Assert
    expect(getSelectedCellIds(nextBoardState)).toEqual([10, 20]);
  });

  it("selects only cells with exactly the same markup color set, not cells with only partial overlap", async () => {
    // Arrange
    const sourceCellId = getBrandedCellId(10);
    const exactMatchCellId = getBrandedCellId(20);
    const partialMatchCellId = getBrandedCellId(30);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      sourceCellId,
      {
        markupColors: [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
      },
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      exactMatchCellId,
      {
        markupColors: [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
      },
      boardState,
    );
    boardState = getBoardStateWithUpdatedTargetCell(
      partialMatchCellId,
      {
        markupColors: [MARKUP_COLOR_RED],
      },
      boardState,
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellId: sourceCellId,
      userSettings: {
        ...defaultUserSettings,
        isStrictHighlightsEnabled: true,
      },
    });

    // Assert
    expect(getSelectedCellIds(nextBoardState)).toEqual([10, 20]);
  });

  it("selects only cells with exactly matching center and corner markup digits", async () => {
    // Arrange
    const sourceCellId = getBrandedCellId(10);
    const exactMatchCellId = getBrandedCellId(20);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      sourceCellId,
      {
        content: {
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
      exactMatchCellId,
      {
        content: {
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
      targetCellId: sourceCellId,
      userSettings: {
        ...defaultUserSettings,
        isStrictHighlightsEnabled: true,
      },
    });

    // Assert
    expect(getSelectedCellIds(nextBoardState)).toEqual([10, 20]);
  });

  it("does not select cells that match only partially when strict mode is on", async () => {
    // Arrange
    const sourceCellId = getBrandedCellId(10);
    const partialMatchCellId = getBrandedCellId(20);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      sourceCellId,
      {
        content: {
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
      partialMatchCellId,
      {
        content: {
          centerMarkups: [getBrandedSudokuDigit("2")],
          cornerMarkups: [""],
        },
      },
      boardState,
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellId: sourceCellId,
      userSettings: {
        ...defaultUserSettings,
        isStrictHighlightsEnabled: true,
      },
    });

    // Assert
    expect(
      getTargetCellStateFromBoardState(partialMatchCellId, nextBoardState)
        .isSelected,
    ).toBe(false);
  });

  it("does not select empty cells when strict mode is on", async () => {
    // Arrange
    const sourceCellId = getBrandedCellId(10);
    const emptyCellId = getBrandedCellId(20);
    let boardState = getStartingEmptyBoardState();

    boardState = getBoardStateWithUpdatedTargetCell(
      sourceCellId,
      {
        markupColors: [MARKUP_COLOR_GREEN],
      },
      boardState,
    );

    // Act
    const nextBoardState = await getNextBoardStateAfterDoubleClick({
      boardState,
      targetCellId: sourceCellId,
      userSettings: {
        ...defaultUserSettings,
        isStrictHighlightsEnabled: true,
      },
    });

    // Assert
    expect(
      getTargetCellStateFromBoardState(emptyCellId, nextBoardState).isSelected,
    ).toBe(false);
  });
});
