import sudoku from "sudoku";

import { type RawBoardState } from "@/lib/pages/home/utils/types";
import { isRawGivenDigit } from "@/lib/pages/home/utils/validators/validators";

// #region Configuration and Types
const BOARD_CELL_COUNT = 81;
const SUBGRID_SIZE = 3;
const UNITS = 9;
const MAX_GENERATION_ATTEMPTS = 100;
const POSSIBLE_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

type PossibilityMap = Array<Set<number>>;
// #endregion

// #region Board Geometry and Possibility Initialization
const buildInitialPossibilities = (
  rawBoardState: RawBoardState,
): PossibilityMap => {
  const initialPossibilities: PossibilityMap = rawBoardState.map((cell) => {
    if (cell === null) return new Set(POSSIBLE_DIGITS);

    return new Set([cell]);
  });

  return initialPossibilities;
};

const positionToRowIndex = (cellPos: number): number =>
  Math.floor(cellPos / UNITS);

const positionToColumnIndex = (cellPos: number): number => cellPos % UNITS;

const positionToBoxIndex = (cellPos: number): number => {
  const row = positionToRowIndex(cellPos);
  const col = positionToColumnIndex(cellPos);
  return (
    Math.floor(row / SUBGRID_SIZE) * SUBGRID_SIZE +
    Math.floor(col / SUBGRID_SIZE)
  );
};

const getAllCellsInRow = (rowIndex: number): Array<number> => {
  const cells: Array<number> = [];

  for (let col = 0; col < UNITS; col++) cells.push(rowIndex * UNITS + col);

  return cells;
};

const getAllCellsInColumn = (colIndex: number): Array<number> => {
  const cells: Array<number> = [];

  for (let row = 0; row < UNITS; row++) cells.push(row * UNITS + colIndex);

  return cells;
};

const getAllCellsInBox = (boxIndex: number): Array<number> => {
  const cells: Array<number> = [];
  const startRow = Math.floor(boxIndex / SUBGRID_SIZE) * SUBGRID_SIZE;
  const startCol = (boxIndex % SUBGRID_SIZE) * SUBGRID_SIZE;

  for (let row = startRow; row < startRow + SUBGRID_SIZE; row++)
    for (let col = startCol; col < startCol + SUBGRID_SIZE; col++)
      cells.push(row * UNITS + col);

  return cells;
};
// #endregion

// #region Constraint Propagation
const removeDigitFromCellsInGroup = (
  excludePos: number,
  digit: number,
  region: Array<number>,
  possibilities: PossibilityMap,
): boolean => {
  for (const pos of region)
    if (pos !== excludePos && possibilities[pos].has(digit)) {
      possibilities[pos].delete(digit);
      if (possibilities[pos].size === 0) return false;
    }

  return true;
};

const removeDigitFromAllPeers = (
  cellPos: number,
  digit: number,
  possibilities: PossibilityMap,
): boolean => {
  const row = positionToRowIndex(cellPos);
  const col = positionToColumnIndex(cellPos);
  const box = positionToBoxIndex(cellPos);

  return (
    removeDigitFromCellsInGroup(
      cellPos,
      digit,
      getAllCellsInRow(row),
      possibilities,
    ) &&
    removeDigitFromCellsInGroup(
      cellPos,
      digit,
      getAllCellsInColumn(col),
      possibilities,
    ) &&
    removeDigitFromCellsInGroup(
      cellPos,
      digit,
      getAllCellsInBox(box),
      possibilities,
    )
  );
};

const enforceEachDigitAppearsOnceInRegion = (
  region: Array<number>,
  possibilities: PossibilityMap,
): boolean => {
  for (const digit of POSSIBLE_DIGITS) {
    let regionCellsWithDigit = 0;
    let lastCellWithDigit = -1;

    for (const cellPos of region) {
      if (possibilities[cellPos].has(digit)) {
        regionCellsWithDigit++;
        lastCellWithDigit = cellPos;
      }
    }

    if (
      regionCellsWithDigit === 1 &&
      possibilities[lastCellWithDigit].size > 1
    ) {
      possibilities[lastCellWithDigit] = new Set([digit]);
    } else if (regionCellsWithDigit === 0) {
      return false;
    }
  }

  return true;
};

const resolveConstraintsFromDeterminedCells = (
  possibilities: PossibilityMap,
): boolean => {
  for (let cellPos = 0; cellPos < BOARD_CELL_COUNT; cellPos++) {
    if (possibilities[cellPos].size === 0) {
      return false;
    }

    if (possibilities[cellPos].size === 1) {
      const [digit] = possibilities[cellPos];
      if (!removeDigitFromAllPeers(cellPos, digit, possibilities)) {
        return false;
      }
    }
  }
  return true;
};

