import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Keypad } from "@/lib/pages/home/components/keypad/keypad";
import { UserSettingsProvider } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import {
  flippedColors,
  flippedDigits,
  markupColors,
  sudokuDigits,
} from "@/lib/pages/home/utils/constants";
import {
  isEnteredDigitInCellContent,
  isMarkupDigitsInCellContent,
} from "@/lib/pages/home/utils/guards";
import {
  defaultUserSettings,
  getBoardStateWithEnteredDigitInTargetCell,
  getBoardStateWithTargetCellsSelected,
  getStartingEmptyBoardState,
  getStartingPuzzleHistoryFromBoardState,
  getTargetCellStateFromBoardState,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";
import {
  getBrandedCellId,
  getBrandedSudokuDigit,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type KeypadMode,
  type PuzzleHistory,
} from "@/lib/pages/home/utils/types";

const USER_SETTINGS_SESSION_STORAGE_KEY = "user-settings";

// #region Shared Test Types
type RenderedKeypad = Awaited<ReturnType<typeof render>>;
type SetPuzzleHistory = (
  value: PuzzleHistory | ((value: PuzzleHistory) => PuzzleHistory),
) => void;
// #endregion

// #region Render Keypad
const renderKeypad = async ({
  isFlipKeypadEnabled = false,
  isMultiselectMode = false,
  keypadMode = "Digit",
  puzzleHistory,
  setPuzzleHistory,
}: {
  isFlipKeypadEnabled?: boolean;
  isMultiselectMode?: boolean;
  keypadMode?: KeypadMode;
  puzzleHistory?: PuzzleHistory;
  setPuzzleHistory?: SetPuzzleHistory;
} = {}): Promise<RenderedKeypad> => {
  window.sessionStorage.setItem(
    USER_SETTINGS_SESSION_STORAGE_KEY,
    JSON.stringify({
      ...defaultUserSettings,
      isFlipKeypadEnabled,
    }),
  );

  const startingPuzzleHistory =
    puzzleHistory ??
    getStartingPuzzleHistoryFromBoardState(getStartingEmptyBoardState());

  const TestKeypad = () => {
    const [currentIsMultiselectMode, setIsMultiselectMode] =
      useState(isMultiselectMode);
    const [currentPuzzleHistory, setPuzzleHistoryState] = useState(
      startingPuzzleHistory,
    );

    const resolvedSetPuzzleHistory = setPuzzleHistory ?? setPuzzleHistoryState;

    return (
      <Keypad
        isMultiselectMode={currentIsMultiselectMode}
        keypadMode={keypadMode}
        puzzleHistory={currentPuzzleHistory}
        setIsMultiselectMode={setIsMultiselectMode}
        setPuzzleHistory={resolvedSetPuzzleHistory}
      />
    );
  };

  const renderedKeypad = await render(
    <Provider>
      <UserSettingsProvider>
        <TestKeypad />
      </UserSettingsProvider>
    </Provider>,
  );

  await waitForReactToFinishUpdating();

  return renderedKeypad;
};
// #endregion

// #region Keypad Lookup
const getDigitButtonLocator = async (
  renderedKeypad: RenderedKeypad | Promise<RenderedKeypad>,
  digit: string,
) => (await renderedKeypad).getByRole("button", { name: digit });

const getAllButtons = async (
  renderedKeypad: RenderedKeypad | Promise<RenderedKeypad>,
) => (await renderedKeypad).getByRole("button").all();

const getClearButtonElement = async (
  renderedKeypad: RenderedKeypad | Promise<RenderedKeypad>,
) => {
  const allButtons = await getAllButtons(renderedKeypad);

  const clearButtonCandidate = allButtons[allButtons.length - 1];

  if (!clearButtonCandidate) throw Error("Could not find the clear button.");

  return clearButtonCandidate;
};

const getMultiselectSwitchInput = async (
  renderedKeypad: RenderedKeypad | Promise<RenderedKeypad>,
) => {
  const resolvedRenderedKeypad = await renderedKeypad;

  const candidateSwitchInput =
    resolvedRenderedKeypad.container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );

  if (!candidateSwitchInput)
    throw Error("Could not find the multiselect switch input.");

  return candidateSwitchInput;
};

const getColorSwatchElements = async (
  renderedKeypad: RenderedKeypad | Promise<RenderedKeypad>,
) => {
  const resolvedRenderedKeypad = await renderedKeypad;

  return Array.from(
    resolvedRenderedKeypad.container.querySelectorAll<HTMLElement>(
      ".color-swatch",
    ),
  );
};

