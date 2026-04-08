import {
  type CellContent,
  type EmptyCellContent,
  type EnteredDigitCellContent,
  type GivenDigitCellContent,
  type MarkupColor,
  type MarkupDigitsCellContent,
} from "@/lib/pages/home/utils/types";

// #region Cell Content Guards
export const isGivenDigitInCellContent = (
  cellContent: CellContent,
): cellContent is GivenDigitCellContent => "givenDigit" in cellContent;

export const isEnteredDigitInCellContent = (
  cellContent: CellContent,
): cellContent is EnteredDigitCellContent => "enteredDigit" in cellContent;

export const isMarkupDigitsInCellContent = (
  cellContent: CellContent,
): cellContent is MarkupDigitsCellContent =>
  "centerMarkups" in cellContent && "cornerMarkups" in cellContent;

export const isEmptyCellContent = (
  cellContent: CellContent,
): cellContent is EmptyCellContent => "emptyCell" in cellContent;

export const isGivenOrEnteredDigitInCellContent = (
  cellContent: CellContent,
): cellContent is GivenDigitCellContent | EnteredDigitCellContent =>
  "enteredDigit" in cellContent || "givenDigit" in cellContent;
// #endregion

// #region Markup Color Guard
export const isNonEmptyMarkupColor = (
  markupColor: MarkupColor | "",
): markupColor is MarkupColor => markupColor !== "";
// #endregion

// #region Exhaustive Guard
export const exhaustiveGuard = (_value: never): never => {
  throw new Error(
    `Reached the exhaustive guard function with an unexpected value: ${JSON.stringify(_value)}`,
  );
};
// #endregion
