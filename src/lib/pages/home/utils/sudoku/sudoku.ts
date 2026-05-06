// This file is a port of the "sudoku" npm package by Blagovest Dachev.
// Source: https://github.com/dachev/sudoku
//
// Which was itself a port of David Bau's python implementation:
// http://davidbau.com/archives/2006/09/04/sudoku_generator.html

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

// #region Internal Types
type InternalBoardState = Array<number | null>;
type CellPossibilityMap = Array<Set<number>>;
type PositionedDigit = {
  readonly cellPosition: number;
  readonly digit: number;
};
// #endregion

// #region Board Geometry and Possibility Initialization
const buildInitialCellPossibilities = (
  rawBoardState: InternalBoardState,
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

// #region Solver Infrastructure
const deepCloneCellPossibilityMap = (
  cellPossibilities: CellPossibilityMap,
): CellPossibilityMap =>
  cellPossibilities.map((candidates) => new Set(candidates));

const isCellPossibilityMapFullySolved = (
  cellPossibilities: CellPossibilityMap,
): boolean => cellPossibilities.every((candidates) => candidates.size === 1);

const findCellPositionWithFewestCandidates = (
  cellPossibilities: CellPossibilityMap,
): number | null => {
  type BestCandidate = {
    readonly cellPosition: number | null;
    readonly fewestCandidateCount: number;
  };

  const bestCandidate = cellPossibilities.reduce<BestCandidate>(
    (currentBest, candidates, cellPosition) => {
      if (
        candidates.size > 1 &&
        candidates.size < currentBest.fewestCandidateCount
      ) {
        return { cellPosition, fewestCandidateCount: candidates.size };
      }

      return currentBest;
    },
    { cellPosition: null, fewestCandidateCount: Number.POSITIVE_INFINITY },
  );

  return bestCandidate.cellPosition;
};

const extractInternalBoardStateFromSolvedCellPossibilities = (
  cellPossibilities: CellPossibilityMap,
): InternalBoardState =>
  cellPossibilities.map((candidates) => {
    const [digit] = candidates;
    return digit;
  });
// #endregion

// #region Backtracking Solver
const solveWithBacktracking = (
  cellPossibilities: CellPossibilityMap,
  shouldRandomizeCandidates: boolean,
): InternalBoardState | null => {
  const workingPossibilities = deepCloneCellPossibilityMap(cellPossibilities);

  if (!isConstraintPropagationSuccessful(workingPossibilities)) {
    return null;
  }

  if (isCellPossibilityMapFullySolved(workingPossibilities)) {
    return extractInternalBoardStateFromSolvedCellPossibilities(
      workingPossibilities,
    );
  }

  const targetCellPosition =
    findCellPositionWithFewestCandidates(workingPossibilities);

  if (targetCellPosition === null) {
    return null;
  }

  const candidateDigits = Array.from(workingPossibilities[targetCellPosition]);
  const orderedCandidateDigits = shouldRandomizeCandidates
    ? candidateDigits
        .map((digit) => ({ digit, sortKey: Math.random() }))
        .sort((sortedA, sortedB) => sortedA.sortKey - sortedB.sortKey)
        .map(({ digit }) => digit)
    : candidateDigits;

  for (const candidateDigit of orderedCandidateDigits) {
    const candidatePossibilities =
      deepCloneCellPossibilityMap(workingPossibilities);
    candidatePossibilities[targetCellPosition] = new Set([candidateDigit]);

    const candidateSolution = solveWithBacktracking(
      candidatePossibilities,
      shouldRandomizeCandidates,
    );

    if (candidateSolution !== null) {
      return candidateSolution;
    }
  }

  return null;
};

const solveInternalBoard = (
  boardState: InternalBoardState,
): InternalBoardState | null => {
  const cellPossibilities = buildInitialCellPossibilities(boardState);

  return solveWithBacktracking(cellPossibilities, false);
};
// #endregion

// #region Puzzle Generation Utilities
const createShuffledCopy = <ItemType>(
  items: Array<ItemType>,
): Array<ItemType> =>
  items
    .map((item) => ({ item, sortKey: Math.random() }))
    .sort((sortedA, sortedB) => sortedA.sortKey - sortedB.sortKey)
    .map(({ item }) => item);

const buildBoardFromPositionedDigits = (
  positionedDigits: Array<PositionedDigit>,
): InternalBoardState => {
  const board: InternalBoardState = Array.from(
    { length: TOTAL_CELLS_IN_BOARD },
    () => null,
  );

  for (const { cellPosition, digit } of positionedDigits) {
    board[cellPosition] = digit;
  }

  return board;
};

const doInternalBoardsMatch = (
  firstBoard: InternalBoardState,
  secondBoard: InternalBoardState,
): boolean =>
  firstBoard.every(
    (firstCellValue, cellPosition) =>
      firstCellValue === secondBoard[cellPosition],
  );

const deduceAllReachableCellValues = (
  boardState: InternalBoardState,
): InternalBoardState => {
  const cellPossibilities = buildInitialCellPossibilities(boardState);
  isConstraintPropagationSuccessful(cellPossibilities);

  return cellPossibilities.map((candidates) => {
    if (candidates.size !== 1) {
      return null;
    }

    const [deducedDigit] = candidates;
    return deducedDigit ?? null;
  });
};
// #endregion

// #region Puzzle Uniqueness Validation
const countSolutionsUpToMaximum = (
  cellPossibilities: CellPossibilityMap,
  maximumSolutionCount: number,
): number => {
  const workingPossibilities = deepCloneCellPossibilityMap(cellPossibilities);

  if (!isConstraintPropagationSuccessful(workingPossibilities)) {
    return 0;
  }

  if (isCellPossibilityMapFullySolved(workingPossibilities)) {
    return 1;
  }

  const targetCellPosition =
    findCellPositionWithFewestCandidates(workingPossibilities);

  if (targetCellPosition === null) {
    return 0;
  }

  let accumulatedSolutionCount = 0;

  for (const candidateDigit of workingPossibilities[targetCellPosition]) {
    const candidatePossibilities =
      deepCloneCellPossibilityMap(workingPossibilities);
    candidatePossibilities[targetCellPosition] = new Set([candidateDigit]);

    accumulatedSolutionCount += countSolutionsUpToMaximum(
      candidatePossibilities,
      maximumSolutionCount,
    );

    if (accumulatedSolutionCount >= maximumSolutionCount) {
      return accumulatedSolutionCount;
    }
  }

  return accumulatedSolutionCount;
};

const hasPuzzleUniqueSolutionMatchingBoard = (
  candidatePuzzle: InternalBoardState,
  solvedBoard: InternalBoardState,
): boolean => {
  const solution = solveInternalBoard(candidatePuzzle);

  if (solution === null) {
    return false;
  }

  if (!doInternalBoardsMatch(solution, solvedBoard)) {
    return false;
  }

  const cellPossibilities = buildInitialCellPossibilities(candidatePuzzle);
  const solutionCount = countSolutionsUpToMaximum(cellPossibilities, 2);

  return solutionCount === 1;
};
// #endregion

// #region Board State Validation
const validateAndNormalizeBoardState = (
  internalBoardState: InternalBoardState,
  sourceFunctionName: "generateInternalPuzzleAttempt" | "solveInternalBoard",
): RawBoardState => {
  if (internalBoardState.length !== TOTAL_CELLS_IN_BOARD) {
    throw new Error(
      `Failed to validate output from ${sourceFunctionName}. Expected 81 cells but received ${internalBoardState.length}.`,
    );
  }

  const validatedBoardState = internalBoardState.map(
    (unvalidatedCell, cellIndex) => {
      if (unvalidatedCell === null) {
        return null;
      }

      if (!isRawGivenDigit(unvalidatedCell)) {
        throw new Error(
          `Failed to validate output from ${sourceFunctionName}. Encountered invalid cell value at index ${cellIndex}: ${String(unvalidatedCell)}.`,
        );
      }

      return unvalidatedCell;
    },
  );

  return validatedBoardState;
};
// #endregion

// #region Puzzle Generation Strategy
const generateRandomSolvedBoard = (): InternalBoardState => {
  const emptyCellPossibilities: CellPossibilityMap = Array.from(
    { length: TOTAL_CELLS_IN_BOARD },
    () => new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]),
  );

  const solvedBoard = solveWithBacktracking(emptyCellPossibilities, true);

  if (solvedBoard === null) {
    throw new Error(
      "Invariant violation: backtracking solver returned null for an empty grid",
    );
  }

  return solvedBoard;
};

