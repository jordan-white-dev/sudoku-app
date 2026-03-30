import { SimpleGrid } from "@chakra-ui/react";
import {
  type Dispatch,
  type PointerEvent,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { Cell } from "@/lib/pages/home/components/cell";
import { useUserSettings } from "@/lib/pages/home/hooks/use-user-settings";
import {
  getBoardStateWithNoCellsSelected,
  getCurrentBoardStateFromPuzzleHistory,
  getGivenOrEnteredDigitInCellIfPresent,
} from "@/lib/pages/home/model/transforms";
import {
  type BoardState,
  type CellNumber,
  type CellState,
  type ColumnNumber,
  type PuzzleHistory,
  type RowNumber,
  type SudokuDigit,
} from "@/lib/pages/home/model/types";
import {
  isCellNumber,
  isColumnNumber,
  isRowNumber,
} from "@/lib/pages/home/model/validators";

// #region Arrow Key Direction
type ArrowKeyDirection = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

const arrowKeyDirectionOffsets: Record<
  ArrowKeyDirection,
  { columnOffset: number; rowOffset: number }
> = {
  ArrowUp: { columnOffset: 0, rowOffset: -1 },
  ArrowDown: { columnOffset: 0, rowOffset: 1 },
  ArrowLeft: { columnOffset: -1, rowOffset: 0 },
  ArrowRight: { columnOffset: 1, rowOffset: 0 },
};

const isArrowKeyDirection = (
  keyboardKey: string,
): keyboardKey is ArrowKeyDirection => keyboardKey in arrowKeyDirectionOffsets;
// #endregion

// #region Conflict Cell Checking
const getEmptyDigitOccurrencesByRegion = (): Array<
  Map<SudokuDigit, Array<CellNumber>>
> => Array.from({ length: 9 }, () => new Map());

const addSudokuDigitOccurrenceToRegion = (
  cellNumber: CellNumber,
  sudokuDigit: SudokuDigit,
  sudokuDigitOccurrencesByRegion: Map<SudokuDigit, Array<CellNumber>>,
): void => {
  const matchingCellNumbers =
    sudokuDigitOccurrencesByRegion.get(sudokuDigit) ?? [];
  matchingCellNumbers.push(cellNumber);
  sudokuDigitOccurrencesByRegion.set(sudokuDigit, matchingCellNumbers);
};

const addConflictedCellNumbersFromRegion = (
  conflictedCellNumbers: Set<CellNumber>,
  sudokuDigitOccurrencesByRegion: Map<SudokuDigit, Array<CellNumber>>,
): void => {
  for (const matchingCellNumbers of sudokuDigitOccurrencesByRegion.values()) {
    if (matchingCellNumbers.length <= 1) continue;

    for (const cellNumber of matchingCellNumbers)
      conflictedCellNumbers.add(cellNumber);
  }
};

const addConflictedCellNumbersFromRegions = (
  conflictedCellNumbers: Set<CellNumber>,
  sudokuDigitOccurrencesByRegion: Array<Map<SudokuDigit, Array<CellNumber>>>,
): void => {
  for (const sudokuDigitOccurrenceByRegion of sudokuDigitOccurrencesByRegion)
    addConflictedCellNumbersFromRegion(
      conflictedCellNumbers,
      sudokuDigitOccurrenceByRegion,
    );
};

const getConflictedCellNumbers = (boardState: BoardState): Set<CellNumber> => {
  const conflictedCellNumbers = new Set<CellNumber>();

  const sudokuDigitOccurrencesByBox = getEmptyDigitOccurrencesByRegion();
  const sudokuDigitOccurrencesByColumn = getEmptyDigitOccurrencesByRegion();
  const sudokuDigitOccurrencesByRow = getEmptyDigitOccurrencesByRegion();

  for (const cellState of boardState) {
    const sudokuDigit = getGivenOrEnteredDigitInCellIfPresent(
      cellState.cellContent,
    );

    if (sudokuDigit === "") continue;

    addSudokuDigitOccurrenceToRegion(
      cellState.cellNumber,
      sudokuDigit,
      sudokuDigitOccurrencesByRow[cellState.rowNumber - 1],
    );
    addSudokuDigitOccurrenceToRegion(
      cellState.cellNumber,
      sudokuDigit,
      sudokuDigitOccurrencesByColumn[cellState.columnNumber - 1],
    );
    addSudokuDigitOccurrenceToRegion(
      cellState.cellNumber,
      sudokuDigit,
      sudokuDigitOccurrencesByBox[cellState.boxNumber - 1],
    );
  }

  addConflictedCellNumbersFromRegions(
    conflictedCellNumbers,
    sudokuDigitOccurrencesByRow,
  );
  addConflictedCellNumbersFromRegions(
    conflictedCellNumbers,
    sudokuDigitOccurrencesByColumn,
  );
  addConflictedCellNumbersFromRegions(
    conflictedCellNumbers,
    sudokuDigitOccurrencesByBox,
  );

  return conflictedCellNumbers;
};
// #endregion

// #region Cell Selection
const didBoardStateChange = (
  currentBoardState: BoardState,
  nextBoardState: BoardState,
): boolean =>
  currentBoardState.some(
    (cellState, cellIndex) => cellState !== nextBoardState[cellIndex],
  );

// #region Add to Cell Selection + Move Cell Selection
const isCellSelected = (
  boardState: BoardState,
  candidateCellNumber: CellNumber,
): boolean =>
  boardState.some(
    (cellState) =>
      cellState.cellNumber === candidateCellNumber && cellState.isSelected,
  );

const getSelectedCellStates = (boardState: BoardState): Array<CellState> =>
  boardState.filter((cellState) => cellState.isSelected);

const getSelectionAnchorCellNumber = (
  boardState: BoardState,
  lastSelectedCellNumber: CellNumber | undefined,
): CellNumber | undefined => {
  if (
    lastSelectedCellNumber !== undefined &&
    isCellSelected(boardState, lastSelectedCellNumber)
  )
    return lastSelectedCellNumber;

  const selectedCellStates = getSelectedCellStates(boardState);
  return selectedCellStates[selectedCellStates.length - 1]?.cellNumber;
};

const getWrappedCellNumberInDirection = (
  arrowKeyDirection: ArrowKeyDirection,
  startingCellNumber: CellNumber,
): CellNumber => {
  const zeroBasedStartingCellNumber = startingCellNumber - 1;
  const startingColumnNumber = zeroBasedStartingCellNumber % 9;
  const startingRowNumber = Math.floor(zeroBasedStartingCellNumber / 9);

  const { columnOffset, rowOffset } =
    arrowKeyDirectionOffsets[arrowKeyDirection];

  const wrappedColumnNumber = (startingColumnNumber + columnOffset + 9) % 9;
  const wrappedRowNumber = (startingRowNumber + rowOffset + 9) % 9;
  const candidateCellNumber = wrappedRowNumber * 9 + wrappedColumnNumber + 1;

  if (!isCellNumber(candidateCellNumber))
    throw Error(
      `Failed to get a wrapped CellNumber from "${startingCellNumber}" in arrow key direction "${arrowKeyDirection}".`,
    );

  return candidateCellNumber;
};

const handleMoveOrAddToCellSelection = (
  arrowKeyDirection: ArrowKeyDirection,
  lastSelectedCellNumber: CellNumber | undefined,
  getBoardStateForCellSelectionAddOrMove: (
    boardState: BoardState,
    targetCellNumber: CellNumber,
  ) => BoardState,
  setLastSelectedCellNumber: (cellNumber: CellNumber) => void,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  setPuzzleHistory((currentPuzzleHistory) => {
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(currentPuzzleHistory);

    const selectionAnchorCellNumber = getSelectionAnchorCellNumber(
      currentBoardState,
      lastSelectedCellNumber,
    );

    if (selectionAnchorCellNumber === undefined) return currentPuzzleHistory;

    const nextCellNumber = getWrappedCellNumberInDirection(
      arrowKeyDirection,
      selectionAnchorCellNumber,
    );

    const nextBoardState = getBoardStateForCellSelectionAddOrMove(
      currentBoardState,
      nextCellNumber,
    );

    if (!didBoardStateChange(currentBoardState, nextBoardState))
      return currentPuzzleHistory;

    setLastSelectedCellNumber(nextCellNumber);

    const nextBoardStateHistory = currentPuzzleHistory.boardStateHistory.map(
      (boardState, boardStateIndex) =>
        boardStateIndex === currentPuzzleHistory.currentBoardStateIndex
          ? nextBoardState
          : boardState,
    );

    const nextPuzzleHistory = {
      currentBoardStateIndex: currentPuzzleHistory.currentBoardStateIndex,
      boardStateHistory: nextBoardStateHistory,
    };

    return nextPuzzleHistory;
  });

const getBoardStateWithTargetCellAddedToSelection = (
  boardState: BoardState,
  targetCellNumber: CellNumber,
): BoardState =>
  boardState.map((cellState) =>
    cellState.cellNumber === targetCellNumber && !cellState.isSelected
      ? {
          ...cellState,
          isSelected: true,
        }
      : cellState,
  );

const handleAddToCellSelectionInDirection = (
  arrowKeyDirection: ArrowKeyDirection,
  lastSelectedCellNumber: CellNumber | undefined,
  setLastSelectedCellNumber: (cellNumber: CellNumber) => void,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  handleMoveOrAddToCellSelection(
    arrowKeyDirection,
    lastSelectedCellNumber,
    getBoardStateWithTargetCellAddedToSelection,
    setLastSelectedCellNumber,
    setPuzzleHistory,
  );

const getBoardStateWithOnlyTargetCellSelected = (
  boardState: BoardState,
  targetCellNumber: CellNumber,
): BoardState =>
  boardState.map((cellState) => {
    const shouldBeSelected = cellState.cellNumber === targetCellNumber;

    const nextBoardState =
      shouldBeSelected === cellState.isSelected
        ? cellState
        : {
            ...cellState,
            isSelected: shouldBeSelected,
          };

    return nextBoardState;
  });

const handleMoveSingleCellSelectionInDirection = (
  arrowKeyDirection: ArrowKeyDirection,
  lastSelectedCellNumber: CellNumber | undefined,
  setLastSelectedCellNumber: (cellNumber: CellNumber) => void,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  handleMoveOrAddToCellSelection(
    arrowKeyDirection,
    lastSelectedCellNumber,
    getBoardStateWithOnlyTargetCellSelected,
    setLastSelectedCellNumber,
    setPuzzleHistory,
  );
// #endregion

// #region All Cells Selection Change
const handleAllCellsSelectionChange = (
  getNextBoardState: (currentBoardState: BoardState) => BoardState,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  setPuzzleHistory((currentPuzzleHistory) => {
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(currentPuzzleHistory);

    const nextBoardState = getNextBoardState(currentBoardState);

    if (!didBoardStateChange(currentBoardState, nextBoardState))
      return currentPuzzleHistory;

    const nextBoardStateHistory = currentPuzzleHistory.boardStateHistory.map(
      (boardState, boardStateIndex) =>
        boardStateIndex === currentPuzzleHistory.currentBoardStateIndex
          ? nextBoardState
          : boardState,
    );

    const nextPuzzleHistory = {
      currentBoardStateIndex: currentPuzzleHistory.currentBoardStateIndex,
      boardStateHistory: nextBoardStateHistory,
    };

    return nextPuzzleHistory;
  });

const handleDeselectAllCells = (
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  handleAllCellsSelectionChange(
    getBoardStateWithNoCellsSelected,
    setPuzzleHistory,
  );

const getBoardStateWithAllCellsSelected = (
  boardState: BoardState,
): BoardState =>
  boardState.map((cellState) =>
    cellState.isSelected
      ? cellState
      : {
          ...cellState,
          isSelected: true,
        },
  );

const handleSelectAllCells = (
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  handleAllCellsSelectionChange(
    getBoardStateWithAllCellsSelected,
    setPuzzleHistory,
  );

const getBoardStateWithInvertedCellsSelected = (
  boardState: BoardState,
): BoardState =>
  boardState.map((cellState) => ({
    ...cellState,
    isSelected: !cellState.isSelected,
  }));

const handleInvertSelectedCells = (
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  handleAllCellsSelectionChange(
    getBoardStateWithInvertedCellsSelected,
    setPuzzleHistory,
  );
// #endregion

// #endregion

// #region Pointer Drag Handling
type BoardPosition = {
  cellNumber: CellNumber;
  columnNumber: ColumnNumber;
  rowNumber: RowNumber;
};

const handleBoardPointerUpOrCancel = (
  currentBoardPositionDuringDragRef: RefObject<BoardPosition | undefined>,
  isPointerDraggingAcrossBoardRef: RefObject<boolean>,
) => {
  isPointerDraggingAcrossBoardRef.current = false;
  currentBoardPositionDuringDragRef.current = undefined;
};

const getBoardPositionFromPointerCoordinates = (
  boardElement: HTMLDivElement,
  pointerClientX: number,
  pointerClientY: number,
): BoardPosition | undefined => {
  const boardBounds = boardElement.getBoundingClientRect();

  const isPointerOutsideBoardHorizontally =
    pointerClientX < boardBounds.left || pointerClientX > boardBounds.right;
  const isPointerOutsideBoardVertically =
    pointerClientY < boardBounds.top || pointerClientY > boardBounds.bottom;

  if (isPointerOutsideBoardHorizontally || isPointerOutsideBoardVertically)
    return undefined;

  const cellHeight = boardBounds.height / 9;
  const cellWidth = boardBounds.width / 9;

  const zeroBasedColumnNumber = Math.min(
    8,
    Math.max(0, Math.floor((pointerClientX - boardBounds.left) / cellWidth)),
  );
  const zeroBasedRowNumber = Math.min(
    8,
    Math.max(0, Math.floor((pointerClientY - boardBounds.top) / cellHeight)),
  );

  const cellNumber = zeroBasedRowNumber * 9 + zeroBasedColumnNumber + 1;
  const columnNumber = zeroBasedColumnNumber + 1;
  const rowNumber = zeroBasedRowNumber + 1;

  if (
    isCellNumber(cellNumber) &&
    isColumnNumber(columnNumber) &&
    isRowNumber(rowNumber)
  ) {
    const boardPosition = {
      cellNumber,
      columnNumber,
      rowNumber,
    };

    return boardPosition;
  }

  throw Error(
    `Failed to get BoardPosition from pointer coordinates x: "${pointerClientX}" and y: "${pointerClientY}".`,
  );
};

const handleMultiCellSelectionDuringPointerDrag = (
  cellNumbersCrossedDuringDrag: Array<CellNumber>,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  setPuzzleHistory((currentPuzzleHistory) => {
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(currentPuzzleHistory);

    const draggedCellNumbers = new Set(cellNumbersCrossedDuringDrag);

    const boardStateAfterSelectionsCheck = currentBoardState.map(
      (cellState) => {
        const shouldBeSelected = draggedCellNumbers.has(cellState.cellNumber);

        if (!shouldBeSelected || cellState.isSelected) return cellState;

        const nextCellState = {
          ...cellState,
          isSelected: true,
        };

        return nextCellState;
      },
    );

    const didSelectedCellsChange = currentBoardState.some(
      (cellState, cellIndex) =>
        cellState !== boardStateAfterSelectionsCheck[cellIndex],
    );

    if (!didSelectedCellsChange) return currentPuzzleHistory;

    const nextBoardStateHistory = currentPuzzleHistory.boardStateHistory.map(
      (boardState, boardStateIndex) =>
        boardStateIndex === currentPuzzleHistory.currentBoardStateIndex
          ? boardStateAfterSelectionsCheck
          : boardState,
    );

    const nextPuzzleHistory = {
      currentBoardStateIndex: currentPuzzleHistory.currentBoardStateIndex,
      boardStateHistory: nextBoardStateHistory,
    };

    return nextPuzzleHistory;
  });

const getCellNumberFromRowAndColumn = (
  rowNumber: RowNumber,
  columnNumber: ColumnNumber,
): CellNumber => {
  const candidateCellNumber = (rowNumber - 1) * 9 + columnNumber;

  if (!isCellNumber(candidateCellNumber))
    throw Error(
      `Failed to get a CellNumber from RowNumber "${rowNumber}" and ColumnNumber "${columnNumber}".`,
    );

  return candidateCellNumber;
};

const getCellNumbersBetweenBoardPositions = (
  endingBoardPosition: BoardPosition,
  startingBoardPosition: BoardPosition,
): Array<CellNumber> => {
  const columnDistance =
    endingBoardPosition.columnNumber - startingBoardPosition.columnNumber;
  const rowDistance =
    endingBoardPosition.rowNumber - startingBoardPosition.rowNumber;

  const interpolationStepCount = Math.max(
    Math.abs(rowDistance),
    Math.abs(columnDistance),
  );

  if (interpolationStepCount === 0) return [startingBoardPosition.cellNumber];

  const crossedCellNumbers = new Set<CellNumber>();

  for (
    let interpolationStepIndex = 0;
    interpolationStepIndex <= interpolationStepCount;
    interpolationStepIndex++
  ) {
    const interpolationProgress =
      interpolationStepIndex / interpolationStepCount;

    const interpolatedColumnNumber = Math.round(
      startingBoardPosition.columnNumber +
        columnDistance * interpolationProgress,
    );
    const interpolatedRowNumber = Math.round(
      startingBoardPosition.rowNumber + rowDistance * interpolationProgress,
    );

    if (
      isRowNumber(interpolatedRowNumber) &&
      isColumnNumber(interpolatedColumnNumber)
    ) {
      const interpolatedCellNumber = getCellNumberFromRowAndColumn(
        interpolatedRowNumber,
        interpolatedColumnNumber,
      );

      crossedCellNumbers.add(interpolatedCellNumber);
    }
  }

  return [...crossedCellNumbers];
};

const handleBoardPointerMove = (
  boardRef: RefObject<HTMLDivElement | null>,
  currentBoardPositionDuringDragRef: RefObject<BoardPosition | undefined>,
  event: PointerEvent<HTMLDivElement>,
  isPointerDraggingAcrossBoardRef: RefObject<boolean>,
  lastSelectedCellNumberRef: RefObject<CellNumber | undefined>,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) => {
  if (!isPointerDraggingAcrossBoardRef.current) return;

  const boardElement = boardRef.current;

  if (boardElement === null) return;

  const candidateBoardPosition = getBoardPositionFromPointerCoordinates(
    boardElement,
    event.clientX,
    event.clientY,
  );

  if (candidateBoardPosition === undefined) return;

  const currentBoardPosition = currentBoardPositionDuringDragRef.current;

  if (
    currentBoardPosition !== undefined &&
    candidateBoardPosition.cellNumber === currentBoardPosition.cellNumber
  )
    return;

  if (currentBoardPosition === undefined) {
    currentBoardPositionDuringDragRef.current = candidateBoardPosition;
    lastSelectedCellNumberRef.current = candidateBoardPosition.cellNumber;

    handleMultiCellSelectionDuringPointerDrag(
      [candidateBoardPosition.cellNumber],
      setPuzzleHistory,
    );

    return;
  }

  const cellNumbersCrossedBetweenPositions =
    getCellNumbersBetweenBoardPositions(
      candidateBoardPosition,
      currentBoardPosition,
    );

  handleMultiCellSelectionDuringPointerDrag(
    cellNumbersCrossedBetweenPositions,
    setPuzzleHistory,
  );

  lastSelectedCellNumberRef.current = candidateBoardPosition.cellNumber;

  currentBoardPositionDuringDragRef.current = candidateBoardPosition;
};

const getColumnNumberFromCellNumber = (
  cellNumber: CellNumber,
): ColumnNumber => {
  const zeroBasedCellNumber = cellNumber - 1;

  const candidateColumnNumber = (zeroBasedCellNumber % 9) + 1;

  if (!isColumnNumber(candidateColumnNumber))
    throw Error(
      `Failed to get a ColumnNumber from CellNumber "${cellNumber}".`,
    );

  return candidateColumnNumber;
};

const getRowNumberFromCellNumber = (cellNumber: CellNumber): RowNumber => {
  const zeroBasedCellNumber = cellNumber - 1;

  const candidateRowNumber = Math.floor(zeroBasedCellNumber / 9) + 1;

  if (!isRowNumber(candidateRowNumber))
    throw Error(`Failed to get a RowNumber from CellNumber "${cellNumber}".`);

  return candidateRowNumber;
};

const getCellStateAfterSelectionCheck = (
  currentCellState: CellState,
  isMultiselectMode: boolean,
  selectedCellNumberWhenExactlyOneIsSelected: CellNumber | undefined,
  selectedCellsCount: number,
  targetCellNumber: CellNumber,
): CellState => {
  if (isMultiselectMode) {
    const isTargetCell = currentCellState.cellNumber === targetCellNumber;

    const nextCellState = isTargetCell
      ? {
          ...currentCellState,
          isSelected: !currentCellState.isSelected,
        }
      : currentCellState;

    return nextCellState;
  }

  const isThisTheOnlySelectedCell =
    selectedCellsCount === 1 &&
    selectedCellNumberWhenExactlyOneIsSelected === targetCellNumber;

  const shouldBeSelected =
    currentCellState.cellNumber === targetCellNumber
      ? !isThisTheOnlySelectedCell
      : false;

  const nextCellState =
    shouldBeSelected === currentCellState.isSelected
      ? currentCellState
      : {
          ...currentCellState,
          isSelected: shouldBeSelected,
        };

  return nextCellState;
};

const handleCellSelection = (
  isMultiselectMode: boolean,
  targetCellNumber: CellNumber,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  setPuzzleHistory((currentPuzzleHistory) => {
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(currentPuzzleHistory);

    const selectedCellsCount = currentBoardState.reduce(
      (selectedCount, cellState) =>
        cellState.isSelected ? selectedCount + 1 : selectedCount,
      0,
    );

    const selectedCellNumberWhenExactlyOneIsSelected =
      selectedCellsCount === 1
        ? currentBoardState.find((cellState) => cellState.isSelected)
            ?.cellNumber
        : undefined;

    const boardStateAfterSelectionCheck = currentBoardState.map(
      (currentCellState) =>
        getCellStateAfterSelectionCheck(
          currentCellState,
          isMultiselectMode,
          selectedCellNumberWhenExactlyOneIsSelected,
          selectedCellsCount,
          targetCellNumber,
        ),
    );

    const didBoardStateChange = currentBoardState.some(
      (cellState, cellIndex) =>
        cellState !== boardStateAfterSelectionCheck[cellIndex],
    );

    if (!didBoardStateChange) return currentPuzzleHistory;

    const nextBoardStateHistory = currentPuzzleHistory.boardStateHistory.map(
      (boardState, boardStateIndex) =>
        boardStateIndex === currentPuzzleHistory.currentBoardStateIndex
          ? boardStateAfterSelectionCheck
          : boardState,
    );

    const nextPuzzleHistory = {
      currentBoardStateIndex: currentPuzzleHistory.currentBoardStateIndex,
      boardStateHistory: nextBoardStateHistory,
    };

    return nextPuzzleHistory;
  });

const handleCellPointerDown = (
  boardRef: RefObject<HTMLDivElement | null>,
  currentBoardPositionDuringDragRef: RefObject<BoardPosition | undefined>,
  isMultiselectMode: boolean,
  isPointerDraggingAcrossBoardRef: RefObject<boolean>,
  lastSelectedCellNumberRef: RefObject<CellNumber | undefined>,
  targetCellNumber: CellNumber,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) => {
  isPointerDraggingAcrossBoardRef.current = true;

  const boardElement = boardRef.current;

  if (boardElement !== null) {
    const columnNumber = getColumnNumberFromCellNumber(targetCellNumber);
    const rowNumber = getRowNumberFromCellNumber(targetCellNumber);

    currentBoardPositionDuringDragRef.current = {
      cellNumber: targetCellNumber,
      columnNumber,
      rowNumber,
    };
  } else currentBoardPositionDuringDragRef.current = undefined;

  lastSelectedCellNumberRef.current = targetCellNumber;

  handleCellSelection(isMultiselectMode, targetCellNumber, setPuzzleHistory);
};
// #endregion

type BoardProps = {
  isMultiselectMode: boolean;
  puzzleHistory: PuzzleHistory;
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>;
};

export const Board = ({
  isMultiselectMode,
  puzzleHistory,
  setPuzzleHistory,
}: BoardProps) => {
  const { userSettings } = useUserSettings();

  const currentBoardState =
    getCurrentBoardStateFromPuzzleHistory(puzzleHistory);

  const conflictedCellNumbers = userSettings.isConflictCheckerEnabled
    ? getConflictedCellNumbers(currentBoardState)
    : new Set<CellNumber>();

  const selectedCells = currentBoardState.filter(
    (cellState) => cellState.isSelected,
  );

  const shouldShowSeenCells =
    userSettings.isShowSeenCellsEnabled && selectedCells.length === 1;

  const selectedColumnNumber =
    selectedCells.length === 1 ? selectedCells[0].columnNumber : undefined;
  const selectedRowNumber =
    selectedCells.length === 1 ? selectedCells[0].rowNumber : undefined;

  const boardRef = useRef<HTMLDivElement | null>(null);
  const isPointerDraggingAcrossBoardRef = useRef(false);
  const currentBoardPositionDuringDragRef = useRef<BoardPosition | undefined>(
    undefined,
  );
  const lastSelectedCellNumberRef = useRef<CellNumber | undefined>(undefined);

  const handleBoardCellPointerDown = useCallback(
    (targetCellNumber: CellNumber) => {
      handleCellPointerDown(
        boardRef,
        currentBoardPositionDuringDragRef,
        isMultiselectMode,
        isPointerDraggingAcrossBoardRef,
        lastSelectedCellNumberRef,
        targetCellNumber,
        setPuzzleHistory,
      );
    },
    [isMultiselectMode, setPuzzleHistory],
  );

  useEffect(() => {
    const handleAddToOrMoveCellSelection = (
      arrowKeyDirection: ArrowKeyDirection,
      event: KeyboardEvent,
    ) => {
      if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) return;

      if (event.ctrlKey || event.shiftKey) {
        event.preventDefault();

        handleAddToCellSelectionInDirection(
          arrowKeyDirection,
          lastSelectedCellNumberRef.current,
          (cellNumber) => (lastSelectedCellNumberRef.current = cellNumber),
          setPuzzleHistory,
        );

        return;
      }

      event.preventDefault();

      handleMoveSingleCellSelectionInDirection(
        arrowKeyDirection,
        lastSelectedCellNumberRef.current,
        (cellNumber) => (lastSelectedCellNumberRef.current = cellNumber),
        setPuzzleHistory,
      );

      return;
    };

    const handleCellSelectionShortcut = (
      event: KeyboardEvent,
      keyboardKey: string,
    ) => {
      const lowerCaseKey = keyboardKey.toLowerCase();

      if (lowerCaseKey === "a" && event.shiftKey) {
        event.preventDefault();
        handleDeselectAllCells(setPuzzleHistory);
        return;
      }

      if (lowerCaseKey === "a") {
        event.preventDefault();
        handleSelectAllCells(setPuzzleHistory);
        return;
      }

      if (lowerCaseKey === "i") {
        event.preventDefault();
        handleInvertSelectedCells(setPuzzleHistory);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const keyboardKey = event.key;

      if (isArrowKeyDirection(keyboardKey))
        handleAddToOrMoveCellSelection(keyboardKey, event);

      if (!event.ctrlKey || event.metaKey) return;

      handleCellSelectionShortcut(event, keyboardKey);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setPuzzleHistory]);

  return (
    <SimpleGrid
      border="2px solid black"
      columns={9}
      gap="0"
      minWidth={{
        base: "301px",
        sm: "463px",
        md: "724px",
      }}
      ref={boardRef}
      touchAction="none"
      onLostPointerCapture={() =>
        handleBoardPointerUpOrCancel(
          currentBoardPositionDuringDragRef,
          isPointerDraggingAcrossBoardRef,
        )
      }
      onPointerCancel={() =>
        handleBoardPointerUpOrCancel(
          currentBoardPositionDuringDragRef,
          isPointerDraggingAcrossBoardRef,
        )
      }
      onPointerMove={(event) =>
        handleBoardPointerMove(
          boardRef,
          currentBoardPositionDuringDragRef,
          event,
          isPointerDraggingAcrossBoardRef,
          lastSelectedCellNumberRef,
          setPuzzleHistory,
        )
      }
      onPointerUp={() =>
        handleBoardPointerUpOrCancel(
          currentBoardPositionDuringDragRef,
          isPointerDraggingAcrossBoardRef,
        )
      }
    >
      {currentBoardState.map((cellState) => (
        <Cell
          boardState={currentBoardState}
          cellState={cellState}
          handleCellPointerDown={handleBoardCellPointerDown}
          hasDigitConflict={conflictedCellNumbers.has(cellState.cellNumber)}
          isSeenInBox={
            shouldShowSeenCells &&
            selectedCells[0].boxNumber === cellState.boxNumber
          }
          isSeenInColumn={
            shouldShowSeenCells &&
            selectedCells[0].columnNumber === cellState.columnNumber
          }
          isSeenInRow={
            shouldShowSeenCells &&
            selectedCells[0].rowNumber === cellState.rowNumber
          }
          key={cellState.cellNumber}
          selectedColumnNumber={selectedColumnNumber}
          selectedRowNumber={selectedRowNumber}
          setPuzzleHistory={setPuzzleHistory}
        />
      ))}
    </SimpleGrid>
  );
};