const clickColorSwatchAtIndex = async (
  renderedKeypad: RenderedKeypad | Promise<RenderedKeypad>,
  index: number,
) => {
  const colorSwatches = await getColorSwatchElements(renderedKeypad);
  const colorSwatch = colorSwatches[index];

  if (!colorSwatch)
    throw Error(`Could not find color swatch at index ${index}.`);

  colorSwatch.click();
  await waitForReactToFinishUpdating();
};

const getDigitButtonsInRenderedOrder = async (
  renderedKeypad: RenderedKeypad | Promise<RenderedKeypad>,
) => {
  const resolvedRenderedKeypad = await renderedKeypad;
  const buttonElements = Array.from(
    resolvedRenderedKeypad.container.querySelectorAll<HTMLButtonElement>(
      "button",
    ),
  );

  return buttonElements
    .map((buttonElement) => buttonElement.textContent?.trim() ?? "")
    .filter((buttonText) =>
      sudokuDigits.includes(buttonText as (typeof sudokuDigits)[number]),
    );
};

const getNextPuzzleHistoryFromSetCall = (
  setPuzzleHistory: ReturnType<typeof vi.fn>,
  startingPuzzleHistory: PuzzleHistory,
): PuzzleHistory => {
  const candidatePuzzleHistoryUpdate = setPuzzleHistory.mock.calls[0]?.[0];

  if (!candidatePuzzleHistoryUpdate)
    throw Error("Expected setPuzzleHistory to be called at least once.");

  if (typeof candidatePuzzleHistoryUpdate === "function")
    return candidatePuzzleHistoryUpdate(startingPuzzleHistory);

  return candidatePuzzleHistoryUpdate;
};

const getSelectedCellStateFromPuzzleHistory = (
  puzzleHistory: PuzzleHistory,
) => {
  const selectedCellId = getBrandedCellId(1);

  return getTargetCellStateFromBoardState(
    selectedCellId,
    puzzleHistory.boardStateHistory[puzzleHistory.currentBoardStateIndex],
  );
};

const getPuzzleHistoryWithSelectedCell = () => {
  const selectedCellId = getBrandedCellId(1);
  const boardStateWithSelectedCell = getBoardStateWithTargetCellsSelected([
    selectedCellId,
  ]);

  return getStartingPuzzleHistoryFromBoardState(boardStateWithSelectedCell);
};

// #endregion

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("Keypad rendering", () => {
  it("shows 9 number buttons and no color swatches in Digit mode", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ keypadMode: "Digit" });

    // Assert
    for (const digit of sudokuDigits)
      await expect
        .element(await getDigitButtonLocator(renderedKeypad, digit))
        .toBeInTheDocument();

    expect(await getColorSwatchElements(renderedKeypad)).toHaveLength(0);
    expect(await getMultiselectSwitchInput(renderedKeypad)).toBeTruthy();
    expect(await getClearButtonElement(renderedKeypad)).toBeTruthy();
  });

  it("shows 9 number buttons and no color swatches in Center mode", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ keypadMode: "Center" });

    // Assert
    for (const digit of sudokuDigits)
      await expect
        .element(await getDigitButtonLocator(renderedKeypad, digit))
        .toBeInTheDocument();

    expect(await getColorSwatchElements(renderedKeypad)).toHaveLength(0);
  });

  it("shows 9 number buttons and no color swatches in Corner mode", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ keypadMode: "Corner" });

    // Assert
    for (const digit of sudokuDigits)
      await expect
        .element(await getDigitButtonLocator(renderedKeypad, digit))
        .toBeInTheDocument();

    expect(await getColorSwatchElements(renderedKeypad)).toHaveLength(0);
  });

  it("shows 9 color swatches and no number buttons in Color mode", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ keypadMode: "Color" });

    // Assert
    expect(await getColorSwatchElements(renderedKeypad)).toHaveLength(9);

    for (const digit of sudokuDigits)
      await expect
        .element(await getDigitButtonLocator(renderedKeypad, digit))
        .not.toBeInTheDocument();
  });
});

