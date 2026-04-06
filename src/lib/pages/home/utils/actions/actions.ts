import { type Dispatch, type SetStateAction } from "react";

import { markupColors } from "@/lib/pages/home/utils/constants";
import {
  isEmptyCellContent,
  isEnteredDigitInCellContent,
  isGivenDigitInCellContent,
  isMarkupDigitsInCellContent,
  isNonEmptyMarkupColor,
} from "@/lib/pages/home/utils/guards";
import { getCurrentBoardStateFromPuzzleState } from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellState,
  type KeypadMode,
  type MarkupColor,
  type MarkupDigitsCellContent,
  type PuzzleState,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";
import { isSudokuDigit } from "@/lib/pages/home/utils/validators/validators";

// #region Input Actions
const commitBoardStateToPuzzleHistoryIfChanged = (
  currentBoardState: BoardState,
  nextBoardState: BoardState,
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) => {
  const hasReferenceDifferences = currentBoardState.some(
    (cellState, cellIndex) => cellState !== nextBoardState[cellIndex],
  );

  const didBoardStateChange =
    hasReferenceDifferences &&
    JSON.stringify(nextBoardState) !== JSON.stringify(currentBoardState);

  if (!didBoardStateChange) return;

  setPuzzleState((currentPuzzleState) => {
    const nextHistoryIndex = currentPuzzleState.historyIndex + 1;

    const nextPuzzleHistory = [
      ...currentPuzzleState.puzzleHistory.slice(0, nextHistoryIndex),
      nextBoardState,
    ];

    const nextPuzzleState = {
      historyIndex: nextHistoryIndex,
      puzzleHistory: nextPuzzleHistory,
    };

    return nextPuzzleState;
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
      isGivenDigitInCellContent(currentCellState.content) ||
      (isEnteredDigitInCellContent(currentCellState.content) &&
        currentCellState.content.enteredDigit === sudokuDigit),
  );

const getEnteredDigitCellState = (
  currentCellState: CellState,
  shouldEnteredDigitBeRemoved: boolean,
  sudokuDigit: SudokuDigit,
): CellState => {
  const isValidInputCell =
    currentCellState.isSelected &&
    !isGivenDigitInCellContent(currentCellState.content);

  if (!isValidInputCell) return currentCellState;

  if (shouldEnteredDigitBeRemoved) {
    const emptyEnteredDigitCellState: CellState = {
      ...currentCellState,
      content: {
        emptyCell: "",
      },
    };

    return emptyEnteredDigitCellState;
  }

  const addedEnteredDigitCellState: CellState = {
    ...currentCellState,
    content: {
      enteredDigit: sudokuDigit,
    },
  };

  return addedEnteredDigitCellState;
};

export const handleDigitInput = (
  puzzleState: PuzzleState,
  sudokuDigit: SudokuDigit,
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) => {
  const currentBoardState = getCurrentBoardStateFromPuzzleState(puzzleState);

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

  commitBoardStateToPuzzleHistoryIfChanged(
    currentBoardState,
    nextBoardState,
    setPuzzleState,
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
    const cellContent = currentCellState.content;

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
  const currentCellContent = currentCellState.content;

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
    content: cellContentAfterRemoveCheck,
  };

  return nextCellState;
};

const getCellStateWithAddedMarkupDigit = (
  currentCellState: CellState,
  currentMarkups: Array<SudokuDigit>,
  markupType: MarkupType,
  sudokuDigit: SudokuDigit,
): CellState => {
  const currentCellContent = currentCellState.content;

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
    content: cellContentAfterAddCheck,
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
    content: nextMarkupDigitsCellContent,
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

  const currentCellContent = currentCellState.content;

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

const handleMarkupInput = (
  markupType: MarkupType,
  puzzleState: PuzzleState,
  sudokuDigit: SudokuDigit,
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) => {
  const currentBoardState = getCurrentBoardStateFromPuzzleState(puzzleState);

  const shouldMarkupDigitBeRemoved =
    areAllSelectedCellsGivenEnteredOrContainSudokuDigitAsMarkup(
      currentBoardState,
      markupType,
      sudokuDigit,
    );

  const nextBoardState: BoardState = currentBoardState.map((currentCellState) =>
    getMarkupDigitsCellState(
      markupType,
      currentCellState,
      shouldMarkupDigitBeRemoved,
      sudokuDigit,
    ),
  );

  commitBoardStateToPuzzleHistoryIfChanged(
    currentBoardState,
    nextBoardState,
    setPuzzleState,
  );
};

// #region Center Markup Input Action
export const handleCenterMarkupInput = (
  puzzleState: PuzzleState,
  sudokuDigit: SudokuDigit,
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) => handleMarkupInput("Center", puzzleState, sudokuDigit, setPuzzleState);
// #endregion

// #region Corner Markup Input Action
export const handleCornerMarkupInput = (
  puzzleState: PuzzleState,
  sudokuDigit: SudokuDigit,
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) => handleMarkupInput("Corner", puzzleState, sudokuDigit, setPuzzleState);
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
        .filter(isNonEmptyMarkupColor)
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
    isNonEmptyMarkupColor,
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
  puzzleState: PuzzleState,
  markupValue: MarkupColor | SudokuDigit,
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) => {
  const markupColor: MarkupColor = isSudokuDigit(markupValue)
    ? markupColors[getZeroBasedIndexFromSudokuDigit(markupValue)]
    : markupValue;

  const currentBoardState = getCurrentBoardStateFromPuzzleState(puzzleState);

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

  commitBoardStateToPuzzleHistoryIfChanged(
    currentBoardState,
    nextBoardState,
    setPuzzleState,
  );
};
// #endregion

// #endregion

// #region Clear Cell Action
export const handleClearCell = (
  puzzleState: PuzzleState,
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) => {
  const currentBoardState = getCurrentBoardStateFromPuzzleState(puzzleState);

  const nextBoardState: BoardState = currentBoardState.map(
    (currentCellState) => {
      if (!currentCellState.isSelected) return currentCellState;

      if (isGivenDigitInCellContent(currentCellState.content)) {
        const nextCellState: CellState = {
          ...currentCellState,
          markupColors: [""],
        };

        return nextCellState;
      }

      const nextCellState: CellState = {
        ...currentCellState,
        content: {
          emptyCell: "",
        },
        markupColors: [""],
      };

      return nextCellState;
    },
  );

  commitBoardStateToPuzzleHistoryIfChanged(
    currentBoardState,
    nextBoardState,
    setPuzzleState,
  );
};
// #endregion

// #region Undo/Redo Actions
const canMoveHistoryIndex = (indexDelta: -1 | 1, puzzleState: PuzzleState) => {
  const candidateIndex = puzzleState.historyIndex + indexDelta;

  const canMoveIndex =
    candidateIndex >= 0 && candidateIndex < puzzleState.puzzleHistory.length;

  return canMoveIndex;
};

const getPuzzleStateWithUpdatedIndex = (
  currentPuzzleState: PuzzleState,
  indexDelta: -1 | 1,
): PuzzleState => ({
  ...currentPuzzleState,
  historyIndex: currentPuzzleState.historyIndex + indexDelta,
});

const updateHistoryIndex = (
  indexDelta: -1 | 1,
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) =>
  setPuzzleState((currentPuzzleState) => {
    const nextPuzzleState = canMoveHistoryIndex(indexDelta, currentPuzzleState)
      ? getPuzzleStateWithUpdatedIndex(currentPuzzleState, indexDelta)
      : currentPuzzleState;

    return nextPuzzleState;
  });

// #region Undo Move Action
export const handleUndoMove = (
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) => updateHistoryIndex(-1, setPuzzleState);
// #endregion

// #region Redo Move Action
export const handleRedoMove = (
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) => updateHistoryIndex(1, setPuzzleState);
// #endregion

// #endregion
