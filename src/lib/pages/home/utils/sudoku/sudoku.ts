import sudoku from "sudoku";

import {
  CELLS_PER_HOUSE,
  puzzleDifficultyLevels,
  TOTAL_CELLS_IN_BOARD,
} from "@/lib/pages/home/utils/constants";
import {
  type PuzzleDifficultyLevel,
  type RawBoardState,
} from "@/lib/pages/home/utils/types";
import { isRawGivenDigit } from "@/lib/pages/home/utils/validators/validators";

const POSSIBLE_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

type CellPossibilityMap = Array<Set<number>>;

// #region Board Geometry and Possibility Initialization
const buildInitialCellPossibilities = (
  rawBoardState: RawBoardState,
): CellPossibilityMap => {
  const initialCellPossibilities: CellPossibilityMap = rawBoardState.map(
    (cell) => {
      if (cell === null) {
        return new Set(POSSIBLE_DIGITS);
      }

      return new Set([cell]);
    },
  );

  return initialCellPossibilities;
};

const getRowIndexFromCellPosition = (cellPosition: number): number =>
  Math.floor(cellPosition / CELLS_PER_HOUSE);

const getColumnIndexFromCellPosition = (cellPosition: number): number =>
  cellPosition % CELLS_PER_HOUSE;

const getBoxIndexFromCellPosition = (cellPosition: number): number => {
  const rowIndex = getRowIndexFromCellPosition(cellPosition);
  const columnIndex = getColumnIndexFromCellPosition(cellPosition);
  return Math.floor(rowIndex / 3) * 3 + Math.floor(columnIndex / 3);
};

const getAllCellsInRow = (rowIndex: number): Array<number> =>
  Array.from(
    { length: CELLS_PER_HOUSE },
    (_, column) => rowIndex * CELLS_PER_HOUSE + column,
  );

const getAllCellsInColumn = (columnIndex: number): Array<number> =>
  Array.from(
    { length: CELLS_PER_HOUSE },
    (_, rowIndex) => rowIndex * CELLS_PER_HOUSE + columnIndex,
  );

const getAllCellsInBox = (boxIndex: number): Array<number> => {
  const startRow = Math.floor(boxIndex / 3) * 3;
  const startColumn = (boxIndex % 3) * 3;

  return Array.from({ length: 3 }, (_, rowOffset) =>
    Array.from(
      { length: 3 },
      (_, columnOffset) =>
        (startRow + rowOffset) * CELLS_PER_HOUSE + (startColumn + columnOffset),
    ),
  ).flat();
};
// #endregion

// #region Constraint Propagation
const isDigitRemovalFromCellsInGroupSuccessful = (
  excludedCellPosition: number,
  digit: number,
  groupCellPositions: Array<number>,
  cellPossibilitiesByPosition: CellPossibilityMap,
): boolean => {
  for (const cellPosition of groupCellPositions) {
    if (
      cellPosition !== excludedCellPosition &&
      cellPossibilitiesByPosition[cellPosition].has(digit)
    ) {
      cellPossibilitiesByPosition[cellPosition].delete(digit);

      if (cellPossibilitiesByPosition[cellPosition].size === 0) {
        return false;
      }
    }
  }

  return true;
};

const isDigitRemovalFromPeerCellPossibilitiesSuccessful = (
  targetCellPosition: number,
  digit: number,
  cellPossibilitiesByPosition: CellPossibilityMap,
): boolean => {
  const rowIndex = getRowIndexFromCellPosition(targetCellPosition);
  const columnIndex = getColumnIndexFromCellPosition(targetCellPosition);
  const boxIndex = getBoxIndexFromCellPosition(targetCellPosition);

  return (
    isDigitRemovalFromCellsInGroupSuccessful(
      targetCellPosition,
      digit,
      getAllCellsInRow(rowIndex),
      cellPossibilitiesByPosition,
    ) &&
    isDigitRemovalFromCellsInGroupSuccessful(
      targetCellPosition,
      digit,
      getAllCellsInColumn(columnIndex),
      cellPossibilitiesByPosition,
    ) &&
    isDigitRemovalFromCellsInGroupSuccessful(
      targetCellPosition,
      digit,
      getAllCellsInBox(boxIndex),
      cellPossibilitiesByPosition,
    )
  );
};

