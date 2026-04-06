import {
  isEnteredDigitInCellContent,
  isGivenDigitInCellContent,
} from "@/lib/pages/home/utils/guards";
import {
  type BoardState,
  type BoxNumber,
  type CellContent,
  type CellId,
  type CellState,
  type ColumnNumber,
  type EmptyCellContent,
  type EncodedPuzzleString,
  type PuzzleState,
  type RawBoardState,
  type RawGivenDigit,
  type RawPuzzleString,
  type RowNumber,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";
import {
  isBoxNumber,
  isCellId,
  isColumnNumber,
  isEncodedPuzzleString,
  isRawPuzzleString,
  isRowNumber,
  isSudokuDigit,
} from "@/lib/pages/home/utils/validators/validators";

// #region Puzzle String Transforms
export const getEncodedPuzzleStringFromRawPuzzleString = (
  rawPuzzleString: RawPuzzleString,
): EncodedPuzzleString => {
  const candidateEncodedPuzzleString = BigInt(rawPuzzleString).toString(36);

  if (!isEncodedPuzzleString(candidateEncodedPuzzleString))
    throw Error(
      `Failed to get an EncodedPuzzleString from the RawPuzzleString "${rawPuzzleString}". The attempted final output "${candidateEncodedPuzzleString}" was invalid.`,
    );

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

  if (!isRawPuzzleString(candidateRawPuzzleString))
    throw Error(
      `Failed to get a RawPuzzleString from the RawBoardState. The attempted final output "${candidateRawPuzzleString}" was invalid.`,
    );

  return candidateRawPuzzleString;
};
// #endregion

// #region Sudoku Digit Transform
export const getBrandedSudokuDigit = (
  candidateSudokuDigit: string,
): SudokuDigit => {
  if (!isSudokuDigit(candidateSudokuDigit))
    throw Error(
      `Failed to get a SudokuDigit from the candidate string "${candidateSudokuDigit}".`,
    );

  return candidateSudokuDigit;
};
// #endregion

// #region Board State Transform

// #region Branded Transforms
export const getBrandedBoxNumber = (candidateBoxNumber: number): BoxNumber => {
  if (!isBoxNumber(candidateBoxNumber))
    throw Error(
      `Encountered an invalid BoxNumber "${candidateBoxNumber}" while getting a BoardState from RawBoardState.`,
    );

  return candidateBoxNumber;
};

export const getBrandedCellId = (candidateCellId: number): CellId => {
  if (!isCellId(candidateCellId))
    throw Error(
      `Encountered an invalid CellId "${candidateCellId}" while getting a BoardState from RawBoardState.`,
    );

  return candidateCellId;
};

export const getBrandedColumnNumber = (
  candidateColumnNumber: number,
): ColumnNumber => {
  if (!isColumnNumber(candidateColumnNumber))
    throw Error(
      `Encountered an invalid ColumnNumber "${candidateColumnNumber}" while getting a BoardState from RawBoardState.`,
    );

  return candidateColumnNumber;
};

export const getBrandedRowNumber = (candidateRowNumber: number): RowNumber => {
  if (!isRowNumber(candidateRowNumber))
    throw Error(
      `Encountered an invalid RowNumber "${candidateRowNumber}" while getting a BoardState from RawBoardState.`,
    );

  return candidateRowNumber;
};
// #endregion

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

  throw Error(
    `Failed to get a given SudokuDigit from the RawGivenDigit "${rawGivenDigit}".`,
  );
};

export const getBoardStateFromRawBoardState = (
  rawBoardState: RawBoardState,
): BoardState =>
  Array.from({ length: 81 }, (_, index) => {
    const candidateCellId = index + 1;
    const candidateColumnNumber = ((candidateCellId - 1) % 9) + 1;
    const candidateRowNumber = Math.floor((candidateCellId - 1) / 9) + 1;
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

  if (!didBoardStateChange) return currentPuzzleState;

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

// #region Digit Accessor
export const getGivenOrEnteredDigitInCellIfPresent = (
  cellContent: CellContent,
): SudokuDigit | "" => {
  if (isGivenDigitInCellContent(cellContent)) return cellContent.givenDigit;
  else if (isEnteredDigitInCellContent(cellContent))
    return cellContent.enteredDigit;
  else return "";
};
// #endregion
