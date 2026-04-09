import { Button, type ButtonProps, Float } from "@chakra-ui/react";
import {
  type Dispatch,
  memo,
  type ReactNode,
  type SetStateAction,
} from "react";

import { useUserSettings } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import {
  CELLS_PER_HOUSE,
  markupColors,
} from "@/lib/pages/home/utils/constants";
import {
  getAriaLabelForTargetCell,
  getCellSizeScaledBy,
} from "@/lib/pages/home/utils/display";
import {
  isEmptyCellContent,
  isEmptyCornerMarkupsCellContent,
  isEmptyMarkupColors,
  isEmptyMarkupDigits,
  isEnteredDigitCellContent,
  isGivenDigitCellContent,
  isGivenOrEnteredDigitCellContent,
  isMarkupColor,
  isMarkupDigitsCellContent,
  isNonEmptyCenterMarkupsCellContent,
  isNonEmptyCornerMarkupsCellContent,
  isNonEmptyMarkupColors,
  isNonEmptyMarkupDigits,
} from "@/lib/pages/home/utils/guards";
import { getCurrentBoardStateFromPuzzleState } from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellContent,
  type CellId,
  type CellState,
  type ColumnNumber,
  type EnteredDigitCellContent,
  type GivenDigitCellContent,
  type MarkupColors,
  type MarkupDigits,
  type MarkupDigitsCellContent,
  type PuzzleState,
  type RowNumber,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";

// #region CSS Properties

// Backgrounds
const CONFLICT_CELL_COLOR = "rgb(179, 58, 58)";
const CONFLICT_CELL_OPACITY = 0.65;

const SEEN_CELL_OPACITY = 0.25;
const SEEN_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS = 8;
const SEEN_CELL_COLOR = "#ffd700";

const SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS = 8;
const SELECTED_CELL_COLOR = "#4ca4ff";

const MARKUP_COLORS_GRADIENT_START_ANGLE_DEGREES = 22.5;

// Cell Size
const CELL_SIZE: ButtonProps["width"] = "var(--cell-size, 80px)";

// Font Size
const DIGIT_FONT_SIZE: ButtonProps["fontSize"] = getCellSizeScaledBy(0.75);
const CORNER_AND_LABEL_FONT_SIZE: ButtonProps["fontSize"] =
  getCellSizeScaledBy(0.27);
const CENTER_FONT_SIZE_LENGTH_5_OR_LESS: ButtonProps["fontSize"] =
  getCellSizeScaledBy(0.27);
const CENTER_FONT_SIZE_LENGTH_6: ButtonProps["fontSize"] =
  getCellSizeScaledBy(0.22);
const CENTER_FONT_SIZE_LENGTH_7: ButtonProps["fontSize"] =
  getCellSizeScaledBy(0.19);
const CENTER_FONT_SIZE_LENGTH_8: ButtonProps["fontSize"] =
  getCellSizeScaledBy(0.165);
const CENTER_FONT_SIZE_LENGTH_9: ButtonProps["fontSize"] =
  getCellSizeScaledBy(0.145);

// Text Shadow
const DIGIT_TEXT_SHADOW: ButtonProps["textShadow"] =
  "1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff";
const MARKUP_TEXT_SHADOW: ButtonProps["textShadow"] = "1px 0 0 #fff";

// #endregion

// #region Cell Styles

// #region Cell Background
type Rectangle = {
  height: number;
  width: number;
  xCoordinate: number;
  yCoordinate: number;
};

const getMarkupColorsBackground = (
  cellMarkupColors: MarkupColors,
): ButtonProps["background"] => {
  const appliedMarkupColors = cellMarkupColors.filter(isMarkupColor);

  if (appliedMarkupColors.length === 0) {
    return "transparent";
  }

  const sortedMarkupColors = markupColors.filter((markupColor) =>
    appliedMarkupColors.includes(markupColor),
  );

  const degreesPerSlice = 360 / sortedMarkupColors.length;
  const gradientSegments = sortedMarkupColors.map(
    (color, index) =>
      `${color} ${index * degreesPerSlice}deg ${(index + 1) * degreesPerSlice}deg`,
  );

  const markupColorsBackground = `conic-gradient(from ${MARKUP_COLORS_GRADIENT_START_ANGLE_DEGREES}deg, ${gradientSegments.join(", ")})`;

  return markupColorsBackground;
};

