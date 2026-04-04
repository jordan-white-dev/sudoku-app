import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Keypad } from "@/lib/pages/home/components/keypad/keypad";
import {
  flippedColors,
  flippedDigits,
  markupColors,
  sudokuDigits,
} from "@/lib/pages/home/utils/constants";
import {
  getStartingEmptyBoardState,
  getStartingPuzzleHistoryFromBoardState,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";
import {
  type KeypadMode,
  type PuzzleHistory,
} from "@/lib/pages/home/utils/types";

// #region Module Mocks
const mockUseUserSettings = vi.fn();

const mockHandleCenterMarkupInput = vi.fn();
const mockHandleClearCell = vi.fn();
const mockHandleColorPadInput = vi.fn();
const mockHandleCornerMarkupInput = vi.fn();
const mockHandleDigitInput = vi.fn();

vi.mock("@/lib/pages/home/hooks/use-user-settings/use-user-settings", () => ({
  useUserSettings: () => mockUseUserSettings(),
}));

vi.mock("@/lib/pages/home/utils/actions/actions", () => ({
  handleCenterMarkupInput: (...args: Array<unknown>) =>
    mockHandleCenterMarkupInput(...args),
  handleClearCell: (...args: Array<unknown>) => mockHandleClearCell(...args),
  handleColorPadInput: (...args: Array<unknown>) =>
    mockHandleColorPadInput(...args),
  handleCornerMarkupInput: (...args: Array<unknown>) =>
    mockHandleCornerMarkupInput(...args),
  handleDigitInput: (...args: Array<unknown>) => mockHandleDigitInput(...args),
}));
// #endregion

// #region Shared Test Types
type RenderedKeypad = Awaited<ReturnType<typeof render>>;
// #endregion

// #region Render Keypad
const renderKeypad = async ({
  isFlipKeypadEnabled = false,
  isMultiselectMode = false,
  keypadMode = "Digit",
  puzzleHistory,
}: {
  isFlipKeypadEnabled?: boolean;
  isMultiselectMode?: boolean;
  keypadMode?: KeypadMode;
  puzzleHistory?: PuzzleHistory;
} = {}): Promise<RenderedKeypad> => {
  mockUseUserSettings.mockReturnValue({
    userSettings: {
      isConflictCheckerEnabled: false,
      isDashedGridEnabled: false,
      isFlipKeypadEnabled,
      isHideStopwatchEnabled: false,
      isShowRowAndColumnLabelsEnabled: false,
      isShowSeenCellsEnabled: false,
      isStopwatchDisabled: false,
      isStrictHighlightsEnabled: false,
    },
    setUserSettings: vi.fn(),
  });

  const startingPuzzleHistory =
    puzzleHistory ??
    getStartingPuzzleHistoryFromBoardState(getStartingEmptyBoardState());

  const TestKeypad = () => {
    const [currentIsMultiselectMode, setIsMultiselectMode] =
      useState(isMultiselectMode);
    const [currentPuzzleHistory, setPuzzleHistory] = useState(
      startingPuzzleHistory,
    );

    return (
      <Keypad
        isMultiselectMode={currentIsMultiselectMode}
        keypadMode={keypadMode}
        puzzleHistory={currentPuzzleHistory}
        setIsMultiselectMode={setIsMultiselectMode}
        setPuzzleHistory={setPuzzleHistory}
      />
    );
  };

  const renderedKeypad = await render(
    <Provider>
      <TestKeypad />
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

// #endregion

beforeEach(() => {
  mockUseUserSettings.mockReset();

  mockHandleCenterMarkupInput.mockReset();
  mockHandleClearCell.mockReset();
  mockHandleColorPadInput.mockReset();
  mockHandleCornerMarkupInput.mockReset();
  mockHandleDigitInput.mockReset();
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
  it("passes digits in natural order when flip keypad is disabled", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({
      isFlipKeypadEnabled: false,
      keypadMode: "Digit",
    });

    // Act
    for (const digit of sudokuDigits)
      await (await getDigitButtonLocator(renderedKeypad, digit)).click();

    // Assert
    const calledDigits = mockHandleDigitInput.mock.calls.map(
      (callArguments) => callArguments[1],
    );
    expect(calledDigits).toEqual([...sudokuDigits]);
  });

  it("passes digits in flipped order when flip keypad is enabled", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({
      isFlipKeypadEnabled: true,
      keypadMode: "Digit",
    });

    // Act
    for (const digit of flippedDigits)
      await (await getDigitButtonLocator(renderedKeypad, digit)).click();

    // Assert
    const calledDigits = mockHandleDigitInput.mock.calls.map(
      (callArguments) => callArguments[1],
    );
    expect(calledDigits).toEqual([...flippedDigits]);
  });

  it("passes colors in flipped order when flip keypad is enabled", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({
      isFlipKeypadEnabled: true,
      keypadMode: "Color",
    });

    // Act
    for (
      let colorSwatchIndex = 0;
      colorSwatchIndex < flippedColors.length;
      colorSwatchIndex += 1
    )
      await clickColorSwatchAtIndex(renderedKeypad, colorSwatchIndex);

    // Assert
    const calledColors = mockHandleColorPadInput.mock.calls.map(
      (callArguments) => callArguments[1],
    );
    expect(calledColors).toEqual([...flippedColors]);
  });

  it("passes colors in natural order when flip keypad is disabled", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({
      isFlipKeypadEnabled: false,
      keypadMode: "Color",
    });

    // Act
    for (
      let colorSwatchIndex = 0;
      colorSwatchIndex < markupColors.length;
      colorSwatchIndex += 1
    )
      await clickColorSwatchAtIndex(renderedKeypad, colorSwatchIndex);

    // Assert
    const calledColors = mockHandleColorPadInput.mock.calls.map(
      (callArguments) => callArguments[1],
    );
    expect(calledColors).toEqual([...markupColors]);
  });
});

