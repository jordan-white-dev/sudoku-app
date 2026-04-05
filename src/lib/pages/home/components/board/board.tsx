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

import { Cell } from "@/lib/pages/home/components/cell/cell";
import { useUserSettings } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import {
  getBoardStateWithNoCellsSelected,
  getCurrentBoardStateFromPuzzleHistory,
  getGivenOrEnteredDigitInCellIfPresent,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellId,
  type CellState,
  type ColumnNumber,
  type PuzzleHistory,
  type RowNumber,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";
import {
  isCellId,
  isColumnNumber,
  isRowNumber,
} from "@/lib/pages/home/utils/validators/validators";

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
const getEmptyDigitOccurrencesByHouse = (): Array<
  Map<SudokuDigit, Array<CellId>>
> => Array.from({ length: 9 }, () => new Map());

const addSudokuDigitOccurrenceToHouse = (
  cellId: CellId,
  sudokuDigit: SudokuDigit,
  sudokuDigitOccurrencesByHouse: Map<SudokuDigit, Array<CellId>>,
): void => {
  const matchingCellIds = sudokuDigitOccurrencesByHouse.get(sudokuDigit) ?? [];
  matchingCellIds.push(cellId);
  sudokuDigitOccurrencesByHouse.set(sudokuDigit, matchingCellIds);
};

const addConflictedCellIdsFromHouse = (
  conflictedCellIds: Set<CellId>,
  sudokuDigitOccurrencesByHouse: Map<SudokuDigit, Array<CellId>>,
): void => {
  for (const matchingCellIds of sudokuDigitOccurrencesByHouse.values()) {
    if (matchingCellIds.length <= 1) continue;

    for (const cellId of matchingCellIds) conflictedCellIds.add(cellId);
  }
};

const addConflictedCellIdsFromHouses = (
  conflictedCellIds: Set<CellId>,
  sudokuDigitOccurrencesByHouse: Array<Map<SudokuDigit, Array<CellId>>>,
): void => {
  for (const sudokuDigitOccurrenceByHouse of sudokuDigitOccurrencesByHouse)
    addConflictedCellIdsFromHouse(
      conflictedCellIds,
      sudokuDigitOccurrenceByHouse,
    );
};

const getConflictedCellIds = (boardState: BoardState): Set<CellId> => {
  const conflictedCellIds = new Set<CellId>();

  const sudokuDigitOccurrencesByBox = getEmptyDigitOccurrencesByHouse();
  const sudokuDigitOccurrencesByColumn = getEmptyDigitOccurrencesByHouse();
  const sudokuDigitOccurrencesByRow = getEmptyDigitOccurrencesByHouse();

  for (const cellState of boardState) {
    const sudokuDigit = getGivenOrEnteredDigitInCellIfPresent(
      cellState.content,
    );

    if (sudokuDigit === "") continue;

    addSudokuDigitOccurrenceToHouse(
      cellState.id,
      sudokuDigit,
      sudokuDigitOccurrencesByRow[cellState.houses.rowNumber - 1],
    );
    addSudokuDigitOccurrenceToHouse(
      cellState.id,
      sudokuDigit,
      sudokuDigitOccurrencesByColumn[cellState.houses.columnNumber - 1],
    );
    addSudokuDigitOccurrenceToHouse(
      cellState.id,
      sudokuDigit,
      sudokuDigitOccurrencesByBox[cellState.houses.boxNumber - 1],
    );
  }

  addConflictedCellIdsFromHouses(
    conflictedCellIds,
    sudokuDigitOccurrencesByRow,
  );
  addConflictedCellIdsFromHouses(
    conflictedCellIds,
    sudokuDigitOccurrencesByColumn,
  );
  addConflictedCellIdsFromHouses(
    conflictedCellIds,
    sudokuDigitOccurrencesByBox,
  );

  return conflictedCellIds;
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
  candidateCellId: CellId,
): boolean =>
  boardState.some(
    (cellState) => cellState.id === candidateCellId && cellState.isSelected,
  );

const getSelectedCellStates = (boardState: BoardState): Array<CellState> =>
  boardState.filter((cellState) => cellState.isSelected);

const getSelectionAnchorCellId = (
  boardState: BoardState,
  lastSelectedCellId: CellId | undefined,
): CellId | undefined => {
  if (
    lastSelectedCellId !== undefined &&
    isCellSelected(boardState, lastSelectedCellId)
  )
    return lastSelectedCellId;

  const selectedCellStates = getSelectedCellStates(boardState);
  return selectedCellStates[selectedCellStates.length - 1]?.id;
};

const getWrappedCellIdInDirection = (
  arrowKeyDirection: ArrowKeyDirection,
  startingCellId: CellId,
): CellId => {
  const zeroBasedStartingCellId = startingCellId - 1;
  const startingColumnNumber = zeroBasedStartingCellId % 9;
  const startingRowNumber = Math.floor(zeroBasedStartingCellId / 9);

  const { columnOffset, rowOffset } =
    arrowKeyDirectionOffsets[arrowKeyDirection];

  const wrappedColumnNumber = (startingColumnNumber + columnOffset + 9) % 9;
  const wrappedRowNumber = (startingRowNumber + rowOffset + 9) % 9;
  const candidateCellId = wrappedRowNumber * 9 + wrappedColumnNumber + 1;

  if (!isCellId(candidateCellId))
    throw Error(
      `Failed to get a wrapped CellId from "${startingCellId}" in arrow key direction "${arrowKeyDirection}".`,
    );

  return candidateCellId;
};

const handleMoveOrAddToCellSelection = (
  arrowKeyDirection: ArrowKeyDirection,
  lastSelectedCellId: CellId | undefined,
  getBoardStateForCellSelectionAddOrMove: (
    boardState: BoardState,
    targetCellId: CellId,
  ) => BoardState,
  setLastSelectedCellId: (cellId: CellId) => void,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  setPuzzleHistory((currentPuzzleHistory) => {
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(currentPuzzleHistory);

    const selectionAnchorCellId = getSelectionAnchorCellId(
      currentBoardState,
      lastSelectedCellId,
    );

    if (selectionAnchorCellId === undefined) return currentPuzzleHistory;

    const nextCellId = getWrappedCellIdInDirection(
      arrowKeyDirection,
      selectionAnchorCellId,
    );

    const nextBoardState = getBoardStateForCellSelectionAddOrMove(
      currentBoardState,
      nextCellId,
    );

    if (!didBoardStateChange(currentBoardState, nextBoardState))
      return currentPuzzleHistory;

    setLastSelectedCellId(nextCellId);

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
  targetCellId: CellId,
): BoardState =>
  boardState.map((cellState) =>
    cellState.id === targetCellId && !cellState.isSelected
      ? {
          ...cellState,
          isSelected: true,
        }
      : cellState,
  );

const handleAddToCellSelectionInDirection = (
  arrowKeyDirection: ArrowKeyDirection,
  lastSelectedCellId: CellId | undefined,
  setLastSelectedCellId: (cellId: CellId) => void,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  handleMoveOrAddToCellSelection(
    arrowKeyDirection,
    lastSelectedCellId,
    getBoardStateWithTargetCellAddedToSelection,
    setLastSelectedCellId,
    setPuzzleHistory,
  );

const getBoardStateWithOnlyTargetCellSelected = (
  boardState: BoardState,
  targetCellId: CellId,
): BoardState =>
  boardState.map((cellState) => {
    const shouldBeSelected = cellState.id === targetCellId;

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
  lastSelectedCellId: CellId | undefined,
  setLastSelectedCellId: (cellId: CellId) => void,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  handleMoveOrAddToCellSelection(
    arrowKeyDirection,
    lastSelectedCellId,
    getBoardStateWithOnlyTargetCellSelected,
    setLastSelectedCellId,
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
  cellId: CellId;
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

  const cellId = zeroBasedRowNumber * 9 + zeroBasedColumnNumber + 1;
  const columnNumber = zeroBasedColumnNumber + 1;
  const rowNumber = zeroBasedRowNumber + 1;

  if (
    isCellId(cellId) &&
    isColumnNumber(columnNumber) &&
    isRowNumber(rowNumber)
  ) {
    const boardPosition = {
      cellId: cellId,
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
  cellIdsCrossedDuringDrag: Array<CellId>,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) =>
  setPuzzleHistory((currentPuzzleHistory) => {
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(currentPuzzleHistory);

    const draggedCellIds = new Set(cellIdsCrossedDuringDrag);

    const boardStateAfterSelectionsCheck = currentBoardState.map(
      (cellState) => {
        const shouldBeSelected = draggedCellIds.has(cellState.id);

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

const getCellIdFromRowAndColumn = (
  rowNumber: RowNumber,
  columnNumber: ColumnNumber,
): CellId => {
  const candidateCellId = (rowNumber - 1) * 9 + columnNumber;

  if (!isCellId(candidateCellId))
    throw Error(
      `Failed to get a CellId from RowNumber "${rowNumber}" and ColumnNumber "${columnNumber}".`,
    );

  return candidateCellId;
};

const getCellIdsBetweenBoardPositions = (
  endingBoardPosition: BoardPosition,
  startingBoardPosition: BoardPosition,
): Array<CellId> => {
  const columnDistance =
    endingBoardPosition.columnNumber - startingBoardPosition.columnNumber;
  const rowDistance =
    endingBoardPosition.rowNumber - startingBoardPosition.rowNumber;

  const interpolationStepCount = Math.max(
    Math.abs(rowDistance),
    Math.abs(columnDistance),
  );

  if (interpolationStepCount === 0) return [startingBoardPosition.cellId];

  const crossedCellIds = new Set<CellId>(
    Array.from(
      { length: interpolationStepCount + 1 },
      (_, interpolationStepIndex) => {
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
          const interpolatedCellId = getCellIdFromRowAndColumn(
            interpolatedRowNumber,
            interpolatedColumnNumber,
          );

          return interpolatedCellId;
        }

        return null;
      },
    ).filter((cellId): cellId is CellId => cellId !== null),
  );

  return [...crossedCellIds];
};

const handleBoardPointerMove = (
  boardRef: RefObject<HTMLDivElement | null>,
  currentBoardPositionDuringDragRef: RefObject<BoardPosition | undefined>,
  event: PointerEvent<HTMLDivElement>,
  isPointerDraggingAcrossBoardRef: RefObject<boolean>,
  lastSelectedCellIdRef: RefObject<CellId | undefined>,
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
    candidateBoardPosition.cellId === currentBoardPosition.cellId
  )
    return;

  if (currentBoardPosition === undefined) {
    currentBoardPositionDuringDragRef.current = candidateBoardPosition;
    lastSelectedCellIdRef.current = candidateBoardPosition.cellId;

    handleMultiCellSelectionDuringPointerDrag(
      [candidateBoardPosition.cellId],
      setPuzzleHistory,
    );

    return;
  }

  const cellIdsCrossedBetweenPositions = getCellIdsBetweenBoardPositions(
    candidateBoardPosition,
    currentBoardPosition,
  );

  handleMultiCellSelectionDuringPointerDrag(
    cellIdsCrossedBetweenPositions,
    setPuzzleHistory,
  );

  lastSelectedCellIdRef.current = candidateBoardPosition.cellId;

  currentBoardPositionDuringDragRef.current = candidateBoardPosition;
};

const getColumnNumberFromCellId = (cellId: CellId): ColumnNumber => {
  const zeroBasedCellId = cellId - 1;

  const candidateColumnNumber = (zeroBasedCellId % 9) + 1;

  if (!isColumnNumber(candidateColumnNumber))
    throw Error(`Failed to get a ColumnNumber from CellId "${cellId}".`);

  return candidateColumnNumber;
};

const getRowNumberFromCellId = (cellId: CellId): RowNumber => {
  const zeroBasedCellId = cellId - 1;

  const candidateRowNumber = Math.floor(zeroBasedCellId / 9) + 1;

  if (!isRowNumber(candidateRowNumber))
    throw Error(`Failed to get a RowNumber from CellId "${cellId}".`);

  return candidateRowNumber;
};

const getCellStateAfterSelectionCheck = (
  currentCellState: CellState,
  isMultiselectMode: boolean,
  selectedCellIdWhenExactlyOneIsSelected: CellId | undefined,
  selectedCellsCount: number,
  targetCellId: CellId,
): CellState => {
  if (isMultiselectMode) {
    const isTargetCell = currentCellState.id === targetCellId;

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
    selectedCellIdWhenExactlyOneIsSelected === targetCellId;

  const shouldBeSelected =
    currentCellState.id === targetCellId ? !isThisTheOnlySelectedCell : false;

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
  targetCellId: CellId,
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

    const selectedCellIdWhenExactlyOneIsSelected =
      selectedCellsCount === 1
        ? currentBoardState.find((cellState) => cellState.isSelected)?.id
        : undefined;

    const boardStateAfterSelectionCheck = currentBoardState.map(
      (currentCellState) =>
        getCellStateAfterSelectionCheck(
          currentCellState,
          isMultiselectMode,
          selectedCellIdWhenExactlyOneIsSelected,
          selectedCellsCount,
          targetCellId,
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
  lastSelectedCellIdRef: RefObject<CellId | undefined>,
  targetCellId: CellId,
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) => {
  isPointerDraggingAcrossBoardRef.current = true;

  const boardElement = boardRef.current;

  if (boardElement !== null) {
    const columnNumber = getColumnNumberFromCellId(targetCellId);
    const rowNumber = getRowNumberFromCellId(targetCellId);

    currentBoardPositionDuringDragRef.current = {
      cellId: targetCellId,
      columnNumber,
      rowNumber,
    };
  } else currentBoardPositionDuringDragRef.current = undefined;

  lastSelectedCellIdRef.current = targetCellId;

  handleCellSelection(isMultiselectMode, targetCellId, setPuzzleHistory);
};
// #endregion

// #region Board Component
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

  const conflictedCellIds = userSettings.isConflictCheckerEnabled
    ? getConflictedCellIds(currentBoardState)
    : new Set<CellId>();

  const selectedCells = currentBoardState.filter(
    (cellState) => cellState.isSelected,
  );

  const shouldShowSeenCells =
    userSettings.isShowSeenCellsEnabled && selectedCells.length === 1;

  const selectedColumnNumber =
    selectedCells.length === 1
      ? selectedCells[0].houses.columnNumber
      : undefined;
  const selectedRowNumber =
    selectedCells.length === 1 ? selectedCells[0].houses.rowNumber : undefined;

  const boardRef = useRef<HTMLDivElement | null>(null);
  const isPointerDraggingAcrossBoardRef = useRef(false);
  const currentBoardPositionDuringDragRef = useRef<BoardPosition | undefined>(
    undefined,
  );
  const lastSelectedCellIdRef = useRef<CellId | undefined>(undefined);

  const handleBoardCellPointerDown = useCallback(
    (targetCellId: CellId) => {
      handleCellPointerDown(
        boardRef,
        currentBoardPositionDuringDragRef,
        isMultiselectMode,
        isPointerDraggingAcrossBoardRef,
        lastSelectedCellIdRef,
        targetCellId,
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
          lastSelectedCellIdRef.current,
          (cellId) => (lastSelectedCellIdRef.current = cellId),
          setPuzzleHistory,
        );

        return;
      }

      event.preventDefault();

      handleMoveSingleCellSelectionInDirection(
        arrowKeyDirection,
        lastSelectedCellIdRef.current,
        (cellId) => (lastSelectedCellIdRef.current = cellId),
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
          lastSelectedCellIdRef,
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
          hasDigitConflict={conflictedCellIds.has(cellState.id)}
          isSeenInBox={
            shouldShowSeenCells &&
            selectedCells[0].houses.boxNumber === cellState.houses.boxNumber
          }
          isSeenInColumn={
            shouldShowSeenCells &&
            selectedCells[0].houses.columnNumber ===
              cellState.houses.columnNumber
          }
          isSeenInRow={
            shouldShowSeenCells &&
            selectedCells[0].houses.rowNumber === cellState.houses.rowNumber
          }
          key={cellState.id}
          selectedColumnNumber={selectedColumnNumber}
          selectedRowNumber={selectedRowNumber}
          setPuzzleHistory={setPuzzleHistory}
        />
      ))}
    </SimpleGrid>
  );
};
// #endregion