describe("Keypad ordering", () => {
  it("renders digits in natural order when flip keypad is disabled", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({
      isFlipKeypadEnabled: false,
      keypadMode: "Digit",
    });

    // Assert
    const digitsInRenderedOrder =
      await getDigitButtonsInRenderedOrder(renderedKeypad);
    expect(digitsInRenderedOrder).toEqual([...sudokuDigits]);
  });

  it("renders digits in flipped order when flip keypad is enabled", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({
      isFlipKeypadEnabled: true,
      keypadMode: "Digit",
    });

    // Assert
    const digitsInRenderedOrder =
      await getDigitButtonsInRenderedOrder(renderedKeypad);
    expect(digitsInRenderedOrder).toEqual([...flippedDigits]);
  });

  it("applies colors in flipped order when flip keypad is enabled", async () => {
    for (
      let colorSwatchIndex = 0;
      colorSwatchIndex < flippedColors.length;
      colorSwatchIndex += 1
    ) {
      const startingPuzzleHistory = getPuzzleHistoryWithSelectedCell();
      const setPuzzleHistory = vi.fn();

      const renderedKeypad = await renderKeypad({
        isFlipKeypadEnabled: true,
        keypadMode: "Color",
        puzzleHistory: startingPuzzleHistory,
        setPuzzleHistory: setPuzzleHistory as SetPuzzleHistory,
      });

      await clickColorSwatchAtIndex(renderedKeypad, colorSwatchIndex);

      const nextPuzzleHistory = getNextPuzzleHistoryFromSetCall(
        setPuzzleHistory,
        startingPuzzleHistory,
      );
      const selectedCellState =
        getSelectedCellStateFromPuzzleHistory(nextPuzzleHistory);

      expect(selectedCellState.markupColors).toEqual([
        flippedColors[colorSwatchIndex],
      ]);
    }
  });

  it("applies colors in natural order when flip keypad is disabled", async () => {
    for (
      let colorSwatchIndex = 0;
      colorSwatchIndex < markupColors.length;
      colorSwatchIndex += 1
    ) {
      const startingPuzzleHistory = getPuzzleHistoryWithSelectedCell();
      const setPuzzleHistory = vi.fn();

      const renderedKeypad = await renderKeypad({
        isFlipKeypadEnabled: false,
        keypadMode: "Color",
        puzzleHistory: startingPuzzleHistory,
        setPuzzleHistory: setPuzzleHistory as SetPuzzleHistory,
      });

      await clickColorSwatchAtIndex(renderedKeypad, colorSwatchIndex);

      const nextPuzzleHistory = getNextPuzzleHistoryFromSetCall(
        setPuzzleHistory,
        startingPuzzleHistory,
      );
      const selectedCellState =
        getSelectedCellStateFromPuzzleHistory(nextPuzzleHistory);

      expect(selectedCellState.markupColors).toEqual([
        markupColors[colorSwatchIndex],
      ]);
    }
  });
});

