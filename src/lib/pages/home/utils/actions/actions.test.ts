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
  isEnteredDigitInCellContent,
  isMarkupDigitsInCellContent,
} from "@/lib/pages/home/utils/guards";
import {
  doesTargetCellContainEmptyCellContent,
  getBoardStateWithEnteredDigitInTargetCell,
  getBoardStateWithGivenDigitInTargetCell,
  getBoardStateWithTargetCellsSelected,
  getGivenDigitInTargetCell,
  getStartingEmptyBoardState,
  getStartingPuzzleStateFromBoardState,
  getTargetCellStateFromBoardState,
} from "@/lib/pages/home/utils/testing";
import { getCurrentBoardStateFromPuzzleState } from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellId,
  type CellState,
  type MarkupColor,
  type PuzzleState,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";
import {
  getBrandedCellId,
  getBrandedSudokuDigit,
} from "@/lib/pages/home/utils/validators/validators";

// #region Puzzle State Update Helpers
const getPuzzleStateAfterStateUpdate = (
  startingPuzzleState: PuzzleState,
  invokePuzzleStateUpdate: (
    setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
  ) => void,
): PuzzleState => {
  let nextPuzzleState = startingPuzzleState;

  const setPuzzleState: Dispatch<SetStateAction<PuzzleState>> = (value) =>
    (nextPuzzleState =
      typeof value === "function" ? value(nextPuzzleState) : value);

  invokePuzzleStateUpdate(setPuzzleState);

  return nextPuzzleState;
};

const getPuzzleStateAfterUndoingMove = (
  puzzleState: PuzzleState,
): PuzzleState => {
  const nextPuzzleState = getPuzzleStateAfterStateUpdate(
    puzzleState,
    (setPuzzleState) => {
      handleUndoMove(setPuzzleState);
    },
  );

  return nextPuzzleState;
};

const getPuzzleStateAfterRedoingMove = (
  puzzleState: PuzzleState,
): PuzzleState => {
  const nextPuzzleState = getPuzzleStateAfterStateUpdate(
    puzzleState,
    (setPuzzleState) => {
      handleRedoMove(setPuzzleState);
    },
  );

  return nextPuzzleState;
};
// #endregion

// #region Board State Composition Helpers
const getBoardStateWithSequentialTransformsApplied = (
  boardStateTransformFunctions: Array<
    (currentBoardState: BoardState) => BoardState
  >,
  startingBoardState?: BoardState,
): BoardState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const transformedBoardState = boardStateTransformFunctions.reduce(
    (currentBoardState, transformBoardState) => {
      const nextBoardState = transformBoardState(currentBoardState);

      return nextBoardState;
    },
    boardState,
  );

  return transformedBoardState;
};

const getStartingPuzzleStateWithSequentialTransformsApplied = (
  boardStateTransformFunctions: Array<
    (currentBoardState: BoardState) => BoardState
  > = [],
): PuzzleState => {
  const startingBoardState = getBoardStateWithSequentialTransformsApplied(
    boardStateTransformFunctions,
  );

  const startingPuzzleState =
    getStartingPuzzleStateFromBoardState(startingBoardState);

  return startingPuzzleState;
};
// #endregion

// #region Action Invocation Helpers
const getPuzzleStateAfterDigitInput = (
  puzzleState: PuzzleState,
  sudokuDigit: SudokuDigit,
): PuzzleState => {
  const nextPuzzleState = getPuzzleStateAfterStateUpdate(
    puzzleState,
    (setPuzzleState) => {
      handleDigitInput(
        puzzleState,
        getBrandedSudokuDigit(sudokuDigit),
        setPuzzleState,
      );
    },
  );

  return nextPuzzleState;
};

const getPuzzleStateAfterCenterMarkupInput = (
  puzzleState: PuzzleState,
  sudokuDigit: SudokuDigit,
): PuzzleState => {
  const nextPuzzleState = getPuzzleStateAfterStateUpdate(
    puzzleState,
    (setPuzzleState) => {
      handleCenterMarkupInput(
        puzzleState,
        getBrandedSudokuDigit(sudokuDigit),
        setPuzzleState,
      );
    },
  );

  return nextPuzzleState;
};

const getPuzzleStateAfterCornerMarkupInput = (
  puzzleState: PuzzleState,
  sudokuDigit: SudokuDigit,
): PuzzleState => {
  const nextPuzzleState = getPuzzleStateAfterStateUpdate(
    puzzleState,
    (setPuzzleState) => {
      handleCornerMarkupInput(
        puzzleState,
        getBrandedSudokuDigit(sudokuDigit),
        setPuzzleState,
      );
    },
  );

  return nextPuzzleState;
};

