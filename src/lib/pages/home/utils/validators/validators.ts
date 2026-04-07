import SuperExpressive from "super-expressive";

import { branded } from "@/lib/pages/home/utils/branding";
import {
  CELLS_PER_HOUSE,
  sudokuDigits,
  TOTAL_CELLS_IN_BOARD,
} from "@/lib/pages/home/utils/constants";

// #region Puzzle String Validators

// Equivalent to: /^\d{81}$/
const validRawPuzzleStringRegex = SuperExpressive()
  .startOfInput.exactly(TOTAL_CELLS_IN_BOARD)
  .digit.endOfInput.toRegex();

export const [isRawPuzzleString, BrandedRawPuzzleString] = branded(
  (input: string) =>
    typeof input === "string" && validRawPuzzleStringRegex.test(input),
  "RawPuzzleString",
);

// Equivalent to: /^[\da-z]+$/
const validEncodedPuzzleStringRegex = SuperExpressive()
  .startOfInput.oneOrMore.anyOf.digit.range("a", "z")
  .end()
  .endOfInput.toRegex();

export const [isEncodedPuzzleString, BrandedEncodedPuzzleString] = branded(
  (input: string) =>
    typeof input === "string" && validEncodedPuzzleStringRegex.test(input),
  "EncodedPuzzleString",
);
// #endregion

// #region Raw Given Digit Validator
export const [isRawGivenDigit, BrandedRawGivenDigit] = branded(
  (input: number) => Number.isInteger(input) && input >= 0 && input <= 8,
  "RawGivenDigit",
);
// #endregion

// #region Sudoku Digit Validator
const sudokuDigitStringSet = new Set<string>(sudokuDigits);

export const [isSudokuDigit, BrandedSudokuDigit] = branded(
  (input: string) =>
    typeof input === "string" && sudokuDigitStringSet.has(input),
  "SudokuDigit",
);
// #endregion

// #region Board Coordinate Validators
const isHouseNumberValidator = (input: number) =>
  Number.isInteger(input) && input >= 1 && input <= CELLS_PER_HOUSE;

export const [isBoxNumber, BrandedBoxNumber] = branded(
  isHouseNumberValidator,
  "BoxNumber",
);

export const [isCellId, BrandedCellId] = branded(
  (input: number) =>
    Number.isInteger(input) && input >= 1 && input <= TOTAL_CELLS_IN_BOARD,
  "CellId",
);

export const [isColumnNumber, BrandedColumnNumber] = branded(
  isHouseNumberValidator,
  "ColumnNumber",
);

export const [isRowNumber, BrandedRowNumber] = branded(
  isHouseNumberValidator,
  "RowNumber",
);
// #endregion
