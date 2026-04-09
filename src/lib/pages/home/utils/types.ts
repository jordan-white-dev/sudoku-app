import {
  type keypadModes,
  type markupColors,
} from "@/lib/pages/home/utils/constants";
import {
  type BrandedBoxNumber,
  type BrandedCellId,
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

export type GivenDigitCellContent = { givenDigit: SudokuDigit };

export type EnteredDigitCellContent = { enteredDigit: SudokuDigit };

export type MarkupDigits = [""] | Array<SudokuDigit>;
export type MarkupDigitsCellContent =
  | {
      centerMarkups: Array<SudokuDigit>;
      cornerMarkups: [""];
    }
  | {
      centerMarkups: [""];
      cornerMarkups: Array<SudokuDigit>;
    }
  | {
      centerMarkups: Array<SudokuDigit>;
      cornerMarkups: Array<SudokuDigit>;
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
export type CellId = typeof BrandedCellId;

export type BoxNumber = typeof BrandedBoxNumber;
export type ColumnNumber = typeof BrandedColumnNumber;
export type RowNumber = typeof BrandedRowNumber;
// #endregion

// #region Cell, Board, and Puzzle State Types
export type MarkupColor = (typeof markupColors)[number];
export type MarkupColors = [""] | Array<MarkupColor>;

export type CellState = {
  content: CellContent;
  houses: {
    boxNumber: BoxNumber;
    columnNumber: ColumnNumber;
    rowNumber: RowNumber;
  };
  id: CellId;
  isSelected: boolean;
  markupColors: MarkupColors;
};

export type BoardState = Array<CellState>;

export type PuzzleState = {
  historyIndex: number;
  puzzleHistory: Array<BoardState>;
};
// #endregion

// #region Keypad Mode Types
export type KeypadMode = (typeof keypadModes)[number];
export type MarkupKeypadMode = Extract<KeypadMode, "Center" | "Corner">;
// #endregion
