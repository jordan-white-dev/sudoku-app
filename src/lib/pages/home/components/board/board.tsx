import { Box, SimpleGrid } from "@chakra-ui/react";
import {
  type Dispatch,
  type FocusEvent,
  type PointerEvent,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Cell } from "@/lib/pages/home/components/cell/cell";
import { useUserSettings } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import { CELLS_PER_HOUSE } from "@/lib/pages/home/utils/constants";
import {
  getBoardStateWithNoCellsSelected,
  getCellAriaLabel,
  getCurrentBoardStateFromPuzzleState,
  getGivenOrEnteredDigitInCellIfPresent,
  updatePuzzleStateWithCurrentBoardState,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type CellId,
  type CellState,
  type ColumnNumber,
  type PuzzleState,
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
> => Array.from({ length: CELLS_PER_HOUSE }, () => new Map());

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
  const startingColumnNumber = zeroBasedStartingCellId % CELLS_PER_HOUSE;
  const startingRowNumber = Math.floor(
    zeroBasedStartingCellId / CELLS_PER_HOUSE,
  );

  const { columnOffset, rowOffset } =
    arrowKeyDirectionOffsets[arrowKeyDirection];

  const wrappedColumnNumber =
    (startingColumnNumber + columnOffset + CELLS_PER_HOUSE) % CELLS_PER_HOUSE;
  const wrappedRowNumber =
    (startingRowNumber + rowOffset + CELLS_PER_HOUSE) % CELLS_PER_HOUSE;
  const candidateCellId =
    wrappedRowNumber * CELLS_PER_HOUSE + wrappedColumnNumber + 1;

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
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) =>
  setPuzzleState((currentPuzzleState) => {
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(currentPuzzleState);

    const selectionAnchorCellId = getSelectionAnchorCellId(
      currentBoardState,
      lastSelectedCellId,
    );

    if (selectionAnchorCellId === undefined) return currentPuzzleState;

    const nextCellId = getWrappedCellIdInDirection(
      arrowKeyDirection,
      selectionAnchorCellId,
    );

    const nextBoardState = getBoardStateForCellSelectionAddOrMove(
      currentBoardState,
      nextCellId,
    );

    if (!didBoardStateChange(currentBoardState, nextBoardState))
      return currentPuzzleState;

    setLastSelectedCellId(nextCellId);

    return updatePuzzleStateWithCurrentBoardState(
      currentPuzzleState,
      nextBoardState,
    );
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
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) =>
  handleMoveOrAddToCellSelection(
    arrowKeyDirection,
    lastSelectedCellId,
    getBoardStateWithTargetCellAddedToSelection,
    setLastSelectedCellId,
    setPuzzleState,
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
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) =>
  handleMoveOrAddToCellSelection(
    arrowKeyDirection,
    lastSelectedCellId,
    getBoardStateWithOnlyTargetCellSelected,
    setLastSelectedCellId,
    setPuzzleState,
  );
// #endregion

// #region All Cells Selection Change
const handleAllCellsSelectionChange = (
  getNextBoardState: (currentBoardState: BoardState) => BoardState,
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) =>
  setPuzzleState((currentPuzzleState) => {
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(currentPuzzleState);

    const nextBoardState = getNextBoardState(currentBoardState);

    if (!didBoardStateChange(currentBoardState, nextBoardState))
      return currentPuzzleState;

    return updatePuzzleStateWithCurrentBoardState(
      currentPuzzleState,
      nextBoardState,
    );
  });

const handleDeselectAllCells = (
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) =>
  handleAllCellsSelectionChange(
    getBoardStateWithNoCellsSelected,
    setPuzzleState,
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
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) =>
  handleAllCellsSelectionChange(
    getBoardStateWithAllCellsSelected,
    setPuzzleState,
  );

const getBoardStateWithInvertedCellsSelected = (
  boardState: BoardState,
): BoardState =>
  boardState.map((cellState) => ({
    ...cellState,
    isSelected: !cellState.isSelected,
  }));

const handleInvertSelectedCells = (
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) =>
  handleAllCellsSelectionChange(
    getBoardStateWithInvertedCellsSelected,
    setPuzzleState,
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

  const cellHeight = boardBounds.height / CELLS_PER_HOUSE;
  const cellWidth = boardBounds.width / CELLS_PER_HOUSE;

  const zeroBasedColumnNumber = Math.min(
    CELLS_PER_HOUSE - 1,
    Math.max(0, Math.floor((pointerClientX - boardBounds.left) / cellWidth)),
  );
  const zeroBasedRowNumber = Math.min(
    CELLS_PER_HOUSE - 1,
    Math.max(0, Math.floor((pointerClientY - boardBounds.top) / cellHeight)),
  );

  const cellId =
    zeroBasedRowNumber * CELLS_PER_HOUSE + zeroBasedColumnNumber + 1;
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
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) =>
  setPuzzleState((currentPuzzleState) => {
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(currentPuzzleState);

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

    if (!didSelectedCellsChange) return currentPuzzleState;

    return updatePuzzleStateWithCurrentBoardState(
      currentPuzzleState,
      boardStateAfterSelectionsCheck,
    );
  });

const getCellIdFromRowAndColumn = (
  rowNumber: RowNumber,
  columnNumber: ColumnNumber,
): CellId => {
  const candidateCellId = (rowNumber - 1) * CELLS_PER_HOUSE + columnNumber;

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
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
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
      setPuzzleState,
    );

    return;
  }

  const cellIdsCrossedBetweenPositions = getCellIdsBetweenBoardPositions(
    candidateBoardPosition,
    currentBoardPosition,
  );

  handleMultiCellSelectionDuringPointerDrag(
    cellIdsCrossedBetweenPositions,
    setPuzzleState,
  );

  lastSelectedCellIdRef.current = candidateBoardPosition.cellId;

  currentBoardPositionDuringDragRef.current = candidateBoardPosition;
};

