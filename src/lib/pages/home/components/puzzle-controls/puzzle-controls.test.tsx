import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { PuzzleControls } from "@/lib/pages/home/components/puzzle-controls/puzzle-controls";
import { UserSettingsProvider } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import {
  EMPTY_RAW_BOARD_STATE,
  getStartingEmptyBoardState,
  getStartingPuzzleStateFromBoardState,
  SudokuStopwatchProviderBridge,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";
import {
  type KeypadMode,
  type PuzzleState,
  type RawBoardState,
} from "@/lib/pages/home/utils/types";

// #region Module Mocks
const mockHandleCenterMarkupInput = vi.fn();
const mockHandleClearCell = vi.fn();
const mockHandleColorPadInput = vi.fn();
const mockHandleCornerMarkupInput = vi.fn();
const mockHandleDigitInput = vi.fn();
const mockHandleRedoMove = vi.fn();
const mockHandleUndoMove = vi.fn();

const mockNavigate = vi.fn();
const mockMakePuzzle = vi.fn();

vi.mock("@/lib/pages/home/utils/actions/actions", () => ({
  handleCenterMarkupInput: (...args: Array<unknown>) =>
    mockHandleCenterMarkupInput(...args),
  handleClearCell: (...args: Array<unknown>) => mockHandleClearCell(...args),
  handleColorPadInput: (...args: Array<unknown>) =>
    mockHandleColorPadInput(...args),
  handleCornerMarkupInput: (...args: Array<unknown>) =>
    mockHandleCornerMarkupInput(...args),
  handleDigitInput: (...args: Array<unknown>) => mockHandleDigitInput(...args),
  handleRedoMove: (...args: Array<unknown>) => mockHandleRedoMove(...args),
  handleUndoMove: (...args: Array<unknown>) => mockHandleUndoMove(...args),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("sudoku", () => ({
  makepuzzle: () => mockMakePuzzle(),
}));

vi.mock("react-timer-hook", () => ({
  useStopwatch: () => ({
    hours: 0,
    isRunning: true,
    minutes: 0,
    pause: vi.fn(),
    reset: vi.fn(),
    seconds: 0,
    start: vi.fn(),
    totalSeconds: 0,
  }),
}));
// #endregion

// #region Shared Test Types
type RenderedPuzzleControls = Awaited<ReturnType<typeof render>>;
// #endregion

// #region Render Puzzle Controls
const KEYPAD_MODE_SESSION_STORAGE_KEY = "keypad-mode";

const renderPuzzleControls = async ({
  initialIsMultiselectMode = false,
  initialPuzzleState,
  rawBoardState = EMPTY_RAW_BOARD_STATE,
  startingKeypadMode,
}: {
  initialIsMultiselectMode?: boolean;
  initialPuzzleState?: PuzzleState;
  rawBoardState?: RawBoardState;
  startingKeypadMode?: KeypadMode;
} = {}): Promise<RenderedPuzzleControls> => {
  if (startingKeypadMode !== undefined) {
    window.sessionStorage.setItem(
      KEYPAD_MODE_SESSION_STORAGE_KEY,
      JSON.stringify(startingKeypadMode),
    );
  }

  const startingPuzzleState =
    initialPuzzleState ??
    getStartingPuzzleStateFromBoardState(getStartingEmptyBoardState());

  const TestPuzzleControls = () => {
    const [isMultiselectMode, setIsMultiselectMode] = useState(
      initialIsMultiselectMode,
    );
    const [puzzleState, setPuzzleState] = useState(startingPuzzleState);

    return (
      <PuzzleControls
        isMultiselectMode={isMultiselectMode}
        isRowLayout={false}
        puzzleState={puzzleState}
        rawBoardState={rawBoardState}
        setIsMultiselectMode={setIsMultiselectMode}
        setPuzzleState={setPuzzleState}
      />
    );
  };

  const renderedPuzzleControls = await render(
    <Provider>
      <UserSettingsProvider>
        <SudokuStopwatchProviderBridge>
          <TestPuzzleControls />
        </SudokuStopwatchProviderBridge>
      </UserSettingsProvider>
    </Provider>,
  );

  await waitForReactToFinishUpdating();

  return renderedPuzzleControls;
};
// #endregion

// #region Keyboard Dispatch
const dispatchWindowKeyboardEvent = async (
  eventType: "keydown" | "keyup",
  keyboardEventInit: KeyboardEventInit,
) => {
  window.dispatchEvent(
    new KeyboardEvent(eventType, {
      bubbles: true,
      cancelable: true,
      ...keyboardEventInit,
    }),
  );

  await waitForReactToFinishUpdating();
};
// #endregion

// #region Control Lookup
const accessibleNameByKeypadMode: Record<KeypadMode, string> = {
  Center: "Center markup mode",
  Color: "Color markup mode",
  Corner: "Corner markup mode",
  Digit: "Digit keypad mode",
};

const getKeypadModeRadio = async (
  renderedPuzzleControls:
    | RenderedPuzzleControls
    | Promise<RenderedPuzzleControls>,
  keypadMode: KeypadMode,
) =>
  (await renderedPuzzleControls).getByRole("radio", {
    name: accessibleNameByKeypadMode[keypadMode],
  });
// #endregion

beforeEach(() => {
  window.sessionStorage.clear();

  mockHandleCenterMarkupInput.mockReset();
  mockHandleClearCell.mockReset();
  mockHandleColorPadInput.mockReset();
  mockHandleCornerMarkupInput.mockReset();
  mockHandleDigitInput.mockReset();
  mockHandleRedoMove.mockReset();
  mockHandleUndoMove.mockReset();

  mockNavigate.mockReset();
  mockMakePuzzle.mockReset();
  mockMakePuzzle.mockReturnValue(EMPTY_RAW_BOARD_STATE);
});

// A known valid solved sudoku (0-indexed digit format, i.e. actual digit minus 1).
// Original: 123456789 456789123 789123456 214365897 365897214 897214365 531642978 642978531 978531642
// This board is solvable by deduction alone, so ratePuzzleDifficulty returns 0 → Standard.
const SOLVED_RAW_BOARD_STATE_FOR_LABEL_TESTS: RawBoardState = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 0, 1, 2, 6, 7, 8, 0, 1, 2, 3, 4,
  5, 1, 0, 3, 2, 5, 4, 7, 8, 6, 2, 5, 4, 7, 8, 6, 1, 0, 3, 7, 8, 6, 1, 0, 3, 2,
  5, 4, 4, 2, 0, 5, 3, 1, 8, 6, 7, 5, 3, 1, 8, 6, 7, 4, 2, 0, 8, 6, 7, 4, 2, 0,
  5, 3, 1,
] as RawBoardState;

describe("Difficulty label", () => {
  it("renders 'Difficulty: Standard' for a fully given board solvable by deduction alone", async () => {
    // Arrange — solved board has 0 empty cells and passes constraint propagation → rating 0 → Standard

    // Act
    const renderedPuzzleControls = await renderPuzzleControls({
      rawBoardState: SOLVED_RAW_BOARD_STATE_FOR_LABEL_TESTS,
    });

    // Assert
    await expect
      .element(renderedPuzzleControls.getByText("Difficulty: Standard"))
      .toBeInTheDocument();
  });

  it("renders 'Difficulty: Intermediate' for a board where all 81 cells are given", async () => {
    // Arrange
    // A board where every cell is 0 (given, non-null) has 0 empty cells:
    // isPuzzleSolvableByDeductionOnly returns false (conflicting given values),
    // so difficulty = Math.max(1, Math.ceil(0 / 4)) = 1 → Intermediate
    const allGivenBoard: RawBoardState = Array.from(
      { length: 81 },
      () => 0,
    ) as RawBoardState;

    // Act
    const renderedPuzzleControls = await renderPuzzleControls({
      rawBoardState: allGivenBoard,
    });

    // Assert
    await expect
      .element(renderedPuzzleControls.getByText("Difficulty: Intermediate"))
      .toBeInTheDocument();
  });

  it("renders 'Difficulty: Expert' for a board with many empty cells", async () => {
    // Arrange — EMPTY_RAW_BOARD_STATE has 81 nulls → rating 21 → capped to Expert

    // Act
    const renderedPuzzleControls = await renderPuzzleControls();

    // Assert
    await expect
      .element(renderedPuzzleControls.getByText("Difficulty: Expert"))
      .toBeInTheDocument();
  });
});

describe("PuzzleControls rendering", () => {
  it("renders puzzle actions, keypad, and keypad mode selector", async () => {
    // Arrange
    const renderedPuzzleControls = await renderPuzzleControls();

    // Assert
    for (const name of [
      "Start a new puzzle",
      "Undo the last move",
      "Redo the last undone move",
      "Check the current solution",
      "Restart the puzzle",
    ]) {
      await expect
        .element(renderedPuzzleControls.getByRole("button", { name }))
        .toBeInTheDocument();
    }
    for (const name of [
      "Enter digit 1",
      "Enter digit 2",
      "Enter digit 3",
      "Enter digit 4",
      "Enter digit 5",
      "Enter digit 6",
      "Enter digit 7",
      "Enter digit 8",
      "Enter digit 9",
    ]) {
      await expect
        .element(
          renderedPuzzleControls.getByRole("button", {
            name,
          }),
        )
        .toBeInTheDocument();
    }
    await expect
      .element(
        renderedPuzzleControls.getByRole("radiogroup", {
          name: "Keypad mode selector",
        }),
      )
      .toBeInTheDocument();
  });
});

describe("Keyboard digit input", () => {
  it("dispatches digit input in Digit base mode", async () => {
    // Arrange
    await renderPuzzleControls({ startingKeypadMode: "Digit" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit1", key: "1" });

    // Assert
    expect(mockHandleDigitInput).toHaveBeenCalledTimes(1);
    expect(mockHandleDigitInput.mock.calls[0][1]).toBe("1");
  });

  it("dispatches center markup input in Center base mode", async () => {
    // Arrange
    await renderPuzzleControls({ startingKeypadMode: "Center" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit3", key: "3" });

    // Assert
    expect(mockHandleCenterMarkupInput).toHaveBeenCalledTimes(1);
    expect(mockHandleCenterMarkupInput.mock.calls[0][1]).toBe("3");
  });

  it("dispatches corner markup input in Corner base mode", async () => {
    // Arrange
    await renderPuzzleControls({ startingKeypadMode: "Corner" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit5", key: "5" });

    // Assert
    expect(mockHandleCornerMarkupInput).toHaveBeenCalledTimes(1);
    expect(mockHandleCornerMarkupInput.mock.calls[0][1]).toBe("5");
  });

  it("dispatches color input in Color base mode", async () => {
    // Arrange
    await renderPuzzleControls({ startingKeypadMode: "Color" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit2", key: "2" });

    // Assert
    expect(mockHandleColorPadInput).toHaveBeenCalledTimes(1);
    expect(mockHandleColorPadInput.mock.calls[0][1]).toBe("2");
  });
});

describe("Modifier key overrides", () => {
  it("uses Center mode while Control is held and returns to base on release", async () => {
    // Arrange
    await renderPuzzleControls({ startingKeypadMode: "Digit" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Control" });
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit4", key: "4" });
    await dispatchWindowKeyboardEvent("keyup", { key: "Control" });
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit6", key: "6" });

    // Assert
    expect(mockHandleCenterMarkupInput).toHaveBeenCalledTimes(1);
    expect(mockHandleCenterMarkupInput.mock.calls[0][1]).toBe("4");
    expect(mockHandleDigitInput).toHaveBeenCalledTimes(1);
    expect(mockHandleDigitInput.mock.calls[0][1]).toBe("6");
  });

  it("uses Corner mode while Shift is held", async () => {
    // Arrange
    await renderPuzzleControls({ startingKeypadMode: "Digit" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Shift" });
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit7", key: "7" });

    // Assert
    expect(mockHandleCornerMarkupInput).toHaveBeenCalledTimes(1);
    expect(mockHandleCornerMarkupInput.mock.calls[0][1]).toBe("7");
  });

  it("uses Color mode while Alt is held", async () => {
    // Arrange
    await renderPuzzleControls({ startingKeypadMode: "Digit" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Alt" });
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit8", key: "8" });

    // Assert
    expect(mockHandleColorPadInput).toHaveBeenCalledTimes(1);
    expect(mockHandleColorPadInput.mock.calls[0][1]).toBe("8");
  });

  it("uses the most recently pressed modifier when multiple modifiers are down", async () => {
    // Arrange
    await renderPuzzleControls({ startingKeypadMode: "Digit" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Control" });
    await dispatchWindowKeyboardEvent("keydown", { key: "Shift" });
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit9", key: "9" });
    await dispatchWindowKeyboardEvent("keyup", { key: "Shift" });
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit1", key: "1" });

    // Assert
    expect(mockHandleCornerMarkupInput).toHaveBeenCalledTimes(1);
    expect(mockHandleCenterMarkupInput).toHaveBeenCalledTimes(1);
    expect(mockHandleCornerMarkupInput.mock.calls[0][1]).toBe("9");
    expect(mockHandleCenterMarkupInput.mock.calls[0][1]).toBe("1");
  });
});

describe("Keyboard shortcuts", () => {
  it("switches keypad mode with Z/X/C/V shortcuts", async () => {
    // Arrange
    const renderedPuzzleControls = await renderPuzzleControls({
      startingKeypadMode: "Digit",
    });

    // Act + Assert
    await dispatchWindowKeyboardEvent("keydown", { key: "x" });
    await expect
      .element(await getKeypadModeRadio(renderedPuzzleControls, "Center"))
      .toBeChecked();

    await dispatchWindowKeyboardEvent("keydown", { key: "c" });
    await expect
      .element(await getKeypadModeRadio(renderedPuzzleControls, "Corner"))
      .toBeChecked();

    await dispatchWindowKeyboardEvent("keydown", { key: "v" });
    await expect
      .element(await getKeypadModeRadio(renderedPuzzleControls, "Color"))
      .toBeChecked();

    await dispatchWindowKeyboardEvent("keydown", { key: "z" });
    await expect
      .element(await getKeypadModeRadio(renderedPuzzleControls, "Digit"))
      .toBeChecked();
  });

  it("dispatches undo and redo shortcuts", async () => {
    // Arrange
    await renderPuzzleControls();

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Control" });
    await dispatchWindowKeyboardEvent("keydown", { key: "z" });
    await dispatchWindowKeyboardEvent("keyup", { key: "Control" });

    await dispatchWindowKeyboardEvent("keydown", { key: "Control" });
    await dispatchWindowKeyboardEvent("keydown", { key: "Shift" });
    await dispatchWindowKeyboardEvent("keydown", { key: "z" });

    await dispatchWindowKeyboardEvent("keyup", { key: "Shift" });
    await dispatchWindowKeyboardEvent("keydown", { key: "y" });

    // Assert
    expect(mockHandleUndoMove).toHaveBeenCalledTimes(1);
    expect(mockHandleRedoMove).toHaveBeenCalledTimes(2);
  });

  it("dispatches clear action for Escape, Backspace, and Delete", async () => {
    // Arrange
    await renderPuzzleControls();

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Escape" });
    await dispatchWindowKeyboardEvent("keydown", { key: "Backspace" });
    await dispatchWindowKeyboardEvent("keydown", { key: "Delete" });

    // Assert
    expect(mockHandleClearCell).toHaveBeenCalledTimes(3);
  });

  it("does not dispatch clear action for Escape when focus is inside a menu", async () => {
    // Arrange
    await renderPuzzleControls();
    const menuElement = document.createElement("div");
    menuElement.setAttribute("role", "menu");
    const menuItemElement = document.createElement("div");
    menuItemElement.setAttribute("role", "menuitem");
    menuElement.appendChild(menuItemElement);
    document.body.appendChild(menuElement);

    // Act
    menuItemElement.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Escape",
      }),
    );
    await waitForReactToFinishUpdating();

    // Assert
    expect(mockHandleClearCell).not.toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(menuElement);
  });

  it("toggles multiselect mode with M", async () => {
    // Arrange
    const renderedPuzzleControls = await renderPuzzleControls({
      initialIsMultiselectMode: false,
    });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "m" });

    // Assert
    await expect
      .element(
        renderedPuzzleControls.getByRole("checkbox", {
          name: "Multiselect mode",
        }),
      )
      .toBeChecked();
  });
});

describe("Numpad and editable element handling", () => {
  it("dispatches digit input for numpad key events", async () => {
    // Arrange
    await renderPuzzleControls({ startingKeypadMode: "Digit" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", {
      code: "Numpad5",
      key: "5",
      location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
    });

    // Assert
    expect(mockHandleDigitInput).toHaveBeenCalledTimes(1);
    expect(mockHandleDigitInput.mock.calls[0][1]).toBe("5");
  });

  it("uses shifted numpad mapping for keys like End and ArrowDown", async () => {
    // Arrange
    await renderPuzzleControls({ startingKeypadMode: "Digit" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", {
      code: "Numpad1",
      key: "End",
      location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
    });
    await dispatchWindowKeyboardEvent("keydown", {
      code: "Numpad2",
      key: "ArrowDown",
      location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
    });

    // Assert
    expect(mockHandleDigitInput).toHaveBeenCalledTimes(2);
    expect(mockHandleDigitInput.mock.calls[0][1]).toBe("1");
    expect(mockHandleDigitInput.mock.calls[1][1]).toBe("2");
  });
});

describe("Window blur behavior", () => {
  it("resets held modifiers on blur and returns to base mode", async () => {
    // Arrange
    const renderedPuzzleControls = await renderPuzzleControls({
      startingKeypadMode: "Digit",
    });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Control" });
    await expect
      .element(await getKeypadModeRadio(renderedPuzzleControls, "Center"))
      .toBeChecked();

    window.dispatchEvent(new Event("blur"));
    await waitForReactToFinishUpdating();

    // Assert
    await expect
      .element(await getKeypadModeRadio(renderedPuzzleControls, "Digit"))
      .toBeChecked();
  });
});

describe("Numpad modifier key behavior", () => {
  it("uses Corner mode for a numpad digit key when Shift is held", async () => {
    // Arrange
    await renderPuzzleControls({ startingKeypadMode: "Digit" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Shift" });
    await dispatchWindowKeyboardEvent("keydown", {
      code: "Numpad7",
      key: "7",
      location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
      shiftKey: true,
    });

    // Assert
    expect(mockHandleCornerMarkupInput).toHaveBeenCalledTimes(1);
    expect(mockHandleCornerMarkupInput.mock.calls[0][1]).toBe("7");
  });
});

describe("Keypad mode shortcut blocking", () => {
  it("does not switch keypad mode when Alt is held alongside a shortcut key", async () => {
    // Arrange
    const renderedPuzzleControls = await renderPuzzleControls({
      startingKeypadMode: "Digit",
    });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Alt" });
    await dispatchWindowKeyboardEvent("keydown", { key: "x" });
    await dispatchWindowKeyboardEvent("keyup", { key: "Alt" });

    // Assert
    await expect
      .element(await getKeypadModeRadio(renderedPuzzleControls, "Digit"))
      .toBeChecked();
  });

  it("does not switch keypad mode when Control is held alongside a shortcut key", async () => {
    // Arrange
    const renderedPuzzleControls = await renderPuzzleControls({
      startingKeypadMode: "Digit",
    });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Control" });
    await dispatchWindowKeyboardEvent("keydown", { key: "x" });
    await dispatchWindowKeyboardEvent("keyup", { key: "Control" });

    // Assert
    await expect
      .element(await getKeypadModeRadio(renderedPuzzleControls, "Digit"))
      .toBeChecked();
  });
});

describe("Duplicate modifier key press", () => {
  it("stays in the same effective mode when the same modifier key is pressed twice", async () => {
    // Arrange
    const renderedPuzzleControls = await renderPuzzleControls({
      startingKeypadMode: "Digit",
    });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Control" });
    await dispatchWindowKeyboardEvent("keydown", { key: "Control" });

    // Assert
    await expect
      .element(await getKeypadModeRadio(renderedPuzzleControls, "Center"))
      .toBeChecked();

    // Cleanup
    await dispatchWindowKeyboardEvent("keyup", { key: "Control" });
  });
});

describe("Shift timestamp tracking for numpad", () => {
  it("treats a numpad key as unshifted when Shift was pressed but not yet released", async () => {
    // Arrange
    await renderPuzzleControls({ startingKeypadMode: "Digit" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Shift" });
    await dispatchWindowKeyboardEvent("keydown", {
      code: "Numpad5",
      key: "5",
      location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
      shiftKey: false,
    });
    await dispatchWindowKeyboardEvent("keyup", { key: "Shift" });

    // Assert
    expect(mockHandleCornerMarkupInput).toHaveBeenCalled();
    expect(mockHandleDigitInput).not.toHaveBeenCalled();
  });

  it("reaches the timestamp calculation when Shift is pressed and released before a numpad key", async () => {
    // Arrange
    await renderPuzzleControls({ startingKeypadMode: "Digit" });

    // Act
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Shift",
      }),
    );
    window.dispatchEvent(
      new KeyboardEvent("keyup", {
        bubbles: true,
        cancelable: true,
        key: "Shift",
      }),
    );
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        code: "Numpad7",
        key: "7",
        location: KeyboardEvent.DOM_KEY_LOCATION_NUMPAD,
        shiftKey: false,
      }),
    );
    await waitForReactToFinishUpdating();

    // Assert
    expect(mockHandleCornerMarkupInput).toHaveBeenCalledWith(
      expect.anything(),
      "7",
      expect.anything(),
    );
  });
});

describe("Row layout rendering", () => {
  it("renders puzzle controls in column direction when isRowLayout is true", async () => {
    // Arrange
    const TestPuzzleControls = () => {
      const [isMultiselectMode, setIsMultiselectMode] = useState(false);
      const [puzzleState, setPuzzleState] = useState(
        getStartingPuzzleStateFromBoardState(getStartingEmptyBoardState()),
      );

      return (
        <PuzzleControls
          isMultiselectMode={isMultiselectMode}
          isRowLayout={true}
          puzzleState={puzzleState}
          rawBoardState={EMPTY_RAW_BOARD_STATE}
          setIsMultiselectMode={setIsMultiselectMode}
          setPuzzleState={setPuzzleState}
        />
      );
    };
    const renderedPuzzleControls = await render(
      <Provider>
        <UserSettingsProvider>
          <SudokuStopwatchProviderBridge>
            <TestPuzzleControls />
          </SudokuStopwatchProviderBridge>
        </UserSettingsProvider>
      </Provider>,
    );
    await waitForReactToFinishUpdating();

    // Assert
    await expect
      .element(
        renderedPuzzleControls.getByRole("button", {
          name: "Check the current solution",
        }),
      )
      .toBeInTheDocument();
  });
});
