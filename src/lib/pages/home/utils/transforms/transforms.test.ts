import { describe, expect, it } from "vitest";

import { TOTAL_CELLS_IN_BOARD } from "@/lib/pages/home/utils/constants";
import {
  doesTargetCellContainEmptyCellContent,
  EMPTY_RAW_BOARD_STATE,
  getBoardStateWithTargetCellsSelected,
  getEmptyRawBoardState,
  getGivenDigitInTargetCell,
  getStartingEmptyBoardState,
  getTargetCellStateFromBoardState,
} from "@/lib/pages/home/utils/testing";
import {
  getBoardStateFromRawBoardState,
  getBoardStateWithNoCellsSelected,
  getCurrentBoardStateFromPuzzleState,
  getEncodedPuzzleStringFromRawPuzzleString,
  getGivenOrEnteredDigitInCellIfPresent,
  getRawPuzzleStringFromRawBoardState,
  updatePuzzleStateWithCurrentBoardState,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellContent,
  type CellId,
  type PuzzleState,
  type RawBoardState,
  type RawGivenDigit,
  type RawPuzzleString,
} from "@/lib/pages/home/utils/types";
import {
  getBrandedBoxNumber,
  getBrandedCellId,
  getBrandedColumnNumber,
  getBrandedRowNumber,
  getBrandedSudokuDigit,
  isRawGivenDigit,
  isRawPuzzleString,
} from "@/lib/pages/home/utils/validators/validators";

// #region Branded Values
const getBrandedRawPuzzleString = (
  candidateRawPuzzleString: string,
): RawPuzzleString => {
  if (!isRawPuzzleString(candidateRawPuzzleString)) {
    throw new Error(
      `Invalid RawPuzzleString "${candidateRawPuzzleString}" in test setup.`,
    );
  }

  return candidateRawPuzzleString;
};

const getBrandedRawGivenDigit = (
  candidateRawGivenDigit: number,
): RawGivenDigit => {
  if (!isRawGivenDigit(candidateRawGivenDigit)) {
    throw new Error(
      `Invalid RawGivenDigit "${candidateRawGivenDigit}" in test setup.`,
    );
  }

  return candidateRawGivenDigit;
};
// #endregion

// #region Raw Board State Builder
const getRawBoardStateWithGivenDigitsInTargetCells = (
  targetCellsAndRawGivenDigits: Array<{
    cellId: CellId;
    rawGivenDigit: RawGivenDigit;
  }>,
): RawBoardState => {
  const rawBoardState = getEmptyRawBoardState();

  for (const { cellId, rawGivenDigit } of targetCellsAndRawGivenDigits) {
    rawBoardState[cellId - 1] = rawGivenDigit;
  }

  return rawBoardState;
};
// #endregion

// #region Puzzle State Builder
const getPuzzleStateFromPuzzleHistory = (
  puzzleHistory: Array<BoardState>,
  historyIndex: number,
): PuzzleState => {
  const puzzleState: PuzzleState = {
    historyIndex,
    puzzleHistory,
  };

  return puzzleState;
};
// #endregion

// #region Cell Coordinates
const getCellCoordinates = (boardState: BoardState, cellId: CellId) => {
  const cellState = getTargetCellStateFromBoardState(cellId, boardState);

  const cellCoordinates = {
    id: cellState.id,
    rowNumber: cellState.houses.rowNumber,
    columnNumber: cellState.houses.columnNumber,
    boxNumber: cellState.houses.boxNumber,
  };

  return cellCoordinates;
};
// #endregion