const isSingleDigitPlacementEnforcementInGroupSuccessful = (
  groupCellPositions: Array<number>,
  cellPossibilitiesByPosition: CellPossibilityMap,
): boolean => {
  for (const digit of POSSIBLE_DIGITS) {
    let possibleCellCountForDigit = 0;
    let lastPossibleCellPositionForDigit = -1;

    for (const cellPosition of groupCellPositions) {
      if (cellPossibilitiesByPosition[cellPosition].has(digit)) {
        possibleCellCountForDigit++;
        lastPossibleCellPositionForDigit = cellPosition;
      }
    }

    if (
      possibleCellCountForDigit === 1 &&
      cellPossibilitiesByPosition[lastPossibleCellPositionForDigit].size > 1
    ) {
      cellPossibilitiesByPosition[lastPossibleCellPositionForDigit] = new Set([
        digit,
      ]);
    } else if (possibleCellCountForDigit === 0) {
      return false;
    }
  }

  return true;
};

const isSingleDigitCellConstraintResolutionSuccessful = (
  cellPossibilitiesByPosition: CellPossibilityMap,
): boolean =>
  Array.from(
    { length: TOTAL_CELLS_IN_BOARD },
    (_, cellPosition) => cellPosition,
  ).every((cellPosition) => {
    if (cellPossibilitiesByPosition[cellPosition].size === 0) {
      return false;
    }

    if (cellPossibilitiesByPosition[cellPosition].size === 1) {
      const [digit] = cellPossibilitiesByPosition[cellPosition];

      return isDigitRemovalFromPeerCellPossibilitiesSuccessful(
        cellPosition,
        digit,
        cellPossibilitiesByPosition,
      );
    }

    return true;
  });

const isGroupConstraintResolutionSuccessful = (
  cellPossibilitiesByPosition: CellPossibilityMap,
): boolean =>
  Array.from({ length: CELLS_PER_HOUSE }, (_, groupIndex) => groupIndex).every(
    (groupIndex) =>
      isSingleDigitPlacementEnforcementInGroupSuccessful(
        getAllCellsInRow(groupIndex),
        cellPossibilitiesByPosition,
      ) &&
      isSingleDigitPlacementEnforcementInGroupSuccessful(
        getAllCellsInColumn(groupIndex),
        cellPossibilitiesByPosition,
      ) &&
      isSingleDigitPlacementEnforcementInGroupSuccessful(
        getAllCellsInBox(groupIndex),
        cellPossibilitiesByPosition,
      ),
  );

const countCellsWithMultipleCandidateDigits = (
  cellPossibilitiesByPosition: CellPossibilityMap,
): number =>
  cellPossibilitiesByPosition.filter(
    (cellPossibilities) => cellPossibilities.size > 1,
  ).length;

const isConstraintPropagationSuccessful = (
  cellPossibilitiesByPosition: CellPossibilityMap,
): boolean => {
  let currentUnresolvedCellCount = countCellsWithMultipleCandidateDigits(
    cellPossibilitiesByPosition,
  );

  while (true) {
    if (
      !isSingleDigitCellConstraintResolutionSuccessful(
        cellPossibilitiesByPosition,
      )
    ) {
      return false;
    }

    if (!isGroupConstraintResolutionSuccessful(cellPossibilitiesByPosition)) {
      return false;
    }

    const updatedUnresolvedCellCount = countCellsWithMultipleCandidateDigits(
      cellPossibilitiesByPosition,
    );

    if (updatedUnresolvedCellCount === currentUnresolvedCellCount) {
      return true;
    }

    currentUnresolvedCellCount = updatedUnresolvedCellCount;
  }
};
// #endregion

// #region Difficulty Evaluation
const isPuzzleSolvableByDeductionOnly = (
  rawBoardState: RawBoardState,
): boolean => {
  const cellPossibilitiesByPosition =
    buildInitialCellPossibilities(rawBoardState);

  if (!isConstraintPropagationSuccessful(cellPossibilitiesByPosition)) {
    return false;
  }

  for (const cellPossibilities of cellPossibilitiesByPosition) {
    if (cellPossibilities.size !== 1) {
      return false;
    }
  }

  return true;
};

export const ratePuzzleDifficulty = (rawBoardState: RawBoardState): number => {
  if (isPuzzleSolvableByDeductionOnly(rawBoardState)) {
    return 0;
  }

  const numberOfGivenDigits = rawBoardState.filter(
    (cell) => cell !== null,
  ).length;

  const emptyCells = TOTAL_CELLS_IN_BOARD - numberOfGivenDigits;

  const puzzleDifficulty = Math.max(1, Math.ceil(emptyCells / 4));

  return puzzleDifficulty;
};
// #endregion

