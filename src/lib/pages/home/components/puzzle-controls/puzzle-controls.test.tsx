import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { PuzzleControls } from "@/lib/pages/home/components/puzzle-controls/puzzle-controls";
import {
  getEmptyRawBoardState,
  getStartingEmptyBoardState,
  getStartingPuzzleStateFromBoardState,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";
import { type PuzzleState } from "@/lib/pages/home/utils/types";

// #region Module Mocks
const mockHandleCenterMarkupInput = vi.fn();
const mockHandleClearCell = vi.fn();
const mockHandleColorPadInput = vi.fn();
const mockHandleCornerMarkupInput = vi.fn();
const mockHandleDigitInput = vi.fn();
const mockHandleRedoMove = vi.fn();
const mockHandleUndoMove = vi.fn();

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

vi.mock("@/lib/pages/home/components/puzzle-actions/puzzle-actions", () => ({
  PuzzleActions: () => (
    <div data-testid="mock-puzzle-actions">PuzzleActions</div>
  ),
}));

vi.mock("@/lib/pages/home/components/keypad/keypad", () => ({
  Keypad: ({
    isMultiselectMode,
    keypadMode,
  }: {
    isMultiselectMode: boolean;
    keypadMode: string;
  }) => (
    <div data-testid="mock-keypad">
      <div>Keypad mode: {keypadMode}</div>
      <div>Multiselect: {String(isMultiselectMode)}</div>
    </div>
  ),
}));

vi.mock(
  "@/lib/pages/home/components/keypad-mode-selector/keypad-mode-selector",
  () => ({
    KeypadModeSelector: ({ keypadMode }: { keypadMode: string }) => (
      <div
        aria-label="Keypad mode selector"
        data-testid="mock-keypad-mode-selector"
        role="radiogroup"
      >
        Active mode: {keypadMode}
      </div>
    ),
  }),
);
// #endregion

// #region Shared Test Types
type RenderedPuzzleControls = Awaited<ReturnType<typeof render>>;
// #endregion

// #region Render Puzzle Controls
const KEYPAD_MODE_SESSION_STORAGE_KEY = "keypad-mode";

const renderPuzzleControls = async ({
  initialIsMultiselectMode = false,
  initialPuzzleState,
  startingBaseKeypadMode,
}: {
  initialIsMultiselectMode?: boolean;
  initialPuzzleState?: PuzzleState;
  startingBaseKeypadMode?: "Digit" | "Center" | "Corner" | "Color";
} = {}): Promise<RenderedPuzzleControls> => {
  if (startingBaseKeypadMode !== undefined)
    window.sessionStorage.setItem(
      KEYPAD_MODE_SESSION_STORAGE_KEY,
      JSON.stringify(startingBaseKeypadMode),
    );

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
        puzzleState={puzzleState}
        rawBoardState={getEmptyRawBoardState()}
        setIsMultiselectMode={setIsMultiselectMode}
        setPuzzleState={setPuzzleState}
      />
    );
  };

  const renderedPuzzleControls = await render(
    <Provider>
      <TestPuzzleControls />
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

const dispatchKeyboardEventFromEditableInput = async (
  keyboardEventInit: KeyboardEventInit,
) => {
  const editableInputElement = document.createElement("input");
  document.body.append(editableInputElement);

  editableInputElement.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ...keyboardEventInit,
    }),
  );

  await waitForReactToFinishUpdating();
  editableInputElement.remove();
};
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
});

describe("PuzzleControls rendering", () => {
  it("renders puzzle actions, keypad, and keypad mode selector", async () => {
    // Arrange
    const renderedPuzzleControls = await renderPuzzleControls();

    // Assert
    await expect
      .element(renderedPuzzleControls.getByTestId("mock-puzzle-actions"))
      .toBeInTheDocument();
    await expect
      .element(renderedPuzzleControls.getByTestId("mock-keypad"))
      .toBeInTheDocument();
    await expect
      .element(renderedPuzzleControls.getByTestId("mock-keypad-mode-selector"))
      .toBeInTheDocument();
  });
});

