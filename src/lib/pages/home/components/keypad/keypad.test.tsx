import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Keypad } from "@/lib/pages/home/components/keypad/keypad";
import {
  defaultUserSettings,
  UserSettingsProvider,
} from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import {
  flippedColors,
  flippedDigits,
  markupColors,
  sudokuDigits,
} from "@/lib/pages/home/utils/constants";
import {
  isEnteredDigitCellContent,
  isMarkupDigitsCellContent,
} from "@/lib/pages/home/utils/guards";
import {
  getBoardStateWithEnteredDigitInTargetCell,
  getBoardStateWithTargetCellsSelected,
  getStartingEmptyBoardState,
  getStartingPuzzleStateFromBoardState,
  getTargetCellStateFromBoardState,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";
import {
  type KeypadMode,
  type PuzzleState,
} from "@/lib/pages/home/utils/types";
import {
  getBrandedCellId,
  getBrandedSudokuDigit,
} from "@/lib/pages/home/utils/validators/validators";

const USER_SETTINGS_LOCAL_STORAGE_KEY = "user-settings";

// #region Shared Test Types
type RenderedKeypad = Awaited<ReturnType<typeof render>>;
type SetPuzzleState = (
  value: PuzzleState | ((value: PuzzleState) => PuzzleState),
) => void;
// #endregion

// #region Render Keypad
const renderKeypad = async ({
  isFlipKeypadEnabled = false,
  isMultiselectMode = false,
  keypadMode = "Digit",
  puzzleState,
  setPuzzleState,
}: {
  isFlipKeypadEnabled?: boolean;
  isMultiselectMode?: boolean;
  keypadMode?: KeypadMode;
  puzzleState?: PuzzleState;
  setPuzzleState?: SetPuzzleState;
} = {}): Promise<RenderedKeypad> => {
  window.localStorage.setItem(
    USER_SETTINGS_LOCAL_STORAGE_KEY,
    JSON.stringify({
      ...defaultUserSettings,
      isFlipKeypadEnabled,
    }),
  );

  const startingPuzzleState =
    puzzleState ??
    getStartingPuzzleStateFromBoardState(getStartingEmptyBoardState());

  const TestKeypad = () => {
    const [currentIsMultiselectMode, setIsMultiselectMode] =
      useState(isMultiselectMode);
    const [currentPuzzleState, setLocalPuzzleState] =
      useState(startingPuzzleState);

    const resolvedSetPuzzleState = setPuzzleState ?? setLocalPuzzleState;

    return (
      <Keypad
        isMultiselectMode={currentIsMultiselectMode}
        keypadMode={keypadMode}
        puzzleState={currentPuzzleState}
        setIsMultiselectMode={setIsMultiselectMode}
        setPuzzleState={resolvedSetPuzzleState}
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

  const clearButtonCandidate = allButtons.at(-1);

  if (!clearButtonCandidate) {
    throw new Error("Could not find the clear button.");
  }

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

  if (!candidateSwitchInput) {
    throw new Error("Could not find the multiselect switch input.");
  }

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

  if (!colorSwatch) {
    throw new Error(`Could not find color swatch at index ${index}.`);
  }

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
    .filter((buttonText) => sudokuDigits.some((digit) => digit === buttonText));
};

const getNextPuzzleStateFromSetCall = (
  setPuzzleState: ReturnType<typeof vi.fn>,
  startingPuzzleState: PuzzleState,
): PuzzleState => {
  const candidatePuzzleStateUpdate = setPuzzleState.mock.calls[0]?.[0];

  if (!candidatePuzzleStateUpdate) {
    throw new Error("Expected setPuzzleState to be called at least once.");
  }

  if (typeof candidatePuzzleStateUpdate === "function") {
    return candidatePuzzleStateUpdate(startingPuzzleState);
  }

  return candidatePuzzleStateUpdate;
};

const getSelectedCellStateFromPuzzleState = (puzzleState: PuzzleState) => {
  const selectedCellId = getBrandedCellId(1);

  return getTargetCellStateFromBoardState(
    selectedCellId,
    puzzleState.puzzleHistory[puzzleState.historyIndex],
  );
};

const getPuzzleStateWithSelectedCell = () => {
  const selectedCellId = getBrandedCellId(1);
  const boardStateWithSelectedCell = getBoardStateWithTargetCellsSelected([
    selectedCellId,
  ]);

  return getStartingPuzzleStateFromBoardState(boardStateWithSelectedCell);
};

// #endregion

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("Keypad rendering", () => {
  it("shows 9 number buttons and no color swatches in Digit mode", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ keypadMode: "Digit" });

    // Assert
    for (const digit of sudokuDigits) {
      await expect
        .element(await getDigitButtonLocator(renderedKeypad, digit))
        .toBeInTheDocument();
    }

    expect(await getColorSwatchElements(renderedKeypad)).toHaveLength(0);
    expect(await getMultiselectSwitchInput(renderedKeypad)).toBeTruthy();
    expect(await getClearButtonElement(renderedKeypad)).toBeTruthy();
  });

  it("shows 9 number buttons and no color swatches in Center mode", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ keypadMode: "Center" });

    // Assert
    for (const digit of sudokuDigits) {
      await expect
        .element(await getDigitButtonLocator(renderedKeypad, digit))
        .toBeInTheDocument();
    }

    expect(await getColorSwatchElements(renderedKeypad)).toHaveLength(0);
  });

  it("shows 9 number buttons and no color swatches in Corner mode", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ keypadMode: "Corner" });

    // Assert
    for (const digit of sudokuDigits) {
      await expect
        .element(await getDigitButtonLocator(renderedKeypad, digit))
        .toBeInTheDocument();
    }

    expect(await getColorSwatchElements(renderedKeypad)).toHaveLength(0);
  });

  it("shows 9 color swatches and no number buttons in Color mode", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ keypadMode: "Color" });

    // Assert
    expect(await getColorSwatchElements(renderedKeypad)).toHaveLength(9);

    const digitsInRenderedOrder =
      await getDigitButtonsInRenderedOrder(renderedKeypad);

    expect(digitsInRenderedOrder).toHaveLength(0);
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
      const startingPuzzleState = getPuzzleStateWithSelectedCell();
      const setPuzzleState = vi.fn<SetPuzzleState>();

      const renderedKeypad = await renderKeypad({
        isFlipKeypadEnabled: true,
        keypadMode: "Color",
        puzzleState: startingPuzzleState,
        setPuzzleState,
      });

      await clickColorSwatchAtIndex(renderedKeypad, colorSwatchIndex);

      const nextPuzzleState = getNextPuzzleStateFromSetCall(
        setPuzzleState,
        startingPuzzleState,
      );
      const selectedCellState =
        getSelectedCellStateFromPuzzleState(nextPuzzleState);

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
      const startingPuzzleState = getPuzzleStateWithSelectedCell();
      const setPuzzleState = vi.fn<SetPuzzleState>();

      const renderedKeypad = await renderKeypad({
        isFlipKeypadEnabled: false,
        keypadMode: "Color",
        puzzleState: startingPuzzleState,
        setPuzzleState,
      });

      await clickColorSwatchAtIndex(renderedKeypad, colorSwatchIndex);

      const nextPuzzleState = getNextPuzzleStateFromSetCall(
        setPuzzleState,
        startingPuzzleState,
      );
      const selectedCellState =
        getSelectedCellStateFromPuzzleState(nextPuzzleState);

      expect(selectedCellState.markupColors).toEqual([
        markupColors[colorSwatchIndex],
      ]);
    }
  });
});

