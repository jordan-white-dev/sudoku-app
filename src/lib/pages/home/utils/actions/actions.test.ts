import { type Dispatch, type SetStateAction } from "react";
import { describe, expect, it } from "vitest";

import {
  handleCenterMarkupInput,
  handleClearCell,
  handleColorPadInput,
  handleCornerMarkupInput,
  handleDigitInput,
  handleRedoMove,
  handleUndoMove,
} from "@/lib/pages/home/utils/actions/actions";
import {
  MARKUP_COLOR_BLUE,
  MARKUP_COLOR_GRAY,
  MARKUP_COLOR_GREEN,
  MARKUP_COLOR_ORANGE,
  MARKUP_COLOR_PINK,
  MARKUP_COLOR_PURPLE,
  MARKUP_COLOR_RED,
  MARKUP_COLOR_WHITE,
  MARKUP_COLOR_YELLOW,
} from "@/lib/pages/home/utils/constants";
import {
  isEmptyCellContent,
  isEnteredDigitInCellContent,
  isGivenDigitInCellContent,
  isMarkupDigitsInCellContent,
} from "@/lib/pages/home/utils/guards";
import {
  getBoardStateFromRawBoardState,
  getBrandedCellNumber,
  getBrandedSudokuDigit,
  getCurrentBoardStateFromPuzzleHistory,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellNumber,
  type CellState,
  type MarkupColor,
  type PuzzleHistory,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";

// #region Shared Test Functions
const getEmptyRawBoardState = () =>
  Array.from({ length: 81 }, () => null) as Array<null>;

const getStartingEmptyBoardState = () => {
  const emptyRawBoardState = getEmptyRawBoardState();

  const startingEmptyBoardState =
    getBoardStateFromRawBoardState(emptyRawBoardState);

  return startingEmptyBoardState;
};

const getPuzzleHistoryAfterStateUpdate = (
  startingPuzzleHistory: PuzzleHistory,
  invokePuzzleHistoryUpdate: (
    setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
  ) => void,
): PuzzleHistory => {
  let nextPuzzleHistory = startingPuzzleHistory;

  const setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>> = (value) => {
    nextPuzzleHistory =
      typeof value === "function"
        ? (value as (current: PuzzleHistory) => PuzzleHistory)(
            nextPuzzleHistory,
          )
        : value;
  };

  invokePuzzleHistoryUpdate(setPuzzleHistory);

  return nextPuzzleHistory;
};

const getBoardStateWithSequentialTransformsApplied = (
  startingBoardState: BoardState,
  boardStateTransformFunctions: Array<
    (currentBoardState: BoardState) => BoardState
  >,
): BoardState => {
  const transformedBoardState = boardStateTransformFunctions.reduce(
    (currentBoardState, transformBoardState) => {
      const nextBoardState = transformBoardState(currentBoardState);

      return nextBoardState;
    },
    startingBoardState,
  );

  return transformedBoardState;
};

const getStartingPuzzleHistoryFromBoardState = (
  startingBoardState: BoardState,
): PuzzleHistory => ({
  currentBoardStateIndex: 0,
  boardStateHistory: [startingBoardState],
});

const getStartingPuzzleHistoryWithSequentialTransformsApplied = (
  boardStateTransformFunctions: Array<
    (currentBoardState: BoardState) => BoardState
  > = [],
): PuzzleHistory => {
  const startingBoardState = getBoardStateWithSequentialTransformsApplied(
    getStartingEmptyBoardState(),
    boardStateTransformFunctions,
  );

  const startingPuzzleHistory =
    getStartingPuzzleHistoryFromBoardState(startingBoardState);

  return startingPuzzleHistory;
};

const getBoardStateWithTargetCellsSelected = (
  boardState: BoardState,
  cellNumbers: Array<CellNumber>,
): BoardState => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const shouldBeSelected = cellNumbers.includes(cellState.cellNumber);

    const nextCellState = {
      ...cellState,
      isSelected: shouldBeSelected,
    };

    return nextCellState;
  });

  return nextBoardState;
};

