import { expect } from "vitest";
import { type Locator } from "vitest/browser";
import { type render } from "vitest-browser-react";

import {
  isEmptyCellContent,
  isGivenDigitInCellContent,
} from "@/lib/pages/home/utils/guards";
import {
  getBoardStateFromRawBoardState,
  getBrandedSudokuDigit,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellNumber,
  type CellState,
  type PuzzleHistory,
  type RawBoardState,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";

// #region Async Test Helpers
export const waitForReactToFinishUpdating = async () => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};
// #endregion

// #region Board State Factories
export const getEmptyRawBoardState = (): RawBoardState =>
  Array.from({ length: 81 }, () => null);

export const getStartingEmptyBoardState = (): BoardState =>
  getBoardStateFromRawBoardState(getEmptyRawBoardState());

export const getStartingPuzzleHistoryFromBoardState = (
  startingBoardState: BoardState,
): PuzzleHistory => ({
  currentBoardStateIndex: 0,
  boardStateHistory: [startingBoardState],
});
// #endregion

// #region Board State Mutators
export const getBoardStateWithTargetCellsSelected = (
  cellNumbers: Array<CellNumber>,
  startingBoardState?: BoardState,
): BoardState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const nextBoardState: BoardState = boardState.map((cellState) => {
    const shouldBeSelected = cellNumbers.includes(cellState.cellNumber);

    const nextCellState: CellState = {
      ...cellState,
      isSelected: shouldBeSelected,
    };

    return nextCellState;
  });

  return nextBoardState;
};

export const getBoardStateWithGivenDigitInTargetCell = (
  cellNumber: CellNumber,
  givenDigit: SudokuDigit,
  startingBoardState?: BoardState,
): BoardState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState =
      cellState.cellNumber === cellNumber
        ? {
            ...cellState,
            cellContent: {
              givenDigit: getBrandedSudokuDigit(givenDigit),
            },
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
};

export const getBoardStateWithEnteredDigitInTargetCell = (
  cellNumber: CellNumber,
  enteredDigit: SudokuDigit,
  startingBoardState?: BoardState,
): BoardState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.cellNumber === cellNumber
        ? {
            ...cellState,
            cellContent: {
              enteredDigit: getBrandedSudokuDigit(enteredDigit),
            },
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
};

const getBoardStateWithDigitsInTargetCells = (
  digitType: "givenDigit" | "enteredDigit",
  digitsToEnterInTargetCells: Array<{
    cellNumber: CellNumber;
    digit: SudokuDigit;
  }>,
  startingBoardState?: BoardState,
): BoardState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState = (() => {
      const digitToEnterInTargetCell = digitsToEnterInTargetCells.find(
        (digitInCellObject) =>
          digitInCellObject.cellNumber === cellState.cellNumber,
      );

      if (digitToEnterInTargetCell) {
        const cellStateWithDigit: CellState = {
          ...cellState,
          cellContent: {
            ...cellState.cellContent,
            [digitType]: getBrandedSudokuDigit(digitToEnterInTargetCell.digit),
          },
        };

        return cellStateWithDigit;
      }

      return cellState;
    })();

    return nextCellState;
  });

  return nextBoardState;
};

export const getBoardStateWithGivenDigitsInTargetCells = (
  digitsToEnterInTargetCells: Array<{
    cellNumber: CellNumber;
    digit: SudokuDigit;
  }>,
  startingBoardState?: BoardState,
): BoardState =>
  getBoardStateWithDigitsInTargetCells(
    "givenDigit",
    digitsToEnterInTargetCells,
    startingBoardState,
  );

export const getBoardStateWithEnteredDigitsInTargetCells = (
  digitsToEnterInTargetCells: Array<{
    cellNumber: CellNumber;
    digit: SudokuDigit;
  }>,
  startingBoardState?: BoardState,
): BoardState =>
  getBoardStateWithDigitsInTargetCells(
    "enteredDigit",
    digitsToEnterInTargetCells,
    startingBoardState,
  );
// #endregion

// #region Board State Queries
export const getTargetCellStateFromBoardState = (
  cellNumber: CellNumber,
  startingBoardState?: BoardState,
): CellState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const candidateCellState = boardState.find(
    (cellState) => cellState.cellNumber === cellNumber,
  );

  if (!candidateCellState)
    throw Error(`Missing cellState for cell number ${cellNumber}`);

  return candidateCellState;
};
// #endregion

