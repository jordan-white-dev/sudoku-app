import {
  MARKUP_COLOR_BLUE,
  MARKUP_COLOR_GRAY,
  MARKUP_COLOR_GREEN,
  MARKUP_COLOR_ORANGE,
  MARKUP_COLOR_PINK,
  MARKUP_COLOR_PURPLE,
  MARKUP_COLOR_RED,
  MARKUP_COLOR_WHITE,
  MARKUP_COLOR_YELLOW,
  markupColors,
} from "@/lib/pages/home/utils/constants";
import {
  isEnteredDigitInCellContent,
  isGivenDigitInCellContent,
  isMarkupDigitsInCellContent,
} from "@/lib/pages/home/utils/guards";
import {
  type CellContent,
  type ColumnNumber,
  type MarkupColor,
  type RowNumber,
} from "@/lib/pages/home/utils/types";

// #region Cell Aria Label
const markupColorNames = {
  [MARKUP_COLOR_GRAY]: "Gray",
  [MARKUP_COLOR_WHITE]: "White",
  [MARKUP_COLOR_PINK]: "Pink",
  [MARKUP_COLOR_RED]: "Red",
  [MARKUP_COLOR_ORANGE]: "Orange",
  [MARKUP_COLOR_YELLOW]: "Yellow",
  [MARKUP_COLOR_GREEN]: "Green",
  [MARKUP_COLOR_BLUE]: "Blue",
  [MARKUP_COLOR_PURPLE]: "Purple",
} as const;

export const getCellAriaLabel = (
  rowNumber: RowNumber,
  columnNumber: ColumnNumber,
  cellContent: CellContent,
  cellMarkupColors: [""] | Array<MarkupColor>,
): string => {
  const location = `Row ${rowNumber}, Column ${columnNumber}`;

  if (isGivenDigitInCellContent(cellContent)) {
    return `${location}: given digit ${cellContent.givenDigit}`;
  }

  if (isEnteredDigitInCellContent(cellContent)) {
    return `${location}: entered digit ${cellContent.enteredDigit}`;
  }

  const parts: Array<string> = [];

  if (isMarkupDigitsInCellContent(cellContent)) {
    if (cellContent.centerMarkups[0] !== "") {
      parts.push(
        `center markup ${[...cellContent.centerMarkups].sort().join(" ")}`,
      );
    }

    if (cellContent.cornerMarkups[0] !== "") {
      parts.push(
        `corner markup ${[...cellContent.cornerMarkups].sort().join(" ")}`,
      );
    }
  }

  const appliedColorNames = markupColors
    .filter((markupColor) =>
      cellMarkupColors.some(
        (cellMarkupColor) => cellMarkupColor === markupColor,
      ),
    )
    .map((markupColor) => markupColorNames[markupColor]);

  if (appliedColorNames.length > 0) {
    parts.push(`color markup ${appliedColorNames.join(" ")}`);
  }

  if (parts.length === 0) {
    return `${location}: empty`;
  }

  return `${location}: ${parts.join("; ")}`;
};
// #endregion

// #region Cell Size Scaling
export const getCellSizeScaledBy = (multiplier: number): string =>
  `calc(var(--cell-size, 80px) * ${multiplier})`;
// #endregion