// #region Conflict Cell Background
const getConflictCellBackground = (
  hasDigitConflict: boolean,
): string | null => {
  if (!hasDigitConflict) {
    return null;
  }

  const conflictCellSvgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect
        x="0"
        y="0"
        width="100"
        height="100"
        fill="${CONFLICT_CELL_COLOR}"
        opacity="${CONFLICT_CELL_OPACITY}"
      />
    </svg>
  `.trim();

  const conflictCellBackground = `url("data:image/svg+xml,${encodeURIComponent(conflictCellSvgMarkup)}")`;

  return conflictCellBackground;
};
// #endregion

// #region Show Seen Cell Background
type BoxAndPuzzleEdges = {
  isOnBottomBoxEdge: boolean;
  isOnBottomPuzzleEdge: boolean;
  isOnLeftBoxEdge: boolean;
  isOnLeftPuzzleEdge: boolean;
  isOnRightBoxEdge: boolean;
  isOnRightPuzzleEdge: boolean;
  isOnTopBoxEdge: boolean;
  isOnTopPuzzleEdge: boolean;
};

const getBoxAndPuzzleEdges = (
  columnNumber: ColumnNumber,
  rowNumber: RowNumber,
): BoxAndPuzzleEdges => ({
  isOnBottomBoxEdge: rowNumber % 3 === 0,
  isOnBottomPuzzleEdge: rowNumber === CELLS_PER_HOUSE,
  isOnLeftBoxEdge: columnNumber % 3 === 1,
  isOnLeftPuzzleEdge: columnNumber === 1,
  isOnRightBoxEdge: columnNumber % 3 === 0,
  isOnRightPuzzleEdge: columnNumber === CELLS_PER_HOUSE,
  isOnTopBoxEdge: rowNumber % 3 === 1,
  isOnTopPuzzleEdge: rowNumber === 1,
});

const isCellInsideSelectedBox = (
  columnNumber: ColumnNumber,
  rowNumber: RowNumber,
  selectedColumnNumber: ColumnNumber | undefined,
  selectedRowNumber: RowNumber | undefined,
): boolean => {
  if (selectedColumnNumber === undefined || selectedRowNumber === undefined) {
    return false;
  }

  const selectedBoxColumnStart =
    Math.floor((selectedColumnNumber - 1) / 3) * 3 + 1;
  const selectedBoxRowStart = Math.floor((selectedRowNumber - 1) / 3) * 3 + 1;

  const isCellInsideSelectedBox =
    columnNumber >= selectedBoxColumnStart &&
    columnNumber <= selectedBoxColumnStart + 2 &&
    rowNumber >= selectedBoxRowStart &&
    rowNumber <= selectedBoxRowStart + 2;

  return isCellInsideSelectedBox;
};

const getSeenInBoxBackgroundRectangle = ({
  isOnBottomBoxEdge,
  isOnLeftBoxEdge,
  isOnRightBoxEdge,
  isOnTopBoxEdge,
}: Pick<
  BoxAndPuzzleEdges,
  | "isOnBottomBoxEdge"
  | "isOnLeftBoxEdge"
  | "isOnRightBoxEdge"
  | "isOnTopBoxEdge"
>): Rectangle => {
  const bottomInset = isOnBottomBoxEdge
    ? SEEN_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS
    : 0;
  const rightInset = isOnRightBoxEdge
    ? SEEN_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS
    : 0;
  const xCoordinate = isOnLeftBoxEdge
    ? SEEN_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS
    : 0;
  const yCoordinate = isOnTopBoxEdge
    ? SEEN_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS
    : 0;

  const seenInBoxBackgroundRectangle: Rectangle = {
    height: 100 - yCoordinate - bottomInset,
    width: 100 - xCoordinate - rightInset,
    xCoordinate,
    yCoordinate,
  };

  return seenInBoxBackgroundRectangle;
};

const getSeenInColumnBackgroundRectangle = (): Rectangle => ({
  height: 100,
  width: 100 - SEEN_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS * 2,
  xCoordinate: SEEN_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
  yCoordinate: 0,
});

const getSeenInRowBackgroundRectangle = (): Rectangle => ({
  height: 100 - SEEN_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS * 2,
  width: 100,
  xCoordinate: 0,
  yCoordinate: SEEN_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
});

const isRectangleVisible = (rectangle: Rectangle): boolean =>
  rectangle.height > 0 && rectangle.width > 0;

const getSeenCellBackgroundRectangles = ({
  columnNumber,
  isSeenInBox,
  isSeenInColumn,
  isSeenInRow,
  rowNumber,
  selectedColumnNumber,
  selectedRowNumber,
}: {
  columnNumber: ColumnNumber;
  isSeenInBox: boolean;
  isSeenInColumn: boolean;
  isSeenInRow: boolean;
  rowNumber: RowNumber;
  selectedColumnNumber: ColumnNumber | undefined;
  selectedRowNumber: RowNumber | undefined;
}): Array<Rectangle> => {
  if (!(isSeenInBox || isSeenInColumn || isSeenInRow)) {
    return [];
  }

  if (isSeenInBox && isSeenInColumn && isSeenInRow) {
    return [{ height: 100, width: 100, xCoordinate: 0, yCoordinate: 0 }];
  }

  const boxAndPuzzleEdges = getBoxAndPuzzleEdges(columnNumber, rowNumber);

  const isCellInSelectedBox = isCellInsideSelectedBox(
    columnNumber,
    rowNumber,
    selectedColumnNumber,
    selectedRowNumber,
  );

  const shouldSuppressColumnBandAtPuzzleEdge =
    isCellInSelectedBox &&
    (boxAndPuzzleEdges.isOnTopPuzzleEdge ||
      boxAndPuzzleEdges.isOnBottomPuzzleEdge);

  const shouldSuppressRowBandAtPuzzleEdge =
    isCellInSelectedBox &&
    (boxAndPuzzleEdges.isOnLeftPuzzleEdge ||
      boxAndPuzzleEdges.isOnRightPuzzleEdge);

  const backgroundRectangles: Array<Rectangle> = [];

  if (isSeenInBox) {
    backgroundRectangles.push(
      getSeenInBoxBackgroundRectangle(boxAndPuzzleEdges),
    );
  }

  if (isSeenInColumn && !shouldSuppressColumnBandAtPuzzleEdge) {
    backgroundRectangles.push(getSeenInColumnBackgroundRectangle());
  }

  if (isSeenInRow && !shouldSuppressRowBandAtPuzzleEdge) {
    backgroundRectangles.push(getSeenInRowBackgroundRectangle());
  }

  const seenCellBackgroundRectangles =
    backgroundRectangles.filter(isRectangleVisible);

  return seenCellBackgroundRectangles;
};

const getSeenCellBackground = ({
  columnNumber,
  isSeenInBox,
  isSeenInColumn,
  isSeenInRow,
  rowNumber,
  selectedColumnNumber,
  selectedRowNumber,
  isShowSeenCellsEnabled,
}: {
  columnNumber: ColumnNumber;
  isSeenInBox: boolean;
  isSeenInColumn: boolean;
  isSeenInRow: boolean;
  rowNumber: RowNumber;
  selectedColumnNumber: ColumnNumber | undefined;
  selectedRowNumber: RowNumber | undefined;
  isShowSeenCellsEnabled: boolean;
}): string | null => {
  if (!isShowSeenCellsEnabled) {
    return null;
  }

  const seenCellBackgroundRectangles = getSeenCellBackgroundRectangles({
    columnNumber,
    isSeenInBox,
    isSeenInColumn,
    isSeenInRow,
    rowNumber,
    selectedColumnNumber,
    selectedRowNumber,
  });

  if (seenCellBackgroundRectangles.length === 0) {
    return null;
  }

  const seenCellRectanglesAsSvgMarkup = seenCellBackgroundRectangles
    .map(
      ({ xCoordinate, yCoordinate, width, height }) =>
        `<rect x="${xCoordinate}" y="${yCoordinate}" width="${width}" height="${height}" fill="${SEEN_CELL_COLOR}" />`,
    )
    .join("");

  const seenCellSvgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <g opacity="${SEEN_CELL_OPACITY}">
        ${seenCellRectanglesAsSvgMarkup}
      </g>
    </svg>
  `.trim();

  const seenCellBackground = `url("data:image/svg+xml,${encodeURIComponent(seenCellSvgMarkup)}")`;

  return seenCellBackground;
};
// #endregion

