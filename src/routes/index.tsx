import { createFileRoute, redirect } from "@tanstack/react-router";
import { makepuzzle } from "sudoku";

import {
  getEncodedPuzzleStringFromRawPuzzleString,
  getRawPuzzleStringFromRawBoardState,
} from "@/lib/pages/home/model/transforms/transforms";
import { type RawBoardState } from "@/lib/pages/home/model/types";

export const Route = createFileRoute("/")({
  loader: () => {
    const rawBoardState: RawBoardState = makepuzzle();
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
