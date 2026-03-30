import {
  Button,
  type ButtonProps,
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
} from "react";
import { ImCheckmark, ImRedo, ImStopwatch, ImUndo } from "react-icons/im";
import { MdOutlineFiberNew, MdRestartAlt } from "react-icons/md";
import { makepuzzle } from "sudoku";

import { Tooltip } from "@/lib/pages/home/components/tooltip";
import { useSudokuStopwatch } from "@/lib/pages/home/hooks/use-sudoku-stopwatch";
import { useUserSettings } from "@/lib/pages/home/hooks/use-user-settings";
import { handleRedoMove, handleUndoMove } from "@/lib/pages/home/model/actions";
import {
  getBoardStateFromRawBoardState,
  getCurrentBoardStateFromPuzzleHistory,
  getEncodedPuzzleStringFromRawPuzzleString,
  getGivenOrEnteredDigitInCellIfPresent,
  getRawPuzzleStringFromRawBoardState,
} from "@/lib/pages/home/model/transforms";
import {
  type BoardState,
  type PuzzleHistory,
  type RawBoardState,
} from "@/lib/pages/home/model/types";

// #region CSS Properties
const ICON_BUTTON_HEIGHT: IconButtonProps["height"] = {
  base: "1.6757rem",
  sm: "2.25rem",
  md: "3.196rem",
  lg: "3.25rem",
};
const ICON_BUTTON_WIDTH: IconButtonProps["width"] = {
  base: "2rem",
  sm: "3rem",
  md: "4rem",
  lg: "full",
};
const IM_ICON_SIZE: IconProps["width"] = {
  base: "4",
  sm: "4.5",
  md: "6",
  lg: "7",
};
const MD_ICON_SIZE: IconProps["width"] = {
  base: "5",
  sm: "7",
  md: "8",
  lg: "9",
};
const MD_ICON_SIZE_ALT: IconProps["width"] = {
  base: "5",
  sm: "8",
  md: "10",
  lg: "14",
};
const BUTTON_ROUNDED: ButtonProps["rounded"] = {
  base: "sm",
  sm: "md",
};
// #endregion

// #region Action Button
interface ActionButtonProps extends PropsWithChildren {
  iconSize: IconProps["width"];
  onClick?: () => void;
}

const ActionButton = ({
  children,
  iconSize,
  onClick,
  ...props
}: ActionButtonProps) => (
  <IconButton
    aspectRatio={{ lg: 2 / 1 }}
    height={ICON_BUTTON_HEIGHT}
    padding="0.25rem 0"
    rounded={BUTTON_ROUNDED}
    width={ICON_BUTTON_WIDTH}
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
type NewPuzzleDialogTriggerProps = {
  pauseStopwatch: () => void;
};

const NewPuzzleDialogTrigger = ({
  pauseStopwatch,
}: NewPuzzleDialogTriggerProps) => (
  <ActionTooltip tooltipText="Start a new puzzle">
    <Dialog.Trigger asChild onClick={pauseStopwatch}>
      <ActionButton iconSize={MD_ICON_SIZE_ALT}>
        <MdOutlineFiberNew />
      </ActionButton>
    </Dialog.Trigger>
  </ActionTooltip>
);

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

const handleNewPuzzleConfirmation = (
  navigateToNewPuzzle: ReturnType<typeof useNavigate>,
) => {
  const newRawBoardState: RawBoardState = makepuzzle();
  const rawPuzzleString = getRawPuzzleStringFromRawBoardState(newRawBoardState);
  const encodedPuzzleString =
    getEncodedPuzzleStringFromRawPuzzleString(rawPuzzleString);
  navigateToNewPuzzle({ to: `/puzzle/${encodedPuzzleString}` });
};

const NewPuzzleButton = () => {
  const { pauseStopwatch, startStopwatchIfEnabled } = useSudokuStopwatch();

  const navigate = useNavigate();

  return (
    <GridItem colSpan={{ base: 1, lg: 2 }}>
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
          <NewPuzzleDialogTrigger pauseStopwatch={pauseStopwatch} />
        }
      />
    </GridItem>
  );
};
// #endregion

// #region Undo Button
type UndoButtonProps = {
  puzzleHistory: PuzzleHistory;
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>;
};

const UndoButton = ({ setPuzzleHistory }: UndoButtonProps) => (
  <ActionTooltip tooltipText="Undo the last move">
    <ActionButton
      iconSize={IM_ICON_SIZE}
      onClick={() => handleUndoMove(setPuzzleHistory)}
    >
      <ImUndo />
    </ActionButton>
  </ActionTooltip>
);
// #endregion

// #region Redo Button
type RedoButtonProps = {
  puzzleHistory: PuzzleHistory;
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>;
};

const RedoButton = ({ setPuzzleHistory }: RedoButtonProps) => (
  <ActionTooltip tooltipText="Redo the last undone move">
    <ActionButton
      iconSize={IM_ICON_SIZE}
      onClick={() => handleRedoMove(setPuzzleHistory)}
    >
      <ImRedo />
    </ActionButton>
  </ActionTooltip>
);
// #endregion

