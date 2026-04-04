import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Puzzle } from "@/lib/pages/home/components/puzzle/puzzle";
import { SudokuStopwatchProvider } from "@/lib/pages/home/hooks/use-sudoku-stopwatch/use-sudoku-stopwatch";
import { UserSettingsProvider } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import {
  getBoardStateWithGivenDigitsInTargetCells,
  getBoardStateWithTargetCellsSelected,
  getCellElement,
  getCellLocator,
  getEmptyRawBoardState,
  getStartingEmptyBoardState,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";
import {
  getBrandedCellNumber,
  getBrandedSudokuDigit,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type RawBoardState,
} from "@/lib/pages/home/utils/types";

// #region Shared Test Types
type RenderedPuzzle = Awaited<ReturnType<typeof render>>;
// #endregion

// #region Render Puzzle
const renderPuzzle = async ({
  rawBoardState,
  startingBoardState,
}: {
  rawBoardState?: RawBoardState;
  startingBoardState?: BoardState;
} = {}): Promise<RenderedPuzzle> => {
  const resolvedRawBoardState = rawBoardState ?? getEmptyRawBoardState();
  const resolvedStartingBoardState =
    startingBoardState ?? getStartingEmptyBoardState();

  const renderedPuzzle = await render(
    <Provider>
      <UserSettingsProvider>
        <SudokuStopwatchProvider rawBoardState={resolvedRawBoardState}>
          <Puzzle
            rawBoardState={resolvedRawBoardState}
            startingBoardState={resolvedStartingBoardState}
          />
        </SudokuStopwatchProvider>
      </UserSettingsProvider>
    </Provider>,
  );

  await waitForReactToFinishUpdating();

  return renderedPuzzle;
};
// #endregion

// #region Puzzle Lookup
const dispatchPointerDownEvent = async (eventTarget: EventTarget) => {
  eventTarget.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
    }),
  );

  await waitForReactToFinishUpdating();
};
// #endregion

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("Puzzle rendering", () => {
  it("renders all 81 board cells and puzzle controls", async () => {
    // Arrange
    const renderedPuzzle = await renderPuzzle();

    // Assert
    for (let cellNumber = 1; cellNumber <= 81; cellNumber += 1)
      await expect
        .element(
          await getCellLocator(
            renderedPuzzle,
            getBrandedCellNumber(cellNumber),
          ),
        )
        .toBeInTheDocument();

    await expect
      .element(
        (await renderedPuzzle).getByRole("radiogroup", {
          name: "Keypad mode selector",
        }),
      )
      .toBeInTheDocument();
  });
});

describe("Puzzle initial board state", () => {
  it("renders given digits provided by startingBoardState", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithGivenDigitsInTargetCells([
      {
        cellNumber: getBrandedCellNumber(1),
        digit: getBrandedSudokuDigit("4"),
      },
      {
        cellNumber: getBrandedCellNumber(81),
        digit: getBrandedSudokuDigit("9"),
      },
    ]);
    const renderedPuzzle = await renderPuzzle({ startingBoardState });

    // Assert
    await expect
      .element(
        (
          await getCellLocator(renderedPuzzle, getBrandedCellNumber(1))
        ).getByText("4"),
      )
      .toBeInTheDocument();
    await expect
      .element(
        (
          await getCellLocator(renderedPuzzle, getBrandedCellNumber(81))
        ).getByText("9"),
      )
      .toBeInTheDocument();
  });
});

describe("Pointer down outside puzzle selection behavior", () => {
  it("clears a single selected cell when pointer down occurs outside the puzzle", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected([
      getBrandedCellNumber(1),
    ]);
    const renderedPuzzle = await renderPuzzle({ startingBoardState });
    const selectedCellBeforeOutsidePointerDown = await getCellElement(
      renderedPuzzle,
      getBrandedCellNumber(1),
    );

    // Act
    await dispatchPointerDownEvent(document.body);

    // Assert
    expect(
      selectedCellBeforeOutsidePointerDown.getAttribute("data-selected"),
    ).toBe("false");
  });

  it("clears all selected cells when multiple cells are selected and pointer down occurs outside the puzzle", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected([
      getBrandedCellNumber(1),
      getBrandedCellNumber(2),
      getBrandedCellNumber(3),
    ]);
    const renderedPuzzle = await renderPuzzle({ startingBoardState });

    const firstSelectedCellBeforeOutsidePointerDown = await getCellElement(
      renderedPuzzle,
      getBrandedCellNumber(1),
    );
    const secondSelectedCellBeforeOutsidePointerDown = await getCellElement(
      renderedPuzzle,
      getBrandedCellNumber(2),
    );
    const thirdSelectedCellBeforeOutsidePointerDown = await getCellElement(
      renderedPuzzle,
      getBrandedCellNumber(3),
    );

    // Act
    await dispatchPointerDownEvent(document.body);

    // Assert
    expect(
      firstSelectedCellBeforeOutsidePointerDown.getAttribute("data-selected"),
    ).toBe("false");
    expect(
      secondSelectedCellBeforeOutsidePointerDown.getAttribute("data-selected"),
    ).toBe("false");
    expect(
      thirdSelectedCellBeforeOutsidePointerDown.getAttribute("data-selected"),
    ).toBe("false");
  });
});

describe("Pointer down inside puzzle selection behavior", () => {
  it("keeps selected cells selected when pointer down occurs inside the puzzle", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected([
      getBrandedCellNumber(1),
    ]);
    const renderedPuzzle = await renderPuzzle({ startingBoardState });
    const selectedCellBeforeInsidePointerDown = await getCellElement(
      renderedPuzzle,
      getBrandedCellNumber(1),
    );
    const keypadModeSelector = await (await renderedPuzzle).getByRole(
      "radiogroup",
      {
        name: "Keypad mode selector",
      },
    );

    // Act
    await dispatchPointerDownEvent(await keypadModeSelector.element());

    // Assert
    expect(
      selectedCellBeforeInsidePointerDown.getAttribute("data-selected"),
    ).toBe("true");
  });
});
