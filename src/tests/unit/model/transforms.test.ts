import { describe, expect, it } from "vitest";

import {
  isPlayerDigitInCellContent,
  isStartingDigitInCellContent,
} from "@/lib/pages/home/model/guards";
import {
  getBoardStateFromRawBoardState,
  getBoardStateWithNoCellsSelected,
  getBrandedBoxNumber,
  getBrandedCellNumber,
  getBrandedColumnNumber,
  getBrandedRowNumber,
  getBrandedSudokuDigit,
  getCurrentBoardStateFromPuzzleHistory,
  getEncodedPuzzleStringFromRawPuzzleString,
  getRawPuzzleStringFromRawBoardState,
  getStartingOrPlayerDigitInCellIfPresent,
} from "@/lib/pages/home/model/transforms";
import {
  type BoardState,
  type BoxNumber,
  type CellContent,
  type CellNumber,
  type CellState,
  type ColumnNumber,
  type PuzzleHistory,
  type RawBoardState,
  type RawPuzzleString,
  type RawStartingDigit,
  type RowNumber,
  type SudokuDigit,
} from "@/lib/pages/home/model/types";
import {
  isRawPuzzleString,
  isRawStartingDigit,
} from "@/lib/pages/home/model/validators";

// #region Shared Test Functions
const getBrandedRawPuzzleString = (
  candidateRawPuzzleString: string,
): RawPuzzleString => {
  if (!isRawPuzzleString(candidateRawPuzzleString))
    throw Error(
      `Invalid RawPuzzleString "${candidateRawPuzzleString}" in test setup.`,
    );

  return candidateRawPuzzleString;
};

const getEmptyRawBoardState = (): RawBoardState =>
  Array.from({ length: 81 }, () => null) as RawBoardState;

const getRawBoardStateWithStartingDigitsInTargetCells = (
  targetCellsAndRawStartingDigits: Array<{
    cellNumber: CellNumber;
    rawStartingDigit: RawStartingDigit;
  }>,
): RawBoardState => {
  const rawBoardState = getEmptyRawBoardState();

  for (const {
    cellNumber,
    rawStartingDigit,
  } of targetCellsAndRawStartingDigits) {
    rawBoardState[cellNumber - 1] = rawStartingDigit;
  }

  return rawBoardState;
};

const getBrandedRawStartingDigit = (
  candidateRawStartingDigit: number,
): RawStartingDigit => {
  if (!isRawStartingDigit(candidateRawStartingDigit))
    throw Error(
      `Invalid RawStartingDigit "${candidateRawStartingDigit}" in test setup.`,
    );

  return candidateRawStartingDigit;
};

const getTargetCellStateFromBoardState = (
  boardState: BoardState,
  cellNumber: CellNumber,
): CellState => {
  const candidateCellState = boardState.find(
    (cellState) => cellState.cellNumber === cellNumber,
  );

  if (!candidateCellState)
    throw Error(`Missing cellState for cell number ${cellNumber}`);

  return candidateCellState;
};

const expectTargetCellToContainPlayerDigit = (
  boardState: BoardState,
  cellNumber: CellNumber,
  expectedPlayerDigit: SudokuDigit | "",
) => {
  const cellState = getTargetCellStateFromBoardState(boardState, cellNumber);

  expect(isPlayerDigitInCellContent(cellState.cellContent)).toBe(true);

  if (isPlayerDigitInCellContent(cellState.cellContent))
    expect(cellState.cellContent.playerDigit).toBe(expectedPlayerDigit);
};

const expectTargetCellToContainStartingDigit = (
  boardState: BoardState,
  cellNumber: CellNumber,
  expectedStartingDigit: SudokuDigit,
) => {
  const cellState = getTargetCellStateFromBoardState(boardState, cellNumber);

  expect(isStartingDigitInCellContent(cellState.cellContent)).toBe(true);

  if (isStartingDigitInCellContent(cellState.cellContent))
    expect(cellState.cellContent.startingDigit).toBe(expectedStartingDigit);
};

const expectTargetCellToHaveCoordinates = (
  boardState: BoardState,
  cellNumber: CellNumber,
  expectedCoordinates: {
    rowNumber: RowNumber;
    columnNumber: ColumnNumber;
    boxNumber: BoxNumber;
  },
) => {
  const cellState = getTargetCellStateFromBoardState(boardState, cellNumber);

  expect(cellState.cellNumber).toBe(cellNumber);
  expect(cellState.rowNumber).toBe(expectedCoordinates.rowNumber);
  expect(cellState.columnNumber).toBe(expectedCoordinates.columnNumber);
  expect(cellState.boxNumber).toBe(expectedCoordinates.boxNumber);
};