// #region Selected Cell Background
type SelectedAdjacentCells = {
  isSelectedCellAbove: boolean;
  isSelectedCellAboveLeft: boolean;
  isSelectedCellAboveRight: boolean;
  isSelectedCellBelow: boolean;
  isSelectedCellBelowLeft: boolean;
  isSelectedCellBelowRight: boolean;
  isSelectedCellToLeft: boolean;
  isSelectedCellToRight: boolean;
};

const getCellStateAtRowAndColumn = (
  boardState: BoardState,
  rowNumber: number,
  columnNumber: number,
): CellState | undefined => {
  if (
    rowNumber < 1 ||
    rowNumber > CELLS_PER_HOUSE ||
    columnNumber < 1 ||
    columnNumber > CELLS_PER_HOUSE
  ) {
    return;
  }

  return boardState[(rowNumber - 1) * CELLS_PER_HOUSE + (columnNumber - 1)];
};

const getSelectedAdjacentCells = (
  boardState: BoardState,
  cellState: CellState,
): SelectedAdjacentCells => {
  const { rowNumber, columnNumber } = cellState.houses;

  const isSelectedCellAbove = Boolean(
    getCellStateAtRowAndColumn(boardState, rowNumber - 1, columnNumber)
      ?.isSelected,
  );
  const isSelectedCellAboveLeft = Boolean(
    getCellStateAtRowAndColumn(boardState, rowNumber - 1, columnNumber - 1)
      ?.isSelected,
  );
  const isSelectedCellAboveRight = Boolean(
    getCellStateAtRowAndColumn(boardState, rowNumber - 1, columnNumber + 1)
      ?.isSelected,
  );
  const isSelectedCellBelow = Boolean(
    getCellStateAtRowAndColumn(boardState, rowNumber + 1, columnNumber)
      ?.isSelected,
  );
  const isSelectedCellBelowLeft = Boolean(
    getCellStateAtRowAndColumn(boardState, rowNumber + 1, columnNumber - 1)
      ?.isSelected,
  );
  const isSelectedCellBelowRight = Boolean(
    getCellStateAtRowAndColumn(boardState, rowNumber + 1, columnNumber + 1)
      ?.isSelected,
  );
  const isSelectedCellToLeft = Boolean(
    getCellStateAtRowAndColumn(boardState, rowNumber, columnNumber - 1)
      ?.isSelected,
  );
  const isSelectedCellToRight = Boolean(
    getCellStateAtRowAndColumn(boardState, rowNumber, columnNumber + 1)
      ?.isSelected,
  );

  const selectedAdjacentCells = {
    isSelectedCellAbove,
    isSelectedCellAboveLeft,
    isSelectedCellAboveRight,
    isSelectedCellBelow,
    isSelectedCellBelowLeft,
    isSelectedCellBelowRight,
    isSelectedCellToLeft,
    isSelectedCellToRight,
  };

  return selectedAdjacentCells;
};

