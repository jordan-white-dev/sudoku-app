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
  getCurrentBoardStateFromPuzzleState,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type PuzzleState,
  type RawBoardState,
} from "@/lib/pages/home/utils/types";

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
    const [puzzleState, setPuzzleState] = useSessionStorageState<PuzzleState>(
      `puzzle-state-${encodedPuzzleString}`,
      {
        defaultValue: {
          historyIndex: 0,
          puzzleHistory: [startingBoardState],
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
          handleClearAllSelections(setPuzzleState);
      };

      document.addEventListener("pointerdown", handlePointerDownOutside);

      return () =>
        document.removeEventListener("pointerdown", handlePointerDownOutside);
    }, [setPuzzleState]);

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
          puzzleState={puzzleState}
          setPuzzleState={setPuzzleState}
        />
        <PuzzleControls
          isMultiselectMode={isMultiselectMode}
          puzzleState={puzzleState}
          rawBoardState={rawBoardState}
          setIsMultiselectMode={setIsMultiselectMode}
          setPuzzleState={setPuzzleState}
        />
      </Flex>
    );
  },
);
// #endregion