describe("Puzzle String Transforms", () => {
  describe("getEncodedPuzzleStringFromRawPuzzleString", () => {
    it("encodes a puzzle into its shareable short-string format", () => {
      // Arrange
      const rawPuzzleString = getBrandedRawPuzzleString(
        "100000000020000000003000000000400000000050000000006000000000700000000080000000009",
      );

      // Act
      const encodedPuzzleString =
        getEncodedPuzzleStringFromRawPuzzleString(rawPuzzleString);

      // Assert
      expect(encodedPuzzleString).toBe(
        "492bta2pyfcoxdhpr9olfou7ig8thrv0gvzr0vzc0nhnfl36br49",
      );
    });
  });

  describe("getRawPuzzleStringFromRawBoardState", () => {
    it("serializes a raw board into its raw puzzle-string format", () => {
      // Arrange
      const rawBoardState = getRawBoardStateWithGivenDigitsInTargetCells([
        {
          cellId: getBrandedCellId(1),
          rawGivenDigit: getBrandedRawGivenDigit(0),
        },
        {
          cellId: getBrandedCellId(2),
          rawGivenDigit: getBrandedRawGivenDigit(4),
        },
        {
          cellId: getBrandedCellId(3),
          rawGivenDigit: getBrandedRawGivenDigit(8),
        },
      ]);

      // Act
      const rawPuzzleString =
        getRawPuzzleStringFromRawBoardState(rawBoardState);

      // Assert
      expect(rawPuzzleString).toBe(`159${"0".repeat(78)}`);
    });

    it("serializes an empty board as a puzzle string with no given digits", () => {
      // Arrange
      const rawBoardState = EMPTY_RAW_BOARD_STATE;
      const rawPuzzleString =
        getRawPuzzleStringFromRawBoardState(rawBoardState);

      // Assert
      expect(rawPuzzleString).toBe("0".repeat(TOTAL_CELLS_IN_BOARD));
    });
  });
});

describe("Sudoku Digit Transform", () => {
  it("accepts a valid sudoku digit entered as a string", () => {
    // Arrange
    const candidateSudokuDigit = "7";

    // Act
    const sudokuDigit = getBrandedSudokuDigit(candidateSudokuDigit);

    // Assert
    expect(sudokuDigit).toBe("7");
  });

  it("rejects a string that is not a valid sudoku digit", () => {
    // Arrange
    const getInvalidSudokuDigit = () => getBrandedSudokuDigit("0");

    // Act / Assert
    expect(getInvalidSudokuDigit).toThrow(
      'Failed to get a SudokuDigit from the candidate string "0".',
    );
  });
});