// #region Check Solution Button
const getIsPuzzleSolved = (boardState: BoardState): boolean => {
  const rows: Array<Set<string>> = Array.from({ length: 9 }, () => new Set());
  const columns: Array<Set<string>> = Array.from(
    { length: 9 },
    () => new Set(),
  );
  const boxes: Array<Set<string>> = Array.from({ length: 9 }, () => new Set());

  for (const cellState of boardState) {
    const givenOrEnteredDigit = getGivenOrEnteredDigitInCellIfPresent(
      cellState.cellContent,
    );
    if (givenOrEnteredDigit === "") return false;

    const boxIndex = cellState.boxNumber - 1;
    const columnIndex = cellState.columnNumber - 1;
    const rowIndex = cellState.rowNumber - 1;

    if (boxes[boxIndex].has(givenOrEnteredDigit)) return false;
    if (columns[columnIndex].has(givenOrEnteredDigit)) return false;
    if (rows[rowIndex].has(givenOrEnteredDigit)) return false;

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
  if (!(isPuzzleSolved || isStopwatchDisabled)) startStopwatch();
};

type CheckSolutionDialogTriggerProps = {
  pauseStopwatch: () => void;
};

const CheckSolutionDialogTrigger = ({
  pauseStopwatch,
}: CheckSolutionDialogTriggerProps) => (
  <ActionTooltip tooltipText="Check the current solution">
    <Dialog.Trigger asChild onClick={pauseStopwatch}>
      <ActionButton iconSize={IM_ICON_SIZE}>
        <ImCheckmark />
      </ActionButton>
    </Dialog.Trigger>
  </ActionTooltip>
);

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
  puzzleHistory: PuzzleHistory;
};

const CheckSolutionButton = ({ puzzleHistory }: CheckSolutionButtonProps) => {
  const { formattedStopwatchTime, pauseStopwatch, startStopwatch } =
    useSudokuStopwatch();
  const { userSettings } = useUserSettings();
  const { isStopwatchDisabled } = userSettings;

  const currentBoardState =
    getCurrentBoardStateFromPuzzleHistory(puzzleHistory);

  const isPuzzleSolved = getIsPuzzleSolved(currentBoardState);

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
        <CheckSolutionDialogTrigger pauseStopwatch={pauseStopwatch} />
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
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>,
) => {
  const restartedBoardState = getRestartedBoardState(rawBoardState);

  const restartedPuzzleHistory = {
    currentBoardStateIndex: 0,
    boardStateHistory: [restartedBoardState],
  };

  setPuzzleHistory(restartedPuzzleHistory);
};

type RestartPuzzleDialogTriggerProps = {
  pauseStopwatch: () => void;
};

const RestartPuzzleDialogTrigger = ({
  pauseStopwatch,
}: RestartPuzzleDialogTriggerProps) => (
  <ActionTooltip tooltipText="Restart the puzzle">
    <Dialog.Trigger asChild onClick={pauseStopwatch}>
      <ActionButton iconSize={MD_ICON_SIZE}>
        <MdRestartAlt />
      </ActionButton>
    </Dialog.Trigger>
  </ActionTooltip>
);

type RestartPuzzleDialogFooterProps = {
  rawBoardState: RawBoardState;
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>;
};

const RestartPuzzleDialogFooter = ({
  rawBoardState,
  setPuzzleHistory,
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
              handleRestartPuzzleConfirmation(rawBoardState, setPuzzleHistory);
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
              handleRestartPuzzleConfirmation(rawBoardState, setPuzzleHistory);
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
  rawBoardState: RawBoardState;
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>;
};

const RestartPuzzleButton = ({
  rawBoardState,
  setPuzzleHistory,
}: RestartPuzzleButtonProps) => {
  const { pauseStopwatch } = useSudokuStopwatch();

  return (
    <ActionDialog
      dialogBodyText="Are you sure you want to restart the puzzle? All progress will be lost!"
      dialogFooter={
        <RestartPuzzleDialogFooter
          rawBoardState={rawBoardState}
          setPuzzleHistory={setPuzzleHistory}
        />
      }
      dialogTitleText="Confirm Restart"
      dialogTrigger={
        <RestartPuzzleDialogTrigger pauseStopwatch={pauseStopwatch} />
      }
    />
  );
};
// #endregion

type PuzzleActionsProps = {
  puzzleHistory: PuzzleHistory;
  rawBoardState: RawBoardState;
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>;
};

export const PuzzleActions = ({
  puzzleHistory,
  rawBoardState,
  setPuzzleHistory,
}: PuzzleActionsProps) => {
  return (
    <SimpleGrid
      columnGap={{ base: "0.5", lg: "3" }}
      columns={{ base: 1, lg: 2 }}
      maxWidth="12.75rem"
      rowGap={{ base: "0.125rem", md: "0.2875rem" }}
    >
      <NewPuzzleButton />
      <UndoButton
        puzzleHistory={puzzleHistory}
        setPuzzleHistory={setPuzzleHistory}
      />
      <RedoButton
        puzzleHistory={puzzleHistory}
        setPuzzleHistory={setPuzzleHistory}
      />
      <CheckSolutionButton puzzleHistory={puzzleHistory} />
      <RestartPuzzleButton
        rawBoardState={rawBoardState}
        setPuzzleHistory={setPuzzleHistory}
      />
    </SimpleGrid>
  );
};
