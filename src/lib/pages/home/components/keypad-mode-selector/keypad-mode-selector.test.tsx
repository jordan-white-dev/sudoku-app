import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { KeypadModeSelector } from "@/lib/pages/home/components/keypad-mode-selector/keypad-mode-selector";
import { waitForReactToFinishUpdating } from "@/lib/pages/home/utils/testing";
import { type KeypadMode } from "@/lib/pages/home/utils/types";

// #region Shared Test Types
type RenderedKeypadModeSelector = Awaited<ReturnType<typeof render>>;
// #endregion

// #region Render Keypad Mode Selector
const renderKeypadModeSelector = async ({
  startingKeypadMode = "Digit",
}: {
  startingKeypadMode?: KeypadMode;
} = {}): Promise<RenderedKeypadModeSelector> => {
  const TestKeypadModeSelector = () => {
    const [keypadMode, setBaseKeypadMode] =
      useState<KeypadMode>(startingKeypadMode);

    return (
      <KeypadModeSelector
        isRowLayout={false}
        keypadMode={keypadMode}
        setBaseKeypadMode={setBaseKeypadMode}
      />
    );
  };

  const renderedKeypadModeSelector = await render(
    <Provider>
      <TestKeypadModeSelector />
    </Provider>,
  );

  await waitForReactToFinishUpdating();

  return renderedKeypadModeSelector;
};
// #endregion

// #region Keypad Mode Selector Lookup
const getKeypadModeInput = async (
  renderedKeypadModeSelector:
    | RenderedKeypadModeSelector
    | Promise<RenderedKeypadModeSelector>,
  keypadMode: KeypadMode,
): Promise<HTMLInputElement> => {
  const resolvedRenderedKeypadModeSelector = await renderedKeypadModeSelector;

  const candidateKeypadModeInput =
    resolvedRenderedKeypadModeSelector.container.querySelector<HTMLInputElement>(
      `input[type="radio"][value="${keypadMode}"]`,
    );

  if (!candidateKeypadModeInput) {
    throw new Error(
      `Could not find radio input for keypad mode "${keypadMode}".`,
    );
  }

  return candidateKeypadModeInput;
};
// #endregion

// #region Selection State Assertion
const isKeypadModeSelected = async (
  renderedKeypadModeSelector:
    | RenderedKeypadModeSelector
    | Promise<RenderedKeypadModeSelector>,
  keypadMode: KeypadMode,
): Promise<boolean> => {
  const keypadModeInput = await getKeypadModeInput(
    renderedKeypadModeSelector,
    keypadMode,
  );

  return keypadModeInput.checked;
};
// #endregion

describe("KeypadModeSelector rendering", () => {
  it("shows all four keypad mode options", async () => {
    // Arrange
    const renderedKeypadModeSelector = await renderKeypadModeSelector();

    // Assert
    expect(
      await getKeypadModeInput(renderedKeypadModeSelector, "Digit"),
    ).toBeTruthy();
    expect(
      await getKeypadModeInput(renderedKeypadModeSelector, "Center"),
    ).toBeTruthy();
    expect(
      await getKeypadModeInput(renderedKeypadModeSelector, "Corner"),
    ).toBeTruthy();
    expect(
      await getKeypadModeInput(renderedKeypadModeSelector, "Color"),
    ).toBeTruthy();
  });

  it("shows the provided keypad mode as selected", async () => {
    // Arrange
    const renderedKeypadModeSelector = await renderKeypadModeSelector({
      startingKeypadMode: "Center",
    });

    // Assert
    expect(
      await isKeypadModeSelected(renderedKeypadModeSelector, "Center"),
    ).toBe(true);
    expect(
      await isKeypadModeSelected(renderedKeypadModeSelector, "Digit"),
    ).toBe(false);
    expect(
      await isKeypadModeSelected(renderedKeypadModeSelector, "Corner"),
    ).toBe(false);
    expect(
      await isKeypadModeSelected(renderedKeypadModeSelector, "Color"),
    ).toBe(false);
  });
});

describe("Changing keypad modes", () => {
  it("updates the selected keypad mode when another mode is chosen", async () => {
    // Arrange
    const renderedKeypadModeSelector = await renderKeypadModeSelector({
      startingKeypadMode: "Digit",
    });
    const colorInput = await getKeypadModeInput(
      renderedKeypadModeSelector,
      "Color",
    );

    // Act
    colorInput.click();
    await waitForReactToFinishUpdating();

    // Assert
    expect(
      await isKeypadModeSelected(renderedKeypadModeSelector, "Color"),
    ).toBe(true);
    expect(
      await isKeypadModeSelected(renderedKeypadModeSelector, "Digit"),
    ).toBe(false);
  });
});
