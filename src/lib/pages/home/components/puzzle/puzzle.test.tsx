import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Provider } from "@/lib/components/ui/provider";
import { Puzzle } from "@/lib/pages/home/components/puzzle/puzzle";
import { UserSettingsProvider } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import { TOTAL_CELLS_IN_BOARD } from "@/lib/pages/home/utils/constants";
import {
  EMPTY_RAW_BOARD_STATE,
  getBoardStateWithGivenDigitsInTargetCells,
  getBoardStateWithTargetCellsSelected,
  getCellElement,
  getCellLocator,
  getStartingEmptyBoardState,
  SudokuStopwatchProviderBridge,
  waitForReactToFinishUpdating,
} from "@/lib/pages/home/utils/testing";
import {
  type BoardState,
  type RawBoardState,
} from "@/lib/pages/home/utils/types";
import {
  getBrandedCellId,
  getBrandedSudokuDigit,
} from "@/lib/pages/home/utils/validators/validators";

// #region Module Mocks
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));
// #endregion

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
  const resolvedRawBoardState = rawBoardState ?? EMPTY_RAW_BOARD_STATE;
  const resolvedStartingBoardState =
    startingBoardState ?? getStartingEmptyBoardState();

  const renderedPuzzle = await render(
    <Provider>
      <UserSettingsProvider>
        <SudokuStopwatchProviderBridge encodedPuzzleString="test-puzzle">
          <Puzzle
            encodedPuzzleString="test-puzzle"
            rawBoardState={resolvedRawBoardState}
            startingBoardState={resolvedStartingBoardState}
          />
        </SudokuStopwatchProviderBridge>
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
    for (let cellId = 1; cellId <= TOTAL_CELLS_IN_BOARD; cellId += 1) {
      await expect
        .element(await getCellLocator(renderedPuzzle, getBrandedCellId(cellId)))
        .toBeInTheDocument();
    }

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
        cellId: getBrandedCellId(1),
        digit: getBrandedSudokuDigit("4"),
      },
      {
        cellId: getBrandedCellId(81),
        digit: getBrandedSudokuDigit("9"),
      },
    ]);
    const renderedPuzzle = await renderPuzzle({ startingBoardState });

    // Assert
    await expect
      .element(
        (await getCellLocator(renderedPuzzle, getBrandedCellId(1))).getByText(
          "4",
        ),
      )
      .toBeInTheDocument();
    await expect
      .element(
        (await getCellLocator(renderedPuzzle, getBrandedCellId(81))).getByText(
          "9",
        ),
      )
      .toBeInTheDocument();
  });
});

describe("Pointer down outside puzzle selection behavior", () => {
  it("clears a single selected cell when pointer down occurs outside the puzzle", async () => {
    // Arrange
    const startingBoardState = getBoardStateWithTargetCellsSelected([
      getBrandedCellId(1),
    ]);
    const renderedPuzzle = await renderPuzzle({ startingBoardState });
    const selectedCellBeforeOutsidePointerDown = await getCellElement(
      renderedPuzzle,
      getBrandedCellId(1),
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
      getBrandedCellId(1),
      getBrandedCellId(2),
      getBrandedCellId(3),
    ]);
    const renderedPuzzle = await renderPuzzle({ startingBoardState });

    const firstSelectedCellBeforeOutsidePointerDown = await getCellElement(
      renderedPuzzle,
      getBrandedCellId(1),
    );
    const secondSelectedCellBeforeOutsidePointerDown = await getCellElement(
      renderedPuzzle,
      getBrandedCellId(2),
    );
    const thirdSelectedCellBeforeOutsidePointerDown = await getCellElement(
      renderedPuzzle,
      getBrandedCellId(3),
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
      getBrandedCellId(1),
    ]);
    const renderedPuzzle = await renderPuzzle({ startingBoardState });
    const selectedCellBeforeInsidePointerDown = await getCellElement(
      renderedPuzzle,
      getBrandedCellId(1),
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

describe("Pointer down outside with multi-entry puzzle history", () => {
  it("preserves non-current history entries when clearing selection", async () => {
    // Arrange
    const initialBoardState = getStartingEmptyBoardState();
    const boardStateWithSelectedCell = getBoardStateWithTargetCellsSelected([
      getBrandedCellId(5),
    ]);
    const puzzleStateWithHistory = {
      historyIndex: 1,
      puzzleHistory: [initialBoardState, boardStateWithSelectedCell],
    };
    window.sessionStorage.setItem(
      "puzzle-state-test-puzzle",
      JSON.stringify(puzzleStateWithHistory),
    );
    const renderedPuzzle = await renderPuzzle();
    const selectedCellBeforeOutsidePointerDown = await getCellElement(
      renderedPuzzle,
      getBrandedCellId(5),
    );

    // Act
    await dispatchPointerDownEvent(document.body);

    // Assert
    expect(
      selectedCellBeforeOutsidePointerDown.getAttribute("data-selected"),
    ).toBe("false");
  });
});

describe("Row layout from dimensions", () => {
  it("renders in row direction when the container is wider than it is tall", async () => {
    // Arrange
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      width: 1000,
      height: 100,
      top: 0,
      right: 1000,
      bottom: 100,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    // Act
    const renderedPuzzle = await renderPuzzle();

    // Assert
    await expect
      .element(
        renderedPuzzle.getByRole("radiogroup", {
          name: "Keypad mode selector",
        }),
      )
      .toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