const selectMinimalCluesFromSolvedBoard = (
  solvedBoard: InternalBoardState,
): InternalBoardState => {
  const shuffledPositions = createShuffledCopy(
    Array.from(
      { length: TOTAL_CELLS_IN_BOARD },
      (_, cellPosition) => cellPosition,
    ),
  );

  const initialClueList: Array<PositionedDigit> = [];
  let currentDeducedBoard: InternalBoardState = Array.from(
    { length: TOTAL_CELLS_IN_BOARD },
    () => null,
  );

  for (const cellPosition of shuffledPositions) {
    if (currentDeducedBoard[cellPosition] !== null) {
      continue;
    }

    const digit = solvedBoard[cellPosition];
    if (digit === null) {
      continue;
    }

    initialClueList.push({ cellPosition, digit });
    currentDeducedBoard = deduceAllReachableCellValues(
      buildBoardFromPositionedDigits(initialClueList),
    );
  }

  const minimizableClueList: Array<PositionedDigit> =
    createShuffledCopy(initialClueList);

  for (
    let clueIndex = minimizableClueList.length - 1;
    clueIndex >= 0;
    clueIndex--
  ) {
    const clueAtIndex = minimizableClueList.at(clueIndex);

    if (clueAtIndex === undefined) {
      continue;
    }

    minimizableClueList.splice(clueIndex, 1);

    if (
      !hasPuzzleUniqueSolutionMatchingBoard(
        buildBoardFromPositionedDigits(minimizableClueList),
        solvedBoard,
      )
    ) {
      minimizableClueList.push(clueAtIndex);
    }
  }

  return buildBoardFromPositionedDigits(minimizableClueList);
};