const getPuzzleStateAfterColorPadInput = (
  puzzleState: PuzzleState,
  markupValue: MarkupColor | SudokuDigit,
): PuzzleState => {
  const nextPuzzleState = getPuzzleStateAfterStateUpdate(
    puzzleState,
    (setPuzzleState) =>
      handleColorPadInput(puzzleState, markupValue, setPuzzleState),
  );

  return nextPuzzleState;
};

const getPuzzleStateAfterClearingSelectedCells = (
  puzzleState: PuzzleState,
): PuzzleState => {
  const nextPuzzleState = getPuzzleStateAfterStateUpdate(
    puzzleState,
    (setPuzzleState) => {
      handleClearCell(puzzleState, setPuzzleState);
    },
  );

  return nextPuzzleState;
};
// #endregion

// #region Board State Cell Content Builders
const getBoardStateWithEmptyCellContentInTargetCell = (
  boardState: BoardState,
  cellId: CellId,
) => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.id === cellId
        ? {
            ...cellState,
            content: {
              emptyCell: "",
            },
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
};

const getBoardStateWithMarkupDigitsInTargetCell = (
  boardState: BoardState,
  cellId: CellId,
  centerMarkups: Array<SudokuDigit>,
  cornerMarkups: Array<SudokuDigit>,
): BoardState => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.id === cellId
        ? {
            ...cellState,
            content: {
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

const getBoardStateWithCenterMarkupsInTargetCell = (
  boardState: BoardState,
  cellId: CellId,
  centerMarkups: Array<SudokuDigit>,
): BoardState => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.id === cellId
        ? {
            ...cellState,
            content: {
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

const getBoardStateWithCornerMarkupsInTargetCell = (
  boardState: BoardState,
  cellId: CellId,
  cornerMarkups: Array<SudokuDigit>,
): BoardState => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.id === cellId
        ? {
            ...cellState,
            content: {
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
// #endregion

// #region Board State Color Builders
const getBoardStateWithMarkupColorsInTargetCell = (
  boardState: BoardState,
  cellId: CellId,
  markupColors: Array<MarkupColor>,
): BoardState => {
  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.id === cellId
        ? {
            ...cellState,
            markupColors: markupColors.length > 0 ? markupColors : [""],
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
};
// #endregion

// #region Cell Content Assertions
const getEnteredDigitInTargetCell = (
  boardState: BoardState,
  cellId: CellId,
): SudokuDigit | undefined => {
  const cellState = getTargetCellStateFromBoardState(cellId, boardState);

  if (!isEnteredDigitInCellContent(cellState.content)) {
    return;
  }

  return cellState.content.enteredDigit;
};

const getCenterMarkupsInTargetCell = (
  boardState: BoardState,
  cellId: CellId,
): [""] | Array<SudokuDigit> | undefined => {
  const cellState = getTargetCellStateFromBoardState(cellId, boardState);

  if (!isMarkupDigitsInCellContent(cellState.content)) {
    return;
  }

  return cellState.content.centerMarkups;
};

const getCornerMarkupsInTargetCell = (
  boardState: BoardState,
  cellId: CellId,
): [""] | Array<SudokuDigit> | undefined => {
  const cellState = getTargetCellStateFromBoardState(cellId, boardState);

  if (!isMarkupDigitsInCellContent(cellState.content)) {
    return;
  }

  return cellState.content.cornerMarkups;
};

const getMarkupColorsInTargetCell = (
  boardState: BoardState,
  cellId: CellId,
): [""] | Array<MarkupColor> => {
  const cellState = getTargetCellStateFromBoardState(cellId, boardState);

  return cellState.markupColors;
};
// #endregion

// #region Puzzle State Assertions
const doesPuzzleStateMatchItsStartingState = (
  nextPuzzleState: PuzzleState,
  startingPuzzleState: PuzzleState,
): boolean => {
  const currentBoardState =
    getCurrentBoardStateFromPuzzleState(nextPuzzleState);
  const startingBoardState =
    getCurrentBoardStateFromPuzzleState(startingPuzzleState);

  return (
    nextPuzzleState.historyIndex === 0 &&
    nextPuzzleState.puzzleHistory.length === 1 &&
    JSON.stringify(currentBoardState) === JSON.stringify(startingBoardState)
  );
};
// #endregion

describe("Digit entry", () => {
  it("fills all selected editable cells with the entered digit when they're empty", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState: BoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2), getBrandedCellId(3)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("4"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(nextPuzzleState.historyIndex).toBe(1);
    expect(nextPuzzleState.puzzleHistory).toHaveLength(2);
    for (const cellId of [
      getBrandedCellId(1),
      getBrandedCellId(2),
      getBrandedCellId(3),
    ]) {
      expect(
        getEnteredDigitInTargetCell(
          currentBoardState,
          getBrandedCellId(cellId),
        ),
      ).toBe(getBrandedSudokuDigit("4"));
    }
  });

  it("replaces a different existing entered digit in selected editable cells", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("2"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("4"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("4"));
  });

  it("replaces markup digits in selected editable cells with the entered digit", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
            [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("5")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("4"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("4"));
  });

  it("preserves color markups in the selected cells when entering a digit", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [MARKUP_COLOR_BLUE, MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("4"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("4"));
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([MARKUP_COLOR_BLUE, MARKUP_COLOR_RED]);
  });

  it("preserves given digits in the selected cells when entering a digit", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("9"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("4"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getGivenDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("9"));
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("4"));
  });

  it("removes the entered digit from all selected editable cells when they already contain it", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("5"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("5"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("5"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    for (const cellId of [getBrandedCellId(1), getBrandedCellId(2)]) {
      expect(
        doesTargetCellContainEmptyCellContent(currentBoardState, cellId),
      ).toBe(true);
    }
  });

  it("removes the entered digit from all selected *editable* cells when all selected cells are either a given digit or already contain it", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("9"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("5"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("5"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getGivenDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("9"));
    expect(
      doesTargetCellContainEmptyCellContent(
        currentBoardState,
        getBrandedCellId(2),
      ),
    ).toBe(true);
  });

  it("sets all selected editable cells to the entered digit when one already contains it and another contains a different editable value", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("5"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [getBrandedSudokuDigit("2")],
            [getBrandedSudokuDigit("3")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("5"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("5"));
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("5"));
  });

  it("leaves unselected cells unchanged when entering a digit", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("2"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("3"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("4"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("4"));
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("3"));
  });

  it("doesn't add a move to the undo/redo history when entering a digit with no cells selected", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied();

    // Act
    const nextPuzzleState = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("4"),
    );

    // Assert
    expect(
      doesPuzzleStateMatchItsStartingState(
        nextPuzzleState,
        startingPuzzleState,
      ),
    ).toBe(true);
  });

  it("doesn't add a move to the undo/redo history when entering a digit doesn't change the board state", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("9"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("4"),
    );

    // Assert
    expect(
      doesPuzzleStateMatchItsStartingState(
        nextPuzzleState,
        startingPuzzleState,
      ),
    ).toBe(true);
  });

  it("discards all undone moves when a new digit is entered after undoing a move", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);
    const puzzleStateAfterOneMove = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("1"),
    );
    const puzzleStateAfterTwoMoves = getPuzzleStateAfterDigitInput(
      puzzleStateAfterOneMove,
      getBrandedSudokuDigit("2"),
    );
    const puzzleStateUndoneToMoveOne = getPuzzleStateAfterUndoingMove(
      puzzleStateAfterTwoMoves,
    );

    // Act
    const branchedHistory = getPuzzleStateAfterDigitInput(
      puzzleStateUndoneToMoveOne,
      getBrandedSudokuDigit("3"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(branchedHistory);

    // Assert
    expect(puzzleStateUndoneToMoveOne.historyIndex).toBe(1);
    expect(puzzleStateUndoneToMoveOne.puzzleHistory).toHaveLength(3);
    expect(branchedHistory.historyIndex).toBe(2);
    expect(branchedHistory.puzzleHistory).toHaveLength(3);
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("3"));
  });
});

describe("Center markup entry", () => {
  it("fills all selected editable cells with the entered center markup when they're empty", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("7")]);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([""]);
  });

  it("adds the entered center markup to a cell that doesn't contain it but contains another center markup", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")]);
  });

  it("adds a center markup only to a cell that doesn't contain it when cells that both contain it and don't contain it are selected", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("7")]);
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")]);
  });

  it("adds the entered center markup only to selected, empty editable cells while leaving selected digit cells unchanged", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("5"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("7")]);
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("5"));
  });

  it("adds the entered center markup to selected editable cells that already contain other center markups while leaving cells that already contain the entered center markup unchanged", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("7")]);
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")]);
  });

  it("adds the entered center markup to selected editable cells with an empty entered digit while leaving selected non-empty entered digit cells unchanged", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("4"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("7")]);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([""]);
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("4"));
  });

  it("adds the entered center markup to selected editable markup cells while preserving their existing corner markups and leaving selected starting digit cells unchanged", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("3")],
            [getBrandedSudokuDigit("5")],
          ),
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("9"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("3"), getBrandedSudokuDigit("7")]);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("5")]);
    expect(
      getGivenDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("9"));
  });

  it("removes the entered center markup from all selected cells when they're editable and already contain it", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) => {
          const nextBoardState: BoardState = currentBoardState.map(
            (cellState) => {
              const nextCellState: CellState =
                cellState.id === 1 || cellState.id === 2
                  ? {
                      ...cellState,
                      content: {
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
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([""]);
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([""]);
  });

  it("removes only the entered center markup from all selected cells when they contain the markup and another center markup", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("2")]);
  });

  it("preserves corner markups in the selected cells when entering a center markup", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("2")],
            [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("4")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")]);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("3"), getBrandedSudokuDigit("4")]);
  });

  it("leaves selected digit cells unchanged when entering a center markup", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("4"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("5"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getGivenDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("4"));
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("5"));
  });

  it("removes the entered center markup from all selected editable cells when all selected cells are either a digit or already contain it", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("4"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("5"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(3),
            [getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2), getBrandedCellId(3)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getGivenDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("4"));
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("5"));
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(3)),
    ).toEqual([""]);
  });

  it("leaves unselected cells unchanged when entering a center markup", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithCenterMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [getBrandedSudokuDigit("3")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")]);
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([getBrandedSudokuDigit("3")]);
  });

  it("doesn't add a move to the undo/redo history when entering a center markup with no cells selected", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied();

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );

    // Assert
    expect(
      doesPuzzleStateMatchItsStartingState(
        nextPuzzleState,
        startingPuzzleState,
      ),
    ).toBe(true);
  });

  it("doesn't add a move to the undo/redo history when entering a center markup doesn't change the board state", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("5"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );

    // Assert
    expect(
      doesPuzzleStateMatchItsStartingState(
        nextPuzzleState,
        startingPuzzleState,
      ),
    ).toBe(true);
  });

  it("discards all undone moves when a new center markup is entered after undoing a move", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);
    const puzzleStateAfterOneMove = getPuzzleStateAfterCenterMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("1"),
    );
    const puzzleStateAfterTwoMoves = getPuzzleStateAfterCenterMarkupInput(
      puzzleStateAfterOneMove,
      getBrandedSudokuDigit("2"),
    );
    const puzzleStateUndoneToMoveOne = getPuzzleStateAfterUndoingMove(
      puzzleStateAfterTwoMoves,
    );

    // Act
    const branchedHistory = getPuzzleStateAfterCenterMarkupInput(
      puzzleStateUndoneToMoveOne,
      getBrandedSudokuDigit("3"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(branchedHistory);

    // Assert
    expect(puzzleStateUndoneToMoveOne.historyIndex).toBe(1);
    expect(puzzleStateUndoneToMoveOne.puzzleHistory).toHaveLength(3);
    expect(branchedHistory.historyIndex).toBe(2);
    expect(branchedHistory.puzzleHistory).toHaveLength(3);
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("1"), getBrandedSudokuDigit("3")]);
  });
});

