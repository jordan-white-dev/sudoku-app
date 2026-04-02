import { type Dispatch, type SetStateAction } from "react";

import { markupColors } from "@/lib/pages/home/utils/constants";
import {
  isEmptyCellContent,
  isEnteredDigitInCellContent,
  isGivenDigitInCellContent,
  isMarkupDigitsInCellContent,
} from "@/lib/pages/home/utils/guards";
import { getCurrentBoardStateFromPuzzleHistory } from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellState,
  type KeypadMode,
  type MarkupColor,
  type MarkupDigitsCellContent,
  type PuzzleHistory,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";
import { isSudokuDigit } from "@/lib/pages/home/utils/validators/validators";

// #region Input Actions
const commitBoardStateToHistoryIfChanged = (
  currentBoardState: BoardState,
  nextBoardState: BoardState,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) => {
  const didBoardStateChange =
    JSON.stringify(nextBoardState) !== JSON.stringify(currentBoardState);

  if (!didBoardStateChange) return;

  setPuzzleHistory((currentPuzzleHistory) => {
    const nextBoardStateIndex = currentPuzzleHistory.currentBoardStateIndex + 1;

    const nextBoardStateHistory = [
      ...currentPuzzleHistory.boardStateHistory.slice(0, nextBoardStateIndex),
      nextBoardState,
    ];

    const nextPuzzleHistory = {
      currentBoardStateIndex: nextBoardStateIndex,
      boardStateHistory: nextBoardStateHistory,
    };

    return nextPuzzleHistory;
  });
};

// #region Digit Input Action
const areAllSelectedCellsGivenOrContainSudokuDigitAsEnteredDigit = (
  currentBoardState: BoardState,
  sudokuDigit: SudokuDigit,
): boolean =>
  currentBoardState.every(
    (currentCellState) =>
      !currentCellState.isSelected ||
      isGivenDigitInCellContent(currentCellState.cellContent) ||
      (isEnteredDigitInCellContent(currentCellState.cellContent) &&
        currentCellState.cellContent.enteredDigit === sudokuDigit),
  );

const getEnteredDigitCellState = (
  currentCellState: CellState,
  shouldEnteredDigitBeRemoved: boolean,
  sudokuDigit: SudokuDigit,
): CellState => {
  const isValidInputCell =
    currentCellState.isSelected &&
    !isGivenDigitInCellContent(currentCellState.cellContent);

  if (!isValidInputCell) return currentCellState;

  if (shouldEnteredDigitBeRemoved) {
    const emptyEnteredDigitCellState: CellState = {
      ...currentCellState,
      cellContent: {
        emptyCell: "",
      },
    };

    return emptyEnteredDigitCellState;
  }

  const addedEnteredDigitCellState: CellState = {
    ...currentCellState,
    cellContent: {
      enteredDigit: sudokuDigit,
    },
  };

  return addedEnteredDigitCellState;
};

export const handleDigitInput = (
  puzzleHistory: PuzzleHistory,
  sudokuDigit: SudokuDigit,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) => {
  const currentBoardState =
    getCurrentBoardStateFromPuzzleHistory(puzzleHistory);

  const shouldEnteredDigitBeRemoved =
    areAllSelectedCellsGivenOrContainSudokuDigitAsEnteredDigit(
      currentBoardState,
      sudokuDigit,
    );

  const nextBoardState: BoardState = currentBoardState.map((currentCellState) =>
    getEnteredDigitCellState(
      currentCellState,
      shouldEnteredDigitBeRemoved,
      sudokuDigit,
    ),
  );

  commitBoardStateToHistoryIfChanged(
    currentBoardState,
    nextBoardState,
    setPuzzleHistory,
  );
};
// #endregion

// #region Markup Digit Input Actions
type MarkupType = Extract<KeypadMode, "Center" | "Corner">;

