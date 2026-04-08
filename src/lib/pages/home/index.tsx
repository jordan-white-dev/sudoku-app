import { Box } from "@chakra-ui/react";
import { useCallback } from "react";

import { Header } from "@/lib/pages/home/components/header/header";
import { Puzzle } from "@/lib/pages/home/components/puzzle/puzzle";
import { SudokuStopwatchProvider } from "@/lib/pages/home/hooks/use-sudoku-stopwatch/use-sudoku-stopwatch";
import {
  UserSettingsProvider,
  useUserSettings,
} from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import { Route } from "@/routes/puzzle.$encodedPuzzleString";

const HomeInner = () => {
  const { boardState, rawBoardState } = Route.useLoaderData();
  const { encodedPuzzleString } = Route.useParams();
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
        id="main-content"
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

const Home = () => (
  <UserSettingsProvider>
    <HomeInner />
  </UserSettingsProvider>
);

export default Home;