describe("Corner markup entry", () => {
  it("fills all selected editable cells with the entered corner markup when they're empty", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("3"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([""]);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("3")]);
  });

  it("adds the entered corner markup to a cell that doesn't contain it but contains another corner markup", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")]);
  });

  it("adds a corner markup only to a cell that doesn't contain it when cells that both contain it and don't contain it are selected", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("7")]);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")]);
  });

  it("adds the entered corner markup only to selected, empty editable cells while leaving selected digit cells unchanged", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("5"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("7")]);
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("5"));
  });

  it("adds the entered corner markup to selected editable cells that already contain other corner markups while leaving cells that already contain the entered corner markup unchanged", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("7")]);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")]);
  });

  it("adds the entered corner markup to selected editable cells with an empty entered digit while leaving selected non-empty entered digit cells unchanged", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("4"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([""]);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("7")]);
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("4"));
  });

  it("adds the entered corner markup to selected editable markup cells while preserving their existing center markups and leaving selected given digit cells unchanged", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("3")],
            [getBrandedSudokuDigit("5")],
          ),
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("9"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("3")]);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("5"), getBrandedSudokuDigit("7")]);
    expect(
      getGivenDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("9"));
  });

  it("removes the entered corner markup from all selected cells when they're editable and already contain it", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) => {
          const nextBoardState: BoardState = currentBoardState.map(
            (cellState) => {
              const nextCellState: CellState =
                cellState.id === 1
                  ? {
                      ...cellState,
                      content: {
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
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("3"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([""]);
  });

  it("removes only the entered corner markup from all selected cells when they contain the markup and another corner markup", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("5")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("3"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("5")]);
  });

  it("preserves center markups in the selected cells when entering a corner markup", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("6")],
            [getBrandedSudokuDigit("3")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("2"), getBrandedSudokuDigit("6")]);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("3"), getBrandedSudokuDigit("7")]);
  });

  it("leaves selected digit cells unchanged when entering a corner markup", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("4"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("5"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getGivenDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("4"));
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("5"));
  });

  it("removes the entered corner markup from all selected editable cells when all selected cells are either a digit or already contain it", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("4"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("5"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(3),
            [getBrandedSudokuDigit("7")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2), getBrandedCellId(3)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getGivenDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("4"));
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("5"));
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(3)),
    ).toEqual([""]);
  });

  it("leaves unselected cells unchanged when entering a corner markup", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("2")],
          ),
        (currentBoardState) =>
          getBoardStateWithCornerMarkupsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [getBrandedSudokuDigit("3")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")]);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([getBrandedSudokuDigit("3")]);
  });

  it("doesn't add a move to the undo/redo history when entering a corner markup with no cells selected", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied();

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );

    // Assert
    expect(
      doesPuzzleStateMatchItsStartingState(
        nextPuzzleState,
        startingPuzzleState,
      ),
    ).toBe(true);
  });

  it("doesn't add a move to the undo/redo history when entering a corner markup doesn't change the board state", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("5"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("7"),
    );

    // Assert
    expect(
      doesPuzzleStateMatchItsStartingState(
        nextPuzzleState,
        startingPuzzleState,
      ),
    ).toBe(true);
  });

  it("discards all undone moves when a new corner markup is entered after undoing a move", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);
    const puzzleStateAfterOneMove = getPuzzleStateAfterCornerMarkupInput(
      startingPuzzleState,
      getBrandedSudokuDigit("1"),
    );
    const puzzleStateAfterTwoMoves = getPuzzleStateAfterCornerMarkupInput(
      puzzleStateAfterOneMove,
      getBrandedSudokuDigit("2"),
    );
    const puzzleStateUndoneToMoveOne = getPuzzleStateAfterUndoingMove(
      puzzleStateAfterTwoMoves,
    );

    // Act
    const branchedHistory = getPuzzleStateAfterCornerMarkupInput(
      puzzleStateUndoneToMoveOne,
      getBrandedSudokuDigit("3"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(branchedHistory);

    // Assert
    expect(puzzleStateUndoneToMoveOne.historyIndex).toBe(1);
    expect(puzzleStateUndoneToMoveOne.puzzleHistory).toHaveLength(3);
    expect(branchedHistory.historyIndex).toBe(2);
    expect(branchedHistory.puzzleHistory).toHaveLength(3);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("1"), getBrandedSudokuDigit("3")]);
  });
});

