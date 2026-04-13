import { Box, Flex } from "@chakra-ui/react";
import {
  type CSSProperties,
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import useSessionStorageState from "use-session-storage-state";

import { Board } from "@/lib/pages/home/components/board/board";
import { PuzzleControls } from "@/lib/pages/home/components/puzzle-controls/puzzle-controls";
import { CELLS_PER_HOUSE } from "@/lib/pages/home/utils/constants";
import { getCellSizeScaledBy } from "@/lib/pages/home/utils/display";
import {
  getBoardStateWithNoCellsSelected,
  getCurrentBoardStateFromPuzzleState,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type PuzzleState,
  type RawBoardState,
} from "@/lib/pages/home/utils/types";

const COLUMN_HEIGHT_DIVISOR = 14;
const ROW_WIDTH_DIVISOR = 14.5;
const MINIMUM_CELL_SIZE = 33;

type LayoutState = {
  cellSize: number;
  isRowLayout: boolean;
};

const getLayoutFromDimensions = (
  availableWidth: number,
  availableHeight: number,
): LayoutState => {
  const columnCellSize = Math.min(
    availableWidth / CELLS_PER_HOUSE,
    availableHeight / COLUMN_HEIGHT_DIVISOR,
  );
  const rowCellSize = Math.min(
    availableWidth / ROW_WIDTH_DIVISOR,
    availableHeight / CELLS_PER_HOUSE,
  );

  const isRowLayout = rowCellSize > columnCellSize;
  const constrainedCellSize = isRowLayout ? rowCellSize : columnCellSize;
  const cellSize = Math.max(MINIMUM_CELL_SIZE, constrainedCellSize);

  return { cellSize, isRowLayout };
};

// #region Outside Click Handler
const handleClearAllSelections = (
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) => {
  setPuzzleState((currentPuzzleState) => {
    const currentBoardState =
      getCurrentBoardStateFromPuzzleState(currentPuzzleState);

    const nextBoardStateWithNoCellsSelected =
      getBoardStateWithNoCellsSelected(currentBoardState);

    const nextPuzzleHistory = currentPuzzleState.puzzleHistory.map(
      (boardState, historyIndex) =>
        historyIndex === currentPuzzleState.historyIndex
          ? nextBoardStateWithNoCellsSelected
          : boardState,
    );

    const nextPuzzleState: PuzzleState = {
      historyIndex: currentPuzzleState.historyIndex,
      puzzleHistory: nextPuzzleHistory,
    };

    return nextPuzzleState;
  });
};
// #endregion

// #region Puzzle Component
type PuzzleProps = {
  encodedPuzzleString: string;
  rawBoardState: RawBoardState;
  startingBoardState: BoardState;
};

export const Puzzle = memo(
  ({ encodedPuzzleString, rawBoardState, startingBoardState }: PuzzleProps) => {
    const [isMultiselectMode, setIsMultiselectMode] =
      useSessionStorageState<boolean>("multiselect-mode", {
        defaultValue: false,
      });
    const startingPuzzleStateRef = useRef<PuzzleState>({
      historyIndex: 0,
      puzzleHistory: [startingBoardState],
    });
    const [sessionStoragePuzzleState, setSessionStoragePuzzleState] =
      useSessionStorageState<PuzzleState>(
        `puzzle-state-${encodedPuzzleString}`,
      );
    const puzzleState =
      sessionStoragePuzzleState ?? startingPuzzleStateRef.current;
    const setPuzzleState: Dispatch<SetStateAction<PuzzleState>> = useCallback(
      (nextPuzzleStateOrUpdater) => {
        if (typeof nextPuzzleStateOrUpdater === "function") {
          setSessionStoragePuzzleState((currentSessionStoragePuzzleState) =>
            nextPuzzleStateOrUpdater(
              currentSessionStoragePuzzleState ??
                startingPuzzleStateRef.current,
            ),
          );
        } else {
          setSessionStoragePuzzleState(nextPuzzleStateOrUpdater);
        }
      },
      [setSessionStoragePuzzleState],
    );
    const containerRef = useRef<HTMLDivElement | null>(null);
    const boardWrapperRef = useRef<HTMLDivElement | null>(null);
    const puzzleControlsWrapperRef = useRef<HTMLDivElement | null>(null);
    const [cellSize, setCellSize] = useState(80);
    const [isRowLayout, setIsRowLayout] = useState(false);

    const flexStyle: CSSProperties & Record<`--${string}`, string> = {
      "--cell-size": `${cellSize}px`,
    };

    useLayoutEffect(() => {
      const container = containerRef.current;
      if (container === null) {
        return;
      }

      const { width, height } = container.getBoundingClientRect();
      const initialLayout = getLayoutFromDimensions(width, height);
      setIsRowLayout(initialLayout.isRowLayout);
      setCellSize(initialLayout.cellSize);
    }, []);

    useEffect(() => {
      const container = containerRef.current;
      if (container === null) {
        return;
      }

      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry === undefined) {
          return;
        }

        const nextLayout = getLayoutFromDimensions(
          entry.contentRect.width,
          entry.contentRect.height,
        );
        setIsRowLayout(nextLayout.isRowLayout);
        setCellSize(nextLayout.cellSize);
      });

      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
      const handlePointerDownOutside = (event: PointerEvent) => {
        const targetNode = event.target instanceof Node ? event.target : null;
        const isOutsideBoard = !(
          boardWrapperRef.current?.contains(targetNode) ?? false
        );
        const isOutsidePuzzleControls = !(
          puzzleControlsWrapperRef.current?.contains(targetNode) ?? false
        );

        if (isOutsideBoard && isOutsidePuzzleControls) {
          handleClearAllSelections(setPuzzleState);
        }
      };

      document.addEventListener("pointerdown", handlePointerDownOutside);

      return () =>
        document.removeEventListener("pointerdown", handlePointerDownOutside);
    }, [setPuzzleState]);

    return (
      <Box
        display="flex"
        height="100%"
        overflow="auto"
        padding="4"
        ref={containerRef}
        width="100%"
      >
        <Flex
          alignItems="center"
          direction={isRowLayout ? "row" : "column"}
          fontFamily="sans-serif"
          gap={getCellSizeScaledBy(0.4)}
          justifyContent="center"
          margin="auto"
          style={flexStyle}
        >
          <Box display="contents" ref={boardWrapperRef}>
            <Board
              isMultiselectMode={isMultiselectMode}
              puzzleState={puzzleState}
              setPuzzleState={setPuzzleState}
            />
          </Box>
          <Box display="contents" ref={puzzleControlsWrapperRef}>
            <PuzzleControls
              isMultiselectMode={isMultiselectMode}
              isRowLayout={isRowLayout}
              puzzleState={puzzleState}
              rawBoardState={rawBoardState}
              setIsMultiselectMode={setIsMultiselectMode}
              setPuzzleState={setPuzzleState}
            />
          </Box>
        </Flex>
      </Box>
    );
  },
);
// #endregion
