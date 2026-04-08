import { expect } from "vitest";
import { type Locator } from "vitest/browser";
import { type render } from "vitest-browser-react";

import {
  CELLS_PER_HOUSE,
  TOTAL_CELLS_IN_BOARD,
} from "@/lib/pages/home/utils/constants";
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
  type CellId,
  type CellState,
  type PuzzleState,
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
  Array.from({ length: TOTAL_CELLS_IN_BOARD }, () => null);

export const EMPTY_RAW_BOARD_STATE: RawBoardState = getEmptyRawBoardState();

export const getStartingEmptyBoardState = (): BoardState =>
  getBoardStateFromRawBoardState(EMPTY_RAW_BOARD_STATE);

export const getStartingPuzzleStateFromBoardState = (
  startingBoardState: BoardState,
): PuzzleState => ({
  historyIndex: 0,
  puzzleHistory: [startingBoardState],
});
// #endregion

// #region Board State Mutators
export const getBoardStateWithTargetCellsSelected = (
  cellIds: Array<CellId>,
  startingBoardState?: BoardState,
): BoardState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const nextBoardState: BoardState = boardState.map((cellState) => {
    const shouldBeSelected = cellIds.includes(cellState.id);

    const nextCellState: CellState = {
      ...cellState,
      isSelected: shouldBeSelected,
    };

    return nextCellState;
  });

  return nextBoardState;
};

export const getBoardStateWithGivenDigitInTargetCell = (
  cellId: CellId,
  givenDigit: SudokuDigit,
  startingBoardState?: BoardState,
): BoardState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState =
      cellState.id === cellId
        ? {
            ...cellState,
            content: {
              givenDigit: getBrandedSudokuDigit(givenDigit),
            },
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
};

export const getBoardStateWithEnteredDigitInTargetCell = (
  cellId: CellId,
  enteredDigit: SudokuDigit,
  startingBoardState?: BoardState,
): BoardState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.id === cellId
        ? {
            ...cellState,
            content: {
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
    cellId: CellId;
    digit: SudokuDigit;
  }>,
  startingBoardState?: BoardState,
): BoardState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState = (() => {
      const digitToEnterInTargetCell = digitsToEnterInTargetCells.find(
        (digitInCellObject) => digitInCellObject.cellId === cellState.id,
      );

      if (digitToEnterInTargetCell) {
        const cellStateWithDigit: CellState = {
          ...cellState,
          content: {
            ...cellState.content,
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
    cellId: CellId;
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
    cellId: CellId;
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
  cellId: CellId,
  startingBoardState?: BoardState,
): CellState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const candidateCellState = boardState.find(
    (cellState) => cellState.id === cellId,
  );

  if (!candidateCellState)
    throw Error(`Missing cellState for cell id ${cellId}`);

  return candidateCellState;
};
// #endregion

// #region Board State Assertions
export const expectTargetCellToContainEmptyCellContent = (
  boardState: BoardState,
  cellId: CellId,
) => {
  const cellState = getTargetCellStateFromBoardState(cellId, boardState);

  expect(isEmptyCellContent(cellState.content)).toBe(true);
};

export const expectTargetCellToContainGivenDigit = (
  boardState: BoardState,
  cellId: CellId,
  expectedGivenDigit: SudokuDigit,
) => {
  const cellState = getTargetCellStateFromBoardState(cellId, boardState);

  expect(isGivenDigitInCellContent(cellState.content)).toBe(true);

  if (isGivenDigitInCellContent(cellState.content))
    expect(cellState.content.givenDigit).toBe(expectedGivenDigit);
};
// #endregion

const SEEN_CELL_HIGHLIGHT_COLOR_TOKEN = "ffd700";
export const CONFLICT_CELL_HIGHLIGHT_COLOR_TOKEN = "179%2c%2058%2c%2058";

export type RenderedBoard = Awaited<ReturnType<typeof render>>;

export const getCellAccessibleName = (cellId: CellId) => {
  const rowNumber = Math.floor((cellId - 1) / CELLS_PER_HOUSE) + 1;
  const columnNumber = ((cellId - 1) % CELLS_PER_HOUSE) + 1;

  return `Row ${rowNumber}, Column ${columnNumber}: empty`;
};

export const getCellLocator = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellId: CellId,
): Promise<Locator> => {
  const rowNumber = Math.floor((cellId - 1) / CELLS_PER_HOUSE) + 1;
  const columnNumber = ((cellId - 1) % CELLS_PER_HOUSE) + 1;
  return (await renderedBoard).getByRole("gridcell", {
    name: new RegExp(`^Row ${rowNumber}, Column ${columnNumber}:`),
  });
};

export const getCellElement = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellId: CellId,
): Promise<HTMLButtonElement> => {
  const resolvedRenderedBoard = await renderedBoard;

  const candidateCellElement =
    resolvedRenderedBoard.container.querySelector<HTMLButtonElement>(
      `button[data-cell-number="${cellId}"]`,
    );

  if (!candidateCellElement)
    throw Error(`Could not find button for cell ${cellId}.`);

  return candidateCellElement;
};

const getComputedStyleOfRenderedCellBackgroundImage = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellId: CellId,
): Promise<string> => {
  const cellElement = await getCellElement(renderedBoard, cellId);

  return window.getComputedStyle(cellElement).backgroundImage;
};

const doesBackgroundImageContainToken = (
  backgroundImage: string,
  token: string,
): boolean => backgroundImage.toLowerCase().includes(token.toLowerCase());

export const expectSeenCellHighlightOrNotInTargetCell = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellId: CellId,
  shouldHighlightBeVisible: boolean,
) => {
  const backgroundImage = await getComputedStyleOfRenderedCellBackgroundImage(
    renderedBoard,
    cellId,
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
  cellId: CellId,
  shouldBeVisible: boolean,
) => {
  const backgroundImage = await getComputedStyleOfRenderedCellBackgroundImage(
    renderedBoard,
    cellId,
  );

  expect(
    doesBackgroundImageContainToken(
      backgroundImage,
      CONFLICT_CELL_HIGHLIGHT_COLOR_TOKEN,
    ),
  ).toBe(shouldBeVisible);
};