const areAllSelectedCellsGivenEnteredOrContainSudokuDigitAsMarkup = (
  currentBoardState: BoardState,
  markupType: MarkupType,
  sudokuDigit: SudokuDigit,
): boolean =>
  currentBoardState.every((currentCellState) => {
    const cellContent = currentCellState.cellContent;

    if (!currentCellState.isSelected) return true;

    if (isGivenDigitInCellContent(cellContent)) return true;

    if (isEnteredDigitInCellContent(cellContent)) return true;

    const doesContainSudokuDigitAsMarkup =
      isMarkupDigitsInCellContent(cellContent) &&
      (markupType === "Center"
        ? cellContent.centerMarkups.filter(isSudokuDigit).includes(sudokuDigit)
        : cellContent.cornerMarkups
            .filter(isSudokuDigit)
            .includes(sudokuDigit));

    if (doesContainSudokuDigitAsMarkup) return true;

    return false;
  });

const getCellStateWithRemovedMarkupDigit = (
  currentCellState: CellState,
  currentMarkups: Array<SudokuDigit>,
  markupType: MarkupType,
  sudokuDigit: SudokuDigit,
): CellState => {
  const currentCellContent = currentCellState.cellContent;

  if (!isMarkupDigitsInCellContent(currentCellContent)) return currentCellState;

  const currentMarkupsNotMatchingTheSudokuDigit = currentMarkups.filter(
    (currentMarkup) => currentMarkup !== sudokuDigit,
  );

  const nextMarkups: [""] | Array<SudokuDigit> =
    currentMarkupsNotMatchingTheSudokuDigit.length > 0
      ? currentMarkupsNotMatchingTheSudokuDigit
      : [""];

  const centerMarkups =
    markupType === "Center" ? nextMarkups : currentCellContent.centerMarkups;

  const cornerMarkups =
    markupType === "Corner" ? nextMarkups : currentCellContent.cornerMarkups;

  const cellContentAfterRemoveCheck: MarkupDigitsCellContent = {
    centerMarkups,
    cornerMarkups,
  };

  const nextCellState: CellState = {
    ...currentCellState,
    cellContent: cellContentAfterRemoveCheck,
  };

  return nextCellState;
};

const getCellStateWithAddedMarkupDigit = (
  currentCellState: CellState,
  currentMarkups: Array<SudokuDigit>,
  markupType: MarkupType,
  sudokuDigit: SudokuDigit,
): CellState => {
  const currentCellContent = currentCellState.cellContent;

  if (!isMarkupDigitsInCellContent(currentCellContent)) return currentCellState;

  const nextMarkups = currentMarkups.includes(sudokuDigit)
    ? currentMarkups
    : [...currentMarkups, sudokuDigit];

  const centerMarkups =
    markupType === "Center" ? nextMarkups : currentCellContent.centerMarkups;

  const cornerMarkups =
    markupType === "Corner" ? nextMarkups : currentCellContent.cornerMarkups;

  const cellContentAfterAddCheck: MarkupDigitsCellContent = {
    centerMarkups,
    cornerMarkups,
  };

  const nextCellState: CellState = {
    ...currentCellState,
    cellContent: cellContentAfterAddCheck,
  };

  return nextCellState;
};

const getCellStateWithAnEmptyMarkupType = (
  currentCellState: CellState,
  markupType: MarkupType,
  sudokuDigit: SudokuDigit,
): CellState => {
  const nextMarkupDigitsCellContent: MarkupDigitsCellContent =
    markupType === "Center"
      ? {
          centerMarkups: [sudokuDigit],
          cornerMarkups: [""],
        }
      : {
          centerMarkups: [""],
          cornerMarkups: [sudokuDigit],
        };

  const nextMarkupDigitsCellState: CellState = {
    ...currentCellState,
    cellContent: nextMarkupDigitsCellContent,
  };

  return nextMarkupDigitsCellState;
};