describe("Keyboard digit input", () => {
  it("dispatches digit input in Digit base mode", async () => {
    // Arrange
    await renderPuzzleControls({ startingBaseKeypadMode: "Digit" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit1", key: "1" });

    // Assert
    expect(mockHandleDigitInput).toHaveBeenCalledTimes(1);
    expect(mockHandleDigitInput.mock.calls[0][1]).toBe("1");
  });

  it("dispatches center markup input in Center base mode", async () => {
    // Arrange
    await renderPuzzleControls({ startingBaseKeypadMode: "Center" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit3", key: "3" });

    // Assert
    expect(mockHandleCenterMarkupInput).toHaveBeenCalledTimes(1);
    expect(mockHandleCenterMarkupInput.mock.calls[0][1]).toBe("3");
  });

  it("dispatches corner markup input in Corner base mode", async () => {
    // Arrange
    await renderPuzzleControls({ startingBaseKeypadMode: "Corner" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit5", key: "5" });

    // Assert
    expect(mockHandleCornerMarkupInput).toHaveBeenCalledTimes(1);
    expect(mockHandleCornerMarkupInput.mock.calls[0][1]).toBe("5");
  });

  it("dispatches color input in Color base mode", async () => {
    // Arrange
    await renderPuzzleControls({ startingBaseKeypadMode: "Color" });

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
    await renderPuzzleControls({ startingBaseKeypadMode: "Digit" });

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
    await renderPuzzleControls({ startingBaseKeypadMode: "Digit" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Shift" });
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit7", key: "7" });

    // Assert
    expect(mockHandleCornerMarkupInput).toHaveBeenCalledTimes(1);
    expect(mockHandleCornerMarkupInput.mock.calls[0][1]).toBe("7");
  });

  it("uses Color mode while Alt is held", async () => {
    // Arrange
    await renderPuzzleControls({ startingBaseKeypadMode: "Digit" });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Alt" });
    await dispatchWindowKeyboardEvent("keydown", { code: "Digit8", key: "8" });

    // Assert
    expect(mockHandleColorPadInput).toHaveBeenCalledTimes(1);
    expect(mockHandleColorPadInput.mock.calls[0][1]).toBe("8");
  });

  it("uses the most recently pressed modifier when multiple modifiers are down", async () => {
    // Arrange
    await renderPuzzleControls({ startingBaseKeypadMode: "Digit" });

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
      startingBaseKeypadMode: "Digit",
    });

    // Act + Assert
    await dispatchWindowKeyboardEvent("keydown", { key: "x" });
    await expect
      .element(renderedPuzzleControls.getByText("Active mode: Center"))
      .toBeInTheDocument();

    await dispatchWindowKeyboardEvent("keydown", { key: "c" });
    await expect
      .element(renderedPuzzleControls.getByText("Active mode: Corner"))
      .toBeInTheDocument();

    await dispatchWindowKeyboardEvent("keydown", { key: "v" });
    await expect
      .element(renderedPuzzleControls.getByText("Active mode: Color"))
      .toBeInTheDocument();

    await dispatchWindowKeyboardEvent("keydown", { key: "z" });
    await expect
      .element(renderedPuzzleControls.getByText("Active mode: Digit"))
      .toBeInTheDocument();
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

  it("toggles multiselect mode with M", async () => {
    // Arrange
    const renderedPuzzleControls = await renderPuzzleControls({
      initialIsMultiselectMode: false,
    });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "m" });

    // Assert
    await expect
      .element(renderedPuzzleControls.getByText("Multiselect: true"))
      .toBeInTheDocument();
  });
});

describe("Numpad and editable element handling", () => {
  it("dispatches digit input for numpad key events", async () => {
    // Arrange
    await renderPuzzleControls({ startingBaseKeypadMode: "Digit" });

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
    await renderPuzzleControls({ startingBaseKeypadMode: "Digit" });

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

  it("ignores shortcut input when the event target is an editable element", async () => {
    // Arrange
    await renderPuzzleControls({ startingBaseKeypadMode: "Digit" });

    // Act
    await dispatchKeyboardEventFromEditableInput({ code: "Digit1", key: "1" });
    await dispatchKeyboardEventFromEditableInput({ key: "Escape" });

    // Assert
    expect(mockHandleDigitInput).not.toHaveBeenCalled();
    expect(mockHandleClearCell).not.toHaveBeenCalled();
  });
});

describe("Window blur behavior", () => {
  it("resets held modifiers on blur and returns to base mode", async () => {
    // Arrange
    const renderedPuzzleControls = await renderPuzzleControls({
      startingBaseKeypadMode: "Digit",
    });

    // Act
    await dispatchWindowKeyboardEvent("keydown", { key: "Control" });
    await expect
      .element(renderedPuzzleControls.getByText("Active mode: Center"))
      .toBeInTheDocument();

    window.dispatchEvent(new Event("blur"));
    await waitForReactToFinishUpdating();

    // Assert
    await expect
      .element(renderedPuzzleControls.getByText("Active mode: Digit"))
      .toBeInTheDocument();
  });
});
