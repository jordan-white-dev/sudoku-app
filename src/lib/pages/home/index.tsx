import { Box } from "@chakra-ui/react";
import { useCallback, useId } from "react";

import { Header } from "@/lib/pages/home/components/header/header";
import { Puzzle } from "@/lib/pages/home/components/puzzle/puzzle";
import { SudokuStopwatchProvider } from "@/lib/pages/home/hooks/use-sudoku-stopwatch/use-sudoku-stopwatch";
import {
  UserSettingsProvider,
  useUserSettings,
} from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import {
  type BoardState,
  type EncodedPuzzleString,
  type RawBoardState,
} from "@/lib/pages/home/utils/types";

type HomeProps = {
  boardState: BoardState;
  encodedPuzzleString: EncodedPuzzleString;
  rawBoardState: RawBoardState;
};

// #region Home Inner
const HomeInner = ({
  boardState,
  encodedPuzzleString,
  rawBoardState,
}: HomeProps) => {
  const { userSettings, setUserSettings } = useUserSettings();

  const handleIsStopwatchDisabledChange = useCallback(
    (nextIsStopwatchDisabled: boolean) => {
      setUserSettings((current) => ({
        ...current,
        isStopwatchDisabled: nextIsStopwatchDisabled,
      }));
    },
    [setUserSettings],
  );

  return (
    <SudokuStopwatchProvider
      encodedPuzzleString={encodedPuzzleString}
      isStopwatchDisabled={userSettings.isStopwatchDisabled}
      key={encodedPuzzleString}
      onIsStopwatchDisabledChange={handleIsStopwatchDisabledChange}
    >
      <Header />
      <Box
        as="main"
        flex="1"
        id={useId()}
        minHeight="0"
        overflow="hidden"
        width="full"
      >
        <Puzzle
          encodedPuzzleString={encodedPuzzleString}
          key={encodedPuzzleString}
          rawBoardState={rawBoardState}
          startingBoardState={boardState}
        />
      </Box>
    </SudokuStopwatchProvider>
  );
};
// #endregion

const Home = ({
  boardState,
  encodedPuzzleString,
  rawBoardState,
}: HomeProps) => (
  <UserSettingsProvider>
    <HomeInner
      boardState={boardState}
      encodedPuzzleString={encodedPuzzleString}
      rawBoardState={rawBoardState}
    />
  </UserSettingsProvider>
);

export default Home;