const getBoardStateWithTargetCellsSelected = (
  boardState: BoardState,
  cellNumbers: Array<CellNumber>,
): BoardState => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const shouldBeSelected = cellNumbers.includes(cellState.cellNumber);

    const nextCellState: CellState = {
      ...cellState,
      isSelected: shouldBeSelected,
    };

    return nextCellState;
  });

  return nextBoardState;
};

const getPuzzleHistoryFromBoardStates = (
  boardStates: Array<BoardState>,
  currentBoardStateIndex: number,
): PuzzleHistory => {
  const puzzleHistory: PuzzleHistory = {
    currentBoardStateIndex,
    boardStateHistory: boardStates,
  };

  return puzzleHistory;
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
      const rawBoardState = getRawBoardStateWithStartingDigitsInTargetCells([
        {
          cellNumber: getBrandedCellNumber(1),
          rawStartingDigit: getBrandedRawStartingDigit(0),
        },
        {
          cellNumber: getBrandedCellNumber(2),
          rawStartingDigit: getBrandedRawStartingDigit(4),
        },
        {
          cellNumber: getBrandedCellNumber(3),
          rawStartingDigit: getBrandedRawStartingDigit(8),
        },
      ]);

      // Act
      const rawPuzzleString =
        getRawPuzzleStringFromRawBoardState(rawBoardState);

      // Assert
      expect(rawPuzzleString).toBe(`159${"0".repeat(78)}`);
    });

    it("serializes an empty board as a puzzle string with no starting digits", () => {
      // Arrange
      const rawBoardState = getEmptyRawBoardState();

      // Act
      const rawPuzzleString =
        getRawPuzzleStringFromRawBoardState(rawBoardState);

      // Assert
      expect(rawPuzzleString).toBe("0".repeat(81));
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
      const rawBoardState = getEmptyRawBoardState();

      // Act
      const boardState = getBoardStateFromRawBoardState(rawBoardState);

      // Assert
      expect(boardState).toHaveLength(81);
    });

    it("treats blank cells as editable cells with no entered digit", () => {
      // Arrange
      const rawBoardState = getEmptyRawBoardState();

      // Act
      const boardState = getBoardStateFromRawBoardState(rawBoardState);

      // Assert
      expectTargetCellToContainPlayerDigit(
        boardState,
        getBrandedCellNumber(1),
        "",
      );
      expectTargetCellToContainPlayerDigit(
        boardState,
        getBrandedCellNumber(81),
        "",
      );
    });

    it("treats provided starting digits as starting digits in the board state", () => {
      // Arrange
      const rawBoardState = getRawBoardStateWithStartingDigitsInTargetCells([
        {
          cellNumber: getBrandedCellNumber(1),
          rawStartingDigit: getBrandedRawStartingDigit(0),
        },
        {
          cellNumber: getBrandedCellNumber(2),
          rawStartingDigit: getBrandedRawStartingDigit(4),
        },
        {
          cellNumber: getBrandedCellNumber(3),
          rawStartingDigit: getBrandedRawStartingDigit(8),
        },
      ]);

      // Act
      const boardState = getBoardStateFromRawBoardState(rawBoardState);

      // Assert
      expectTargetCellToContainStartingDigit(
        boardState,
        getBrandedCellNumber(1),
        getBrandedSudokuDigit("1"),
      );
      expectTargetCellToContainStartingDigit(
        boardState,
        getBrandedCellNumber(2),
        getBrandedSudokuDigit("5"),
      );
      expectTargetCellToContainStartingDigit(
        boardState,
        getBrandedCellNumber(3),
        getBrandedSudokuDigit("9"),
      );
    });

    it("places each cell in the correct row, column, and box", () => {
      // Arrange
      const rawBoardState = getEmptyRawBoardState();

      // Act
      const boardState = getBoardStateFromRawBoardState(rawBoardState);

      // Assert
      expectTargetCellToHaveCoordinates(boardState, getBrandedCellNumber(1), {
        rowNumber: getBrandedRowNumber(1),
        columnNumber: getBrandedColumnNumber(1),
        boxNumber: getBrandedBoxNumber(1),
      });
      expectTargetCellToHaveCoordinates(boardState, getBrandedCellNumber(9), {
        rowNumber: getBrandedRowNumber(1),
        columnNumber: getBrandedColumnNumber(9),
        boxNumber: getBrandedBoxNumber(3),
      });
      expectTargetCellToHaveCoordinates(boardState, getBrandedCellNumber(10), {
        rowNumber: getBrandedRowNumber(2),
        columnNumber: getBrandedColumnNumber(1),
        boxNumber: getBrandedBoxNumber(1),
      });
      expectTargetCellToHaveCoordinates(boardState, getBrandedCellNumber(41), {
        rowNumber: getBrandedRowNumber(5),
        columnNumber: getBrandedColumnNumber(5),
        boxNumber: getBrandedBoxNumber(5),
      });
      expectTargetCellToHaveCoordinates(boardState, getBrandedCellNumber(81), {
        rowNumber: getBrandedRowNumber(9),
        columnNumber: getBrandedColumnNumber(9),
        boxNumber: getBrandedBoxNumber(9),
      });
    });

    it("starts every cell unselected and without color markups", () => {
      // Arrange
      const rawBoardState = getEmptyRawBoardState();

      // Act
      const boardState = getBoardStateFromRawBoardState(rawBoardState);

      // Assert
      for (const cellState of boardState) {
        expect(cellState.isSelected).toBe(false);
        expect(cellState.markupColors).toEqual([""]);
      }
    });
  });

  describe("getCurrentBoardStateFromPuzzleHistory", () => {
    it("returns the board state for the player's current point in the puzzle history", () => {
      // Arrange
      const firstBoardState = getBoardStateFromRawBoardState(
        getEmptyRawBoardState(),
      );
      const secondBoardState = getBoardStateWithTargetCellsSelected(
        firstBoardState,
        [
          getBrandedCellNumber(1),
          getBrandedCellNumber(2),
          getBrandedCellNumber(3),
        ],
      );
      const thirdBoardState = getBoardStateWithTargetCellsSelected(
        firstBoardState,
        [getBrandedCellNumber(9)],
      );
      const puzzleHistory = getPuzzleHistoryFromBoardStates(
        [firstBoardState, secondBoardState, thirdBoardState],
        1,
      );

      // Act
      const currentBoardState =
        getCurrentBoardStateFromPuzzleHistory(puzzleHistory);

      // Assert
      expect(currentBoardState).toBe(secondBoardState);
    });
  });

  describe("getBoardStateWithNoCellsSelected", () => {
    it("clears selection from every cell when the board is deselected", () => {
      // Arrange
      const startingBoardState = getBoardStateWithTargetCellsSelected(
        getBoardStateFromRawBoardState(getEmptyRawBoardState()),
        [
          getBrandedCellNumber(1),
          getBrandedCellNumber(5),
          getBrandedCellNumber(9),
        ],
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
      const startingBoardState = getBoardStateFromRawBoardState(
        getEmptyRawBoardState(),
      );

      // Act
      const nextBoardState =
        getBoardStateWithNoCellsSelected(startingBoardState);

      // Assert
      expect(nextBoardState).toEqual(startingBoardState);
    });
  });
});

describe("Digit Accessor", () => {
  it("returns the starting digit when a cell contains a starting digit", () => {
    // Arrange
    const cellContent: CellContent = {
      startingDigit: getBrandedSudokuDigit("8"),
    };

    // Act
    const digitInCell = getStartingOrPlayerDigitInCellIfPresent(cellContent);

    // Assert
    expect(digitInCell).toBe(getBrandedSudokuDigit("8"));
  });

  it("returns the entered digit when a cell contains a player digit", () => {
    // Arrange
    const cellContent: CellContent = {
      playerDigit: getBrandedSudokuDigit("6"),
    };

    // Act
    const digitInCell = getStartingOrPlayerDigitInCellIfPresent(cellContent);

    // Assert
    expect(digitInCell).toBe(getBrandedSudokuDigit("6"));
  });

  it("returns an empty string when an editable cell is still blank", () => {
    // Arrange
    const cellContent: CellContent = {
      playerDigit: "",
    };

    // Act
    const digitInCell = getStartingOrPlayerDigitInCellIfPresent(cellContent);

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
    const digitInCell = getStartingOrPlayerDigitInCellIfPresent(cellContent);

    // Assert
    expect(digitInCell).toBe("");
  });
});
