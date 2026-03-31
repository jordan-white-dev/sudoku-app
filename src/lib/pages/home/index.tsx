import { Box } from "@chakra-ui/react";

import { Header } from "@/lib/pages/home/components/header/header";
import { Puzzle } from "@/lib/pages/home/components/puzzle/puzzle";
import { SudokuStopwatchProvider } from "@/lib/pages/home/hooks/use-sudoku-stopwatch/use-sudoku-stopwatch";
import { UserSettingsProvider } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import { Route } from "@/routes/puzzle.$encodedPuzzleString";

const Home = () => {
  const { boardState, rawBoardState } = Route.useLoaderData();

  return (
    <UserSettingsProvider>
      <SudokuStopwatchProvider
        key={JSON.stringify(rawBoardState)}
        rawBoardState={rawBoardState}
      >
        <Header />
        <Box width="full" as="main" justifyItems="center" marginY={22}>
          <Puzzle
            key={JSON.stringify(rawBoardState)}
            rawBoardState={rawBoardState}
            startingBoardState={boardState}
          />
        </Box>
      </SudokuStopwatchProvider>
    </UserSettingsProvider>
  );
};

export default Home;
