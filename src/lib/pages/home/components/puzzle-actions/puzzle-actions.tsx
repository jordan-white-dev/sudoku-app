import {
  Button,
  Dialog,
  GridItem,
  Icon,
  IconButton,
  type IconButtonProps,
  type IconProps,
  Portal,
  SimpleGrid,
  Stack,
} from "@chakra-ui/react";
import { type UseNavigateResult, useNavigate } from "@tanstack/react-router";
import {
  type Dispatch,
  type PropsWithChildren,
  type ReactNode,
  type SetStateAction,
  useMemo,
} from "react";
import { ImCheckmark, ImRedo, ImStopwatch, ImUndo } from "react-icons/im";
import { MdOutlineFiberNew, MdRestartAlt } from "react-icons/md";

import { Tooltip } from "@/lib/pages/home/components/tooltip";
import { useSudokuStopwatch } from "@/lib/pages/home/hooks/use-sudoku-stopwatch/use-sudoku-stopwatch";
import { useUserSettings } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import {
  handleRedoMove,
  handleUndoMove,
} from "@/lib/pages/home/utils/actions/actions";
import { CELLS_PER_HOUSE } from "@/lib/pages/home/utils/constants";
import { getCellSizeScaledBy } from "@/lib/pages/home/utils/display";
import { makePuzzle } from "@/lib/pages/home/utils/sudoku/sudoku";
import {
  getBoardStateFromRawBoardState,
  getCurrentBoardStateFromPuzzleState,
  getEncodedPuzzleStringFromRawPuzzleString,
  getGivenOrEnteredDigitInCellIfPresent,
  getRawPuzzleStringFromRawBoardState,
} from "@/lib/pages/home/utils/transforms/transforms";
import {
  type BoardState,
  type PuzzleState,
  type RawBoardState,
} from "@/lib/pages/home/utils/types";

// #region CSS Properties
const IM_ICON_SIZE: IconProps["width"] = getCellSizeScaledBy(0.5);
const MD_ICON_SIZE: IconProps["width"] = getCellSizeScaledBy(0.56);
const MD_ICON_SIZE_ALT: IconProps["width"] = getCellSizeScaledBy(0.7);
// #endregion

// #region Action Button
interface ActionButtonProps extends PropsWithChildren {
  ariaLabel: IconButtonProps["aria-label"];
  disabled?: boolean;
  iconSize: string;
  isRowLayout: boolean;
  onClick?: () => void;
}

const ActionButton = ({
  ariaLabel,
  children,
  iconSize,
  isRowLayout,
  onClick,
  ...props
}: ActionButtonProps) => (
  <IconButton
    aria-label={ariaLabel}
    aspectRatio={isRowLayout ? "2 / 1" : undefined}
    height={getCellSizeScaledBy(0.64)}
    padding="0.25rem 0"
    rounded="md"
    width={isRowLayout ? "full" : getCellSizeScaledBy(0.8)}
    onClick={onClick}
    {...props}
  >
    <Icon height={iconSize} width={iconSize}>
      {children}
    </Icon>
  </IconButton>
);
// #endregion

// #region Action Tooltip
interface ActionTooltipProps extends PropsWithChildren {
  tooltipText: string;
}

const ActionTooltip = ({ children, tooltipText }: ActionTooltipProps) => (
  <Tooltip content={tooltipText} positioning={{ placement: "left-start" }}>
    {children}
  </Tooltip>
);
// #endregion

// #region Action Dialog
type ActionDialogProps = {
  dialogBodyText: string;
  dialogFooter: ReactNode;
  dialogTitleText: string;
  dialogTrigger: ReactNode;
};