describe("Color markup entry", () => {
  it("adds the keypad color to all selected cells", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterColorPadInput(
      startingPuzzleState,
      MARKUP_COLOR_RED,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([MARKUP_COLOR_RED]);
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([MARKUP_COLOR_RED]);
  });

  it("adds the keyboard shortcut color to all selected cells", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterColorPadInput(
      startingPuzzleState,
      getBrandedSudokuDigit("8"),
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getTargetCellStateFromBoardState(getBrandedCellId(1), currentBoardState)
        .markupColors,
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
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterColorPadInput(
      startingPuzzleState,
      sudokuDigit,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([expectedColor]);
  });

  it("removes the entered color markup when all selected cells already contain it", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterColorPadInput(
      startingPuzzleState,
      MARKUP_COLOR_RED,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([""]);
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([MARKUP_COLOR_BLUE]);
  });

  it("adds the entered color markup to a cell that doesn't contain it but contains another color markup", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterColorPadInput(
      startingPuzzleState,
      MARKUP_COLOR_BLUE,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([MARKUP_COLOR_RED, MARKUP_COLOR_BLUE]);
  });

  it("adds a color markup only to a cell that doesn't contain it when cells that both contain it and don't contain it are selected", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1), getBrandedCellId(2)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterColorPadInput(
      startingPuzzleState,
      MARKUP_COLOR_RED,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([MARKUP_COLOR_RED]);
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([MARKUP_COLOR_BLUE, MARKUP_COLOR_RED]);
  });

  it("preserves a selected given digit when entering a color", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("8"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterColorPadInput(
      startingPuzzleState,
      MARKUP_COLOR_RED,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getGivenDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("8"));
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([MARKUP_COLOR_RED]);
  });

  it("preserves a selected entered digit when entering a color", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("6"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterColorPadInput(
      startingPuzzleState,
      MARKUP_COLOR_RED,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("6"));
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([MARKUP_COLOR_RED]);
  });

  it("preserves selected markup digits when entering a color", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
            [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("5")],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterColorPadInput(
      startingPuzzleState,
      MARKUP_COLOR_BLUE,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")]);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([getBrandedSudokuDigit("3"), getBrandedSudokuDigit("5")]);
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([MARKUP_COLOR_BLUE]);
  });

  it("leaves unselected cells unchanged when entering a color", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState = getPuzzleStateAfterColorPadInput(
      startingPuzzleState,
      MARKUP_COLOR_RED,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([MARKUP_COLOR_BLUE, MARKUP_COLOR_RED]);
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([MARKUP_COLOR_RED]);
  });

  it("doesn't add a move to the undo/redo history when trying to enter a color with no cells selected", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied();

    // Act
    const nextPuzzleState = getPuzzleStateAfterColorPadInput(
      startingPuzzleState,
      MARKUP_COLOR_RED,
    );

    // Assert
    expect(
      doesPuzzleStateMatchItsStartingState(
        nextPuzzleState,
        startingPuzzleState,
      ),
    ).toBe(true);
  });

  it("discards all undone moves when a new color markup is entered after undoing a move", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);
    const puzzleStateAfterOneMove = getPuzzleStateAfterColorPadInput(
      startingPuzzleState,
      MARKUP_COLOR_BLUE,
    );
    const puzzleStateAfterTwoMoves = getPuzzleStateAfterColorPadInput(
      puzzleStateAfterOneMove,
      MARKUP_COLOR_RED,
    );
    const puzzleStateUndoneToMoveOne = getPuzzleStateAfterUndoingMove(
      puzzleStateAfterTwoMoves,
    );

    // Act
    const branchedHistory = getPuzzleStateAfterColorPadInput(
      puzzleStateUndoneToMoveOne,
      MARKUP_COLOR_GREEN,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(branchedHistory);

    // Assert
    expect(puzzleStateUndoneToMoveOne.historyIndex).toBe(1);
    expect(puzzleStateUndoneToMoveOne.puzzleHistory).toHaveLength(3);
    expect(branchedHistory.historyIndex).toBe(2);
    expect(branchedHistory.puzzleHistory).toHaveLength(3);
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([MARKUP_COLOR_BLUE, MARKUP_COLOR_GREEN]);
  });
});

