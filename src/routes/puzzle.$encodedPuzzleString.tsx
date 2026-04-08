import { createFileRoute, notFound } from "@tanstack/react-router";

import Home from "@/lib/pages/home";
import { TOTAL_CELLS_IN_BOARD } from "@/lib/pages/home/utils/constants";
import { solvePuzzle } from "@/lib/pages/home/utils/sudoku/sudoku";
import { getBoardStateFromRawBoardState } from "@/lib/pages/home/utils/transforms/transforms";
import {
  type EncodedPuzzleString,
  type RawBoardState,
  type RawPuzzleString,
} from "@/lib/pages/home/utils/types";
import {
  isEncodedPuzzleString,
  isRawGivenDigit,
  isRawPuzzleString,
} from "@/lib/pages/home/utils/validators/validators";

const tryOrNotFound = <TryResult,>(
  functionToTry: () => TryResult,
): TryResult => {
  try {
    return functionToTry();
  } catch {
    throw notFound();
  }
};

const getRawPuzzleStringFromEncodedPuzzleString = (
  encodedPuzzleString: EncodedPuzzleString,
): RawPuzzleString => {
  const encodedPuzzleStringAsBigInt = [...encodedPuzzleString].reduce(
    (accumulatedDecimalValue, currentCharacter, characterIndex) => {
      const base36Alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

      const digitIndexInAlphabet = base36Alphabet.indexOf(currentCharacter);
      const isCharacterAValidBase36Digit = digitIndexInAlphabet !== -1;

      if (!isCharacterAValidBase36Digit) {
        throw new Error(
          `Failed to get a RawPuzzleString from the EncodedPuzzleString "${encodedPuzzleString}". An invalid base36 character - "${currentCharacter}" - was encountered at position ${characterIndex}.`,
        );
      }

      return accumulatedDecimalValue * 36n + BigInt(digitIndexInAlphabet);
    },
    0n,
  );

  const candidateRawPuzzleString = encodedPuzzleStringAsBigInt
    .toString()
    .padStart(TOTAL_CELLS_IN_BOARD, "0");

  if (!isRawPuzzleString(candidateRawPuzzleString)) {
    throw new Error(
      `Failed to get a RawPuzzleString from the EncodedPuzzleString "${encodedPuzzleString}". The attempted final output "${candidateRawPuzzleString}" was invalid.`,
    );
  }

  return candidateRawPuzzleString;
};

const getRawBoardStateFromRawPuzzleString = (
  rawPuzzleString: RawPuzzleString,
): RawBoardState => {
  const rawBoardState = [...rawPuzzleString].map((character) => {
    if (character === "0") {
      return null;
    }

    const candidateRawGivenDigit = Number(character) - 1;

    if (!isRawGivenDigit(candidateRawGivenDigit)) {
      throw new Error(
        `Failed to get a RawBoardState from the RawPuzzleString "${rawPuzzleString}". An invalid RawGivenDigit was encountered: "${candidateRawGivenDigit}".`,
      );
    }

    return candidateRawGivenDigit;
  });

  return rawBoardState;
};

const HomeRoute = () => {
  const { boardState, encodedPuzzleString, rawBoardState } =
    Route.useLoaderData();

  return (
    <Home
      boardState={boardState}
      encodedPuzzleString={encodedPuzzleString}
      rawBoardState={rawBoardState}
    />
  );
};

export const Route = createFileRoute("/puzzle/$encodedPuzzleString")({
  loader: ({ params }) => {
    const candidateEncodedPuzzleString =
      params.encodedPuzzleString.toLowerCase();

    if (!isEncodedPuzzleString(candidateEncodedPuzzleString)) {
      throw notFound();
    }

    const encodedPuzzleString = candidateEncodedPuzzleString;

    const rawPuzzleString = tryOrNotFound(() =>
      getRawPuzzleStringFromEncodedPuzzleString(encodedPuzzleString),
    );

    const rawBoardState = tryOrNotFound(() =>
      getRawBoardStateFromRawPuzzleString(rawPuzzleString),
    );

    const isPuzzleSolvable = solvePuzzle(rawBoardState);
    if (!isPuzzleSolvable) {
      throw notFound();
    }

    const boardState = getBoardStateFromRawBoardState(rawBoardState);

    const loaderData = {
      boardState,
      encodedPuzzleString,
      rawBoardState,
    };

    return loaderData;
  },

  component: HomeRoute,
});