// #region Board State Assertions
export const expectTargetCellToContainEmptyCellContent = (
  boardState: BoardState,
  cellNumber: CellNumber,
) => {
  const cellState = getTargetCellStateFromBoardState(cellNumber, boardState);

  expect(isEmptyCellContent(cellState.cellContent)).toBe(true);
};

export const expectTargetCellToContainGivenDigit = (
  boardState: BoardState,
  cellNumber: CellNumber,
  expectedGivenDigit: SudokuDigit,
) => {
  const cellState = getTargetCellStateFromBoardState(cellNumber, boardState);

  expect(isGivenDigitInCellContent(cellState.cellContent)).toBe(true);

  if (isGivenDigitInCellContent(cellState.cellContent))
    expect(cellState.cellContent.givenDigit).toBe(expectedGivenDigit);
};
// #endregion

export const defaultUserSettings = {
  isConflictCheckerEnabled: false,
  isDashedGridEnabled: false,
  isStopwatchDisabled: false,
  isFlipKeypadEnabled: false,
  isHideStopwatchEnabled: false,
  isShowRowAndColumnLabelsEnabled: false,
  isShowSeenCellsEnabled: false,
  isStrictHighlightsEnabled: false,
};

const SEEN_CELL_HIGHLIGHT_COLOR_TOKEN = "ffd700";
export const CONFLICT_CELL_HIGHLIGHT_COLOR_TOKEN = "179%2c%2058%2c%2058";

export type RenderedBoard = Awaited<ReturnType<typeof render>>;

export const getCellAccessibleName = (cellNumber: CellNumber) => {
  const rowNumber = Math.floor((cellNumber - 1) / 9) + 1;
  const columnNumber = ((cellNumber - 1) % 9) + 1;

  return `Cell ${cellNumber} located in row ${rowNumber}, column ${columnNumber}`;
};

export const getCellLocator = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellNumber: CellNumber,
): Promise<Locator> =>
  (await renderedBoard).getByRole("button", {
    name: getCellAccessibleName(cellNumber),
  });

export const getCellElement = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellNumber: CellNumber,
): Promise<HTMLButtonElement> => {
  const resolvedRenderedBoard = await renderedBoard;
  const cellAccessibleName = getCellAccessibleName(cellNumber);

  const candidateCellElement =
    resolvedRenderedBoard.container.querySelector<HTMLButtonElement>(
      `button[aria-label="${cellAccessibleName}"]`,
    );

  if (!candidateCellElement)
    throw Error(`Could not find button for ${cellAccessibleName}.`);

  return candidateCellElement;
};

const getComputedStyleOfRenderedCellBackgroundImage = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellNumber: CellNumber,
): Promise<string> => {
  const cellElement = await getCellElement(renderedBoard, cellNumber);

  return window.getComputedStyle(cellElement).backgroundImage;
};

const doesBackgroundImageContainToken = (
  backgroundImage: string,
  token: string,
): boolean => backgroundImage.toLowerCase().includes(token.toLowerCase());

export const expectSeenCellHighlightOrNotInTargetCell = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellNumber: CellNumber,
  shouldHighlightBeVisible: boolean,
) => {
  const backgroundImage = await getComputedStyleOfRenderedCellBackgroundImage(
    renderedBoard,
    cellNumber,
  );

  expect(
    doesBackgroundImageContainToken(
      backgroundImage,
      SEEN_CELL_HIGHLIGHT_COLOR_TOKEN,
    ),
  ).toBe(shouldHighlightBeVisible);
};

export const expectTargetCellToHaveConflictHighlightOrNot = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellNumber: CellNumber,
  shouldBeVisible: boolean,
) => {
  const backgroundImage = await getComputedStyleOfRenderedCellBackgroundImage(
    renderedBoard,
    cellNumber,
  );

  expect(
    doesBackgroundImageContainToken(
      backgroundImage,
      CONFLICT_CELL_HIGHLIGHT_COLOR_TOKEN,
    ),
  ).toBe(shouldBeVisible);
};