const getMarkupDigitsCellState = (
  markupType: MarkupType,
  currentCellState: CellState,
  shouldMarkupDigitBeRemoved: boolean,
  sudokuDigit: SudokuDigit,
): CellState => {
  if (!currentCellState.isSelected) return currentCellState;

  const currentCellContent = currentCellState.cellContent;

  const isNotAGivenDigit = !isGivenDigitInCellContent(currentCellContent);

  const isValidInputCell =
    isNotAGivenDigit &&
    (isEmptyCellContent(currentCellContent) ||
      isMarkupDigitsInCellContent(currentCellContent));

  if (!isValidInputCell) return currentCellState;

  if (isMarkupDigitsInCellContent(currentCellContent)) {
    const currentMarkups =
      markupType === "Center"
        ? currentCellContent.centerMarkups.filter(isSudokuDigit)
        : currentCellContent.cornerMarkups.filter(isSudokuDigit);

    if (shouldMarkupDigitBeRemoved)
      return getCellStateWithRemovedMarkupDigit(
        currentCellState,
        currentMarkups,
        markupType,
        sudokuDigit,
      );

    return getCellStateWithAddedMarkupDigit(
      currentCellState,
      currentMarkups,
      markupType,
      sudokuDigit,
    );
  } else if (isEmptyCellContent(currentCellContent))
    return getCellStateWithAnEmptyMarkupType(
      currentCellState,
      markupType,
      sudokuDigit,
    );

  return currentCellState;
};

// #region Center Markup Input Action
export const handleCenterMarkupInput = (
  puzzleHistory: PuzzleHistory,
  sudokuDigit: SudokuDigit,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) => {
  const currentBoardState =
    getCurrentBoardStateFromPuzzleHistory(puzzleHistory);

  const shouldMarkupDigitBeRemoved =
    areAllSelectedCellsGivenEnteredOrContainSudokuDigitAsMarkup(
      currentBoardState,
      "Center",
      sudokuDigit,
    );

  const nextBoardState: BoardState = currentBoardState.map((currentCellState) =>
    getMarkupDigitsCellState(
      "Center",
      currentCellState,
      shouldMarkupDigitBeRemoved,
      sudokuDigit,
    ),
  );

  commitBoardStateToHistoryIfChanged(
    currentBoardState,
    nextBoardState,
    setPuzzleHistory,
  );
};
// #endregion

// #region Corner Markup Input Action
export const handleCornerMarkupInput = (
  puzzleHistory: PuzzleHistory,
  sudokuDigit: SudokuDigit,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) => {
  const currentBoardState =
    getCurrentBoardStateFromPuzzleHistory(puzzleHistory);

  const shouldMarkupDigitBeRemoved =
    areAllSelectedCellsGivenEnteredOrContainSudokuDigitAsMarkup(
      currentBoardState,
      "Corner",
      sudokuDigit,
    );

  const nextBoardState: BoardState = currentBoardState.map((currentCellState) =>
    getMarkupDigitsCellState(
      "Corner",
      currentCellState,
      shouldMarkupDigitBeRemoved,
      sudokuDigit,
    ),
  );

  commitBoardStateToHistoryIfChanged(
    currentBoardState,
    nextBoardState,
    setPuzzleHistory,
  );
};
// #endregion

// #endregion

// #region Markup Color Input Action
const getZeroBasedIndexFromSudokuDigit = (sudokuDigit: SudokuDigit): number =>
  Number(sudokuDigit) - 1;

const doAllSelectedCellsHaveTheMarkupColor = (
  currentBoardState: BoardState,
  markupColor: MarkupColor,
): boolean =>
  currentBoardState
    .filter((currentCellState) => currentCellState.isSelected)
    .every((currentCellState) =>
      currentCellState.markupColors
        .filter((currentMarkupColor) => currentMarkupColor !== "")
        .includes(markupColor),
    );

const getCellStateWithRemovedMarkupColor = (
  currentCellState: CellState,
  currentMarkupColors: Array<MarkupColor>,
  markupColor: MarkupColor,
): CellState => {
  const cellContentAfterRemoveCheck: Array<MarkupColor> =
    currentMarkupColors.filter(
      (currentMarkupColor) => currentMarkupColor !== markupColor,
    );

  if (cellContentAfterRemoveCheck.length > 0) {
    const nextCellState: CellState = {
      ...currentCellState,
      markupColors: cellContentAfterRemoveCheck,
    };

    return nextCellState;
  }

  const nextCellState: CellState = {
    ...currentCellState,
    markupColors: [""],
  };

  return nextCellState;
};

const getCellStateWithAddedMarkupColor = (
  currentCellState: CellState,
  currentMarkupColors: Array<MarkupColor>,
  markupColor: MarkupColor,
): CellState => {
  const cellContentAfterAddCheck: Array<MarkupColor> =
    currentMarkupColors.includes(markupColor)
      ? currentMarkupColors
      : [...currentMarkupColors, markupColor];

  const nextCellState: CellState = {
    ...currentCellState,
    markupColors: cellContentAfterAddCheck,
  };

  return nextCellState;
};