const getPuzzleHistoryAfterDigitInput = (
  puzzleHistory: PuzzleHistory,
  sudokuDigit: SudokuDigit,
): PuzzleHistory => {
  const nextPuzzleHistory = getPuzzleHistoryAfterStateUpdate(
    puzzleHistory,
    (setPuzzleHistory) => {
      handleDigitInput(
        puzzleHistory,
        getBrandedSudokuDigit(sudokuDigit),
        setPuzzleHistory,
      );
    },
  );

  return nextPuzzleHistory;
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

const expectTargetCellToContainEmptyCellContent = (
  boardState: BoardState,
  cellNumber: CellNumber,
) => {
  const cellState = getTargetCellStateFromBoardState(boardState, cellNumber);

  expect(isEmptyCellContent(cellState.cellContent)).toBe(true);
};

const expectTargetCellToContainEnteredDigit = (
  boardState: BoardState,
  cellNumber: CellNumber,
  expectedEnteredDigit: SudokuDigit,
) => {
  const cellState = getTargetCellStateFromBoardState(boardState, cellNumber);

  expect(isEnteredDigitInCellContent(cellState.cellContent)).toBe(true);

  if (isEnteredDigitInCellContent(cellState.cellContent))
    expect(cellState.cellContent.enteredDigit).toBe(expectedEnteredDigit);
};

const getBoardStateWithEmptyCellContentInTargetCell = (
  boardState: BoardState,
  cellNumber: CellNumber,
) => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.cellNumber === cellNumber
        ? {
            ...cellState,
            cellContent: {
              emptyCell: "",
            },
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
};

const getBoardStateWithEnteredDigitInTargetCell = (
  boardState: BoardState,
  cellNumber: CellNumber,
  enteredDigit: SudokuDigit,
): BoardState => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.cellNumber === cellNumber
        ? {
            ...cellState,
            cellContent: {
              enteredDigit: getBrandedSudokuDigit(enteredDigit),
            },
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
};

const getBoardStateWithMarkupDigitsInTargetCell = (
  boardState: BoardState,
  cellNumber: CellNumber,
  centerMarkups: Array<SudokuDigit>,
  cornerMarkups: Array<SudokuDigit>,
): BoardState => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.cellNumber === cellNumber
        ? {
            ...cellState,
            cellContent: {
              centerMarkups:
                centerMarkups.length > 0
                  ? centerMarkups.map(getBrandedSudokuDigit)
                  : [""],
              cornerMarkups:
                cornerMarkups.length > 0
                  ? cornerMarkups.map(getBrandedSudokuDigit)
                  : [""],
            },
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
};

const getBoardStateWithMarkupColorsInTargetCell = (
  boardState: BoardState,
  cellNumber: CellNumber,
  markupColors: Array<MarkupColor>,
): BoardState => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.cellNumber === cellNumber
        ? {
            ...cellState,
            markupColors: markupColors.length > 0 ? markupColors : [""],
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
};

const expectTargetCellToContainMarkupColors = (
  boardState: BoardState,
  cellNumber: CellNumber,
  expectedMarkupColors: [""] | Array<MarkupColor>,
) => {
  const cellState = getTargetCellStateFromBoardState(boardState, cellNumber);

  expect(cellState.markupColors).toEqual(expectedMarkupColors);
};

const getBoardStateWithGivenDigitInTargetCell = (
  boardState: BoardState,
  cellNumber: CellNumber,
  givenDigit: SudokuDigit,
): BoardState => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState =
      cellState.cellNumber === cellNumber
        ? {
            ...cellState,
            cellContent: {
              givenDigit: getBrandedSudokuDigit(givenDigit),
            },
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
};

const expectTargetCellToContainGivenDigit = (
  boardState: BoardState,
  cellNumber: CellNumber,
  expectedGivenDigit: SudokuDigit,
) => {
  const cellState = getTargetCellStateFromBoardState(boardState, cellNumber);

  expect(isGivenDigitInCellContent(cellState.cellContent)).toBe(true);

  if (isGivenDigitInCellContent(cellState.cellContent))
    expect(cellState.cellContent.givenDigit).toBe(expectedGivenDigit);
};

const expectPuzzleHistoryToMatchItsStartingState = (
  nextPuzzleHistory: PuzzleHistory,
  startingPuzzleHistory: PuzzleHistory,
) => {
  const currentBoardState =
    getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);
  const startingBoardState = getCurrentBoardStateFromPuzzleHistory(
    startingPuzzleHistory,
  );

  expect(nextPuzzleHistory.currentBoardStateIndex).toBe(0);
  expect(nextPuzzleHistory.boardStateHistory).toHaveLength(1);
  expect(currentBoardState).toEqual(startingBoardState);
};

const getPuzzleHistoryAfterUndoingMove = (
  puzzleHistory: PuzzleHistory,
): PuzzleHistory => {
  const nextPuzzleHistory = getPuzzleHistoryAfterStateUpdate(
    puzzleHistory,
    (setPuzzleHistory) => {
      handleUndoMove(setPuzzleHistory);
    },
  );

  return nextPuzzleHistory;
};

const getPuzzleHistoryAfterCenterMarkupInput = (
  puzzleHistory: PuzzleHistory,
  sudokuDigit: SudokuDigit,
): PuzzleHistory => {
  const nextPuzzleHistory = getPuzzleHistoryAfterStateUpdate(
    puzzleHistory,
    (setPuzzleHistory) => {
      handleCenterMarkupInput(
        puzzleHistory,
        getBrandedSudokuDigit(sudokuDigit),
        setPuzzleHistory,
      );
    },
  );

  return nextPuzzleHistory;
};

const expectTargetCellToContainCenterMarkups = (
  boardState: BoardState,
  cellNumber: CellNumber,
  expectedCenterMarkups: [""] | Array<SudokuDigit>,
) => {
  const cellState = getTargetCellStateFromBoardState(boardState, cellNumber);

  expect(isMarkupDigitsInCellContent(cellState.cellContent)).toBe(true);

  if (isMarkupDigitsInCellContent(cellState.cellContent))
    expect(cellState.cellContent.centerMarkups).toEqual(expectedCenterMarkups);
};

const expectTargetCellToContainCornerMarkups = (
  boardState: BoardState,
  cellNumber: CellNumber,
  expectedCornerMarkups: [""] | Array<SudokuDigit>,
) => {
  const cellState = getTargetCellStateFromBoardState(boardState, cellNumber);

  expect(isMarkupDigitsInCellContent(cellState.cellContent)).toBe(true);

  if (isMarkupDigitsInCellContent(cellState.cellContent))
    expect(cellState.cellContent.cornerMarkups).toEqual(expectedCornerMarkups);
};

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
              centerMarkups:
                centerMarkups.length > 0
                  ? centerMarkups.map(getBrandedSudokuDigit)
                  : [""],
              cornerMarkups: [""],
            },
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
};