const resolveConstraintsFromRegions = (
  possibilities: PossibilityMap,
): boolean => {
  for (let index = 0; index < UNITS; index++) {
    if (
      !enforceEachDigitAppearsOnceInRegion(
        getAllCellsInRow(index),
        possibilities,
      )
    ) {
      return false;
    }
    if (
      !enforceEachDigitAppearsOnceInRegion(
        getAllCellsInColumn(index),
        possibilities,
      )
    ) {
      return false;
    }
    if (
      !enforceEachDigitAppearsOnceInRegion(
        getAllCellsInBox(index),
        possibilities,
      )
    ) {
      return false;
    }
  }
  return true;
};

const countCellsWithMultiplePossibilities = (
  possibilities: PossibilityMap,
): number => {
  let count = 0;
  for (const cell of possibilities) {
    if (cell.size > 1) {
      count++;
    }
  }
  return count;
};

const propagateConstraints = (possibilities: PossibilityMap): boolean => {
  let currentUnfilledCount = countCellsWithMultiplePossibilities(possibilities);

  while (true) {
    if (!resolveConstraintsFromDeterminedCells(possibilities)) {
      return false;
    }

    if (!resolveConstraintsFromRegions(possibilities)) {
      return false;
    }

    const updatedUnfilledCount =
      countCellsWithMultiplePossibilities(possibilities);
    if (updatedUnfilledCount === currentUnfilledCount) {
      return true;
    }
    currentUnfilledCount = updatedUnfilledCount;
  }
};
// #endregion

// #region Difficulty Evaluation
const isSolvableByPureDeduction = (rawBoardState: RawBoardState): boolean => {
  const possibilities = buildInitialPossibilities(rawBoardState);

  if (!propagateConstraints(possibilities)) return false;

  for (const cellPossibilities of possibilities)
    if (cellPossibilities.size !== 1) return false;

  return true;
};

const ratePuzzleDifficulty = (rawBoardState: RawBoardState): number => {
  if (isSolvableByPureDeduction(rawBoardState)) return 0;

  const numberOfGivenDigits = rawBoardState.filter(
    (cell) => cell !== null,
  ).length;
  const emptyCells = BOARD_CELL_COUNT - numberOfGivenDigits;

  const puzzleDifficulty = Math.max(1, Math.ceil(emptyCells / 4));

  return puzzleDifficulty;
};
// #endregion

// #region Sudoku Package Validation
const validateAndNormalizeBoardState = (
  unvalidatedBoardState: unknown,
  sourceFunction: "makepuzzle" | "solvepuzzle",
): RawBoardState => {
  if (!Array.isArray(unvalidatedBoardState))
    throw Error(
      `Failed to validate output from ${sourceFunction}. Expected an array output.`,
    );

  if (unvalidatedBoardState.length !== BOARD_CELL_COUNT)
    throw Error(
      `Failed to validate output from ${sourceFunction}. Expected 81 cells but received ${unvalidatedBoardState.length}.`,
    );

  const validatedState = unvalidatedBoardState.map((unvalidatedCell, index) => {
    if (unvalidatedCell === null) return null;

    if (!isRawGivenDigit(unvalidatedCell))
      throw Error(
        `Failed to validate output from ${sourceFunction}. Encountered invalid cell value at index ${index}: ${String(unvalidatedCell)}.`,
      );

    return unvalidatedCell;
  });

  return validatedState;
};
// #endregion

// #region Puzzle Generation Strategy
const generateSinglePuzzleAttempt = (): RawBoardState => {
  const unvalidatedBoardState = sudoku.makepuzzle();

  const validatedBoardState = validateAndNormalizeBoardState(
    unvalidatedBoardState,
    "makepuzzle",
  );

  return validatedBoardState;
};

const selectBestPuzzleOrFallback = (
  bestPuzzle: RawBoardState | null,
): RawBoardState => {
  if (bestPuzzle !== null) return bestPuzzle;

  const unvalidatedFallbackPuzzle = sudoku.makepuzzle();

  const validatedFallbackPuzzle = validateAndNormalizeBoardState(
    unvalidatedFallbackPuzzle,
    "makepuzzle",
  );

  return validatedFallbackPuzzle;
};
// #endregion

// #region Public API
export const makePuzzle = (): RawBoardState => {
  let bestFoundPuzzle: RawBoardState | null = null;
  let lowestDifficultyFound = Infinity;

  for (
    let attemptNumber = 1;
    attemptNumber <= MAX_GENERATION_ATTEMPTS;
    attemptNumber++
  ) {
    const generatedPuzzle = generateSinglePuzzleAttempt();
    const puzzleDifficulty = ratePuzzleDifficulty(generatedPuzzle);

    if (puzzleDifficulty === 0) return generatedPuzzle;

    if (puzzleDifficulty < lowestDifficultyFound) {
      lowestDifficultyFound = puzzleDifficulty;
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

  if (unvalidatedSolution === null) return null;

  const validatedSolution = validateAndNormalizeBoardState(
    unvalidatedSolution,
    "solvepuzzle",
  );

  return validatedSolution;
};
// #endregion