const getMarkupColorsCellState = (
  currentCellState: CellState,
  markupColor: MarkupColor,
  shouldMarkupColorBeRemoved: boolean,
): CellState => {
  if (!currentCellState.isSelected) return currentCellState;

  const currentMarkupColors = currentCellState.markupColors.filter(
    (currentMarkupColor) => currentMarkupColor !== "",
  );

  return shouldMarkupColorBeRemoved
    ? getCellStateWithRemovedMarkupColor(
        currentCellState,
        currentMarkupColors,
        markupColor,
      )
    : getCellStateWithAddedMarkupColor(
        currentCellState,
        currentMarkupColors,
        markupColor,
      );
};

export const handleColorPadInput = (
  puzzleHistory: PuzzleHistory,
  markupValue: MarkupColor | SudokuDigit,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) => {
  const markupColor: MarkupColor = isSudokuDigit(markupValue)
    ? markupColors[getZeroBasedIndexFromSudokuDigit(markupValue)]
    : markupValue;

  const currentBoardState =
    getCurrentBoardStateFromPuzzleHistory(puzzleHistory);

  const shouldMarkupColorBeRemoved = doAllSelectedCellsHaveTheMarkupColor(
    currentBoardState,
    markupColor,
  );

  const nextBoardState: BoardState = currentBoardState.map((currentCellState) =>
    getMarkupColorsCellState(
      currentCellState,
      markupColor,
      shouldMarkupColorBeRemoved,
    ),
  );

  commitBoardStateToHistoryIfChanged(
    currentBoardState,
    nextBoardState,
    setPuzzleHistory,
  );
};
// #endregion

// #endregion

// #region Clear Cell Action
export const handleClearCell = (
  puzzleHistory: PuzzleHistory,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) => {
  const currentBoardState =
    getCurrentBoardStateFromPuzzleHistory(puzzleHistory);

  const nextBoardState: BoardState = currentBoardState.map(
    (currentCellState) => {
      if (!currentCellState.isSelected) return currentCellState;

      if (isGivenDigitInCellContent(currentCellState.cellContent)) {
        const nextCellState: CellState = {
          ...currentCellState,
          markupColors: [""],
        };

        return nextCellState;
      }

      const nextCellState: CellState = {
        ...currentCellState,
        cellContent: {
          emptyCell: "",
        },
        markupColors: [""],
      };

      return nextCellState;
    },
  );

  commitBoardStateToHistoryIfChanged(
    currentBoardState,
    nextBoardState,
    setPuzzleHistory,
  );
};
// #endregion

// #region Undo/Redo Actions
const canMoveBoardStateIndex = (
  indexDelta: -1 | 1,
  puzzleHistory: PuzzleHistory,
) => {
  const candidateIndex = puzzleHistory.currentBoardStateIndex + indexDelta;

  const canMoveIndex =
    candidateIndex >= 0 &&
    candidateIndex < puzzleHistory.boardStateHistory.length;

  return canMoveIndex;
};

const getPuzzleHistoryWithUpdatedIndex = (
  currentPuzzleHistory: PuzzleHistory,
  indexDelta: -1 | 1,
): PuzzleHistory => ({
  ...currentPuzzleHistory,
  currentBoardStateIndex:
    currentPuzzleHistory.currentBoardStateIndex + indexDelta,
});

const updateBoardStateIndex = (
  indexDelta: -1 | 1,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  setPuzzleHistory((currentPuzzleHistory) => {
    const nextPuzzleHistory = canMoveBoardStateIndex(
      indexDelta,
      currentPuzzleHistory,
    )
      ? getPuzzleHistoryWithUpdatedIndex(currentPuzzleHistory, indexDelta)
      : currentPuzzleHistory;

    return nextPuzzleHistory;
  });

// #region Undo Move Action
export const handleUndoMove = (
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) => updateBoardStateIndex(-1, setPuzzleHistory);
// #endregion

// #region Redo Move Action
export const handleRedoMove = (
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) => updateBoardStateIndex(1, setPuzzleHistory);
// #endregion

// #endregion