const getPuzzleHistoryAfterCornerMarkupInput = (
  puzzleHistory: PuzzleHistory,
  sudokuDigit: SudokuDigit,
): PuzzleHistory => {
  const nextPuzzleHistory = getPuzzleHistoryAfterStateUpdate(
    puzzleHistory,
    (setPuzzleHistory) => {
      handleCornerMarkupInput(
        puzzleHistory,
        getBrandedSudokuDigit(sudokuDigit),
        setPuzzleHistory,
      );
    },
  );

  return nextPuzzleHistory;
};

const getBoardStateWithCornerMarkupsInTargetCell = (
  boardState: BoardState,
  cellNumber: CellNumber,
  cornerMarkups: Array<SudokuDigit>,
): BoardState => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.cellNumber === cellNumber
        ? {
            ...cellState,
            cellContent: {
              centerMarkups: [""],
              cornerMarkups:
                cornerMarkups.length > 0
                  ? cornerMarkups.map(getBrandedSudokuDigit)
                  : [""],
            },
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
};

const getPuzzleHistoryAfterColorPadInput = (
  puzzleHistory: PuzzleHistory,
  markupValue: MarkupColor | SudokuDigit,
): PuzzleHistory => {
  const nextPuzzleHistory = getPuzzleHistoryAfterStateUpdate(
    puzzleHistory,
    (setPuzzleHistory) =>
      handleColorPadInput(puzzleHistory, markupValue, setPuzzleHistory),
  );

  return nextPuzzleHistory;
};

const getPuzzleHistoryAfterClearingSelectedCells = (
  puzzleHistory: PuzzleHistory,
): PuzzleHistory => {
  const nextPuzzleHistory = getPuzzleHistoryAfterStateUpdate(
    puzzleHistory,
    (setPuzzleHistory) => {
      handleClearCell(puzzleHistory, setPuzzleHistory);
    },
  );

  return nextPuzzleHistory;
};

const getPuzzleHistoryAfterRedoingMove = (
  puzzleHistory: PuzzleHistory,
): PuzzleHistory => {
  const nextPuzzleHistory = getPuzzleHistoryAfterStateUpdate(
    puzzleHistory,
    (setPuzzleHistory) => {
      handleRedoMove(setPuzzleHistory);
    },
  );

  return nextPuzzleHistory;
};
// #endregion

describe("Digit entry", () => {
  it("fills all selected editable cells with the entered digit when they're empty", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState: BoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
            getBrandedCellNumber(3),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("4"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expect(nextPuzzleHistory.currentBoardStateIndex).toBe(1);
    expect(nextPuzzleHistory.boardStateHistory).toHaveLength(2);
    for (const cellNumber of [
      getBrandedCellNumber(1),
      getBrandedCellNumber(2),
      getBrandedCellNumber(3),
    ]) {
      expectTargetCellToContainEnteredDigit(
        currentBoardState,
        getBrandedCellNumber(cellNumber),
        getBrandedSudokuDigit("4"),
      );
    }
  });

  it("replaces a different existing entered digit in selected editable cells", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("2"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("4"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("4"),
    );
  });

  it("replaces markup digits in selected editable cells with the entered digit", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
            [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("5")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("4"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("4"),
    );
  });

  it("preserves color markups in the selected cells when entering a digit", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [MARKUP_COLOR_BLUE, MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("4"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("4"),
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [MARKUP_COLOR_BLUE, MARKUP_COLOR_RED],
    );
  });

  it("preserves given digits in the selected cells when entering a digit", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("9"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("4"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainGivenDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("9"),
    );
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("4"),
    );
  });

  it("removes the entered digit from all selected editable cells when they already contain it", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("5"),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("5"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("5"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    for (const cellNumber of [
      getBrandedCellNumber(1),
      getBrandedCellNumber(2),
    ]) {
      expectTargetCellToContainEmptyCellContent(currentBoardState, cellNumber);
    }
  });

  it("removes the entered digit from all selected *editable* cells when all selected cells are either a given digit or already contain it", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("9"),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("5"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("5"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainGivenDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("9"),
    );
    expectTargetCellToContainEmptyCellContent(
      currentBoardState,
      getBrandedCellNumber(2),
    );
  });

  it("sets all selected editable cells to the entered digit when one already contains it and another contains a different editable value", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("5"),
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [getBrandedSudokuDigit("2")],
            [getBrandedSudokuDigit("3")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("5"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("5"),
    );
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("5"),
    );
  });

  it("leaves unselected cells unchanged when entering a digit", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("2"),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("3"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("4"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("4"),
    );
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("3"),
    );
  });

  it("doesn't add a move to the game's history when entering a digit with no cells selected", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied();

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("4"),
    );

    // Assert
    expectPuzzleHistoryToMatchItsStartingState(
      nextPuzzleHistory,
      startingPuzzleHistory,
    );
  });

  it("doesn't add a move to the game's history when entering a digit doesn't change the board state", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("9"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("4"),
    );

    // Assert
    expectPuzzleHistoryToMatchItsStartingState(
      nextPuzzleHistory,
      startingPuzzleHistory,
    );
  });

  it("discards all undone moves when a new digit is entered after undoing a move", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);
    const puzzleHistoryAfterOneMove = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("1"),
    );
    const puzzleHistoryAfterTwoMoves = getPuzzleHistoryAfterDigitInput(
      puzzleHistoryAfterOneMove,
      getBrandedSudokuDigit("2"),
    );
    const puzzleHistoryUndoneToMoveOne = getPuzzleHistoryAfterUndoingMove(
      puzzleHistoryAfterTwoMoves,
    );

    // Act
    const branchedHistory = getPuzzleHistoryAfterDigitInput(
      puzzleHistoryUndoneToMoveOne,
      getBrandedSudokuDigit("3"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(branchedHistory);

    // Assert
    expect(puzzleHistoryUndoneToMoveOne.currentBoardStateIndex).toBe(1);
    expect(puzzleHistoryUndoneToMoveOne.boardStateHistory).toHaveLength(3);
    expect(branchedHistory.currentBoardStateIndex).toBe(2);
    expect(branchedHistory.boardStateHistory).toHaveLength(3);
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("3"),
    );
  });
});