const ActionDialog = ({
  dialogBodyText,
  dialogFooter,
  dialogTitleText,
  dialogTrigger,
}: ActionDialogProps) => {
  const { startStopwatchIfEnabled } = useSudokuStopwatch();

  return (
    <Dialog.Root
      placement="center"
      size="sm"
      onEscapeKeyDown={startStopwatchIfEnabled}
      onPointerDownOutside={startStopwatchIfEnabled}
    >
      {dialogTrigger}
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{dialogTitleText}</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>{dialogBodyText}</Dialog.Body>

            {dialogFooter}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
// #endregion

// #region New Puzzle Button
const handleNewPuzzleConfirmation = (
  navigateToNewPuzzle: ReturnType<typeof useNavigate>,
) => {
  const newRawBoardState: RawBoardState = makePuzzle();
  const rawPuzzleString = getRawPuzzleStringFromRawBoardState(newRawBoardState);
  const encodedPuzzleString =
    getEncodedPuzzleStringFromRawPuzzleString(rawPuzzleString);
  navigateToNewPuzzle({ to: `/puzzle/${encodedPuzzleString}` });
};

type NewPuzzleDialogTriggerProps = {
  isRowLayout: boolean;
  pauseStopwatch: () => void;
};

const NewPuzzleDialogTrigger = ({
  isRowLayout,
  pauseStopwatch,
}: NewPuzzleDialogTriggerProps) => {
  const tooltipText = "Start a new puzzle";

  return (
    <ActionTooltip tooltipText={tooltipText}>
      <Dialog.Trigger asChild onClick={pauseStopwatch}>
        <ActionButton
          ariaLabel={tooltipText}
          iconSize={MD_ICON_SIZE_ALT}
          isRowLayout={isRowLayout}
        >
          <MdOutlineFiberNew />
        </ActionButton>
      </Dialog.Trigger>
    </ActionTooltip>
  );
};

type NewPuzzleDialogFooterProps = {
  navigate: UseNavigateResult<string>;
  startStopwatchIfEnabled: () => void;
};

const NewPuzzleDialogFooter = ({
  navigate,
  startStopwatchIfEnabled,
}: NewPuzzleDialogFooterProps) => (
  <Dialog.Footer>
    <Dialog.ActionTrigger asChild>
      <Button
        colorPalette="gray"
        variant="outline"
        onClick={startStopwatchIfEnabled}
      >
        Cancel
      </Button>
    </Dialog.ActionTrigger>

    <Dialog.ActionTrigger asChild>
      <Button
        colorPalette="blue"
        onClick={() => handleNewPuzzleConfirmation(navigate)}
      >
        New Puzzle
      </Button>
    </Dialog.ActionTrigger>
  </Dialog.Footer>
);

const NewPuzzleButton = ({ isRowLayout }: { isRowLayout: boolean }) => {
  const { pauseStopwatch, startStopwatchIfEnabled } = useSudokuStopwatch();

  const navigate = useNavigate();

  return (
    <GridItem colSpan={isRowLayout ? 2 : 1}>
      <ActionDialog
        dialogBodyText="Are you sure you want to start a new puzzle? All progress will be lost!"
        dialogFooter={
          <NewPuzzleDialogFooter
            navigate={navigate}
            startStopwatchIfEnabled={startStopwatchIfEnabled}
          />
        }
        dialogTitleText="Confirm New"
        dialogTrigger={
          <NewPuzzleDialogTrigger
            isRowLayout={isRowLayout}
            pauseStopwatch={pauseStopwatch}
          />
        }
      />
    </GridItem>
  );
};
// #endregion

// #region Undo Button
type UndoButtonProps = {
  isRowLayout: boolean;
  puzzleState: PuzzleState;
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>;
};

const UndoButton = ({
  isRowLayout,
  puzzleState,
  setPuzzleState,
}: UndoButtonProps) => {
  const tooltipText = "Undo the last move";
  const isDisabled = puzzleState.historyIndex === 0;

  return (
    <ActionTooltip tooltipText={tooltipText}>
      <ActionButton
        ariaLabel={tooltipText}
        disabled={isDisabled}
        iconSize={IM_ICON_SIZE}
        isRowLayout={isRowLayout}
        onClick={() => handleUndoMove(setPuzzleState)}
      >
        <ImUndo />
      </ActionButton>
    </ActionTooltip>
  );
};
// #endregion

// #region Redo Button
type RedoButtonProps = {
  isRowLayout: boolean;
  puzzleState: PuzzleState;
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>;
};

const RedoButton = ({
  isRowLayout,
  puzzleState,
  setPuzzleState,
}: RedoButtonProps) => {
  const tooltipText = "Redo the last undone move";
  const isDisabled =
    puzzleState.historyIndex === puzzleState.puzzleHistory.length - 1;

  return (
    <ActionTooltip tooltipText={tooltipText}>
      <ActionButton
        ariaLabel={tooltipText}
        disabled={isDisabled}
        iconSize={IM_ICON_SIZE}
        isRowLayout={isRowLayout}
        onClick={() => handleRedoMove(setPuzzleState)}
      >
        <ImRedo />
      </ActionButton>
    </ActionTooltip>
  );
};
// #endregion

// #region Check Solution Button
const getIsPuzzleSolved = (boardState: BoardState): boolean => {
  const rows: Array<Set<string>> = Array.from(
    { length: CELLS_PER_HOUSE },
    () => new Set(),
  );
  const columns: Array<Set<string>> = Array.from(
    { length: CELLS_PER_HOUSE },
    () => new Set(),
  );
  const boxes: Array<Set<string>> = Array.from(
    { length: CELLS_PER_HOUSE },
    () => new Set(),
  );

  for (const cellState of boardState) {
    const givenOrEnteredDigit = getGivenOrEnteredDigitInCellIfPresent(
      cellState.content,
    );
    if (givenOrEnteredDigit === "") {
      return false;
    }

    const boxIndex = cellState.houses.boxNumber - 1;
    const columnIndex = cellState.houses.columnNumber - 1;
    const rowIndex = cellState.houses.rowNumber - 1;

    if (boxes[boxIndex].has(givenOrEnteredDigit)) {
      return false;
    }
    if (columns[columnIndex].has(givenOrEnteredDigit)) {
      return false;
    }
    if (rows[rowIndex].has(givenOrEnteredDigit)) {
      return false;
    }

    boxes[boxIndex].add(givenOrEnteredDigit);
    columns[columnIndex].add(givenOrEnteredDigit);
    rows[rowIndex].add(givenOrEnteredDigit);
  }

  return true;
};

const getDialogBodyText = (
  isPuzzleSolved: boolean,
  isStopwatchDisabled: boolean,
  stopwatchTime: string,
): string => {
  const solvedText = isStopwatchDisabled
    ? "You solved the puzzle!"
    : `You solved the puzzle in ${stopwatchTime}!`;
  const notSolvedText =
    "That doesn't look quite right. Some digits are missing or incorrect.";

  return isPuzzleSolved ? solvedText : notSolvedText;
};

const startStopwatchAfterSolutionCheckIfAppropriate = (
  isPuzzleSolved: boolean,
  isStopwatchDisabled: boolean,
  startStopwatch: () => void,
) => {
  if (!(isPuzzleSolved || isStopwatchDisabled)) {
    startStopwatch();
  }
};

type CheckSolutionDialogTriggerProps = {
  isRowLayout: boolean;
  pauseStopwatch: () => void;
};

const CheckSolutionDialogTrigger = ({
  isRowLayout,
  pauseStopwatch,
}: CheckSolutionDialogTriggerProps) => {
  const tooltipText = "Check the current solution";

  return (
    <ActionTooltip tooltipText={tooltipText}>
      <Dialog.Trigger asChild onClick={pauseStopwatch}>
        <ActionButton
          ariaLabel={tooltipText}
          iconSize={IM_ICON_SIZE}
          isRowLayout={isRowLayout}
        >
          <ImCheckmark />
        </ActionButton>
      </Dialog.Trigger>
    </ActionTooltip>
  );
};

type CheckSolutionDialogFooterProps = {
  isPuzzleSolved: boolean;
  isStopwatchDisabled: boolean;
  startStopwatch: () => void;
};

const CheckSolutionDialogFooter = ({
  isPuzzleSolved,
  isStopwatchDisabled,
  startStopwatch,
}: CheckSolutionDialogFooterProps) => (
  <Dialog.Footer>
    <Dialog.ActionTrigger asChild>
      <Button
        colorPalette={isPuzzleSolved ? "blue" : "red"}
        variant="solid"
        onClick={() =>
          startStopwatchAfterSolutionCheckIfAppropriate(
            isPuzzleSolved,
            isStopwatchDisabled,
            startStopwatch,
          )
        }
      >
        Okay
      </Button>
    </Dialog.ActionTrigger>
  </Dialog.Footer>
);

type CheckSolutionButtonProps = {
  isRowLayout: boolean;
  puzzleState: PuzzleState;
};

const CheckSolutionButton = ({
  isRowLayout,
  puzzleState,
}: CheckSolutionButtonProps) => {
  const { formattedStopwatchTime, pauseStopwatch, startStopwatch } =
    useSudokuStopwatch();
  const { userSettings } = useUserSettings();
  const { isStopwatchDisabled } = userSettings;

  const currentBoardState = getCurrentBoardStateFromPuzzleState(puzzleState);

  const isPuzzleSolved = useMemo(
    () => getIsPuzzleSolved(currentBoardState),
    [currentBoardState],
  );

  const dialogBodyText = getDialogBodyText(
    isPuzzleSolved,
    isStopwatchDisabled,
    formattedStopwatchTime,
  );
  const dialogTitleText = isPuzzleSolved ? "Congratulations" : "Try Again";

  return (
    <ActionDialog
      dialogBodyText={dialogBodyText}
      dialogFooter={
        <CheckSolutionDialogFooter
          isPuzzleSolved={isPuzzleSolved}
          isStopwatchDisabled={isStopwatchDisabled}
          startStopwatch={startStopwatch}
        />
      }
      dialogTitleText={dialogTitleText}
      dialogTrigger={
        <CheckSolutionDialogTrigger
          isRowLayout={isRowLayout}
          pauseStopwatch={pauseStopwatch}
        />
      }
    />
  );
};
// #endregion

// #region Restart Puzzle Button
const getRestartedBoardState = (rawBoardState: RawBoardState): BoardState => {
  const restartedBoardState = getBoardStateFromRawBoardState(rawBoardState);
  return restartedBoardState;
};

const handleRestartPuzzleConfirmation = (
  rawBoardState: RawBoardState,
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>,
) => {
  const restartedBoardState = getRestartedBoardState(rawBoardState);

  const restartedPuzzleState = {
    historyIndex: 0,
    puzzleHistory: [restartedBoardState],
  };

  setPuzzleState(restartedPuzzleState);
};

type RestartPuzzleDialogTriggerProps = {
  isRowLayout: boolean;
  pauseStopwatch: () => void;
};

const RestartPuzzleDialogTrigger = ({
  isRowLayout,
  pauseStopwatch,
}: RestartPuzzleDialogTriggerProps) => {
  const tooltipText = "Restart the puzzle";

  return (
    <ActionTooltip tooltipText={tooltipText}>
      <Dialog.Trigger asChild onClick={pauseStopwatch}>
        <ActionButton
          ariaLabel={tooltipText}
          iconSize={MD_ICON_SIZE}
          isRowLayout={isRowLayout}
        >
          <MdRestartAlt />
        </ActionButton>
      </Dialog.Trigger>
    </ActionTooltip>
  );
};

type RestartPuzzleDialogFooterProps = {
  rawBoardState: RawBoardState;
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>;
};

const RestartPuzzleDialogFooter = ({
  rawBoardState,
  setPuzzleState,
}: RestartPuzzleDialogFooterProps) => {
  const { resetStopwatch, startStopwatch, startStopwatchIfEnabled } =
    useSudokuStopwatch();

  return (
    <Dialog.Footer justifyContent="center">
      <Stack direction={{ base: "column-reverse", sm: "row" }}>
        <Dialog.ActionTrigger asChild>
          <Button
            colorPalette="gray"
            variant="outline"
            onClick={startStopwatchIfEnabled}
          >
            Cancel
          </Button>
        </Dialog.ActionTrigger>

        <Dialog.ActionTrigger asChild>
          <Button
            colorPalette="blue"
            onClick={() => {
              resetStopwatch();
              handleRestartPuzzleConfirmation(rawBoardState, setPuzzleState);
            }}
          >
            <MdRestartAlt /> Restart
          </Button>
        </Dialog.ActionTrigger>

        <Dialog.ActionTrigger asChild>
          <Button
            colorPalette="blue"
            onClick={() => {
              startStopwatch();
              handleRestartPuzzleConfirmation(rawBoardState, setPuzzleState);
            }}
          >
            <MdRestartAlt /> + <ImStopwatch /> Keep Time
          </Button>
        </Dialog.ActionTrigger>
      </Stack>
    </Dialog.Footer>
  );
};

type RestartPuzzleButtonProps = {
  isRowLayout: boolean;
  rawBoardState: RawBoardState;
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>;
};

const RestartPuzzleButton = ({
  isRowLayout,
  rawBoardState,
  setPuzzleState,
}: RestartPuzzleButtonProps) => {
  const { pauseStopwatch } = useSudokuStopwatch();

  return (
    <ActionDialog
      dialogBodyText="Are you sure you want to restart the puzzle? All progress will be lost!"
      dialogFooter={
        <RestartPuzzleDialogFooter
          rawBoardState={rawBoardState}
          setPuzzleState={setPuzzleState}
        />
      }
      dialogTitleText="Confirm Restart"
      dialogTrigger={
        <RestartPuzzleDialogTrigger
          isRowLayout={isRowLayout}
          pauseStopwatch={pauseStopwatch}
        />
      }
    />
  );
};
// #endregion

// #region Puzzle Actions Component
type PuzzleActionsProps = {
  isRowLayout: boolean;
  puzzleState: PuzzleState;
  rawBoardState: RawBoardState;
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>;
};

export const PuzzleActions = ({
  isRowLayout,
  puzzleState,
  rawBoardState,
  setPuzzleState,
}: PuzzleActionsProps) => (
  <SimpleGrid
    columnGap={getCellSizeScaledBy(0.058)}
    columns={isRowLayout ? 2 : 1}
    maxWidth={getCellSizeScaledBy(2.55)}
    rowGap={getCellSizeScaledBy(0.058)}
  >
    <NewPuzzleButton isRowLayout={isRowLayout} />
    <UndoButton
      isRowLayout={isRowLayout}
      puzzleState={puzzleState}
      setPuzzleState={setPuzzleState}
    />
    <RedoButton
      isRowLayout={isRowLayout}
      puzzleState={puzzleState}
      setPuzzleState={setPuzzleState}
    />
    <CheckSolutionButton isRowLayout={isRowLayout} puzzleState={puzzleState} />
    <RestartPuzzleButton
      isRowLayout={isRowLayout}
      rawBoardState={rawBoardState}
      setPuzzleState={setPuzzleState}
    />
  </SimpleGrid>
);
// #endregion
