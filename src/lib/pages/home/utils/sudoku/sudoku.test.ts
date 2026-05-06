import { describe, expect, it } from "vitest";

import { TOTAL_CELLS_IN_BOARD } from "@/lib/pages/home/utils/constants";
import {
  getDifficultyLevelFromRating,
  getDifficultyLevelFromRawBoardState,
  makePuzzle,
  ratePuzzleDifficulty,
  solvePuzzle,
} from "@/lib/pages/home/utils/sudoku/sudoku";
import { type RawBoardState } from "@/lib/pages/home/utils/types";
import { isRawGivenDigit } from "@/lib/pages/home/utils/validators/validators";

// #region Test Helpers
const buildRawBoardState = (
  overrides: Partial<Record<number, number | null>> = {},
): RawBoardState => {
  const base: RawBoardState = Array.from(
    { length: TOTAL_CELLS_IN_BOARD },
    () => null,
  );

  for (const [index, value] of Object.entries(overrides)) {
    const cellValue = value ?? null;
    (base as Array<number | null>)[Number(index)] = cellValue;
  }

  return base;
};

// A known valid solved sudoku (0-indexed digits, i.e. raw format: digit - 1)
// Original: 123456789 456789123 789123456 214365897 365897214 897214365 531642978 642978531 978531642
const SOLVED_RAW_BOARD_STATE: RawBoardState = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 0, 1, 2, 6, 7, 8, 0, 1, 2, 3, 4,
  5, 1, 0, 3, 2, 5, 4, 7, 8, 6, 2, 5, 4, 7, 8, 6, 1, 0, 3, 7, 8, 6, 1, 0, 3, 2,
  5, 4, 4, 2, 0, 5, 3, 1, 8, 6, 7, 5, 3, 1, 8, 6, 7, 4, 2, 0, 8, 6, 7, 4, 2, 0,
  5, 3, 1,
] as RawBoardState;

// Solvable puzzle: solved state with first 50 cells cleared.
// Note: this puzzle has multiple valid solutions because 31 clues do not
// uniquely determine a sudoku board. The deterministic MRV solver always
// returns the same solution for the same input.
const SOLVABLE_PUZZLE_BOARD_STATE: RawBoardState = (() => {
  const board = [...SOLVED_RAW_BOARD_STATE] as RawBoardState;

  for (let i = 0; i < 50; i++) {
    board[i] = null;
  }

  return board;
})();

const canPuzzleCellHaveAlternativeSolution = (
  puzzle: RawBoardState,
  cellPosition: number,
  solutionDigit: number,
): boolean => {
  const givenClueOverrides: Partial<Record<number, number | null>> = {};

  for (let position = 0; position < TOTAL_CELLS_IN_BOARD; position++) {
    if (puzzle[position] !== null) {
      givenClueOverrides[position] = puzzle[position];
    }
  }

  for (const alternativeDigit of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
    if (alternativeDigit === solutionDigit) {
      continue;
    }

    const testPuzzle = buildRawBoardState({
      ...givenClueOverrides,
      [cellPosition]: alternativeDigit,
    });

    if (solvePuzzle(testPuzzle) !== null) {
      return true;
    }
  }

  return false;
};
// #endregion

describe("makePuzzle", () => {
  it("returns a board state with exactly 81 cells", () => {
    // Act
    const rawBoardState = makePuzzle(0);

    // Assert
    expect(rawBoardState).toHaveLength(TOTAL_CELLS_IN_BOARD);
  });

  it("returns a board state where all non-null cells are valid raw given digits", () => {
    // Act
    const rawBoardState = makePuzzle(0);

    // Assert
    for (const cell of rawBoardState) {
      if (cell !== null) {
        expect(isRawGivenDigit(cell)).toBe(true);
      }
    }
  });

  it("returns a board state with at least one given digit (non-null cell)", () => {
    // Act
    const rawBoardState = makePuzzle(0);

    // Assert
    const givenDigitCount = rawBoardState.filter(
      (cell) => cell !== null,
    ).length;

    expect(givenDigitCount).toBeGreaterThan(0);
  });

  it("returns a solvable puzzle", () => {
    // Act
    const generatedPuzzle = makePuzzle(0);
    const solution = solvePuzzle(generatedPuzzle);

    // Assert
    expect(solution).not.toBeNull();
  });

  it("returns a puzzle whose rating matches the target difficulty rating when targeting Standard", () => {
    // Act
    const puzzle = makePuzzle(0);

    // Assert
    expect(ratePuzzleDifficulty(puzzle)).toBe(0);
  });

  it("returns a valid puzzle when the target difficulty rating is not achievable within the attempt limit", () => {
    // Act — targeting a rating that is never produced in practice; the fallback returns the lowest-rated puzzle
    const puzzle = makePuzzle(999);

    // Assert
    expect(puzzle).toHaveLength(TOTAL_CELLS_IN_BOARD);
    expect(solvePuzzle(puzzle)).not.toBeNull();
  });

  it("returns a puzzle with a unique solution", () => {
    // Arrange
    const puzzle = makePuzzle(0);
    const solution = solvePuzzle(puzzle);

    // Assert
    expect(solution).not.toBeNull();
    if (solution === null) {
      return;
    }

    for (
      let cellPosition = 0;
      cellPosition < TOTAL_CELLS_IN_BOARD;
      cellPosition++
    ) {
      if (puzzle[cellPosition] !== null) {
        continue;
      }

      const solutionDigit = solution[cellPosition];
      if (solutionDigit === null) {
        continue;
      }

      expect(
        canPuzzleCellHaveAlternativeSolution(
          puzzle,
          cellPosition,
          solutionDigit,
        ),
      ).toBe(false);
    }
  });
});