describe("Center markup entry", () => {
  it("fills all selected editable cells with the entered center markup when they're empty", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [""],
    );
  });

  it("adds the entered center markup to a cell that doesn't contain it but contains another center markup", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
    );
  });

  it("adds a center markup only to a cell that doesn't contain it when cells that both contain it and don't contain it are selected", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(2),
      [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
    );
  });

  it("adds the entered center markup only to selected, empty editable cells while leaving selected digit cells unchanged", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("5"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("5"),
    );
  });

  it("adds the entered center markup to selected editable cells that already contain other center markups while leaving cells that already contain the entered center markup unchanged", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(2),
      [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
    );
  });

  it("adds the entered center markup to selected editable cells with an empty entered digit while leaving selected non-empty entered digit cells unchanged", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("4"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [""],
    );
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("4"),
    );
  });

  it("adds the entered center markup to selected editable markup cells while preserving their existing corner markups and leaving selected starting digit cells unchanged", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("3")],
            [getBrandedSudokuDigit("5")],
          ),
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("9"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("5")],
    );
    expectTargetCellToContainGivenDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("9"),
    );
  });

  it("removes the entered center markup from all selected cells when they're editable and already contain it", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) => {
          const nextBoardState: BoardState = currentBoardState.map(
            (cellState) => {
              const nextCellState: CellState =
                cellState.cellNumber === 1 || cellState.cellNumber === 2
                  ? {
                      ...cellState,
                      cellContent: {
                        centerMarkups: [getBrandedSudokuDigit("7")],
                        cornerMarkups: [""],
                      },
                    }
                  : cellState;

              return nextCellState;
            },
          );

          return nextBoardState;
        },
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [""],
    );
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(2),
      [""],
    );
  });

  it("removes only the entered center markup from all selected cells when they contain the markup and another center markup", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("2")],
    );
  });

  it("preserves corner markups in the selected cells when entering a center markup", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("2")],
            [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("4")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("4")],
    );
  });

  it("leaves selected digit cells unchanged when entering a center markup", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("4"),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("5"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainGivenDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("4"),
    );
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("5"),
    );
  });

  it("removes the entered center markup from all selected editable cells when all selected cells are either a digit or already contain it", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("4"),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("5"),
          ),
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(3),
            [getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
            getBrandedCellNumber(3),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainGivenDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("4"),
    );
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("5"),
    );
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(3),
      [""],
    );
  });

  it("leaves unselected cells unchanged when entering a center markup", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [getBrandedSudokuDigit("3")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(2),
      [getBrandedSudokuDigit("3")],
    );
  });

  it("doesn't add a move to the game's history when entering a center markup with no cells selected", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied();

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );

    // Assert
    expectPuzzleHistoryToMatchItsStartingState(
      nextPuzzleHistory,
      startingPuzzleHistory,
    );
  });

  it("doesn't add a move to the game's history when entering a center markup doesn't change the board state", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("5"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );

    // Assert
    expectPuzzleHistoryToMatchItsStartingState(
      nextPuzzleHistory,
      startingPuzzleHistory,
    );
  });

  it("discards all undone moves when a new center markup is entered after undoing a move", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);
    const puzzleHistoryAfterOneMove = getPuzzleHistoryAfterCenterMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("1"),
    );
    const puzzleHistoryAfterTwoMoves = getPuzzleHistoryAfterCenterMarkupInput(
      puzzleHistoryAfterOneMove,
      getBrandedSudokuDigit("2"),
    );
    const puzzleHistoryUndoneToMoveOne = getPuzzleHistoryAfterUndoingMove(
      puzzleHistoryAfterTwoMoves,
    );

    // Act
    const branchedHistory = getPuzzleHistoryAfterCenterMarkupInput(
      puzzleHistoryUndoneToMoveOne,
      getBrandedSudokuDigit("3"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(branchedHistory);

    // Assert
    expect(puzzleHistoryUndoneToMoveOne.currentBoardStateIndex).toBe(1);
    expect(puzzleHistoryUndoneToMoveOne.boardStateHistory).toHaveLength(3);
    expect(branchedHistory.currentBoardStateIndex).toBe(2);
    expect(branchedHistory.boardStateHistory).toHaveLength(3);
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("1"), getBrandedSudokuDigit("3")],
    );
  });
});

