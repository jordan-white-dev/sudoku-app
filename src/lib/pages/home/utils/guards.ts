import {
  type CellContent,
  type MarkupColor,
} from "@/lib/pages/home/utils/types";

// #region Cell Content Guards
export const isGivenDigitInCellContent = (cellContent: CellContent) =>
  "givenDigit" in cellContent;

export const isEnteredDigitInCellContent = (cellContent: CellContent) =>
  "enteredDigit" in cellContent;

export const isMarkupDigitsInCellContent = (cellContent: CellContent) =>
  "centerMarkups" in cellContent && "cornerMarkups" in cellContent;

export const isEmptyCellContent = (cellContent: CellContent) =>
  "emptyCell" in cellContent;

export const isGivenOrEnteredDigitInCellContent = (cellContent: CellContent) =>
  "enteredDigit" in cellContent || "givenDigit" in cellContent;

export const isNonEmptyMarkupColor = (
  markupColor: MarkupColor | "",
): markupColor is MarkupColor => markupColor !== "";
// #endregion

// #region Exhaustive Guard
export const exhaustiveGuard = (_value: never): never => {
  throw Error(
    `Reached the exhaustive guard function with an unexpected value: ${JSON.stringify(_value)}`,
  );
};
// #endregion
