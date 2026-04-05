import { Flex } from "@chakra-ui/react";
import {
  type Dispatch,
  memo,
  type SetStateAction,
  useEffect,
  useRef,
} from "react";
import useSessionStorageState from "use-session-storage-state";

import { Board } from "@/lib/pages/home/components/board/board";
import { PuzzleControls } from "@/lib/pages/home/components/puzzle-controls/puzzle-controls";
import {
  getBoardStateWithNoCellsSelected,
  getCurrentBoardStateFromPuzzleHistory,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type PuzzleHistory,
  type RawBoardState,
} from "@/lib/pages/home/utils/types";

// #region Outside Click Handler
const handleClearAllSelections = (
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) => {
  setPuzzleHistory((currentPuzzleHistory) => {
    const currentBoardState =
      getCurrentBoardStateFromPuzzleHistory(currentPuzzleHistory);

    const nextBoardStateWithNoCellsSelected =
      getBoardStateWithNoCellsSelected(currentBoardState);

    const nextBoardStateHistory = currentPuzzleHistory.boardStateHistory.map(
      (boardState, boardStateIndex) =>
        boardStateIndex === currentPuzzleHistory.currentBoardStateIndex
          ? nextBoardStateWithNoCellsSelected
          : boardState,
    );

    const nextPuzzleHistory: PuzzleHistory = {
      currentBoardStateIndex: currentPuzzleHistory.currentBoardStateIndex,
      boardStateHistory: nextBoardStateHistory,
    };

    return nextPuzzleHistory;
  });
};
// #endregion

// #region Puzzle Component
type PuzzleProps = {
  rawBoardState: RawBoardState;
  startingBoardState: BoardState;
};

export const Puzzle = memo(
  ({ rawBoardState, startingBoardState }: PuzzleProps) => {
    const [isMultiselectMode, setIsMultiselectMode] =
      useSessionStorageState<boolean>("multiselect-mode", {
        defaultValue: false,
      });
    const [puzzleHistory, setPuzzleHistory] =
      useSessionStorageState<PuzzleHistory>(
        `puzzle-history-${JSON.stringify(rawBoardState)}`,
        {
          defaultValue: {
            currentBoardStateIndex: 0,
            boardStateHistory: [startingBoardState],
          },
        },
      );
    const puzzleRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const handlePointerDownOutside = (event: PointerEvent) => {
        if (
          puzzleRef.current &&
          !puzzleRef.current.contains(event.target as Node)
        )
          handleClearAllSelections(setPuzzleHistory);
      };

      document.addEventListener("pointerdown", handlePointerDownOutside);

      return () =>
        document.removeEventListener("pointerdown", handlePointerDownOutside);
    }, [setPuzzleHistory]);

    return (
      <Flex
        alignItems="center"
        direction={{ base: "column", lg: "row" }}
        fontFamily="sans-serif"
        gap={{ base: "4", md: "8" }}
        marginTop={{ sm: "2.5" }}
        ref={puzzleRef}
      >
        <Board
          isMultiselectMode={isMultiselectMode}
          puzzleHistory={puzzleHistory}
          setPuzzleHistory={setPuzzleHistory}
        />
        <PuzzleControls
          isMultiselectMode={isMultiselectMode}
          puzzleHistory={puzzleHistory}
          rawBoardState={rawBoardState}
          setIsMultiselectMode={setIsMultiselectMode}
          setPuzzleHistory={setPuzzleHistory}
        />
      </Flex>
    );
  },
);
// #endregion
