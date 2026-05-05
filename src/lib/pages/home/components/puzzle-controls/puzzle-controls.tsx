import { Stack, Text } from "@chakra-ui/react";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import useSessionStorageState from "use-session-storage-state";

import { Keypad } from "@/lib/pages/home/components/keypad/keypad";
import { KeypadModeSelector } from "@/lib/pages/home/components/keypad-mode-selector/keypad-mode-selector";
import { PuzzleActions } from "@/lib/pages/home/components/puzzle-actions/puzzle-actions";
import {
  handleCenterMarkupInput,
  handleClearCell,
  handleColorPadInput,
  handleCornerMarkupInput,
  handleDigitInput,
  handleRedoMove,
  handleUndoMove,
} from "@/lib/pages/home/utils/actions/actions";
import { getCellSizeScaledBy } from "@/lib/pages/home/utils/display";
import { exhaustiveGuard } from "@/lib/pages/home/utils/guards";
import { getDifficultyLevelFromRawBoardState } from "@/lib/pages/home/utils/sudoku/sudoku";
import {
  type KeypadMode,
  type PuzzleState,
  type RawBoardState,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";
import {
  getBrandedSudokuDigit,
  isSudokuDigit,
} from "@/lib/pages/home/utils/validators/validators";

// #region Modifier Key Utilities
const modifierKeyboardKeys = ["Control", "Shift", "Alt"] as const;
type ModifierKeyboardKey = (typeof modifierKeyboardKeys)[number];

const isModifierKeyboardKey = (
  keyboardKey: string,
): keyboardKey is ModifierKeyboardKey =>
  modifierKeyboardKeys.some((modifierKey) => modifierKey === keyboardKey);

const keypadModesByModifierKeyboardKey: Record<
  ModifierKeyboardKey,
  Exclude<KeypadMode, "Digit">
> = {
  Control: "Center",
  Shift: "Corner",
  Alt: "Color",
};

const getModifierKeyDownOrderWithAddedModifier = (
  modifierKeyboardKeyToAdd: ModifierKeyboardKey,
  currentModifierKeyDownOrder: Array<ModifierKeyboardKey>,
): Array<ModifierKeyboardKey> =>
  currentModifierKeyDownOrder.includes(modifierKeyboardKeyToAdd)
    ? currentModifierKeyDownOrder
    : [...currentModifierKeyDownOrder, modifierKeyboardKeyToAdd];

const doModifierKeyDownOrdersMatch = (
  firstModifierKeyDownOrder: Array<ModifierKeyboardKey>,
  secondModifierKeyDownOrder: Array<ModifierKeyboardKey>,
): boolean =>
  firstModifierKeyDownOrder.length === secondModifierKeyDownOrder.length &&
  firstModifierKeyDownOrder.every(
    (modifierKeyboardKey, modifierKeyboardKeyIndex) =>
      modifierKeyboardKey ===
      secondModifierKeyDownOrder[modifierKeyboardKeyIndex],
  );
// #endregion

// #region Keypad Mode Shortcut Utilities
const keypadModeByShortcutKey = {
  z: "Digit",
  x: "Center",
  c: "Corner",
  v: "Color",
} as const satisfies Record<string, KeypadMode>;
type KeypadModeShortcutKey = keyof typeof keypadModeByShortcutKey;

const isKeypadModeShortcutKey = (
  keyboardKey: string,
): keyboardKey is KeypadModeShortcutKey =>
  keyboardKey in keypadModeByShortcutKey;
// #endregion

// #region Numpad Digit Input Utilities
const shiftedNumpadKeyToDigit: Partial<Record<string, SudokuDigit>> = {
  End: getBrandedSudokuDigit("1"),
  ArrowDown: getBrandedSudokuDigit("2"),
  PageDown: getBrandedSudokuDigit("3"),
  ArrowLeft: getBrandedSudokuDigit("4"),
  Clear: getBrandedSudokuDigit("5"),
  ArrowRight: getBrandedSudokuDigit("6"),
  Home: getBrandedSudokuDigit("7"),
  ArrowUp: getBrandedSudokuDigit("8"),
  PageUp: getBrandedSudokuDigit("9"),
};

const isNumpadKeyboardEvent = (keyboardEvent: KeyboardEvent): boolean =>
  keyboardEvent.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD;

const getSudokuDigitFromKeyboardEvent = (
  keyboardEvent: KeyboardEvent,
): SudokuDigit | undefined => {
  if (isNumpadKeyboardEvent(keyboardEvent)) {
    const shiftedNumpadDigit = shiftedNumpadKeyToDigit[keyboardEvent.key];
    if (shiftedNumpadDigit !== undefined) {
      return shiftedNumpadDigit;
    }

    const candidateFromKey = keyboardEvent.key;
    if (isSudokuDigit(candidateFromKey)) {
      return candidateFromKey;
    }

    const candidateFromCode = keyboardEvent.code.replace("Numpad", "");
    if (isSudokuDigit(candidateFromCode)) {
      return candidateFromCode;
    }

    return;
  }

  const keyboardCode = keyboardEvent.code;

  if (!keyboardCode.startsWith("Digit")) {
    return;
  }

  const candidateSudokuDigit = keyboardCode.replace("Digit", "");

  return isSudokuDigit(candidateSudokuDigit) ? candidateSudokuDigit : undefined;
};

const isShiftIntendedForNumpadKeyboardEvent = (
  keyboardEvent: KeyboardEvent,
  lastShiftKeyDownTimestamp: number | null,
  lastShiftKeyUpTimestamp: number | null,
): boolean => {
  if (!isNumpadKeyboardEvent(keyboardEvent)) {
    return false;
  }

  if (keyboardEvent.shiftKey) {
    return true;
  }

  if (lastShiftKeyDownTimestamp === null || lastShiftKeyUpTimestamp === null) {
    return false;
  }

  const millisecondsBetweenShiftKeyUpAndCurrentEvent =
    keyboardEvent.timeStamp - lastShiftKeyUpTimestamp;

  const didShiftGoDownBeforeItWentUp =
    lastShiftKeyDownTimestamp <= lastShiftKeyUpTimestamp;

  return (
    didShiftGoDownBeforeItWentUp &&
    millisecondsBetweenShiftKeyUpAndCurrentEvent >= 0 &&
    millisecondsBetweenShiftKeyUpAndCurrentEvent <= 50
  );
};
// #endregion

// #region Effective Keypad Mode
const getEffectiveKeypadMode = (
  baseKeypadMode: KeypadMode,
  modifierKeyDownOrder: Array<ModifierKeyboardKey>,
): KeypadMode => {
  const mostRecentlyPressedModifierKeyboardKey = modifierKeyDownOrder.at(-1);

  const effectiveKeypadMode =
    mostRecentlyPressedModifierKeyboardKey === undefined
      ? baseKeypadMode
      : keypadModesByModifierKeyboardKey[
          mostRecentlyPressedModifierKeyboardKey
        ];

  return effectiveKeypadMode;
};

const getEffectiveKeypadModeForKeyboardEvent = ({
  baseKeypadMode,
  keyboardEvent,
  lastShiftKeyDownTimestamp,
  lastShiftKeyUpTimestamp,
  modifierKeyDownOrder,
}: {
  baseKeypadMode: KeypadMode;
  keyboardEvent: KeyboardEvent;
  lastShiftKeyDownTimestamp: number | null;
  lastShiftKeyUpTimestamp: number | null;
  modifierKeyDownOrder: Array<ModifierKeyboardKey>;
}): KeypadMode => {
  if (
    isShiftIntendedForNumpadKeyboardEvent(
      keyboardEvent,
      lastShiftKeyDownTimestamp,
      lastShiftKeyUpTimestamp,
    )
  ) {
    return "Corner";
  }

  return getEffectiveKeypadMode(baseKeypadMode, modifierKeyDownOrder);
};
// #endregion

const getModifierKeyDownOrderWithRemovedModifier = (
  currentModifierKeyDownOrder: Array<ModifierKeyboardKey>,
  modifierKeyboardKeyToRemove: ModifierKeyboardKey,
): Array<ModifierKeyboardKey> =>
  currentModifierKeyDownOrder.filter(
    (modifierKeyboardKey) =>
      modifierKeyboardKey !== modifierKeyboardKeyToRemove,
  );

// #region Puzzle Controls Component
type PuzzleDifficultyLabelProps = {
  rawBoardState: RawBoardState;
};

const PuzzleDifficultyLabel = ({
  rawBoardState,
}: PuzzleDifficultyLabelProps) => {
  const difficultyLevel = getDifficultyLevelFromRawBoardState(rawBoardState);

  return <Text fontWeight="bold">Difficulty: {difficultyLevel}</Text>;
};

type PuzzleControlsProps = {
  isMultiselectMode: boolean;
  isRowLayout: boolean;
  puzzleState: PuzzleState;
  rawBoardState: RawBoardState;
  setIsMultiselectMode: Dispatch<SetStateAction<boolean>>;
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>;
};

export const PuzzleControls = ({
  isMultiselectMode,
  isRowLayout,
  puzzleState,
  rawBoardState,
  setIsMultiselectMode,
  setPuzzleState,
}: PuzzleControlsProps) => {
  const [baseKeypadMode, setBaseKeypadMode] =
    useSessionStorageState<KeypadMode>("keypad-mode", {
      defaultValue: "Digit",
    });
  const [modifierKeyDownOrderForRender, setModifierKeyDownOrderForRender] =
    useState<Array<ModifierKeyboardKey>>([]);

  const puzzleStateRef = useRef(puzzleState);
  const baseKeypadModeRef = useRef(baseKeypadMode);
  const modifierKeyDownOrderRef = useRef<Array<ModifierKeyboardKey>>([]);
  const lastShiftKeyDownTimestampRef = useRef<number | null>(null);
  const lastShiftKeyUpTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    puzzleStateRef.current = puzzleState;
  }, [puzzleState]);

  useEffect(() => {
    baseKeypadModeRef.current = baseKeypadMode;
  }, [baseKeypadMode]);

  const setModifierKeyDownOrder = useCallback(
    (nextModifierKeyDownOrder: Array<ModifierKeyboardKey>) => {
      modifierKeyDownOrderRef.current = nextModifierKeyDownOrder;
      setModifierKeyDownOrderForRender(nextModifierKeyDownOrder);
    },
    [],
  );

  const resetModifierKeyDownOrder = useCallback(() => {
    if (modifierKeyDownOrderRef.current.length === 0) {
      return;
    }
    setModifierKeyDownOrder([]);
  }, [setModifierKeyDownOrder]);

  useEffect(() => {
    const captureKeyboardEvents = true;

    const handleModifierKeyDown = (
      event: KeyboardEvent,
      modifierKeyboardKey: ModifierKeyboardKey,
    ) => {
      event.preventDefault();

      if (event.repeat) {
        return;
      }

      if (event.key === "Shift") {
        lastShiftKeyDownTimestampRef.current = event.timeStamp;
      }

      const nextModifierKeyDownOrder = getModifierKeyDownOrderWithAddedModifier(
        modifierKeyboardKey,
        modifierKeyDownOrderRef.current,
      );

      if (
        !doModifierKeyDownOrdersMatch(
          modifierKeyDownOrderRef.current,
          nextModifierKeyDownOrder,
        )
      ) {
        setModifierKeyDownOrder(nextModifierKeyDownOrder);
      }

      return;
    };

    const handleNumberKeyDown = (
      sudokuDigit: SudokuDigit,
      keyboardEvent: KeyboardEvent,
    ) => {
      const effectiveKeypadMode = getEffectiveKeypadModeForKeyboardEvent({
        baseKeypadMode: baseKeypadModeRef.current,
        keyboardEvent,
        lastShiftKeyDownTimestamp: lastShiftKeyDownTimestampRef.current,
        lastShiftKeyUpTimestamp: lastShiftKeyUpTimestampRef.current,
        modifierKeyDownOrder: modifierKeyDownOrderRef.current,
      });

      switch (effectiveKeypadMode) {
        case "Digit":
          handleDigitInput(puzzleStateRef.current, sudokuDigit, setPuzzleState);
          return;
        case "Center":
          handleCenterMarkupInput(
            puzzleStateRef.current,
            sudokuDigit,
            setPuzzleState,
          );
          return;
        case "Corner":
          handleCornerMarkupInput(
            puzzleStateRef.current,
            sudokuDigit,
            setPuzzleState,
          );
          return;
        case "Color":
          handleColorPadInput(
            puzzleStateRef.current,
            sudokuDigit,
            setPuzzleState,
          );
          return;
        default:
          exhaustiveGuard(effectiveKeypadMode);
      }
    };

    const handleSudokuDigitKeyDown = (event: KeyboardEvent) => {
      const sudokuDigit = getSudokuDigitFromKeyboardEvent(event);

      if (sudokuDigit === undefined) {
        return false;
      }

      event.preventDefault();
      handleNumberKeyDown(sudokuDigit, event);
      return true;
    };

    const isControlPressedForShortcut = () =>
      modifierKeyDownOrderRef.current.includes("Control");

    const handleUndoOrRedoKeyDown = (
      event: KeyboardEvent,
      lowerCaseKey: string,
    ) => {
      const isControlPressed = isControlPressedForShortcut() && !event.metaKey;

      if (isControlPressed && lowerCaseKey === "z") {
        event.preventDefault();

        if (modifierKeyDownOrderRef.current.includes("Shift")) {
          handleRedoMove(setPuzzleState);
        } else {
          handleUndoMove(setPuzzleState);
        }

        return true;
      }

      if (isControlPressed && lowerCaseKey === "y") {
        event.preventDefault();
        handleRedoMove(setPuzzleState);
        return true;
      }

      return false;
    };

    const hasBlockingModifierKey = (event: KeyboardEvent) =>
      modifierKeyDownOrderRef.current.includes("Control") ||
      modifierKeyDownOrderRef.current.includes("Alt") ||
      event.metaKey;

    const handleKeypadModeShortcutKeyDown = (
      event: KeyboardEvent,
      lowerCaseKey: string,
    ) => {
      if (hasBlockingModifierKey(event)) {
        return false;
      }
      if (!isKeypadModeShortcutKey(lowerCaseKey)) {
        return false;
      }

      event.preventDefault();
      setBaseKeypadMode(keypadModeByShortcutKey[lowerCaseKey]);
      return true;
    };

    const handleClearKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" &&
        event.key !== "Backspace" &&
        event.key !== "Delete"
      ) {
        return false;
      }

      if (
        event.key === "Escape" &&
        event.target instanceof Element &&
        event.target.closest('[role="menu"]') !== null
      ) {
        return false;
      }

      event.preventDefault();
      handleClearCell(puzzleStateRef.current, setPuzzleState);
      return true;
    };

    const handleMultiselectModeShortcutKeyDown = (
      event: KeyboardEvent,
      lowerCaseKey: string,
    ) => {
      if (hasBlockingModifierKey(event)) {
        return false;
      }
      if (lowerCaseKey !== "m") {
        return false;
      }

      event.preventDefault();
      setIsMultiselectMode(
        (currentIsMultiselectMode) => !currentIsMultiselectMode,
      );
      return true;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isModifierKeyboardKey(event.key)) {
        handleModifierKeyDown(event, event.key);
        return;
      }

      const lowerCaseKey = event.key.toLowerCase();

      const keyDownHandlers = [
        () => handleSudokuDigitKeyDown(event),
        () => handleUndoOrRedoKeyDown(event, lowerCaseKey),
        () => handleKeypadModeShortcutKeyDown(event, lowerCaseKey),
        () => handleClearKeyDown(event),
        () => handleMultiselectModeShortcutKeyDown(event, lowerCaseKey),
      ];

      keyDownHandlers.some((handler) => handler());
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isModifierKeyboardKey(event.key)) {
        return;
      }

      event.preventDefault();

      if (event.key === "Shift") {
        lastShiftKeyUpTimestampRef.current = event.timeStamp;
      }

      const nextModifierKeyDownOrder =
        getModifierKeyDownOrderWithRemovedModifier(
          modifierKeyDownOrderRef.current,
          event.key,
        );

      if (
        !doModifierKeyDownOrdersMatch(
          modifierKeyDownOrderRef.current,
          nextModifierKeyDownOrder,
        )
      ) {
        setModifierKeyDownOrder(nextModifierKeyDownOrder);
      }
    };

    const handleWindowBlur = () => {
      resetModifierKeyDownOrder();
    };

    window.addEventListener("keydown", handleKeyDown, captureKeyboardEvents);
    window.addEventListener("keyup", handleKeyUp, captureKeyboardEvents);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
        captureKeyboardEvents,
      );
      window.removeEventListener("keyup", handleKeyUp, captureKeyboardEvents);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [
    setBaseKeypadMode,
    setIsMultiselectMode,
    setPuzzleState,
    resetModifierKeyDownOrder,
    setModifierKeyDownOrder,
  ]);

  const effectiveKeypadMode = getEffectiveKeypadMode(
    baseKeypadMode,
    modifierKeyDownOrderForRender,
  );

  return (
    <Stack alignItems="center" direction="column" gap="2">
      <PuzzleDifficultyLabel rawBoardState={rawBoardState} />
      <Stack
        alignItems="center"
        direction={isRowLayout ? "column" : "row"}
        gap="4"
        minWidth={isRowLayout ? getCellSizeScaledBy(2.6) : undefined}
      >
        <PuzzleActions
          isRowLayout={isRowLayout}
          puzzleState={puzzleState}
          rawBoardState={rawBoardState}
          setPuzzleState={setPuzzleState}
        />
        <Keypad
          isMultiselectMode={isMultiselectMode}
          keypadMode={effectiveKeypadMode}
          puzzleState={puzzleState}
          setIsMultiselectMode={setIsMultiselectMode}
          setPuzzleState={setPuzzleState}
        />
        <KeypadModeSelector
          isRowLayout={isRowLayout}
          keypadMode={effectiveKeypadMode}
          setBaseKeypadMode={setBaseKeypadMode}
        />
      </Stack>
    </Stack>
  );
};
// #endregion