describe("Keypad input actions", () => {
  it("enters the selected digit in Digit mode", async () => {
    // Arrange
    const startingPuzzleState = getPuzzleStateWithSelectedCell();
    const setPuzzleState = vi.fn<SetPuzzleState>();

    const renderedKeypad = await renderKeypad({
      keypadMode: "Digit",
      puzzleState: startingPuzzleState,
      setPuzzleState,
    });

    // Act
    await (await getDigitButtonLocator(renderedKeypad, "9")).click();

    // Assert
    const nextPuzzleState = getNextPuzzleStateFromSetCall(
      setPuzzleState,
      startingPuzzleState,
    );
    const selectedCellState =
      getSelectedCellStateFromPuzzleState(nextPuzzleState);

    expect(isEnteredDigitCellContent(selectedCellState.content)).toBe(true);

    if (isEnteredDigitCellContent(selectedCellState.content)) {
      expect(selectedCellState.content.enteredDigit).toBe("9");
    }
  });

  it("enters center markups in Center mode", async () => {
    // Arrange
    const startingPuzzleState = getPuzzleStateWithSelectedCell();
    const setPuzzleState = vi.fn<SetPuzzleState>();

    const renderedKeypad = await renderKeypad({
      keypadMode: "Center",
      puzzleState: startingPuzzleState,
      setPuzzleState,
    });

    // Act
    await (await getDigitButtonLocator(renderedKeypad, "3")).click();

    // Assert
    const nextPuzzleState = getNextPuzzleStateFromSetCall(
      setPuzzleState,
      startingPuzzleState,
    );
    const selectedCellState =
      getSelectedCellStateFromPuzzleState(nextPuzzleState);

    expect(isMarkupDigitsCellContent(selectedCellState.content)).toBe(true);

    if (isMarkupDigitsCellContent(selectedCellState.content)) {
      expect(selectedCellState.content.centerMarkups).toEqual(["3"]);
    }
  });

  it("enters corner markups in Corner mode", async () => {
    // Arrange
    const startingPuzzleState = getPuzzleStateWithSelectedCell();
    const setPuzzleState = vi.fn<SetPuzzleState>();

    const renderedKeypad = await renderKeypad({
      keypadMode: "Corner",
      puzzleState: startingPuzzleState,
      setPuzzleState,
    });

    // Act
    await (await getDigitButtonLocator(renderedKeypad, "7")).click();

    // Assert
    const nextPuzzleState = getNextPuzzleStateFromSetCall(
      setPuzzleState,
      startingPuzzleState,
    );
    const selectedCellState =
      getSelectedCellStateFromPuzzleState(nextPuzzleState);

    expect(isMarkupDigitsCellContent(selectedCellState.content)).toBe(true);

    if (isMarkupDigitsCellContent(selectedCellState.content)) {
      expect(selectedCellState.content.cornerMarkups).toEqual(["7"]);
    }
  });

  it("applies selected colors in Color mode", async () => {
    // Arrange
    const startingPuzzleState = getPuzzleStateWithSelectedCell();
    const setPuzzleState = vi.fn<SetPuzzleState>();

    const renderedKeypad = await renderKeypad({
      keypadMode: "Color",
      puzzleState: startingPuzzleState,
      setPuzzleState,
    });

    // Act
    await clickColorSwatchAtIndex(renderedKeypad, 0);

    // Assert
    const nextPuzzleState = getNextPuzzleStateFromSetCall(
      setPuzzleState,
      startingPuzzleState,
    );
    const selectedCellState =
      getSelectedCellStateFromPuzzleState(nextPuzzleState);

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
    const startingPuzzleState = getStartingPuzzleStateFromBoardState(
      boardStateWithEnteredDigit,
    );
    const setPuzzleState = vi.fn<SetPuzzleState>();
    const renderedKeypad = await renderKeypad({
      keypadMode: "Digit",
      puzzleState: startingPuzzleState,
      setPuzzleState,
    });
    const clearButton = await getClearButtonElement(renderedKeypad);

    // Act
    await clearButton.click();

    // Assert
    const nextPuzzleState = getNextPuzzleStateFromSetCall(
      setPuzzleState,
      startingPuzzleState,
    );
    const selectedCellState =
      getSelectedCellStateFromPuzzleState(nextPuzzleState);

    expect(isEnteredDigitCellContent(selectedCellState.content)).toBe(false);
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