const getSelectedCellBackground = ({
  isSelected,
  isSelectedCellAbove,
  isSelectedCellAboveLeft,
  isSelectedCellAboveRight,
  isSelectedCellBelow,
  isSelectedCellBelowLeft,
  isSelectedCellBelowRight,
  isSelectedCellToLeft,
  isSelectedCellToRight,
}: {
  isSelected: boolean;
  isSelectedCellAbove: boolean;
  isSelectedCellAboveLeft: boolean;
  isSelectedCellAboveRight: boolean;
  isSelectedCellBelow: boolean;
  isSelectedCellBelowLeft: boolean;
  isSelectedCellBelowRight: boolean;
  isSelectedCellToLeft: boolean;
  isSelectedCellToRight: boolean;
}): string | null => {
  if (!isSelected) {
    return null;
  }

  const topEdgeRectangle: Rectangle | null = isSelectedCellAbove
    ? null
    : {
        height: SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
        width: 100,
        xCoordinate: 0,
        yCoordinate: 0,
      };

  const bottomEdgeRectangle: Rectangle | null = isSelectedCellBelow
    ? null
    : {
        height: SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
        width: 100,
        xCoordinate: 0,
        yCoordinate: 100 - SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
      };

  const leftEdgeRectangle: Rectangle | null = isSelectedCellToLeft
    ? null
    : {
        height: 100,
        width: SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
        xCoordinate: 0,
        yCoordinate: 0,
      };

  const rightEdgeRectangle: Rectangle | null = isSelectedCellToRight
    ? null
    : {
        height: 100,
        width: SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
        xCoordinate: 100 - SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
        yCoordinate: 0,
      };

  const topLeftCornerRectangle: Rectangle | null =
    isSelectedCellAbove && isSelectedCellToLeft && !isSelectedCellAboveLeft
      ? {
          height: SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
          width: SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
          xCoordinate: 0,
          yCoordinate: 0,
        }
      : null;

  const topRightCornerRectangle: Rectangle | null =
    isSelectedCellAbove && isSelectedCellToRight && !isSelectedCellAboveRight
      ? {
          height: SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
          width: SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
          xCoordinate: 100 - SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
          yCoordinate: 0,
        }
      : null;

  const bottomLeftCornerRectangle: Rectangle | null =
    isSelectedCellBelow && isSelectedCellToLeft && !isSelectedCellBelowLeft
      ? {
          height: SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
          width: SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
          xCoordinate: 0,
          yCoordinate: 100 - SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
        }
      : null;

  const bottomRightCornerRectangle: Rectangle | null =
    isSelectedCellBelow && isSelectedCellToRight && !isSelectedCellBelowRight
      ? {
          height: SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
          width: SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
          xCoordinate: 100 - SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
          yCoordinate: 100 - SELECTED_CELL_EDGE_THICKNESS_IN_VIEWBOX_UNITS,
        }
      : null;

  const selectedCellRectangles = [
    topEdgeRectangle,
    bottomEdgeRectangle,
    leftEdgeRectangle,
    rightEdgeRectangle,
    topLeftCornerRectangle,
    topRightCornerRectangle,
    bottomLeftCornerRectangle,
    bottomRightCornerRectangle,
  ].filter((rectangle): rectangle is Rectangle => rectangle !== null);

  if (selectedCellRectangles.length === 0) {
    return null;
  }

  const selectedCellRectanglesAsSvgMarkup = selectedCellRectangles
    .map(
      ({ xCoordinate, yCoordinate, width, height }) =>
        `<rect x="${xCoordinate}" y="${yCoordinate}" width="${width}" height="${height}" fill="${SELECTED_CELL_COLOR}" />`,
    )
    .join("");

  const selectedCellSvgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      ${selectedCellRectanglesAsSvgMarkup}
    </svg>
  `.trim();

  const selectedCellBackground = `url("data:image/svg+xml,${encodeURIComponent(selectedCellSvgMarkup)}")`;

  return selectedCellBackground;
};
// #endregion

const getCellBackground = ({
  columnNumber,
  hasDigitConflict,
  isSeenInBox,
  isSeenInColumn,
  isSeenInRow,
  isSelected,
  isSelectedCellAbove,
  isSelectedCellAboveLeft,
  isSelectedCellAboveRight,
  isSelectedCellBelow,
  isSelectedCellBelowLeft,
  isSelectedCellBelowRight,
  isSelectedCellToLeft,
  isSelectedCellToRight,
  isShowSeenCellsEnabled,
  markupColors,
  rowNumber,
  selectedColumnNumber,
  selectedRowNumber,
}: {
  columnNumber: ColumnNumber;
  hasDigitConflict: boolean;
  isSeenInBox: boolean;
  isSeenInColumn: boolean;
  isSeenInRow: boolean;
  isSelected: boolean;
  isSelectedCellAbove: boolean;
  isSelectedCellAboveLeft: boolean;
  isSelectedCellAboveRight: boolean;
  isSelectedCellBelow: boolean;
  isSelectedCellBelowLeft: boolean;
  isSelectedCellBelowRight: boolean;
  isSelectedCellToLeft: boolean;
  isSelectedCellToRight: boolean;
  isShowSeenCellsEnabled: boolean;
  markupColors: MarkupColors;
  rowNumber: RowNumber;
  selectedColumnNumber: ColumnNumber | undefined;
  selectedRowNumber: RowNumber | undefined;
}): ButtonProps["background"] => {
  const backgroundLayers = [
    getSelectedCellBackground({
      isSelected,
      isSelectedCellAbove,
      isSelectedCellAboveLeft,
      isSelectedCellAboveRight,
      isSelectedCellBelow,
      isSelectedCellBelowLeft,
      isSelectedCellBelowRight,
      isSelectedCellToLeft,
      isSelectedCellToRight,
    }),
    getConflictCellBackground(hasDigitConflict),
    getSeenCellBackground({
      columnNumber,
      isSeenInBox,
      isSeenInColumn,
      isSeenInRow,
      rowNumber,
      selectedColumnNumber,
      selectedRowNumber,
      isShowSeenCellsEnabled,
    }),
    getMarkupColorsBackground(markupColors),
  ].filter(Boolean);

  const cellBackground = backgroundLayers.join(", ");

  return cellBackground;
};
// #endregion

// #region Other Cell Styles
const getFontSize = (cellContent: CellContent): ButtonProps["fontSize"] => {
  if (isGivenOrEnteredDigitCellContent(cellContent)) {
    return DIGIT_FONT_SIZE;
  }
  if (isMarkupDigitsCellContent(cellContent)) {
    const centerMarkupsCount = cellContent.centerMarkups.length;

    switch (centerMarkupsCount) {
      case 9:
        return CENTER_FONT_SIZE_LENGTH_9;
      case 8:
        return CENTER_FONT_SIZE_LENGTH_8;
      case 7:
        return CENTER_FONT_SIZE_LENGTH_7;
      case 6:
        return CENTER_FONT_SIZE_LENGTH_6;
      default:
        return CENTER_FONT_SIZE_LENGTH_5_OR_LESS;
    }
  }
};

const getTextShadow = (cellContent: CellContent): ButtonProps["textShadow"] =>
  isNonEmptyCenterMarkupsCellContent(cellContent) ? "none" : DIGIT_TEXT_SHADOW;

const getCellBorderStyles = (
  columnNumber: ColumnNumber,
  dashedGridEnabled: boolean,
  rowNumber: RowNumber,
) => {
  const isOnBottomBoxEdge = rowNumber % 3 === 0;
  const isOnLeftBoxEdge = columnNumber % 3 === 1;
  const isOnRightBoxEdge = columnNumber % 3 === 0;
  const isOnTopBoxEdge = rowNumber % 3 === 1;

  const cellBorderStyles = {
    borderBottomStyle:
      !isOnBottomBoxEdge && dashedGridEnabled ? "dashed" : "solid",
    borderLeftStyle: !isOnLeftBoxEdge && dashedGridEnabled ? "dashed" : "solid",
    borderRightStyle:
      !isOnRightBoxEdge && dashedGridEnabled ? "dashed" : "solid",
    borderTopStyle: !isOnTopBoxEdge && dashedGridEnabled ? "dashed" : "solid",
  };

  return cellBorderStyles;
};

const getCellBorderWidths = (
  columnNumber: ColumnNumber,
  rowNumber: RowNumber,
) => {
  const isOnLeftBoxEdge = columnNumber % 3 === 1;
  const isOnTopBoxEdge = rowNumber % 3 === 1;

  const cellBorderWidths = {
    borderBottomWidth: "2px",
    borderLeftWidth: isOnLeftBoxEdge ? "2px" : "0",
    borderRightWidth: "2px",
    borderTopWidth: isOnTopBoxEdge ? "2px" : "0",
  };

  return cellBorderWidths;
};
// #endregion

// #endregion

// #region Cell Floats

// #region Corner Markup Floats
const floatPlacements = [
  "top-start",
  "top-center",
  "top-end",
  "middle-start",
  "middle-center",
  "middle-end",
  "bottom-start",
  "bottom-center",
  "bottom-end",
] as const;
type FloatPlacement = (typeof floatPlacements)[number];

const floatPlacementIndexesByMarkupCount: Record<
  number,
  ReadonlyArray<number>
> = {
  1: [0],
  2: [0, 2],
  3: [0, 2, 6],
  4: [0, 2, 6, 8],
  5: [0, 1, 2, 6, 8],
  6: [0, 1, 2, 6, 7, 8],
  7: [0, 1, 2, 3, 6, 7, 8],
  8: [0, 1, 2, 3, 5, 6, 7, 8],
  9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
};

const getFloatPlacement = (
  cornerMarkupCount: number,
  cornerMarkupIndex: number,
): FloatPlacement => {
  const placementIndexes =
    floatPlacementIndexesByMarkupCount[cornerMarkupCount] ??
    floatPlacementIndexesByMarkupCount[9];

  return floatPlacements[placementIndexes[cornerMarkupIndex]];
};

const getCornerMarkups = (cellContent: CellContent): Array<string> => {
  if (isNonEmptyCornerMarkupsCellContent(cellContent)) {
    return [...cellContent.cornerMarkups].sort();
  }

  return [""];
};

const getCornerMarkupFloats = (
  cellContent: CellContent,
): Array<ReactNode> | undefined => {
  const cornerMarkups = getCornerMarkups(cellContent);

  if (isEmptyCornerMarkupsCellContent(cellContent)) {
    return;
  }

  const cornerMarkupFloats = cornerMarkups.map((cornerMarkup, markupIndex) => {
    const placement = getFloatPlacement(cornerMarkups.length, markupIndex);

    return (
      <Float
        fontSize={CORNER_AND_LABEL_FONT_SIZE}
        key={cornerMarkup}
        offsetX={getCellSizeScaledBy(0.2)}
        offsetY={getCellSizeScaledBy(0.25)}
        placement={placement}
        textShadow={MARKUP_TEXT_SHADOW}
      >
        {cornerMarkup}
      </Float>
    );
  });

  return cornerMarkupFloats;
};
// #endregion

// #region Row and Column Label Floats
const getRowLabelFloat = (rowNumber: RowNumber): ReactNode => (
  <Float
    color="black"
    fontSize={CORNER_AND_LABEL_FONT_SIZE}
    key={`row-label-${rowNumber}`}
    offsetX={getCellSizeScaledBy(-0.2)}
    placement="middle-start"
  >
    {rowNumber.toString()}
  </Float>
);

const getColumnLabelFloat = (columnNumber: ColumnNumber): ReactNode => (
  <Float
    color="black"
    fontSize={CORNER_AND_LABEL_FONT_SIZE}
    key={`column-label-${columnNumber}`}
    offsetY={getCellSizeScaledBy(-0.2)}
    placement="top-center"
  >
    {columnNumber.toString()}
  </Float>
);
// #endregion

// #endregion

// #region Handle Double Click
const getGivenOrEnteredDigit = (
  cellContent: GivenDigitCellContent | EnteredDigitCellContent,
): SudokuDigit =>
  isGivenDigitCellContent(cellContent)
    ? cellContent.givenDigit
    : cellContent.enteredDigit;

const isEmptyEditableCellWithoutMarkup = (cellState: CellState) => {
  const { content: cellContent } = cellState;

  if (isGivenDigitCellContent(cellContent)) {
    return false;
  }

  if (isEnteredDigitCellContent(cellContent)) {
    return false;
  }

  if (isNonEmptyCornerMarkupsCellContent(cellContent)) {
    return false;
  }

  if (isNonEmptyCenterMarkupsCellContent(cellContent)) {
    return false;
  }

  if (isNonEmptyMarkupColors(cellState.markupColors)) {
    return false;
  }

  return true;
};

const getCellStateAsSelectedIfMatchingMarkupColorsExist = (
  sourceMarkupColors: MarkupColors,
  candidateMarkupColors: MarkupColors,
  candidateCellState: CellState,
): CellState => {
  const hasAtLeastOneMatchingMarkupColor =
    isNonEmptyMarkupColors(sourceMarkupColors) &&
    isNonEmptyMarkupColors(candidateMarkupColors) &&
    sourceMarkupColors.some((markupColor) =>
      candidateMarkupColors.includes(markupColor),
    );

  if (hasAtLeastOneMatchingMarkupColor) {
    const nextCellState = {
      ...candidateCellState,
      isSelected: true,
    };

    return nextCellState;
  }

  return candidateCellState;
};

const doBothCellsContainAtLeastOneMatchingMarkupDigit = (
  sourceMarkupDigits: MarkupDigits,
  candidateMarkupDigits: MarkupDigits,
): boolean =>
  isNonEmptyMarkupDigits(sourceMarkupDigits) &&
  isNonEmptyMarkupDigits(candidateMarkupDigits) &&
  sourceMarkupDigits.some((markupDigit) =>
    candidateMarkupDigits.includes(markupDigit),
  );

const getCellStateAsSelectedIfMatchingMarkupDigitsExist = (
  sourceCellContent: MarkupDigitsCellContent,
  candidateCellContent: MarkupDigitsCellContent,
  candidateCellState: CellState,
): CellState => {
  const hasAtLeastOneMatchingMarkupDigit =
    doBothCellsContainAtLeastOneMatchingMarkupDigit(
      sourceCellContent.centerMarkups,
      candidateCellContent.centerMarkups,
    ) ||
    doBothCellsContainAtLeastOneMatchingMarkupDigit(
      sourceCellContent.cornerMarkups,
      candidateCellContent.cornerMarkups,
    );

  if (hasAtLeastOneMatchingMarkupDigit) {
    const nextCellState = {
      ...candidateCellState,
      isSelected: true,
    };

    return nextCellState;
  }

  return candidateCellState;
};

const doMarkupColorsMatchExactly = (
  sourceMarkupColors: MarkupColors,
  candidateMarkupColors: MarkupColors,
): boolean => {
  if (isEmptyMarkupColors(sourceMarkupColors)) {
    return isEmptyMarkupColors(candidateMarkupColors);
  }

  if (isEmptyMarkupColors(candidateMarkupColors)) {
    return false;
  }

  const sourceMarkupColorsSortedInDisplayOrder = markupColors.filter(
    (markupColor) => sourceMarkupColors.includes(markupColor),
  );

  const candidateMarkupColorsSortedInDisplayOrder = markupColors.filter(
    (markupColor) => candidateMarkupColors.includes(markupColor),
  );

  const doMarkupColorsHaveSameLength =
    sourceMarkupColorsSortedInDisplayOrder.length ===
    candidateMarkupColorsSortedInDisplayOrder.length;

  if (!doMarkupColorsHaveSameLength) {
    return false;
  }

  const doAllMarkupColorsMatchByPosition =
    sourceMarkupColorsSortedInDisplayOrder.every(
      (markupColor, markupColorIndex) =>
        markupColor ===
        candidateMarkupColorsSortedInDisplayOrder[markupColorIndex],
    );

  return doAllMarkupColorsMatchByPosition;
};

const doMarkupDigitsMatchExactly = (
  sourceMarkupDigits: MarkupDigits,
  candidateMarkupDigits: MarkupDigits,
): boolean => {
  if (isEmptyMarkupDigits(sourceMarkupDigits)) {
    return isEmptyMarkupDigits(candidateMarkupDigits);
  }

  if (isEmptyMarkupDigits(candidateMarkupDigits)) {
    return false;
  }

  const sourceMarkupDigitsSorted = [...sourceMarkupDigits].sort();
  const candidateMarkupDigitsSorted = [...candidateMarkupDigits].sort();

  const doMarkupDigitsHaveSameLength =
    sourceMarkupDigitsSorted.length === candidateMarkupDigitsSorted.length;

  if (!doMarkupDigitsHaveSameLength) {
    return false;
  }

  const doAllMarkupDigitsMatchByPosition = sourceMarkupDigitsSorted.every(
    (markupDigit, markupDigitIndex) =>
      markupDigit === candidateMarkupDigitsSorted[markupDigitIndex],
  );

  return doAllMarkupDigitsMatchByPosition;
};

const doesMarkupDigitsCellContentMatchExactly = (
  sourceCellContent: MarkupDigitsCellContent,
  candidateCellContent: MarkupDigitsCellContent,
): boolean => {
  const doCenterMarkupsMatchExactly = doMarkupDigitsMatchExactly(
    sourceCellContent.centerMarkups,
    candidateCellContent.centerMarkups,
  );

  const doCornerMarkupsMatchExactly = doMarkupDigitsMatchExactly(
    sourceCellContent.cornerMarkups,
    candidateCellContent.cornerMarkups,
  );

  const doesSourceCellContainAtLeastOneMarkupDigit =
    isNonEmptyCenterMarkupsCellContent(sourceCellContent) ||
    isNonEmptyCornerMarkupsCellContent(sourceCellContent);

  const doesCandidateCellContainAtLeastOneMarkupDigit =
    isNonEmptyCenterMarkupsCellContent(candidateCellContent) ||
    isNonEmptyCornerMarkupsCellContent(candidateCellContent);

  const doesMarkupDigitsCellContentMatchExactly =
    doCenterMarkupsMatchExactly &&
    doCornerMarkupsMatchExactly &&
    doesSourceCellContainAtLeastOneMarkupDigit &&
    doesCandidateCellContainAtLeastOneMarkupDigit;

  return doesMarkupDigitsCellContentMatchExactly;
};

const doBothCellsHaveEmptyCellContent = (
  sourceCellContent: CellContent,
  candidateCellContent: CellContent,
): boolean => {
  const isSourceCellContentEmpty = isEmptyCellContent(sourceCellContent);

  const isCandidateCellContentEmpty = isEmptyCellContent(candidateCellContent);

  return isSourceCellContentEmpty && isCandidateCellContentEmpty;
};

const getSelectedCellStateWithStrictMatching = (
  sourceCellState: CellState,
  candidateCellState: CellState,
): CellState => {
  if (isEmptyEditableCellWithoutMarkup(candidateCellState)) {
    return candidateCellState;
  }

  const doCellMarkupColorsMatchExactly = doMarkupColorsMatchExactly(
    sourceCellState.markupColors,
    candidateCellState.markupColors,
  );

  if (!doCellMarkupColorsMatchExactly) {
    return candidateCellState;
  }

  const sourceCellContent = sourceCellState.content;
  const candidateCellContent = candidateCellState.content;

  const doGivenOrEnteredDigitsMatchExactly =
    isGivenOrEnteredDigitCellContent(sourceCellContent) &&
    isGivenOrEnteredDigitCellContent(candidateCellContent) &&
    getGivenOrEnteredDigit(sourceCellContent) ===
      getGivenOrEnteredDigit(candidateCellContent);

  const doMarkupDigitsMatchExactly =
    isMarkupDigitsCellContent(sourceCellContent) &&
    isMarkupDigitsCellContent(candidateCellContent) &&
    doesMarkupDigitsCellContentMatchExactly(
      sourceCellContent,
      candidateCellContent,
    );

  if (
    doGivenOrEnteredDigitsMatchExactly ||
    doMarkupDigitsMatchExactly ||
    doBothCellsHaveEmptyCellContent(sourceCellContent, candidateCellContent)
  ) {
    const nextCellState = {
      ...candidateCellState,
      isSelected: true,
    };

    return nextCellState;
  }

  return candidateCellState;
};

const getSelectedCellStateWithPartialMatching = (
  sourceCellState: CellState,
  candidateCellState: CellState,
): CellState => {
  if (isEmptyEditableCellWithoutMarkup(candidateCellState)) {
    return candidateCellState;
  }

  const sourceCellContent = sourceCellState.content;
  const candidateCellContent = candidateCellState.content;

  if (
    isNonEmptyMarkupColors(sourceCellState.markupColors) &&
    isNonEmptyMarkupColors(candidateCellState.markupColors)
  ) {
    return getCellStateAsSelectedIfMatchingMarkupColorsExist(
      sourceCellState.markupColors,
      candidateCellState.markupColors,
      candidateCellState,
    );
  }

  if (
    isMarkupDigitsCellContent(sourceCellContent) &&
    isMarkupDigitsCellContent(candidateCellContent)
  ) {
    return getCellStateAsSelectedIfMatchingMarkupDigitsExist(
      sourceCellContent,
      candidateCellContent,
      candidateCellState,
    );
  }

  if (
    isGivenOrEnteredDigitCellContent(sourceCellContent) &&
    isGivenOrEnteredDigitCellContent(candidateCellContent) &&
    getGivenOrEnteredDigit(sourceCellContent) ===
      getGivenOrEnteredDigit(candidateCellContent)
  ) {
    const nextCellState = {
      ...candidateCellState,
      isSelected: true,
    };

    return nextCellState;
  }

  return candidateCellState;
};

const handleCellDoubleClick = (
  sourceCellState: CellState,
  isStrictHighlightsEnabled: boolean,
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) => {
  setPuzzleState((currentPuzzleState) => {
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(currentPuzzleState);

    const boardStateWithNoCellsSelected: BoardState = currentBoardState.map(
      (cellState) => ({
        ...cellState,
        isSelected: false,
      }),
    );

    const boardStateWithMatchingCellsSelected: BoardState =
      isStrictHighlightsEnabled
        ? boardStateWithNoCellsSelected.map((cellState) =>
            getSelectedCellStateWithStrictMatching(sourceCellState, cellState),
          )
        : boardStateWithNoCellsSelected.map((cellState) =>
            getSelectedCellStateWithPartialMatching(sourceCellState, cellState),
          );

    const nextPuzzleHistory = [...currentPuzzleState.puzzleHistory];
    nextPuzzleHistory[currentPuzzleState.historyIndex] =
      boardStateWithMatchingCellsSelected;

    const nextPuzzleState = {
      historyIndex: currentPuzzleState.historyIndex,
      puzzleHistory: nextPuzzleHistory,
    };

    return nextPuzzleState;
  });
};
// #endregion

const getNonCornerCellDigits = (cellContent: CellContent): string => {
  if (isGivenDigitCellContent(cellContent)) {
    return cellContent.givenDigit;
  }
  if (isEnteredDigitCellContent(cellContent)) {
    return cellContent.enteredDigit;
  }
  if (isMarkupDigitsCellContent(cellContent)) {
    return [...cellContent.centerMarkups].sort().join("");
  }

  return "";
};

// #region Cell Component
type CellProps = {
  boardState: BoardState;
  cellState: CellState;
  hasDigitConflict: boolean;
  isSeenInBox: boolean;
  isSeenInColumn: boolean;
  isSeenInRow: boolean;
  selectedColumnNumber: ColumnNumber | undefined;
  selectedRowNumber: RowNumber | undefined;
  tabIndex: number;
  handleCellPointerDown: (cellId: CellId) => void;
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>;
};

export const Cell = memo(
  ({
    boardState,
    cellState,
    hasDigitConflict,
    isSeenInBox,
    isSeenInColumn,
    isSeenInRow,
    selectedColumnNumber,
    selectedRowNumber,
    tabIndex,
    handleCellPointerDown,
    setPuzzleState,
  }: CellProps) => {
    const { userSettings } = useUserSettings();
    const {
      isDashedGridEnabled,
      isShowRowAndColumnLabelsEnabled,
      isShowSeenCellsEnabled,
      isStrictHighlightsEnabled,
    } = userSettings;

    const selectedAdjacentCells = getSelectedAdjacentCells(
      boardState,
      cellState,
    );

    const {
      content: cellContent,
      houses: { columnNumber, rowNumber },
      id: cellId,
      isSelected,
      markupColors: cellMarkupColors,
    } = cellState;
    const nonCornerCellDigits = getNonCornerCellDigits(cellContent);
    const cornerMarkupFloats = getCornerMarkupFloats(cellContent);

    return (
      <Button
        aria-colindex={columnNumber}
        aria-invalid={hasDigitConflict}
        aria-label={getAriaLabelForTargetCell(cellState)}
        aria-readonly={isGivenDigitCellContent(cellContent)}
        aria-selected={isSelected}
        background={getCellBackground({
          markupColors: cellMarkupColors,
          columnNumber,
          hasDigitConflict,
          isSeenInBox,
          isSeenInColumn,
          isSeenInRow,
          isSelected,
          isShowSeenCellsEnabled,
          rowNumber,
          selectedColumnNumber,
          selectedRowNumber,
          ...selectedAdjacentCells,
        })}
        borderColor="black"
        borderRadius="0"
        color={isGivenDigitCellContent(cellContent) ? "black" : "#1212f0"}
        data-cell-number={cellId}
        data-selected={isSelected}
        fontSize={getFontSize(cellContent)}
        height={CELL_SIZE}
        minWidth={CELL_SIZE}
        padding="0"
        role="gridcell"
        tabIndex={tabIndex}
        textShadow={getTextShadow(cellContent)}
        transition="none"
        width={CELL_SIZE}
        {...getCellBorderStyles(columnNumber, isDashedGridEnabled, rowNumber)}
        {...getCellBorderWidths(columnNumber, rowNumber)}
        onDoubleClick={() =>
          handleCellDoubleClick(
            cellState,
            isStrictHighlightsEnabled,
            setPuzzleState,
          )
        }
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          handleCellPointerDown(cellId);
        }}
      >
        {isShowRowAndColumnLabelsEnabled &&
          columnNumber === 1 &&
          getRowLabelFloat(rowNumber)}
        {isShowRowAndColumnLabelsEnabled &&
          rowNumber === 1 &&
          getColumnLabelFloat(columnNumber)}
        {cornerMarkupFloats}
        {nonCornerCellDigits}
      </Button>
    );
  },
);
// #endregion