describe("Clearing selected cells", () => {
  it("removes all digits and all center, corner, and color markups from all selected editable cells while leaving given digit cells unchanged", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("6"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [getBrandedSudokuDigit("2"), getBrandedSudokuDigit("7")],
            [getBrandedSudokuDigit("3"), getBrandedSudokuDigit("5")],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(3),
            [MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            getBrandedCellId(4),
            getBrandedSudokuDigit("7"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [
              getBrandedCellId(1),
              getBrandedCellId(2),
              getBrandedCellId(3),
              getBrandedCellId(4),
            ],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState =
      getPuzzleStateAfterClearingSelectedCells(startingPuzzleState);
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      doesTargetCellContainEmptyCellContent(
        currentBoardState,
        getBrandedCellId(1),
      ),
    ).toBe(true);
    expect(
      doesTargetCellContainEmptyCellContent(
        currentBoardState,
        getBrandedCellId(2),
      ),
    ).toBe(true);
    expect(
      doesTargetCellContainEmptyCellContent(
        currentBoardState,
        getBrandedCellId(3),
      ),
    ).toBe(true);

    expect(
      getGivenDigitInTargetCell(currentBoardState, getBrandedCellId(4)),
    ).toBe(getBrandedSudokuDigit("7"));

    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([""]);
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([""]);
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(3)),
    ).toEqual([""]);
  });

  it("clears just colors and not digits from selected given digit cells", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithGivenDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("8"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState =
      getPuzzleStateAfterClearingSelectedCells(startingPuzzleState);
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      getGivenDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("8"));
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([""]);
  });

  it("clears digits and colors from selected editable cells that contain both while leaving other cells unchanged", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("6"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [MARKUP_COLOR_RED, MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(2),
            getBrandedSudokuDigit("4"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [MARKUP_COLOR_GREEN],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState =
      getPuzzleStateAfterClearingSelectedCells(startingPuzzleState);
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      doesTargetCellContainEmptyCellContent(
        currentBoardState,
        getBrandedCellId(1),
      ),
    ).toBe(true);
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([""]);

    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toBe(getBrandedSudokuDigit("4"));
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([MARKUP_COLOR_GREEN]);
  });

  it("leaves unselected cells unchanged when clearing selected cells", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEnteredDigitInTargetCell(
            getBrandedCellId(1),
            getBrandedSudokuDigit("6"),
            currentBoardState,
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
            [MARKUP_COLOR_RED],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupDigitsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [getBrandedSudokuDigit("2")],
            [getBrandedSudokuDigit("3")],
          ),
        (currentBoardState) =>
          getBoardStateWithMarkupColorsInTargetCell(
            currentBoardState,
            getBrandedCellId(2),
            [MARKUP_COLOR_BLUE],
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState =
      getPuzzleStateAfterClearingSelectedCells(startingPuzzleState);
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(nextPuzzleState);

    // Assert
    expect(
      doesTargetCellContainEmptyCellContent(
        currentBoardState,
        getBrandedCellId(1),
      ),
    ).toBe(true);
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([""]);

    expect(
      getCenterMarkupsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([getBrandedSudokuDigit("2")]);
    expect(
      getCornerMarkupsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([getBrandedSudokuDigit("3")]);
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(2)),
    ).toEqual([MARKUP_COLOR_BLUE]);
  });

  it("doesn't add a move to the undo/redo history when clearing selected cells with no cells selected", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied();

    // Act
    const nextPuzzleState =
      getPuzzleStateAfterClearingSelectedCells(startingPuzzleState);

    // Assert
    expect(
      doesPuzzleStateMatchItsStartingState(
        nextPuzzleState,
        startingPuzzleState,
      ),
    ).toBe(true);
  });

  it("doesn't add a move to the undo/redo history when clearing cells doesn't change the board state", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithEmptyCellContentInTargetCell(
            currentBoardState,
            getBrandedCellId(1),
          ),
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);

    // Act
    const nextPuzzleState =
      getPuzzleStateAfterClearingSelectedCells(startingPuzzleState);

    // Assert
    expect(
      doesPuzzleStateMatchItsStartingState(
        nextPuzzleState,
        startingPuzzleState,
      ),
    ).toBe(true);
  });

  it("discards all undone moves when selected cells are cleared after undoing a move", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);
    const puzzleStateAfterOneMove = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("1"),
    );
    const puzzleStateAfterTwoMoves = getPuzzleStateAfterColorPadInput(
      puzzleStateAfterOneMove,
      MARKUP_COLOR_RED,
    );
    const puzzleStateUndoneToMoveOne = getPuzzleStateAfterUndoingMove(
      puzzleStateAfterTwoMoves,
    );

    // Act
    const branchedHistory = getPuzzleStateAfterClearingSelectedCells(
      puzzleStateUndoneToMoveOne,
    );
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(branchedHistory);

    // Assert
    expect(puzzleStateUndoneToMoveOne.historyIndex).toBe(1);
    expect(puzzleStateUndoneToMoveOne.puzzleHistory).toHaveLength(3);
    expect(branchedHistory.historyIndex).toBe(2);
    expect(branchedHistory.puzzleHistory).toHaveLength(3);
    expect(
      doesTargetCellContainEmptyCellContent(
        currentBoardState,
        getBrandedCellId(1),
      ),
    ).toBe(true);
    expect(
      getMarkupColorsInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toEqual([""]);
  });
});

