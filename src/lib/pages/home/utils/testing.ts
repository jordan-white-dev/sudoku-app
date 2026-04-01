import { expect } from "vitest";

import {
  isEmptyCellContent,
  isGivenDigitInCellContent,
} from "@/lib/pages/home/utils/guards";
import {
  getBoardStateFromRawBoardState,
  getBrandedSudokuDigit,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellNumber,
  type CellState,
  type PuzzleHistory,
  type RawBoardState,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";

// #region Async Test Helpers
export const waitForReactToFinishUpdating = async () => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};
// #endregion

// #region Board State Factories
export const getEmptyRawBoardState = (): RawBoardState =>
  Array.from({ length: 81 }, () => null);

export const getStartingEmptyBoardState = (): BoardState =>
  getBoardStateFromRawBoardState(getEmptyRawBoardState());

export const getStartingPuzzleHistoryFromBoardState = (
  startingBoardState: BoardState,
): PuzzleHistory => ({
  currentBoardStateIndex: 0,
  boardStateHistory: [startingBoardState],
});
// #endregion

// #region Board State Mutators
export const getBoardStateWithTargetCellsSelected = (
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

export const getBoardStateWithGivenDigitInTargetCell = (
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

export const getBoardStateWithEnteredDigitInTargetCell = (
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
// #endregion

// #region Board State Queries
export const getTargetCellStateFromBoardState = (
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
// #endregion

// #region Board State Assertions
export const expectTargetCellToContainEmptyCellContent = (
  boardState: BoardState,
  cellNumber: CellNumber,
) => {
  const cellState = getTargetCellStateFromBoardState(boardState, cellNumber);

  expect(isEmptyCellContent(cellState.cellContent)).toBe(true);
};

export const expectTargetCellToContainGivenDigit = (
  boardState: BoardState,
  cellNumber: CellNumber,
  expectedGivenDigit: SudokuDigit,
) => {
  const cellState = getTargetCellStateFromBoardState(boardState, cellNumber);

  expect(isGivenDigitInCellContent(cellState.cellContent)).toBe(true);

  if (isGivenDigitInCellContent(cellState.cellContent))
    expect(cellState.cellContent.givenDigit).toBe(expectedGivenDigit);
};
// #endregion