describe("Keypad input actions", () => {
  it("enters the selected digit in Digit mode", async () => {
    // Arrange
    const startingPuzzleHistory = getPuzzleHistoryWithSelectedCell();
    const setPuzzleHistory = vi.fn();

    const renderedKeypad = await renderKeypad({
      keypadMode: "Digit",
      puzzleHistory: startingPuzzleHistory,
      setPuzzleHistory: setPuzzleHistory as SetPuzzleHistory,
    });

    // Act
    await (await getDigitButtonLocator(renderedKeypad, "9")).click();

    // Assert
    const nextPuzzleHistory = getNextPuzzleHistoryFromSetCall(
      setPuzzleHistory,
      startingPuzzleHistory,
    );
    const selectedCellState =
      getSelectedCellStateFromPuzzleHistory(nextPuzzleHistory);

    expect(isEnteredDigitInCellContent(selectedCellState.content)).toBe(true);

    if (isEnteredDigitInCellContent(selectedCellState.content))
      expect(selectedCellState.content.enteredDigit).toBe("9");
  });

  it("enters center markups in Center mode", async () => {
    // Arrange
    const startingPuzzleHistory = getPuzzleHistoryWithSelectedCell();
    const setPuzzleHistory = vi.fn();

    const renderedKeypad = await renderKeypad({
      keypadMode: "Center",
      puzzleHistory: startingPuzzleHistory,
      setPuzzleHistory: setPuzzleHistory as SetPuzzleHistory,
    });

    // Act
    await (await getDigitButtonLocator(renderedKeypad, "3")).click();

    // Assert
    const nextPuzzleHistory = getNextPuzzleHistoryFromSetCall(
      setPuzzleHistory,
      startingPuzzleHistory,
    );
    const selectedCellState =
      getSelectedCellStateFromPuzzleHistory(nextPuzzleHistory);

    expect(isMarkupDigitsInCellContent(selectedCellState.content)).toBe(true);

    if (isMarkupDigitsInCellContent(selectedCellState.content))
      expect(selectedCellState.content.centerMarkups).toEqual(["3"]);
  });

  it("enters corner markups in Corner mode", async () => {
    // Arrange
    const startingPuzzleHistory = getPuzzleHistoryWithSelectedCell();
    const setPuzzleHistory = vi.fn();

    const renderedKeypad = await renderKeypad({
      keypadMode: "Corner",
      puzzleHistory: startingPuzzleHistory,
      setPuzzleHistory: setPuzzleHistory as SetPuzzleHistory,
    });

    // Act
    await (await getDigitButtonLocator(renderedKeypad, "7")).click();

    // Assert
    const nextPuzzleHistory = getNextPuzzleHistoryFromSetCall(
      setPuzzleHistory,
      startingPuzzleHistory,
    );
    const selectedCellState =
      getSelectedCellStateFromPuzzleHistory(nextPuzzleHistory);

    expect(isMarkupDigitsInCellContent(selectedCellState.content)).toBe(true);

    if (isMarkupDigitsInCellContent(selectedCellState.content))
      expect(selectedCellState.content.cornerMarkups).toEqual(["7"]);
  });

  it("applies selected colors in Color mode", async () => {
    // Arrange
    const startingPuzzleHistory = getPuzzleHistoryWithSelectedCell();
    const setPuzzleHistory = vi.fn();

    const renderedKeypad = await renderKeypad({
      keypadMode: "Color",
      puzzleHistory: startingPuzzleHistory,
      setPuzzleHistory: setPuzzleHistory as SetPuzzleHistory,
    });

    // Act
    await clickColorSwatchAtIndex(renderedKeypad, 0);

    // Assert
    const nextPuzzleHistory = getNextPuzzleHistoryFromSetCall(
      setPuzzleHistory,
      startingPuzzleHistory,
    );
    const selectedCellState =
      getSelectedCellStateFromPuzzleHistory(nextPuzzleHistory);

    expect(selectedCellState.markupColors).toEqual([markupColors[0]]);
  });

  it("clears a selected entered digit when the clear button is pressed", async () => {
    // Arrange
    const selectedCellId = getBrandedCellId(1);
    const boardStateWithEnteredDigit =
      getBoardStateWithEnteredDigitInTargetCell(
        selectedCellId,
        getBrandedSudokuDigit("8"),
        getBoardStateWithTargetCellsSelected([selectedCellId]),
      );
    const startingPuzzleHistory = getStartingPuzzleHistoryFromBoardState(
      boardStateWithEnteredDigit,
    );
    const setPuzzleHistory = vi.fn();

    const renderedKeypad = await renderKeypad({
      keypadMode: "Digit",
      puzzleHistory: startingPuzzleHistory,
      setPuzzleHistory: setPuzzleHistory as SetPuzzleHistory,
    });
    const clearButton = await getClearButtonElement(renderedKeypad);

    // Act
    await clearButton.click();

    // Assert
    const nextPuzzleHistory = getNextPuzzleHistoryFromSetCall(
      setPuzzleHistory,
      startingPuzzleHistory,
    );
    const selectedCellState =
      getSelectedCellStateFromPuzzleHistory(nextPuzzleHistory);

    expect(isEnteredDigitInCellContent(selectedCellState.content)).toBe(false);
  });
});

describe("Multiselect switch behavior", () => {
  it("renders unchecked when multiselect mode is disabled", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ isMultiselectMode: false });

    // Assert
    const multiselectSwitchInput =
      await getMultiselectSwitchInput(renderedKeypad);
    expect(multiselectSwitchInput.checked).toBe(false);
  });

  it("renders checked when multiselect mode is enabled", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ isMultiselectMode: true });

    // Assert
    const multiselectSwitchInput =
      await getMultiselectSwitchInput(renderedKeypad);
    expect(multiselectSwitchInput.checked).toBe(true);
  });

  it("toggles checked state when the switch is changed", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ isMultiselectMode: false });
    const multiselectSwitchInput =
      await getMultiselectSwitchInput(renderedKeypad);

    // Act
    multiselectSwitchInput.click();
    await waitForReactToFinishUpdating();

    // Assert
    expect(multiselectSwitchInput.checked).toBe(true);
  });
});