describe("Undoing moves", () => {
  it("returns the game to how it looked immediately before the most recent move was taken", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);
    const puzzleStateAfterOneMove = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("4"),
    );
    const puzzleStateAfterTwoMoves = getPuzzleStateAfterDigitInput(
      puzzleStateAfterOneMove,
      getBrandedSudokuDigit("7"),
    );

    // Act
    const puzzleStateAfterUndo = getPuzzleStateAfterUndoingMove(
      puzzleStateAfterTwoMoves,
    );

    // Assert
    expect(puzzleStateAfterTwoMoves.historyIndex).toBe(2);
    expect(puzzleStateAfterUndo.historyIndex).toBe(1);
    expect(getCurrentBoardStateFromPuzzleState(puzzleStateAfterUndo)).toEqual(
      getCurrentBoardStateFromPuzzleState(puzzleStateAfterOneMove),
    );
  });

  it("can step backwards through multiple earlier moves without changing the amount of undo/redo history that exists", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);
    const puzzleStateAfterOneMove = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("1"),
    );
    const puzzleStateAfterTwoMoves = getPuzzleStateAfterDigitInput(
      puzzleStateAfterOneMove,
      getBrandedSudokuDigit("2"),
    );
    const puzzleStateAfterThreeMoves = getPuzzleStateAfterDigitInput(
      puzzleStateAfterTwoMoves,
      getBrandedSudokuDigit("3"),
    );

    // Act
    const puzzleStateAfterFirstUndo = getPuzzleStateAfterUndoingMove(
      puzzleStateAfterThreeMoves,
    );
    const puzzleStateAfterSecondUndo = getPuzzleStateAfterUndoingMove(
      puzzleStateAfterFirstUndo,
    );

    // Assert
    expect(puzzleStateAfterThreeMoves.puzzleHistory).toHaveLength(4);
    expect(puzzleStateAfterFirstUndo.puzzleHistory).toHaveLength(4);
    expect(puzzleStateAfterSecondUndo.puzzleHistory).toHaveLength(4);

    expect(puzzleStateAfterFirstUndo.historyIndex).toBe(2);
    expect(puzzleStateAfterSecondUndo.historyIndex).toBe(1);

    expect(
      getCurrentBoardStateFromPuzzleState(puzzleStateAfterSecondUndo),
    ).toEqual(getCurrentBoardStateFromPuzzleState(puzzleStateAfterOneMove));
  });

  it("does nothing when there are no moves to undo", () => {
    // Arrange
    const boardState = getStartingEmptyBoardState();
    const puzzleState: PuzzleState = {
      historyIndex: 0,
      puzzleHistory: [boardState],
    };

    // Act
    const nextPuzzleState = getPuzzleStateAfterUndoingMove(puzzleState);

    // Assert
    expect(nextPuzzleState.historyIndex).toBe(0);
    expect(nextPuzzleState.puzzleHistory).toHaveLength(1);
  });
});