describe("Board State Transform", () => {
  describe("getBoardStateFromRawBoardState", () => {
    it("creates a full 81-cell board for a puzzle", () => {
      // Arrange
      const rawBoardState = EMPTY_RAW_BOARD_STATE;
      const boardState = getBoardStateFromRawBoardState(rawBoardState);

      // Assert
      expect(boardState).toHaveLength(TOTAL_CELLS_IN_BOARD);
    });

    it("treats blank cells as editable cells with no entered digit", () => {
      // Arrange
      const rawBoardState = EMPTY_RAW_BOARD_STATE;
      const boardState = getBoardStateFromRawBoardState(rawBoardState);

      // Assert
      expect(
        doesTargetCellContainEmptyCellContent(boardState, getBrandedCellId(1)),
      ).toBe(true);
      expect(
        doesTargetCellContainEmptyCellContent(boardState, getBrandedCellId(81)),
      ).toBe(true);
    });

    it("treats provided given digits as given digits in the board state", () => {
      // Arrange
      const rawBoardState = getRawBoardStateWithGivenDigitsInTargetCells([
        {
          cellId: getBrandedCellId(1),
          rawGivenDigit: getBrandedRawGivenDigit(0),
        },
        {
          cellId: getBrandedCellId(2),
          rawGivenDigit: getBrandedRawGivenDigit(4),
        },
        {
          cellId: getBrandedCellId(3),
          rawGivenDigit: getBrandedRawGivenDigit(8),
        },
      ]);

      // Act
      const boardState = getBoardStateFromRawBoardState(rawBoardState);

      // Assert
      expect(getGivenDigitInTargetCell(boardState, getBrandedCellId(1))).toBe(
        getBrandedSudokuDigit("1"),
      );
      expect(getGivenDigitInTargetCell(boardState, getBrandedCellId(2))).toBe(
        getBrandedSudokuDigit("5"),
      );
      expect(getGivenDigitInTargetCell(boardState, getBrandedCellId(3))).toBe(
        getBrandedSudokuDigit("9"),
      );
    });

    it("places each cell in the correct row, column, and box", () => {
      // Arrange
      const rawBoardState = EMPTY_RAW_BOARD_STATE;
      const boardState = getBoardStateFromRawBoardState(rawBoardState);

      // Assert
      expect(getCellCoordinates(boardState, getBrandedCellId(1))).toEqual({
        id: getBrandedCellId(1),
        rowNumber: getBrandedRowNumber(1),
        columnNumber: getBrandedColumnNumber(1),
        boxNumber: getBrandedBoxNumber(1),
      });
      expect(getCellCoordinates(boardState, getBrandedCellId(9))).toEqual({
        id: getBrandedCellId(9),
        rowNumber: getBrandedRowNumber(1),
        columnNumber: getBrandedColumnNumber(9),
        boxNumber: getBrandedBoxNumber(3),
      });
      expect(getCellCoordinates(boardState, getBrandedCellId(10))).toEqual({
        id: getBrandedCellId(10),
        rowNumber: getBrandedRowNumber(2),
        columnNumber: getBrandedColumnNumber(1),
        boxNumber: getBrandedBoxNumber(1),
      });
      expect(getCellCoordinates(boardState, getBrandedCellId(41))).toEqual({
        id: getBrandedCellId(41),
        rowNumber: getBrandedRowNumber(5),
        columnNumber: getBrandedColumnNumber(5),
        boxNumber: getBrandedBoxNumber(5),
      });
      expect(getCellCoordinates(boardState, getBrandedCellId(81))).toEqual({
        id: getBrandedCellId(81),
        rowNumber: getBrandedRowNumber(9),
        columnNumber: getBrandedColumnNumber(9),
        boxNumber: getBrandedBoxNumber(9),
      });
    });

    it("starts every cell unselected and without color markups", () => {
      // Arrange
      const rawBoardState = EMPTY_RAW_BOARD_STATE;
      const boardState = getBoardStateFromRawBoardState(rawBoardState);

      // Assert
      for (const cellState of boardState) {
        expect(cellState.isSelected).toBe(false);
        expect(cellState.markupColors).toEqual([""]);
      }
    });
  });

  describe("getCurrentBoardStateFromPuzzleState", () => {
    it("returns the board state for the player's current point in their undo/redo history", () => {
      // Arrange
      const rawBoardState = EMPTY_RAW_BOARD_STATE;
      const firstBoardState = getBoardStateFromRawBoardState(rawBoardState);
      const secondBoardState = getBoardStateWithTargetCellsSelected(
        [getBrandedCellId(1), getBrandedCellId(2), getBrandedCellId(3)],
        firstBoardState,
      );
      const thirdBoardState = getBoardStateWithTargetCellsSelected(
        [getBrandedCellId(9)],
        firstBoardState,
      );
      const puzzleState = getPuzzleStateFromPuzzleHistory(
        [firstBoardState, secondBoardState, thirdBoardState],
        1,
      );

      // Act
      const currentBoardState =
        getCurrentBoardStateFromPuzzleState(puzzleState);

      // Assert
      expect(currentBoardState).toBe(secondBoardState);
    });
  });

  describe("getBoardStateWithNoCellsSelected", () => {
    it("clears selection from every cell when the board is deselected", () => {
      // Arrange
      const rawBoardState = EMPTY_RAW_BOARD_STATE;
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        [getBrandedCellId(1), getBrandedCellId(5), getBrandedCellId(9)],
        getBoardStateFromRawBoardState(rawBoardState),
      );

      // Act
      const nextBoardState =
        getBoardStateWithNoCellsSelected(startingBoardState);

      // Assert
      for (const cellState of nextBoardState) {
        expect(cellState.isSelected).toBe(false);
      }
    });

    it("leaves the board unchanged when no cells are selected and the board is deselected", () => {
      // Arrange
      const rawBoardState = EMPTY_RAW_BOARD_STATE;
      const startingBoardState = getBoardStateFromRawBoardState(rawBoardState);

      // Act
      const nextBoardState =
        getBoardStateWithNoCellsSelected(startingBoardState);

      // Assert
      expect(nextBoardState).toEqual(startingBoardState);
    });
  });

  describe("updatePuzzleStateWithCurrentBoardState", () => {
    it("returns the original puzzle state when the board state is unchanged", () => {
      // Arrange
      const startingBoardState = getStartingEmptyBoardState();
      const startingPuzzleState = getPuzzleStateFromPuzzleHistory(
        [startingBoardState],
        0,
      );

      // Act
      const nextPuzzleState = updatePuzzleStateWithCurrentBoardState(
        startingPuzzleState,
        startingBoardState,
      );

      // Assert
      expect(nextPuzzleState).toBe(startingPuzzleState);
    });

    it("replaces the board state at the current history index when the board changes", () => {
      // Arrange
      const firstBoardState = getStartingEmptyBoardState();
      const secondBoardState = getBoardStateWithTargetCellsSelected(
        [getBrandedCellId(1)],
        firstBoardState,
      );
      const thirdBoardState = getBoardStateWithTargetCellsSelected(
        [getBrandedCellId(9)],
        firstBoardState,
      );
      const startingPuzzleState = getPuzzleStateFromPuzzleHistory(
        [firstBoardState, secondBoardState, thirdBoardState],
        1,
      );
      const replacementBoardState = getBoardStateWithTargetCellsSelected(
        [getBrandedCellId(2), getBrandedCellId(3)],
        secondBoardState,
      );

      // Act
      const nextPuzzleState = updatePuzzleStateWithCurrentBoardState(
        startingPuzzleState,
        replacementBoardState,
      );

      // Assert
      expect(nextPuzzleState).not.toBe(startingPuzzleState);
      expect(nextPuzzleState.historyIndex).toBe(1);
      expect(nextPuzzleState.puzzleHistory[0]).toBe(firstBoardState);
      expect(nextPuzzleState.puzzleHistory[1]).toBe(replacementBoardState);
      expect(nextPuzzleState.puzzleHistory[2]).toBe(thirdBoardState);
    });
  });
});

