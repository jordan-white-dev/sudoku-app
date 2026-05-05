import { createFileRoute, redirect } from "@tanstack/react-router";

import { getPreferredDifficultyRatingFromStorage } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import { makePuzzle } from "@/lib/pages/home/utils/sudoku/sudoku";
import {
  getEncodedPuzzleStringFromRawPuzzleString,
  getRawPuzzleStringFromRawBoardState,
} from "@/lib/pages/home/utils/transforms/transforms";
import { type RawBoardState } from "@/lib/pages/home/utils/types";

export const Route = createFileRoute("/")({
  loader: () => {
    const targetDifficultyRating = getPreferredDifficultyRatingFromStorage();
    const rawBoardState: RawBoardState = makePuzzle(targetDifficultyRating);
    const rawPuzzleString = getRawPuzzleStringFromRawBoardState(rawBoardState);
    const encodedPuzzleString =
      getEncodedPuzzleStringFromRawPuzzleString(rawPuzzleString);

    throw redirect({
      to: "/puzzle/$encodedPuzzleString",
      params: { encodedPuzzleString },
      replace: true,
    });
  },
});