describe("Redoing moves", () => {
  it("restores the game to how it looked immediately before the most recent move was undone", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);
    const puzzleStateAfterOneMove = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("4"),
    );
    const puzzleStateAfterUndo = getPuzzleStateAfterUndoingMove(
      puzzleStateAfterOneMove,
    );

    // Act
    const puzzleStateAfterRedo =
      getPuzzleStateAfterRedoingMove(puzzleStateAfterUndo);

    // Assert
    expect(puzzleStateAfterUndo.historyIndex).toBe(0);
    expect(puzzleStateAfterRedo.historyIndex).toBe(1);
    expect(getCurrentBoardStateFromPuzzleState(puzzleStateAfterRedo)).toEqual(
      getCurrentBoardStateFromPuzzleState(puzzleStateAfterOneMove),
    );
  });

  it("can step forwards through multiple undone moves without changing the amount of undo/redohistory that exists", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);
    const puzzleStateAfterOneMove = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("1"),
    );
    const puzzleStateAfterTwoMoves = getPuzzleStateAfterDigitInput(
      puzzleStateAfterOneMove,
      getBrandedSudokuDigit("2"),
    );
    const puzzleStateAfterThreeMoves = getPuzzleStateAfterDigitInput(
      puzzleStateAfterTwoMoves,
      getBrandedSudokuDigit("3"),
    );
    const puzzleStateAfterUndoingTwice = getPuzzleStateAfterUndoingMove(
      getPuzzleStateAfterUndoingMove(puzzleStateAfterThreeMoves),
    );

    // Act
    const puzzleStateAfterFirstRedo = getPuzzleStateAfterRedoingMove(
      puzzleStateAfterUndoingTwice,
    );
    const puzzleStateAfterSecondRedo = getPuzzleStateAfterRedoingMove(
      puzzleStateAfterFirstRedo,
    );

    // Assert
    expect(puzzleStateAfterUndoingTwice.puzzleHistory).toHaveLength(4);
    expect(puzzleStateAfterFirstRedo.puzzleHistory).toHaveLength(4);
    expect(puzzleStateAfterSecondRedo.puzzleHistory).toHaveLength(4);

    expect(puzzleStateAfterFirstRedo.historyIndex).toBe(2);
    expect(puzzleStateAfterSecondRedo.historyIndex).toBe(3);

    expect(
      getCurrentBoardStateFromPuzzleState(puzzleStateAfterSecondRedo),
    ).toEqual(getCurrentBoardStateFromPuzzleState(puzzleStateAfterThreeMoves));
  });

  it("doesn't restore discarded moves after a new move is made from an earlier point in the undo/redo history", () => {
    // Arrange
    const startingPuzzleState =
      getStartingPuzzleStateWithSequentialTransformsApplied([
        (currentBoardState) =>
          getBoardStateWithTargetCellsSelected(
            [getBrandedCellId(1)],
            currentBoardState,
          ),
      ]);
    const puzzleStateAfterOneMove = getPuzzleStateAfterDigitInput(
      startingPuzzleState,
      getBrandedSudokuDigit("1"),
    );
    const puzzleStateAfterTwoMoves = getPuzzleStateAfterDigitInput(
      puzzleStateAfterOneMove,
      getBrandedSudokuDigit("2"),
    );
    const puzzleStateAfterUndo = getPuzzleStateAfterUndoingMove(
      puzzleStateAfterTwoMoves,
    );
    const branchedPuzzleState = getPuzzleStateAfterDigitInput(
      puzzleStateAfterUndo,
      getBrandedSudokuDigit("3"),
    );

    // Act
    const puzzleStateAfterRedo =
      getPuzzleStateAfterRedoingMove(branchedPuzzleState);
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(puzzleStateAfterRedo);

    // Assert
    expect(branchedPuzzleState.historyIndex).toBe(2);
    expect(branchedPuzzleState.puzzleHistory).toHaveLength(3);
    expect(puzzleStateAfterRedo.historyIndex).toBe(2);
    expect(puzzleStateAfterRedo.puzzleHistory).toHaveLength(3);
    expect(
      getEnteredDigitInTargetCell(currentBoardState, getBrandedCellId(1)),
    ).toBe(getBrandedSudokuDigit("3"));
  });

  it("does nothing when there are no undone moves to redo", () => {
    // Arrange
    const boardState = getStartingEmptyBoardState();
    const puzzleState: PuzzleState = {
      historyIndex: 0,
      puzzleHistory: [boardState],
    };

    // Act
    const nextPuzzleState = getPuzzleStateAfterRedoingMove(puzzleState);

    // Assert
    expect(nextPuzzleState.historyIndex).toBe(0);
    expect(nextPuzzleState.puzzleHistory).toHaveLength(1);
  });
});
