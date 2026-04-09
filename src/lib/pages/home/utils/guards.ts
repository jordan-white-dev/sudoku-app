import { markupColors } from "@/lib/pages/home/utils/constants";
import {
  type CellContent,
  type EmptyCellContent,
  type EnteredDigitCellContent,
  type GivenDigitCellContent,
  type MarkupColor,
  type MarkupColors,
  type MarkupDigits,
  type MarkupDigitsCellContent,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";

import { isSudokuDigit } from "./validators/validators";

// #region Cell Content Guards

// #region Given/Entered Cell Content Guards

// #region Given Digit Cell Content Guards
export const isGivenDigitCellContent = (
  cellContent: CellContent,
): cellContent is GivenDigitCellContent => "givenDigit" in cellContent;

export const isNotGivenDigitCellContent = (
  cellContent: CellContent,
): cellContent is Exclude<CellContent, GivenDigitCellContent> =>
  !isGivenDigitCellContent(cellContent);
// #endregion

// #region Entered Digit Cell Content Guards
export const isEnteredDigitCellContent = (
  cellContent: CellContent,
): cellContent is EnteredDigitCellContent => "enteredDigit" in cellContent;

export const isNotEnteredDigitCellContent = (
  cellContent: CellContent,
): cellContent is Exclude<CellContent, EnteredDigitCellContent> =>
  !isEnteredDigitCellContent(cellContent);
// #endregion

export const isGivenOrEnteredDigitCellContent = (
  cellContent: CellContent,
): cellContent is GivenDigitCellContent | EnteredDigitCellContent =>
  isGivenDigitCellContent(cellContent) ||
  isEnteredDigitCellContent(cellContent);
// #endregion

// #region Markup/Empty Cell Content Guards

// #region Markup Digits Guards
export const isNonEmptyMarkupDigits = (
  markupDigits: MarkupDigits,
): markupDigits is Array<SudokuDigit> =>
  markupDigits.length > 0 && markupDigits.every(isSudokuDigit);

export const isEmptyMarkupDigits = (
  markupDigits: MarkupDigits,
): markupDigits is [""] => !isNonEmptyMarkupDigits(markupDigits);
// #endregion

// #region Markup Digits Cell Content Guards
export const isMarkupDigitsCellContent = (
  cellContent: CellContent,
): cellContent is MarkupDigitsCellContent =>
  "centerMarkups" in cellContent && "cornerMarkups" in cellContent;

export const isNotMarkupDigitsCellContent = (
  cellContent: CellContent,
): cellContent is Exclude<CellContent, MarkupDigitsCellContent> =>
  !isMarkupDigitsCellContent(cellContent);
// #endregion

// #region Center Markups Cell Content Guard
export const isNonEmptyCenterMarkupsCellContent = (
  cellContent: CellContent,
): cellContent is MarkupDigitsCellContent & {
  centerMarkups: Array<SudokuDigit>;
} =>
  isMarkupDigitsCellContent(cellContent) &&
  isNonEmptyMarkupDigits(cellContent.centerMarkups);
// #endregion

// #region Corner Markups Cell Content Guards
export const isNonEmptyCornerMarkupsCellContent = (
  cellContent: CellContent,
): cellContent is MarkupDigitsCellContent & {
  cornerMarkups: Array<SudokuDigit>;
} =>
  isMarkupDigitsCellContent(cellContent) &&
  isNonEmptyMarkupDigits(cellContent.cornerMarkups);

export const isEmptyCornerMarkupsCellContent = (
  cellContent: CellContent,
): cellContent is MarkupDigitsCellContent & {
  cornerMarkups: [""];
} => !isNonEmptyCornerMarkupsCellContent(cellContent);
// #endregion

// #region Empty Cell Content Guard
export const isEmptyCellContent = (
  cellContent: CellContent,
): cellContent is EmptyCellContent => "emptyCell" in cellContent;
// #endregion

export const isMarkupDigitsOrEmptyCellContent = (
  cellContent: CellContent,
): cellContent is MarkupDigitsCellContent | EmptyCellContent =>
  isMarkupDigitsCellContent(cellContent) || isEmptyCellContent(cellContent);
// #endregion

// #endregion

// #region Markup Color Guards
export const isMarkupColor = (
  candidateMarkupColor: string,
): candidateMarkupColor is MarkupColor =>
  markupColors.some((markupColor) => markupColor === candidateMarkupColor);

export const isNonEmptyMarkupColors = (
  cellStateMarkupColors: MarkupColors,
): cellStateMarkupColors is Array<MarkupColor> =>
  cellStateMarkupColors.length > 0 &&
  cellStateMarkupColors.every(isMarkupColor);

export const isEmptyMarkupColors = (
  cellStateMarkupColors: MarkupColors,
): cellStateMarkupColors is [""] =>
  !isNonEmptyMarkupColors(cellStateMarkupColors);
// #endregion

// #region Exhaustive Guard
export const exhaustiveGuard = (_value: never): never => {
  throw new Error(
    `Reached the exhaustive guard function with an unexpected value: ${JSON.stringify(_value)}`,
  );
};
// #endregion
