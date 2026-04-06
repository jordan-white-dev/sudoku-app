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
      key={encodedPuzzleString}
      encodedPuzzleString={encodedPuzzleString}
      isStopwatchDisabled={userSettings.isStopwatchDisabled}
      onIsStopwatchDisabledChange={handleIsStopwatchDisabledChange}
    >
      <Header />
      <Box width="full" as="main" justifyItems="center" marginY={22}>
        <Puzzle
          key={encodedPuzzleString}
          encodedPuzzleString={encodedPuzzleString}
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