describe("Corner markup entry", () => {
  it("fills all selected editable cells with the entered corner markup when they're empty", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("3"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [""],
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("3")],
    );
  });

  it("adds the entered corner markup to a cell that doesn't contain it but contains another corner markup", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
    );
  });

  it("adds a corner markup only to a cell that doesn't contain it when cells that both contain it and don't contain it are selected", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(2),
      [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
    );
  });

  it("adds the entered corner markup only to selected, empty editable cells while leaving selected digit cells unchanged", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("5"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("5"),
    );
  });

  it("adds the entered corner markup to selected editable cells that already contain other corner markups while leaving cells that already contain the entered corner markup unchanged", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(2),
      [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
    );
  });

  it("adds the entered corner markup to selected editable cells with an empty entered digit while leaving selected non-empty entered digit cells unchanged", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("4"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [""],
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("4"),
    );
  });

  it("adds the entered corner markup to selected editable markup cells while preserving their existing center markups and leaving selected given digit cells unchanged", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("3")],
            [getBrandedSudokuDigit("5")],
          ),
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("9"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("3")],
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("5"), getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainGivenDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("9"),
    );
  });

  it("removes the entered corner markup from all selected cells when they're editable and already contain it", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) => {
          const nextBoardState: BoardState = currentBoardState.map(
            (cellState) => {
              const nextCellState: CellState =
                cellState.cellNumber === 1
                  ? {
                      ...cellState,
                      cellContent: {
                        centerMarkups: [""],
                        cornerMarkups: [getBrandedSudokuDigit("3")],
                      },
                    }
                  : cellState;

              return nextCellState;
            },
          );

          return nextBoardState;
        },
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("3"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [""],
    );
  });

  it("removes only the entered corner markup from all selected cells when they contain the markup and another corner markup", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("5")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("3"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("5")],
    );
  });

  it("preserves center markups in the selected cells when entering a corner markup", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("6")],
            [getBrandedSudokuDigit("3")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("6")],
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("7")],
    );
  });

  it("leaves selected digit cells unchanged when entering a corner markup", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("4"),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("5"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainGivenDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("4"),
    );
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("5"),
    );
  });

  it("removes the entered corner markup from all selected editable cells when all selected cells are either a digit or already contain it", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("4"),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("5"),
          ),
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(3),
            [getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
            getBrandedCellNumber(3),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainGivenDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("4"),
    );
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("5"),
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(3),
      [""],
    );
  });

  it("leaves unselected cells unchanged when entering a corner markup", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [getBrandedSudokuDigit("3")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(2),
      [getBrandedSudokuDigit("3")],
    );
  });

  it("doesn't add a move to the game's history when entering a corner markup with no cells selected", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied();

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );

    // Assert
    expectPuzzleHistoryToMatchItsStartingState(
      nextPuzzleHistory,
      startingPuzzleHistory,
    );
  });

  it("doesn't add a move to the game's history when entering a corner markup doesn't change the board state", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("5"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("7"),
    );

    // Assert
    expectPuzzleHistoryToMatchItsStartingState(
      nextPuzzleHistory,
      startingPuzzleHistory,
    );
  });

  it("discards all undone moves when a new corner markup is entered after undoing a move", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);
    const puzzleHistoryAfterOneMove = getPuzzleHistoryAfterCornerMarkupInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("1"),
    );
    const puzzleHistoryAfterTwoMoves = getPuzzleHistoryAfterCornerMarkupInput(
      puzzleHistoryAfterOneMove,
      getBrandedSudokuDigit("2"),
    );
    const puzzleHistoryUndoneToMoveOne = getPuzzleHistoryAfterUndoingMove(
      puzzleHistoryAfterTwoMoves,
    );

    // Act
    const branchedHistory = getPuzzleHistoryAfterCornerMarkupInput(
      puzzleHistoryUndoneToMoveOne,
      getBrandedSudokuDigit("3"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(branchedHistory);

    // Assert
    expect(puzzleHistoryUndoneToMoveOne.currentBoardStateIndex).toBe(1);
    expect(puzzleHistoryUndoneToMoveOne.boardStateHistory).toHaveLength(3);
    expect(branchedHistory.currentBoardStateIndex).toBe(2);
    expect(branchedHistory.boardStateHistory).toHaveLength(3);
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("1"), getBrandedSudokuDigit("3")],
    );
  });
});