describe("Digit Accessor", () => {
  it("returns the given digit when a cell contains a given digit", () => {
    // Arrange
    const cellContent: CellContent = {
      givenDigit: getBrandedSudokuDigit("8"),
    };

    // Act
    const digitInCell = getGivenOrEnteredDigitInCellIfPresent(cellContent);

    // Assert
    expect(digitInCell).toBe(getBrandedSudokuDigit("8"));
  });

  it("returns the entered digit when a cell contains an entered digit", () => {
    // Arrange
    const cellContent: CellContent = {
      enteredDigit: getBrandedSudokuDigit("6"),
    };

    // Act
    const digitInCell = getGivenOrEnteredDigitInCellIfPresent(cellContent);

    // Assert
    expect(digitInCell).toBe(getBrandedSudokuDigit("6"));
  });

  it("returns an empty string when an editable cell is still blank", () => {
    // Arrange
    const cellContent: CellContent = {
      emptyCell: "",
    };

    // Act
    const digitInCell = getGivenOrEnteredDigitInCellIfPresent(cellContent);

    // Assert
    expect(digitInCell).toBe("");
  });

  it("returns an empty string when a cell contains only markup digits", () => {
    // Arrange
    const cellContent: CellContent = {
      centerMarkups: [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
      cornerMarkups: [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("5")],
    };

    // Act
    const digitInCell = getGivenOrEnteredDigitInCellIfPresent(cellContent);

    // Assert
    expect(digitInCell).toBe("");
  });
});
