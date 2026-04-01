import {
  type keypadModes,
  type markupColors,
} from "@/lib/pages/home/utils/constants";
import {
  type BrandedBoxNumber,
  type BrandedCellNumber,
  type BrandedColumnNumber,
  type BrandedEncodedPuzzleString,
  type BrandedRawGivenDigit,
  type BrandedRawPuzzleString,
  type BrandedRowNumber,
  type BrandedSudokuDigit,
} from "@/lib/pages/home/utils/validators/validators";

// #region Utility Types
type Prettify<TypeIntersectionToPrettify> = {
  [Property in keyof TypeIntersectionToPrettify]: TypeIntersectionToPrettify[Property];
} & unknown;
// #endregion

// #region URL Type
export type EncodedPuzzleString = typeof BrandedEncodedPuzzleString;
// #endregion

// #region Raw Types
export type RawPuzzleString = typeof BrandedRawPuzzleString;

export type RawGivenDigit = typeof BrandedRawGivenDigit;
type RawEmptyCell = null;
type RawCellState = RawGivenDigit | RawEmptyCell;

export type RawBoardState = Array<RawCellState>;
// #endregion

// #region Cell Content Types
export type SudokuDigit = typeof BrandedSudokuDigit;

type GivenDigitCellContent = { givenDigit: SudokuDigit };

export type EnteredDigitCellContent = { enteredDigit: SudokuDigit };

export type MarkupDigits = [""] | Array<SudokuDigit>;
export type MarkupDigitsCellContent = {
  centerMarkups: MarkupDigits;
  cornerMarkups: MarkupDigits;
};

export type EmptyCellContent = { emptyCell: "" };

export type CellContent = Prettify<
  | GivenDigitCellContent
  | EnteredDigitCellContent
  | MarkupDigitsCellContent
  | EmptyCellContent
>;
// #endregion

// #region Board Coordinate Types
export type BoxNumber = typeof BrandedBoxNumber;
export type CellNumber = typeof BrandedCellNumber;
export type ColumnNumber = typeof BrandedColumnNumber;
export type RowNumber = typeof BrandedRowNumber;
// #endregion

// #region Cell, Board, and Puzzle State Types
export type MarkupColor = (typeof markupColors)[number];

export type CellState = {
  boxNumber: BoxNumber;
  cellContent: CellContent;
  cellNumber: CellNumber;
  columnNumber: ColumnNumber;
  isSelected: boolean;
  markupColors: [""] | Array<MarkupColor>;
  rowNumber: RowNumber;
};

export type BoardState = Array<CellState>;

export type PuzzleHistory = {
  currentBoardStateIndex: number;
  boardStateHistory: Array<BoardState>;
};
// #endregion

// #region UI Type
export type KeypadMode = (typeof keypadModes)[number];
// #endregion