describe("Color markup entry", () => {
  it("adds the keypad color to all selected cells", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterColorPadInput(
      startingPuzzleHistory,
      MARKUP_COLOR_RED,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [MARKUP_COLOR_RED],
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(2),
      [MARKUP_COLOR_RED],
    );
  });

  it("adds the keyboard shortcut color to all selected cells", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterColorPadInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("8"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expect(
      getTargetCellStateFromBoardState(
        currentBoardState,
        getBrandedCellNumber(1),
      ).markupColors,
    ).toEqual([MARKUP_COLOR_BLUE]);
  });

  it.each([
    [getBrandedSudokuDigit("1"), "gray", MARKUP_COLOR_GRAY],
    [getBrandedSudokuDigit("2"), "white", MARKUP_COLOR_WHITE],
    [getBrandedSudokuDigit("3"), "pink", MARKUP_COLOR_PINK],
    [getBrandedSudokuDigit("4"), "red", MARKUP_COLOR_RED],
    [getBrandedSudokuDigit("5"), "orange", MARKUP_COLOR_ORANGE],
    [getBrandedSudokuDigit("6"), "yellow", MARKUP_COLOR_YELLOW],
    [getBrandedSudokuDigit("7"), "green", MARKUP_COLOR_GREEN],
    [getBrandedSudokuDigit("8"), "blue", MARKUP_COLOR_BLUE],
    [getBrandedSudokuDigit("9"), "purple", MARKUP_COLOR_PURPLE],
  ] as const)("applies %s's %s markup to the selected cell", (sudokuDigit, _colorName, expectedColor) => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterColorPadInput(
      startingPuzzleHistory,
      sudokuDigit,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [expectedColor],
    );
  });

  it("removes the entered color markup when all selected cells already contain it", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterColorPadInput(
      startingPuzzleHistory,
      MARKUP_COLOR_RED,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [""],
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(2),
      [MARKUP_COLOR_BLUE],
    );
  });

  it("adds the entered color markup to a cell that doesn't contain it but contains another color markup", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterColorPadInput(
      startingPuzzleHistory,
      MARKUP_COLOR_BLUE,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
    );
  });

  it("adds a color markup only to a cell that doesn't contain it when cells that both contain it and don't contain it are selected", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterColorPadInput(
      startingPuzzleHistory,
      MARKUP_COLOR_RED,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [MARKUP_COLOR_RED],
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(2),
      [MARKUP_COLOR_BLUE, MARKUP_COLOR_RED],
    );
  });

  it("preserves a selected given digit when entering a color", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("8"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterColorPadInput(
      startingPuzzleHistory,
      MARKUP_COLOR_RED,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainGivenDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("8"),
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [MARKUP_COLOR_RED],
    );
  });

  it("preserves a selected entered digit when entering a color", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("6"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterColorPadInput(
      startingPuzzleHistory,
      MARKUP_COLOR_RED,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("6"),
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [MARKUP_COLOR_RED],
    );
  });

  it("preserves selected markup digits when entering a color", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
            [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("5")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterColorPadInput(
      startingPuzzleHistory,
      MARKUP_COLOR_BLUE,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(1),
      [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("5")],
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [MARKUP_COLOR_BLUE],
    );
  });

  it("leaves unselected cells unchanged when entering a color", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterColorPadInput(
      startingPuzzleHistory,
      MARKUP_COLOR_RED,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [MARKUP_COLOR_BLUE, MARKUP_COLOR_RED],
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(2),
      [MARKUP_COLOR_RED],
    );
  });

  it("doesn't add a move to the game's history when trying to enter a color with no cells selected", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied();

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterColorPadInput(
      startingPuzzleHistory,
      MARKUP_COLOR_RED,
    );

    // Assert
    expectPuzzleHistoryToMatchItsStartingState(
      nextPuzzleHistory,
      startingPuzzleHistory,
    );
  });

  it("discards all undone moves when a new color markup is entered after undoing a move", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);
    const puzzleHistoryAfterOneMove = getPuzzleHistoryAfterColorPadInput(
      startingPuzzleHistory,
      MARKUP_COLOR_BLUE,
    );
    const puzzleHistoryAfterTwoMoves = getPuzzleHistoryAfterColorPadInput(
      puzzleHistoryAfterOneMove,
      MARKUP_COLOR_RED,
    );
    const puzzleHistoryUndoneToMoveOne = getPuzzleHistoryAfterUndoingMove(
      puzzleHistoryAfterTwoMoves,
    );

    // Act
    const branchedHistory = getPuzzleHistoryAfterColorPadInput(
      puzzleHistoryUndoneToMoveOne,
      MARKUP_COLOR_GREEN,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(branchedHistory);

    // Assert
    expect(puzzleHistoryUndoneToMoveOne.currentBoardStateIndex).toBe(1);
    expect(puzzleHistoryUndoneToMoveOne.boardStateHistory).toHaveLength(3);
    expect(branchedHistory.currentBoardStateIndex).toBe(2);
    expect(branchedHistory.boardStateHistory).toHaveLength(3);
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [MARKUP_COLOR_BLUE, MARKUP_COLOR_GREEN],
    );
  });
});

