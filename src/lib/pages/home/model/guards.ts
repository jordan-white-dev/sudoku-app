import { type CellContent } from "@/lib/pages/home/model/types";

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
// #endregion

// #region Exhaustive Guard
export const exhaustiveGuard = (_value: never): never => {
  throw Error(
    `Reached the exhaustive guard function with an unexpected value: ${JSON.stringify(_value)}`,
  );
};
// #endregion
