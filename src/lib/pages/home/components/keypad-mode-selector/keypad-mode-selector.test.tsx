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

  if (!candidateKeypadModeInput)
    throw Error(`Could not find radio input for keypad mode "${keypadMode}".`);

  return candidateKeypadModeInput;
};
// #endregion

// #region Selection State Assertion
const expectKeypadModeToBeSelected = async (
  renderedKeypadModeSelector:
    | RenderedKeypadModeSelector
    | Promise<RenderedKeypadModeSelector>,
  keypadMode: KeypadMode,
  shouldBeSelected: boolean,
) => {
  const keypadModeInput = await getKeypadModeInput(
    renderedKeypadModeSelector,
    keypadMode,
  );

  expect(keypadModeInput.checked).toBe(shouldBeSelected);
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
    await expectKeypadModeToBeSelected(
      renderedKeypadModeSelector,
      "Center",
      true,
    );
    await expectKeypadModeToBeSelected(
      renderedKeypadModeSelector,
      "Digit",
      false,
    );
    await expectKeypadModeToBeSelected(
      renderedKeypadModeSelector,
      "Corner",
      false,
    );
    await expectKeypadModeToBeSelected(
      renderedKeypadModeSelector,
      "Color",
      false,
    );
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
    await expectKeypadModeToBeSelected(
      renderedKeypadModeSelector,
      "Color",
      true,
    );
    await expectKeypadModeToBeSelected(
      renderedKeypadModeSelector,
      "Digit",
      false,
    );
  });
});