describe("Clearing selected cells", () => {
  it("removes all digits and all center, corner, and color markups from all selected editable cells while leaving given digit cells unchanged", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("6"),
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
            [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("5")],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(3),
            [MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(4),
            getBrandedSudokuDigit("7"),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
            getBrandedCellNumber(2),
            getBrandedCellNumber(3),
            getBrandedCellNumber(4),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterClearingSelectedCells(
      startingPuzzleHistory,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainEmptyCellContent(
      currentBoardState,
      getBrandedCellNumber(1),
    );
    expectTargetCellToContainEmptyCellContent(
      currentBoardState,
      getBrandedCellNumber(2),
    );
    expectTargetCellToContainEmptyCellContent(
      currentBoardState,
      getBrandedCellNumber(3),
    );

    expectTargetCellToContainGivenDigit(
      currentBoardState,
      getBrandedCellNumber(4),
      getBrandedSudokuDigit("7"),
    );

    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [""],
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(2),
      [""],
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(3),
      [""],
    );
  });

  it("clears just colors and not digits from selected given digit cells", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("8"),
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterClearingSelectedCells(
      startingPuzzleHistory,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainGivenDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("8"),
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [""],
    );
  });

  it("clears digits and colors from selected editable cells that contain both while leaving other cells unchanged", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("6"),
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            getBrandedSudokuDigit("4"),
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [MARKUP_COLOR_GREEN],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterClearingSelectedCells(
      startingPuzzleHistory,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainEmptyCellContent(
      currentBoardState,
      getBrandedCellNumber(1),
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [""],
    );

    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(2),
      getBrandedSudokuDigit("4"),
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(2),
      [MARKUP_COLOR_GREEN],
    );
  });

  it("leaves unselected cells unchanged when clearing selected cells", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            getBrandedSudokuDigit("6"),
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
            [MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [getBrandedSudokuDigit("2")],
            [getBrandedSudokuDigit("3")],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellNumber(2),
            [MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterClearingSelectedCells(
      startingPuzzleHistory,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(nextPuzzleHistory);

    // Assert
    expectTargetCellToContainEmptyCellContent(
      currentBoardState,
      getBrandedCellNumber(1),
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [""],
    );

    expectTargetCellToContainCenterMarkups(
      currentBoardState,
      getBrandedCellNumber(2),
      [getBrandedSudokuDigit("2")],
    );
    expectTargetCellToContainCornerMarkups(
      currentBoardState,
      getBrandedCellNumber(2),
      [getBrandedSudokuDigit("3")],
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(2),
      [MARKUP_COLOR_BLUE],
    );
  });

  it("doesn't add a move to the game's history when clearing selected cells with no cells selected", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied();

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterClearingSelectedCells(
      startingPuzzleHistory,
    );

    // Assert
    expectPuzzleHistoryToMatchItsStartingState(
      nextPuzzleHistory,
      startingPuzzleHistory,
    );
  });

  it("doesn't add a move to the game's history when clearing cells doesn't change the board state", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellNumber(1),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterClearingSelectedCells(
      startingPuzzleHistory,
    );

    // Assert
    expectPuzzleHistoryToMatchItsStartingState(
      nextPuzzleHistory,
      startingPuzzleHistory,
    );
  });

  it("discards all undone moves when selected cells are cleared after undoing a move", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);
    const puzzleHistoryAfterOneMove = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("1"),
    );
    const puzzleHistoryAfterTwoMoves = getPuzzleHistoryAfterColorPadInput(
      puzzleHistoryAfterOneMove,
      MARKUP_COLOR_RED,
    );
    const puzzleHistoryUndoneToMoveOne = getPuzzleHistoryAfterUndoingMove(
      puzzleHistoryAfterTwoMoves,
    );

    // Act
    const branchedHistory = getPuzzleHistoryAfterClearingSelectedCells(
      puzzleHistoryUndoneToMoveOne,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(branchedHistory);

    // Assert
    expect(puzzleHistoryUndoneToMoveOne.currentBoardStateIndex).toBe(1);
    expect(puzzleHistoryUndoneToMoveOne.boardStateHistory).toHaveLength(3);
    expect(branchedHistory.currentBoardStateIndex).toBe(2);
    expect(branchedHistory.boardStateHistory).toHaveLength(3);
    expectTargetCellToContainEmptyCellContent(
      currentBoardState,
      getBrandedCellNumber(1),
    );
    expectTargetCellToContainMarkupColors(
      currentBoardState,
      getBrandedCellNumber(1),
      [""],
    );
  });
});

describe("Undoing moves", () => {
  it("returns the game to how it looked immediately before the most recent move was taken", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);
    const puzzleHistoryAfterOneMove = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("4"),
    );
    const puzzleHistoryAfterTwoMoves = getPuzzleHistoryAfterDigitInput(
      puzzleHistoryAfterOneMove,
      getBrandedSudokuDigit("7"),
    );

    // Act
    const puzzleHistoryAfterUndo = getPuzzleHistoryAfterUndoingMove(
      puzzleHistoryAfterTwoMoves,
    );

    // Assert
    expect(puzzleHistoryAfterTwoMoves.currentBoardStateIndex).toBe(2);
    expect(puzzleHistoryAfterUndo.currentBoardStateIndex).toBe(1);
    expect(
      getCurrentBoardStateFromPuzzleHistory(puzzleHistoryAfterUndo),
    ).toEqual(getCurrentBoardStateFromPuzzleHistory(puzzleHistoryAfterOneMove));
  });

  it("can step backwards through multiple earlier moves without changing the amount of history that exists", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);
    const puzzleHistoryAfterOneMove = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("1"),
    );
    const puzzleHistoryAfterTwoMoves = getPuzzleHistoryAfterDigitInput(
      puzzleHistoryAfterOneMove,
      getBrandedSudokuDigit("2"),
    );
    const puzzleHistoryAfterThreeMoves = getPuzzleHistoryAfterDigitInput(
      puzzleHistoryAfterTwoMoves,
      getBrandedSudokuDigit("3"),
    );

    // Act
    const puzzleHistoryAfterFirstUndo = getPuzzleHistoryAfterUndoingMove(
      puzzleHistoryAfterThreeMoves,
    );
    const puzzleHistoryAfterSecondUndo = getPuzzleHistoryAfterUndoingMove(
      puzzleHistoryAfterFirstUndo,
    );

    // Assert
    expect(puzzleHistoryAfterThreeMoves.boardStateHistory).toHaveLength(4);
    expect(puzzleHistoryAfterFirstUndo.boardStateHistory).toHaveLength(4);
    expect(puzzleHistoryAfterSecondUndo.boardStateHistory).toHaveLength(4);

    expect(puzzleHistoryAfterFirstUndo.currentBoardStateIndex).toBe(2);
    expect(puzzleHistoryAfterSecondUndo.currentBoardStateIndex).toBe(1);

    expect(
      getCurrentBoardStateFromPuzzleHistory(puzzleHistoryAfterSecondUndo),
    ).toEqual(getCurrentBoardStateFromPuzzleHistory(puzzleHistoryAfterOneMove));
  });

  it("does nothing when there are no moves to undo", () => {
    // Arrange
    const boardState = getStartingEmptyBoardState();
    const puzzleHistory: PuzzleHistory = {
      currentBoardStateIndex: 0,
      boardStateHistory: [boardState],
    };

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterUndoingMove(puzzleHistory);

    // Assert
    expect(nextPuzzleHistory.currentBoardStateIndex).toBe(0);
    expect(nextPuzzleHistory.boardStateHistory).toHaveLength(1);
  });
});

