import { type Locator } from "vitest/browser";
import { type render } from "vitest-browser-react";

import {
  CELLS_PER_HOUSE,
  TOTAL_CELLS_IN_BOARD,
} from "@/lib/pages/home/utils/constants";
import {
  isEmptyCellContent,
  isNotGivenDigitCellContent,
} from "@/lib/pages/home/utils/guards";
import { getBoardStateFromRawBoardState } from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellContent,
  type CellId,
  type CellState,
  type EnteredDigitCellContent,
  type GivenDigitCellContent,
  type PuzzleState,
  type RawBoardState,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";
import { getBrandedSudokuDigit } from "@/lib/pages/home/utils/validators/validators";

// #region Async Helper
export const waitForReactToFinishUpdating = async () => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};
// #endregion

// #region Board and Puzzle State Factories
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

// #region Selected Cells Mutator
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
// #endregion

// #region Digit Mutators

// #region Single Digit Mutators
const getBoardStateWithDigitInTargetCell = (
  digitType: keyof GivenDigitCellContent | keyof EnteredDigitCellContent,
  cellId: CellId,
  digit: SudokuDigit,
  startingBoardState?: BoardState,
): BoardState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const nextBoardState: BoardState = boardState.map((cellState) => {
    const nextCellState: CellState =
      cellState.id === cellId
        ? {
            ...cellState,
            content: {
              [digitType]: getBrandedSudokuDigit(digit),
            } as CellContent,
          }
        : cellState;

    return nextCellState;
  });

  return nextBoardState;
};

export const getBoardStateWithGivenDigitInTargetCell = (
  cellId: CellId,
  givenDigit: SudokuDigit,
  startingBoardState?: BoardState,
): BoardState =>
  getBoardStateWithDigitInTargetCell(
    "givenDigit",
    cellId,
    givenDigit,
    startingBoardState,
  );

export const getBoardStateWithEnteredDigitInTargetCell = (
  cellId: CellId,
  enteredDigit: SudokuDigit,
  startingBoardState?: BoardState,
): BoardState =>
  getBoardStateWithDigitInTargetCell(
    "enteredDigit",
    cellId,
    enteredDigit,
    startingBoardState,
  );
// #endregion

// #region Multiple Digits Mutators
const getBoardStateWithDigitsInTargetCells = (
  digitType: keyof GivenDigitCellContent | keyof EnteredDigitCellContent,
  digitsToEnterInTargetCells: Array<{
    cellId: CellId;
    digit: SudokuDigit;
  }>,
  startingBoardState?: BoardState,
): BoardState =>
  digitsToEnterInTargetCells.reduce(
    (boardState, { cellId, digit }) =>
      getBoardStateWithDigitInTargetCell(digitType, cellId, digit, boardState),
    startingBoardState ?? getStartingEmptyBoardState(),
  );

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

// #endregion

// #endregion

// #region Cell Queries

// #region Cell State Queries
export const getTargetCellStateFromBoardState = (
  cellId: CellId,
  startingBoardState?: BoardState,
): CellState => {
  const boardState = startingBoardState ?? getStartingEmptyBoardState();

  const candidateCellState = boardState.find(
    (cellState) => cellState.id === cellId,
  );

  if (!candidateCellState) {
    throw new Error(`Missing cellState for cell id ${cellId}`);
  }

  return candidateCellState;
};

export const getGivenDigitInTargetCell = (
  boardState: BoardState,
  cellId: CellId,
): SudokuDigit | undefined => {
  const cellState = getTargetCellStateFromBoardState(cellId, boardState);

  if (isNotGivenDigitCellContent(cellState.content)) {
    return;
  }

  return cellState.content.givenDigit;
};

export const doesTargetCellContainEmptyCellContent = (
  boardState: BoardState,
  cellId: CellId,
): boolean => {
  const cellState = getTargetCellStateFromBoardState(cellId, boardState);

  return isEmptyCellContent(cellState.content);
};
// #endregion

// #region Rendered Cell Queries
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

  if (!candidateCellElement) {
    throw new Error(`Could not find button for cell ${cellId}.`);
  }

  return candidateCellElement;
};
// #endregion

// #region Cell Highlight Queries
const SEEN_CELL_HIGHLIGHT_COLOR_TOKEN = "ffd700";
export const CONFLICT_CELL_HIGHLIGHT_COLOR_TOKEN = "179%2c%2058%2c%2058";

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

export const hasSeenCellHighlightInTargetCell = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellId: CellId,
): Promise<boolean> => {
  const backgroundImage = await getComputedStyleOfRenderedCellBackgroundImage(
    renderedBoard,
    cellId,
  );

  return doesBackgroundImageContainToken(
    backgroundImage,
    SEEN_CELL_HIGHLIGHT_COLOR_TOKEN,
  );
};

export const hasConflictCellHighlightInTargetCell = async (
  renderedBoard: RenderedBoard | Promise<RenderedBoard>,
  cellId: CellId,
): Promise<boolean> => {
  const backgroundImage = await getComputedStyleOfRenderedCellBackgroundImage(
    renderedBoard,
    cellId,
  );

  return doesBackgroundImageContainToken(
    backgroundImage,
    CONFLICT_CELL_HIGHLIGHT_COLOR_TOKEN,
  );
};
// #endregion

// #endregion