const generateInternalPuzzleAttempt = (): InternalBoardState => {
  const solvedBoard = generateRandomSolvedBoard();

  return selectMinimalCluesFromSolvedBoard(solvedBoard);
};

const selectBestPuzzleOrFallback = (
  bestFoundPuzzle: RawBoardState | null,
): RawBoardState => {
  if (bestFoundPuzzle !== null) {
    return bestFoundPuzzle;
  }

  const fallbackInternalPuzzle = generateInternalPuzzleAttempt();

  return validateAndNormalizeBoardState(
    fallbackInternalPuzzle,
    "generateInternalPuzzleAttempt",
  );
};
// #endregion

// #region Difficulty Conversion
export const getDifficultyLevelFromRating = (
  rating: number,
): PuzzleDifficultyLevel => {
  const clampedRating = Math.max(
    0,
    Math.min(rating, puzzleDifficultyLevels.length - 1),
  );
  const puzzleDifficultyLevel = puzzleDifficultyLevels[clampedRating];
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
    const generatedInternalPuzzle = generateInternalPuzzleAttempt();
    const generatedPuzzle = validateAndNormalizeBoardState(
      generatedInternalPuzzle,
      "generateInternalPuzzleAttempt",
    );
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
  const internalSolution = solveInternalBoard(rawBoardState);

  if (internalSolution === null) {
    return null;
  }

  const validatedSolution = validateAndNormalizeBoardState(
    internalSolution,
    "solveInternalBoard",
  );

  return validatedSolution;
};
// #endregion