describe("Keypad input actions", () => {
  it("calls handleDigitInput with the selected digit in Digit mode", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ keypadMode: "Digit" });

    // Act
    await (await getDigitButtonLocator(renderedKeypad, "1")).click();
    await (await getDigitButtonLocator(renderedKeypad, "5")).click();
    await (await getDigitButtonLocator(renderedKeypad, "9")).click();

    // Assert
    expect(mockHandleDigitInput).toHaveBeenCalledTimes(3);
    expect(mockHandleDigitInput.mock.calls[0][1]).toBe("1");
    expect(mockHandleDigitInput.mock.calls[1][1]).toBe("5");
    expect(mockHandleDigitInput.mock.calls[2][1]).toBe("9");
  });

  it("calls handleCenterMarkupInput with the selected digit in Center mode", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ keypadMode: "Center" });

    // Act
    await (await getDigitButtonLocator(renderedKeypad, "3")).click();

    // Assert
    expect(mockHandleCenterMarkupInput).toHaveBeenCalledTimes(1);
    expect(mockHandleCenterMarkupInput.mock.calls[0][1]).toBe("3");
  });

  it("calls handleCornerMarkupInput with the selected digit in Corner mode", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ keypadMode: "Corner" });

    // Act
    await (await getDigitButtonLocator(renderedKeypad, "7")).click();

    // Assert
    expect(mockHandleCornerMarkupInput).toHaveBeenCalledTimes(1);
    expect(mockHandleCornerMarkupInput.mock.calls[0][1]).toBe("7");
  });

  it("calls handleColorPadInput with the selected color in Color mode", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ keypadMode: "Color" });

    // Act
    await clickColorSwatchAtIndex(renderedKeypad, 0);
    await clickColorSwatchAtIndex(renderedKeypad, 7);

    // Assert
    expect(mockHandleColorPadInput).toHaveBeenCalledTimes(2);
    expect(mockHandleColorPadInput.mock.calls[0][1]).toBe(markupColors[0]);
    expect(mockHandleColorPadInput.mock.calls[1][1]).toBe(markupColors[7]);
  });

  it("calls handleClearCell when the clear button is pressed", async () => {
    // Arrange
    const renderedKeypad = await renderKeypad({ keypadMode: "Digit" });
    const clearButton = await getClearButtonElement(renderedKeypad);

    // Act
    await clearButton.click();

    // Assert
    expect(mockHandleClearCell).toHaveBeenCalledTimes(1);
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