const getColumnNumberFromCellId = (cellId: CellId): ColumnNumber => {
  const zeroBasedCellId = cellId - 1;

  const candidateColumnNumber = (zeroBasedCellId % CELLS_PER_HOUSE) + 1;

  if (!isColumnNumber(candidateColumnNumber))
    throw Error(`Failed to get a ColumnNumber from CellId "${cellId}".`);

  return candidateColumnNumber;
};

const getRowNumberFromCellId = (cellId: CellId): RowNumber => {
  const zeroBasedCellId = cellId - 1;

  const candidateRowNumber = Math.floor(zeroBasedCellId / CELLS_PER_HOUSE) + 1;

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
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) =>
  setPuzzleState((currentPuzzleState) => {
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(currentPuzzleState);

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

    if (!didBoardStateChange) return currentPuzzleState;

    return updatePuzzleStateWithCurrentBoardState(
      currentPuzzleState,
      boardStateAfterSelectionCheck,
    );
  });

const handleCellPointerDown = (
  boardRef: RefObject<HTMLDivElement | null>,
  currentBoardPositionDuringDragRef: RefObject<BoardPosition | undefined>,
  isMultiselectMode: boolean,
  isPointerDraggingAcrossBoardRef: RefObject<boolean>,
  lastSelectedCellIdRef: RefObject<CellId | undefined>,
  targetCellId: CellId,
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
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

  handleCellSelection(isMultiselectMode, targetCellId, setPuzzleState);
};
// #endregion

// #region Announcement Helpers
const tryAnnounceKeyboardNavCell = (
  boardState: BoardState,
  boardRef: RefObject<HTMLDivElement | null>,
  shouldHandleKeyboardNavRef: RefObject<boolean>,
  setAnnouncementText: (text: string) => void,
): boolean => {
  if (!shouldHandleKeyboardNavRef.current) return false;

  shouldHandleKeyboardNavRef.current = false;
  const navSelectedCells = boardState.filter((c) => c.isSelected);
  if (navSelectedCells.length !== 1) return false;

  const navCell = navSelectedCells[0];
  boardRef.current
    ?.querySelector<HTMLElement>(`[data-cell-number="${navCell.id}"]`)
    ?.focus({ preventScroll: true });
  setAnnouncementText(
    getCellAriaLabel(
      navCell.houses.rowNumber,
      navCell.houses.columnNumber,
      navCell.content,
      navCell.markupColors,
    ),
  );
  return true;
};

