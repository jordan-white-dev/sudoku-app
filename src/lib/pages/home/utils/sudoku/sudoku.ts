import { makepuzzle, solvepuzzle } from "sudoku";

import { type RawBoardState } from "@/lib/pages/home/utils/types";
import { isRawGivenDigit } from "@/lib/pages/home/utils/validators/validators";

const BOARD_CELL_COUNT = 81;

const getValidatedRawBoardState = (
  candidateRawBoardState: unknown,
  sourceFunctionName: "makepuzzle" | "solvepuzzle",
): RawBoardState => {
  if (!Array.isArray(candidateRawBoardState))
    throw Error(
      `Failed to validate output from ${sourceFunctionName}. Expected an array output.`,
    );

  if (candidateRawBoardState.length !== BOARD_CELL_COUNT)
    throw Error(
      `Failed to validate output from ${sourceFunctionName}. Expected 81 cells but received ${candidateRawBoardState.length}.`,
    );

  const rawBoardState = candidateRawBoardState.map(
    (candidateRawCell, index) => {
      if (candidateRawCell === null) return null;

      if (!isRawGivenDigit(candidateRawCell)) {
        throw Error(
          `Failed to validate output from ${sourceFunctionName}. Encountered invalid cell value at index ${index}: ${String(candidateRawCell)}.`,
        );
      }

      return candidateRawCell;
    },
  );

  return rawBoardState;
};

export const makePuzzle = (): RawBoardState => {
  const candidateRawBoardState = makepuzzle();

  return getValidatedRawBoardState(candidateRawBoardState, "makepuzzle");
};

export const solvePuzzle = (
  rawBoardState: RawBoardState,
): RawBoardState | null => {
  const candidateSolvedRawBoardState = solvepuzzle(rawBoardState);

  if (candidateSolvedRawBoardState === null) return null;

  return getValidatedRawBoardState(candidateSolvedRawBoardState, "solvepuzzle");
};