describe("Redoing moves", () => {
  it("restores the game to how it looked immediately before the most recent move was undone", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);
    const puzzleHistoryAfterOneMove = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("4"),
    );
    const puzzleHistoryAfterUndo = getPuzzleHistoryAfterUndoingMove(
      puzzleHistoryAfterOneMove,
    );

    // Act
    const puzzleHistoryAfterRedo = getPuzzleHistoryAfterRedoingMove(
      puzzleHistoryAfterUndo,
    );

    // Assert
    expect(puzzleHistoryAfterUndo.currentBoardStateIndex).toBe(0);
    expect(puzzleHistoryAfterRedo.currentBoardStateIndex).toBe(1);
    expect(
      getCurrentBoardStateFromPuzzleHistory(puzzleHistoryAfterRedo),
    ).toEqual(getCurrentBoardStateFromPuzzleHistory(puzzleHistoryAfterOneMove));
  });

  it("can step forwards through multiple undone moves without changing the amount of history that exists", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);
    const puzzleHistoryAfterOneMove = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("1"),
    );
    const puzzleHistoryAfterTwoMoves = getPuzzleHistoryAfterDigitInput(
      puzzleHistoryAfterOneMove,
      getBrandedSudokuDigit("2"),
    );
    const puzzleHistoryAfterThreeMoves = getPuzzleHistoryAfterDigitInput(
      puzzleHistoryAfterTwoMoves,
      getBrandedSudokuDigit("3"),
    );
    const puzzleHistoryAfterUndoingTwice = getPuzzleHistoryAfterUndoingMove(
      getPuzzleHistoryAfterUndoingMove(puzzleHistoryAfterThreeMoves),
    );

    // Act
    const puzzleHistoryAfterFirstRedo = getPuzzleHistoryAfterRedoingMove(
      puzzleHistoryAfterUndoingTwice,
    );
    const puzzleHistoryAfterSecondRedo = getPuzzleHistoryAfterRedoingMove(
      puzzleHistoryAfterFirstRedo,
    );

    // Assert
    expect(puzzleHistoryAfterUndoingTwice.boardStateHistory).toHaveLength(4);
    expect(puzzleHistoryAfterFirstRedo.boardStateHistory).toHaveLength(4);
    expect(puzzleHistoryAfterSecondRedo.boardStateHistory).toHaveLength(4);

    expect(puzzleHistoryAfterFirstRedo.currentBoardStateIndex).toBe(2);
    expect(puzzleHistoryAfterSecondRedo.currentBoardStateIndex).toBe(3);

    expect(
      getCurrentBoardStateFromPuzzleHistory(puzzleHistoryAfterSecondRedo),
    ).toEqual(
      getCurrentBoardStateFromPuzzleHistory(puzzleHistoryAfterThreeMoves),
    );
  });

  it("doesn't restore discarded moves after a new move is made from an earlier point in history", () => {
    // Arrange
    const startingPuzzleHistory =
      getStartingPuzzleHistoryWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(currentBoardState, [
            getBrandedCellNumber(1),
          ]),
      ]);
    const puzzleHistoryAfterOneMove = getPuzzleHistoryAfterDigitInput(
      startingPuzzleHistory,
      getBrandedSudokuDigit("1"),
    );
    const puzzleHistoryAfterTwoMoves = getPuzzleHistoryAfterDigitInput(
      puzzleHistoryAfterOneMove,
      getBrandedSudokuDigit("2"),
    );
    const puzzleHistoryAfterUndo = getPuzzleHistoryAfterUndoingMove(
      puzzleHistoryAfterTwoMoves,
    );
    const branchedPuzzleHistory = getPuzzleHistoryAfterDigitInput(
      puzzleHistoryAfterUndo,
      getBrandedSudokuDigit("3"),
    );

    // Act
    const puzzleHistoryAfterRedo = getPuzzleHistoryAfterRedoingMove(
      branchedPuzzleHistory,
    );
    const currentBoardState = getCurrentBoardStateFromPuzzleHistory(
      puzzleHistoryAfterRedo,
    );

    // Assert
    expect(branchedPuzzleHistory.currentBoardStateIndex).toBe(2);
    expect(branchedPuzzleHistory.boardStateHistory).toHaveLength(3);
    expect(puzzleHistoryAfterRedo.currentBoardStateIndex).toBe(2);
    expect(puzzleHistoryAfterRedo.boardStateHistory).toHaveLength(3);
    expectTargetCellToContainEnteredDigit(
      currentBoardState,
      getBrandedCellNumber(1),
      getBrandedSudokuDigit("3"),
    );
  });

  it("does nothing when there are no undone moves to redo", () => {
    // Arrange
    const boardState = getStartingEmptyBoardState();
    const puzzleHistory: PuzzleHistory = {
      currentBoardStateIndex: 0,
      boardStateHistory: [boardState],
    };

    // Act
    const nextPuzzleHistory = getPuzzleHistoryAfterRedoingMove(puzzleHistory);

    // Assert
    expect(nextPuzzleHistory.currentBoardStateIndex).toBe(0);
    expect(nextPuzzleHistory.boardStateHistory).toHaveLength(1);
  });
});