// #region Sudoku Package Validation
const validateAndNormalizeBoardState = (
  unvalidatedBoardState: unknown,
  sourceSudokuFunctionName: "makepuzzle" | "solvepuzzle",
): RawBoardState => {
  if (!Array.isArray(unvalidatedBoardState)) {
    throw new Error(
      `Failed to validate output from ${sourceSudokuFunctionName}. Expected an array output.`,
    );
  }

  if (unvalidatedBoardState.length !== TOTAL_CELLS_IN_BOARD) {
    throw new Error(
      `Failed to validate output from ${sourceSudokuFunctionName}. Expected 81 cells but received ${unvalidatedBoardState.length}.`,
    );
  }

  const validatedBoardState = unvalidatedBoardState.map(
    (unvalidatedCell, cellIndex) => {
      if (unvalidatedCell === null) {
        return null;
      }

      if (!isRawGivenDigit(unvalidatedCell)) {
        throw new Error(
          `Failed to validate output from ${sourceSudokuFunctionName}. Encountered invalid cell value at index ${cellIndex}: ${String(unvalidatedCell)}.`,
        );
      }

      return unvalidatedCell;
    },
  );

  return validatedBoardState;
};
// #endregion

// #region Puzzle Generation Strategy
const generateValidatedPuzzleAttempt = (): RawBoardState => {
  const unvalidatedBoardState = sudoku.makepuzzle();

  const validatedBoardState = validateAndNormalizeBoardState(
    unvalidatedBoardState,
    "makepuzzle",
  );

  return validatedBoardState;
};

const selectBestPuzzleOrFallback = (
  bestPuzzleFound: RawBoardState | null,
): RawBoardState => {
  if (bestPuzzleFound !== null) {
    return bestPuzzleFound;
  }

  const unvalidatedFallbackPuzzle = sudoku.makepuzzle();

  const validatedFallbackPuzzle = validateAndNormalizeBoardState(
    unvalidatedFallbackPuzzle,
    "makepuzzle",
  );

  return validatedFallbackPuzzle;
};
// #endregion

// #region Difficulty Conversion
export const getDifficultyLevelFromRating = (
  rating: number,
): PuzzleDifficultyLevel => {
  const cappedRating = Math.min(rating, puzzleDifficultyLevels.length - 1);
  const puzzleDifficultyLevel = puzzleDifficultyLevels[cappedRating];
  return puzzleDifficultyLevel;
};

export const getDifficultyLevelFromRawBoardState = (
  rawBoardState: RawBoardState,
): PuzzleDifficultyLevel => {
  const rating = ratePuzzleDifficulty(rawBoardState);
  return getDifficultyLevelFromRating(rating);
};
// #endregion

// #region Public API
const MAX_GENERATION_ATTEMPTS = 100;

export const makePuzzle = (targetDifficultyRating: number): RawBoardState => {
  let bestFoundPuzzle: RawBoardState | null = null;
  let lowestDifficultyScoreFound = Number.POSITIVE_INFINITY;

  for (
    let attemptNumber = 1;
    attemptNumber <= MAX_GENERATION_ATTEMPTS;
    attemptNumber++
  ) {
    const generatedPuzzle = generateValidatedPuzzleAttempt();
    const puzzleDifficultyScore = ratePuzzleDifficulty(generatedPuzzle);

    if (puzzleDifficultyScore === targetDifficultyRating) {
      return generatedPuzzle;
    }

    if (puzzleDifficultyScore < lowestDifficultyScoreFound) {
      lowestDifficultyScoreFound = puzzleDifficultyScore;
      bestFoundPuzzle = generatedPuzzle;
    }
  }

  const puzzle = selectBestPuzzleOrFallback(bestFoundPuzzle);

  return puzzle;
};

export const solvePuzzle = (
  rawBoardState: RawBoardState,
): RawBoardState | null => {
  const unvalidatedSolution = sudoku.solvepuzzle(rawBoardState);

  if (unvalidatedSolution === null) {
    return null;
  }

  const validatedSolution = validateAndNormalizeBoardState(
    unvalidatedSolution,
    "solvepuzzle",
  );

  return validatedSolution;
};
// #endregion