const tryAnnounceContentChange = (
  boardState: BoardState,
  prevBoardStateRef: RefObject<BoardState>,
  isPointerDraggingAcrossBoardRef: RefObject<boolean>,
  setAnnouncementText: (text: string) => void,
): boolean => {
  if (isPointerDraggingAcrossBoardRef.current) return false;

  const selectedCells = boardState.filter((c) => c.isSelected);
  if (selectedCells.length !== 1) return false;

  const cell = selectedCells[0];
  const prevCell = prevBoardStateRef.current[cell.id - 1];
  const didContentChange =
    prevCell !== undefined &&
    (prevCell.content !== cell.content ||
      prevCell.markupColors !== cell.markupColors);
  if (!didContentChange) return false;

  setAnnouncementText(
    getCellAriaLabel(
      cell.houses.rowNumber,
      cell.houses.columnNumber,
      cell.content,
      cell.markupColors,
    ),
  );
  return true;
};

const announceConflictCountChange = (
  prevConflictCount: number,
  currConflictCount: number,
  setAnnouncementText: (text: string) => void,
) => {
  if (prevConflictCount === 0 && currConflictCount > 0)
    setAnnouncementText("Digit conflict detected");
  else if (prevConflictCount > 0 && currConflictCount === 0)
    setAnnouncementText("No conflicts");
};
// #endregion

// #region Board Component
type BoardProps = {
  isMultiselectMode: boolean;
  puzzleState: PuzzleState;
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>;
};

