import SuperExpressive from "super-expressive";

import { branded } from "@/lib/pages/home/model/branding";
import { sudokuDigits } from "@/lib/pages/home/model/constants";

// #region Puzzle String Validators

// Equivalent to: /^\d{81}$/
const validRawPuzzleStringRegex = SuperExpressive()
  .startOfInput.exactly(81)
  .digit.endOfInput.toRegex();

export const [isRawPuzzleString, BrandedRawPuzzleString] = branded(
  (input: string) => validRawPuzzleStringRegex.test(input),
  "RawPuzzleString",
);

// Equivalent to: /^[\da-z]+$/
const validEncodedPuzzleStringRegex = SuperExpressive()
  .startOfInput.oneOrMore.anyOf.digit.range("a", "z")
  .end()
  .endOfInput.toRegex();

export const [isEncodedPuzzleString, BrandedEncodedPuzzleString] = branded(
  (input: string) => validEncodedPuzzleStringRegex.test(input),
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
  (input: string) => sudokuDigitStringSet.has(input),
  "SudokuDigit",
);
// #endregion

// #region Board Coordinate Validators
const isNumberOneThroughNineValidator = (input: number) =>
  Number.isInteger(input) && input >= 1 && input <= 9;

export const [isBoxNumber, BrandedBoxNumber] = branded(
  isNumberOneThroughNineValidator,
  "BoxNumber",
);

export const [isCellNumber, BrandedCellNumber] = branded(
  (input: number) => Number.isInteger(input) && input >= 1 && input <= 81,
  "CellNumber",
);

export const [isColumnNumber, BrandedColumnNumber] = branded(
  isNumberOneThroughNineValidator,
  "ColumnNumber",
);

export const [isRowNumber, BrandedRowNumber] = branded(
  isNumberOneThroughNineValidator,
  "RowNumber",
);
// #endregion