describe("solvePuzzle", () => {
  it("returns null for an unsolvable board state", () => {
    // Arrange
    const unsolvableBoard = buildRawBoardState({ 0: 0, 1: 0 });

    // Act
    const solution = solvePuzzle(unsolvableBoard);

    // Assert
    expect(solution).toBeNull();
  });

  it("returns a full board state with 81 non-null cells when given a solvable puzzle", () => {
    // Arrange
    const rawBoardState = SOLVABLE_PUZZLE_BOARD_STATE;

    // Act
    const solution = solvePuzzle(rawBoardState);

    // Assert
    expect(solution).not.toBeNull();
    if (solution === null) {
      return;
    }

    expect(solution).toHaveLength(TOTAL_CELLS_IN_BOARD);

    for (const cell of solution) {
      expect(cell).not.toBeNull();
      if (cell === null) {
        continue;
      }
      expect(isRawGivenDigit(cell)).toBe(true);
    }
  });

  it("returns a board state where given clues are preserved in the solution", () => {
    // Arrange
    const rawBoardState = SOLVABLE_PUZZLE_BOARD_STATE;
    const givenCells = SOLVED_RAW_BOARD_STATE.slice(50);

    // Act
    const solution = solvePuzzle(rawBoardState);

    // Assert
    expect(solution).not.toBeNull();
    if (solution === null) {
      return;
    }

    for (let i = 50; i < TOTAL_CELLS_IN_BOARD; i++) {
      expect(solution[i]).toBe(givenCells[i - 50]);
    }
  });

  it("returns a board state with all digits 0-8 represented in each row of the solution", () => {
    // Arrange
    const rawBoardState = makePuzzle(0);

    // Act
    const solution = solvePuzzle(rawBoardState);

    // Assert
    expect(solution).not.toBeNull();
    if (solution === null) {
      return;
    }
    for (let row = 0; row < 9; row++) {
      const rowDigits = new Set(solution.slice(row * 9, row * 9 + 9));

      expect(rowDigits.size).toBe(9);
    }
  });

  it("returns the same solution on repeated calls with the same board state", () => {
    // Arrange
    const rawBoardState = SOLVABLE_PUZZLE_BOARD_STATE;

    // Act
    const firstSolution = solvePuzzle(rawBoardState);
    const secondSolution = solvePuzzle(rawBoardState);

    // Assert
    expect(firstSolution).not.toBeNull();
    expect(firstSolution).toEqual(secondSolution);
  });
});

describe("ratePuzzleDifficulty", () => {
  it("returns 0 for a fully given board solvable by deduction alone", () => {
    // Arrange
    const rawBoardState = SOLVED_RAW_BOARD_STATE;

    // Act
    const rating = ratePuzzleDifficulty(rawBoardState);

    // Assert
    expect(rating).toBe(0);
  });

  it("returns a rating greater than 0 for a board with many empty cells", () => {
    // Arrange
    const allEmptyBoard: RawBoardState = Array.from(
      { length: TOTAL_CELLS_IN_BOARD },
      () => null,
    );

    // Act
    const rating = ratePuzzleDifficulty(allEmptyBoard);

    // Assert
    expect(rating).toBeGreaterThan(0);
  });
});

describe("getDifficultyLevelFromRating", () => {
  it("returns 'Standard' for a rating of 0", () => {
    // Act
    const puzzleDifficultyLevel = getDifficultyLevelFromRating(0);

    // Assert
    expect(puzzleDifficultyLevel).toBe("Standard");
  });

  it("returns 'Intermediate' for a rating of 1", () => {
    // Act
    const puzzleDifficultyLevel = getDifficultyLevelFromRating(1);

    // Assert
    expect(puzzleDifficultyLevel).toBe("Intermediate");
  });

  it("returns 'Advanced' for a rating of 2", () => {
    // Act
    const puzzleDifficultyLevel = getDifficultyLevelFromRating(2);

    // Assert
    expect(puzzleDifficultyLevel).toBe("Advanced");
  });

  it("returns 'Expert' for a rating of 3", () => {
    // Act
    const puzzleDifficultyLevel = getDifficultyLevelFromRating(3);

    // Assert
    expect(puzzleDifficultyLevel).toBe("Expert");
  });

  it("returns 'Expert' for a rating greater than 3", () => {
    // Act
    const puzzleDifficultyLevel = getDifficultyLevelFromRating(10);

    // Assert
    expect(puzzleDifficultyLevel).toBe("Expert");
  });

  it("returns 'Standard' for a negative rating", () => {
    // Act
    const puzzleDifficultyLevel = getDifficultyLevelFromRating(-1);

    // Assert
    expect(puzzleDifficultyLevel).toBe("Standard");
  });
});

describe("getDifficultyLevelFromRawBoardState", () => {
  it("returns 'Standard' for a fully given board solvable by deduction alone", () => {
    // Arrange
    const rawBoardState = SOLVED_RAW_BOARD_STATE;

    // Act
    const puzzleDifficultyLevel =
      getDifficultyLevelFromRawBoardState(rawBoardState);

    // Assert
    expect(puzzleDifficultyLevel).toBe("Standard");
  });

  it("returns 'Expert' for a board with a very high computed difficulty rating", () => {
    // Arrange
    const allEmptyBoard: RawBoardState = Array.from(
      { length: TOTAL_CELLS_IN_BOARD },
      () => null,
    );

    // Act
    const puzzleDifficultyLevel =
      getDifficultyLevelFromRawBoardState(allEmptyBoard);

    // Assert
    expect(puzzleDifficultyLevel).toBe("Expert");
  });
});