export const Board = ({
  isMultiselectMode,
  puzzleState,
  setPuzzleState,
}: BoardProps) => {
  const { userSettings } = useUserSettings();

  const currentBoardState = getCurrentBoardStateFromPuzzleState(puzzleState);

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
  const shouldHandleKeyboardNavRef = useRef(false);
  const prevBoardStateRef = useRef<BoardState>(currentBoardState);
  const prevConflictCountRef = useRef(conflictedCellIds.size);

  const [announcementText, setAnnouncementText] = useState("");

  useEffect(() => {
    const currConflictCount = userSettings.isConflictCheckerEnabled
      ? getConflictedCellIds(currentBoardState).size
      : 0;

    const wasAnnouncementHandled =
      tryAnnounceKeyboardNavCell(
        currentBoardState,
        boardRef,
        shouldHandleKeyboardNavRef,
        setAnnouncementText,
      ) ||
      tryAnnounceContentChange(
        currentBoardState,
        prevBoardStateRef,
        isPointerDraggingAcrossBoardRef,
        setAnnouncementText,
      );

    if (!wasAnnouncementHandled)
      announceConflictCountChange(
        prevConflictCountRef.current,
        currConflictCount,
        setAnnouncementText,
      );

    prevBoardStateRef.current = currentBoardState;
    prevConflictCountRef.current = currConflictCount;
  }, [currentBoardState, userSettings]);

  const handleBoardCellPointerDown = useCallback(
    (targetCellId: CellId) => {
      handleCellPointerDown(
        boardRef,
        currentBoardPositionDuringDragRef,
        isMultiselectMode,
        isPointerDraggingAcrossBoardRef,
        lastSelectedCellIdRef,
        targetCellId,
        setPuzzleState,
      );
    },
    [isMultiselectMode, setPuzzleState],
  );

  const handleBoardFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      if (boardRef.current?.contains(event.relatedTarget as Node)) return;
      if (isPointerDraggingAcrossBoardRef.current) return;

      setPuzzleState((currentPuzzleState) => {
        const currentBoardState =
          getCurrentBoardStateFromPuzzleState(currentPuzzleState);

        if (currentBoardState.some((c) => c.isSelected))
          return currentPuzzleState;

        return updatePuzzleStateWithCurrentBoardState(
          currentPuzzleState,
          getBoardStateWithOnlyTargetCellSelected(
            currentBoardState,
            currentBoardState[0].id,
          ),
        );
      });
    },
    [setPuzzleState],
  );

  useEffect(() => {
    const handleAddToOrMoveCellSelection = (
      arrowKeyDirection: ArrowKeyDirection,
      event: KeyboardEvent,
    ) => {
      if (event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) return;

      if (event.ctrlKey || event.shiftKey) {
        event.preventDefault();
        shouldHandleKeyboardNavRef.current = true;
        handleAddToCellSelectionInDirection(
          arrowKeyDirection,
          lastSelectedCellIdRef.current,
          (cellId) => (lastSelectedCellIdRef.current = cellId),
          setPuzzleState,
        );

        return;
      }

      event.preventDefault();
      shouldHandleKeyboardNavRef.current = true;
      handleMoveSingleCellSelectionInDirection(
        arrowKeyDirection,
        lastSelectedCellIdRef.current,
        (cellId) => (lastSelectedCellIdRef.current = cellId),
        setPuzzleState,
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
        handleDeselectAllCells(setPuzzleState);
        return;
      }

      if (lowerCaseKey === "a") {
        event.preventDefault();
        handleSelectAllCells(setPuzzleState);
        return;
      }

      if (lowerCaseKey === "i") {
        event.preventDefault();
        handleInvertSelectedCells(setPuzzleState);
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
  }, [setPuzzleState]);

  const rovingTabCellId: CellId =
    selectedCells.length > 0
      ? selectedCells[selectedCells.length - 1].id
      : currentBoardState[0].id;

  const boardRows = Array.from({ length: CELLS_PER_HOUSE }, (_, rowIndex) =>
    currentBoardState.slice(
      rowIndex * CELLS_PER_HOUSE,
      rowIndex * CELLS_PER_HOUSE + CELLS_PER_HOUSE,
    ),
  );

  return (
    <>
      <SimpleGrid
        aria-colcount={CELLS_PER_HOUSE}
        aria-label="Sudoku puzzle grid"
        aria-rowcount={CELLS_PER_HOUSE}
        border="2px solid black"
        columns={CELLS_PER_HOUSE}
        gap="0"
        minWidth="calc(var(--cell-size, 80px) * 9 + 4px)"
        ref={boardRef}
        role="grid"
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
            setPuzzleState,
          )
        }
        onFocus={handleBoardFocus}
        onPointerUp={() =>
          handleBoardPointerUpOrCancel(
            currentBoardPositionDuringDragRef,
            isPointerDraggingAcrossBoardRef,
          )
        }
      >
        {boardRows.map((rowCells, rowIndex) => (
          <Box
            aria-rowindex={rowIndex + 1}
            display="contents"
            key={rowCells[0].id}
            role="row"
          >
            {rowCells.map((cellState) => (
              <Cell
                boardState={currentBoardState}
                cellState={cellState}
                handleCellPointerDown={handleBoardCellPointerDown}
                hasDigitConflict={conflictedCellIds.has(cellState.id)}
                isSeenInBox={
                  shouldShowSeenCells &&
                  selectedCells[0].houses.boxNumber ===
                    cellState.houses.boxNumber
                }
                isSeenInColumn={
                  shouldShowSeenCells &&
                  selectedCells[0].houses.columnNumber ===
                    cellState.houses.columnNumber
                }
                isSeenInRow={
                  shouldShowSeenCells &&
                  selectedCells[0].houses.rowNumber ===
                    cellState.houses.rowNumber
                }
                key={cellState.id}
                selectedColumnNumber={selectedColumnNumber}
                selectedRowNumber={selectedRowNumber}
                setPuzzleState={setPuzzleState}
                tabIndex={cellState.id === rovingTabCellId ? 0 : -1}
              />
            ))}
          </Box>
        ))}
      </SimpleGrid>
      <Box
        aria-atomic="true"
        aria-live="polite"
        height="1px"
        left="-9999px"
        overflow="hidden"
        position="absolute"
        width="1px"
      >
        {announcementText}
      </Box>
    </>
  );
};
// #endregion
