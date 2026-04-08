import {
  CELLS_PER_HOUSE,
  TOTAL_CELLS_IN_BOARD,
} from "@/lib/pages/home/utils/constants";
import {
  isEnteredDigitInCellContent,
  isGivenDigitInCellContent,
} from "@/lib/pages/home/utils/guards";
import {
  type BoardState,
  type CellContent,
  type CellState,
  type EmptyCellContent,
  type EncodedPuzzleString,
  type PuzzleState,
  type RawBoardState,
  type RawGivenDigit,
  type RawPuzzleString,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";
import {
  getBrandedBoxNumber,
  getBrandedCellId,
  getBrandedColumnNumber,
  getBrandedRowNumber,
  isEncodedPuzzleString,
  isRawPuzzleString,
  isSudokuDigit,
} from "@/lib/pages/home/utils/validators/validators";

// #region Puzzle String Transforms
const BASE_36 = 36;

export const getEncodedPuzzleStringFromRawPuzzleString = (
  rawPuzzleString: RawPuzzleString,
): EncodedPuzzleString => {
  const candidateEncodedPuzzleString =
    BigInt(rawPuzzleString).toString(BASE_36);

  if (!isEncodedPuzzleString(candidateEncodedPuzzleString)) {
    throw new Error(
      `Failed to get an EncodedPuzzleString from the RawPuzzleString "${rawPuzzleString}". The attempted final output "${candidateEncodedPuzzleString}" was invalid.`,
    );
  }

  return candidateEncodedPuzzleString;
};

export const getRawPuzzleStringFromRawBoardState = (
  rawBoardState: RawBoardState,
): RawPuzzleString => {
  const candidateRawPuzzleString = rawBoardState
    .map((rawCellState) =>
      rawCellState === null ? "0" : (rawCellState + 1).toString(),
    )
    .join("");

  if (!isRawPuzzleString(candidateRawPuzzleString)) {
    throw new Error(
      `Failed to get a RawPuzzleString from the RawBoardState. The attempted final output "${candidateRawPuzzleString}" was invalid.`,
    );
  }

  return candidateRawPuzzleString;
};
// #endregion

// #region Board State Transforms
const getGivenDigitCellContentFromRawGivenDigit = (
  rawGivenDigit: RawGivenDigit,
): CellContent => {
  const candidateSudokuDigit = (rawGivenDigit + 1).toString();

  if (isSudokuDigit(candidateSudokuDigit)) {
    const givenDigitCellContent = {
      givenDigit: candidateSudokuDigit,
    };

    return givenDigitCellContent;
  }

  throw new Error(
    `Failed to get a given SudokuDigit from the RawGivenDigit "${rawGivenDigit}".`,
  );
};

export const getBoardStateFromRawBoardState = (
  rawBoardState: RawBoardState,
): BoardState =>
  Array.from({ length: TOTAL_CELLS_IN_BOARD }, (_, index) => {
    const candidateCellId = index + 1;
    const candidateColumnNumber = ((candidateCellId - 1) % CELLS_PER_HOUSE) + 1;
    const candidateRowNumber =
      Math.floor((candidateCellId - 1) / CELLS_PER_HOUSE) + 1;
    const candidateBoxNumber =
      Math.floor((candidateRowNumber - 1) / 3) * 3 +
      Math.floor((candidateColumnNumber - 1) / 3) +
      1;

    const boxNumber = getBrandedBoxNumber(candidateBoxNumber);
    const id = getBrandedCellId(candidateCellId);
    const columnNumber = getBrandedColumnNumber(candidateColumnNumber);
    const rowNumber = getBrandedRowNumber(candidateRowNumber);

    const rawCellState = rawBoardState[candidateCellId - 1];

    const emptyCellContent: EmptyCellContent = {
      emptyCell: "",
    };

    const content: CellContent =
      rawCellState === null
        ? emptyCellContent
        : getGivenDigitCellContentFromRawGivenDigit(rawCellState);

    const cellState: CellState = {
      content,
      houses: {
        boxNumber,
        columnNumber,
        rowNumber,
      },
      id,
      isSelected: false,
      markupColors: [""],
    };

    return cellState;
  });

export const getBoardStateWithNoCellsSelected = (
  boardState: BoardState,
): BoardState => {
  const nextBoardState = boardState.map((cellState) => {
    const nextCellState = cellState.isSelected
      ? {
          ...cellState,
          isSelected: false,
        }
      : cellState;

    return nextCellState;
  });

  return nextBoardState;
};
// #endregion

// #region Puzzle State Transforms
export const getCurrentBoardStateFromPuzzleState = (
  puzzleState: PuzzleState,
): BoardState => {
  const currentBoardState = puzzleState.puzzleHistory[puzzleState.historyIndex];

  return currentBoardState;
};

export const updatePuzzleStateWithCurrentBoardState = (
  currentPuzzleState: PuzzleState,
  nextBoardState: BoardState,
): PuzzleState => {
  const currentBoardState =
    getCurrentBoardStateFromPuzzleState(currentPuzzleState);

  const didBoardStateChange = currentBoardState.some(
    (cellState, cellIndex) => cellState !== nextBoardState[cellIndex],
  );

  if (!didBoardStateChange) {
    return currentPuzzleState;
  }

  const nextPuzzleHistory = currentPuzzleState.puzzleHistory.map(
    (boardState, historyIndex) =>
      historyIndex === currentPuzzleState.historyIndex
        ? nextBoardState
        : boardState,
  );

  const nextPuzzleState: PuzzleState = {
    historyIndex: currentPuzzleState.historyIndex,
    puzzleHistory: nextPuzzleHistory,
  };

  return nextPuzzleState;
};
// #endregion

// #region Digit Accessor
export const getGivenOrEnteredDigitInCellIfPresent = (
  cellContent: CellContent,
): SudokuDigit | "" => {
  if (isGivenDigitInCellContent(cellContent)) {
    return cellContent.givenDigit;
  }
  if (isEnteredDigitInCellContent(cellContent)) {
    return cellContent.enteredDigit;
  }
  return "";
};
// #endregion
