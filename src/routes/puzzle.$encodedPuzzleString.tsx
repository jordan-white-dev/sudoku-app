import { createFileRoute, notFound } from "@tanstack/react-router";
import { solvepuzzle } from "sudoku";

import Home from "@/lib/pages/home";
import { getBoardStateFromRawBoardState } from "@/lib/pages/home/model/transforms/transforms";
import {
  type EncodedPuzzleString,
  type RawBoardState,
  type RawPuzzleString,
} from "@/lib/pages/home/model/types";
import {
  isEncodedPuzzleString,
  isRawGivenDigit,
  isRawPuzzleString,
} from "@/lib/pages/home/model/validators/validators";

const getRawPuzzleStringFromEncodedPuzzleString = (
  encodedPuzzleString: EncodedPuzzleString,
): RawPuzzleString => {
  const encodedPuzzleStringAsBigInt = [...encodedPuzzleString].reduce(
    (accumulatedDecimalValue, currentCharacter, characterIndex) => {
      const base36Alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

      const digitIndexInAlphabet = base36Alphabet.indexOf(currentCharacter);
      const isCharacterAValidBase36Digit = digitIndexInAlphabet !== -1;

      if (!isCharacterAValidBase36Digit)
        throw Error(
          `Failed to get a RawPuzzleString from the EncodedPuzzleString "${encodedPuzzleString}". An invalid base36 character - "${currentCharacter}" - was encountered at position ${characterIndex}.`,
        );

      return accumulatedDecimalValue * 36n + BigInt(digitIndexInAlphabet);
    },
    0n,
  );

  const candidateRawPuzzleString = encodedPuzzleStringAsBigInt
    .toString()
    .padStart(81, "0");

  if (!isRawPuzzleString(candidateRawPuzzleString))
    throw Error(
      `Failed to get a RawPuzzleString from the EncodedPuzzleString "${encodedPuzzleString}". The attempted final output "${candidateRawPuzzleString}" was invalid.`,
    );

  return candidateRawPuzzleString;
};

const getRawBoardStateFromRawPuzzleString = (
  rawPuzzleString: RawPuzzleString,
): RawBoardState => {
  const rawBoardState = [...rawPuzzleString].map((character) => {
    if (character === "0") return null;

    const candidateRawGivenDigit = Number(character) - 1;

    if (!isRawGivenDigit(candidateRawGivenDigit))
      throw Error(
        `Failed to get a RawBoardState from the RawPuzzleString "${rawPuzzleString}". An invalid RawGivenDigit was encountered: "${candidateRawGivenDigit}".`,
      );

    return candidateRawGivenDigit;
  });

  return rawBoardState;
};

export const Route = createFileRoute("/puzzle/$encodedPuzzleString")({
  loader: ({ params }) => {
    const encodedPuzzleString = (() => {
      const candidateEncodedPuzzleString =
        params.encodedPuzzleString.toLowerCase();

      if (!isEncodedPuzzleString(candidateEncodedPuzzleString))
        throw notFound();

      return candidateEncodedPuzzleString;
    })();

    const rawPuzzleString = (() => {
      try {
        const rawPuzzleString =
          getRawPuzzleStringFromEncodedPuzzleString(encodedPuzzleString);

        return rawPuzzleString;
      } catch {
        throw notFound();
      }
    })();

    const rawBoardState = (() => {
      try {
        const rawBoardState =
          getRawBoardStateFromRawPuzzleString(rawPuzzleString);

        return rawBoardState;
      } catch {
        throw notFound();
      }
    })();

    const isPuzzleSolvable = solvepuzzle(rawBoardState);
    if (!isPuzzleSolvable) throw notFound();

    const boardState = getBoardStateFromRawBoardState(rawBoardState);

    const loaderData = {
      boardState,
      rawBoardState,
    };

    return loaderData;
  },

  component: Home,
});
