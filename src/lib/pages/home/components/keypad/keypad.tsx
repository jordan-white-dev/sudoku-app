import {
  Button,
  ColorSwatch,
  GridItem,
  Icon,
  IconButton,
  type IconButtonProps,
  type IconProps,
  SimpleGrid,
  Switch,
} from "@chakra-ui/react";
import { type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { FiDelete } from "react-icons/fi";
import { GrCheckbox, GrMultiple } from "react-icons/gr";

import { Tooltip } from "@/lib/pages/home/components/tooltip";
import { useUserSettings } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import {
  handleCenterMarkupInput,
  handleClearCell,
  handleColorPadInput,
  handleCornerMarkupInput,
  handleDigitInput,
} from "@/lib/pages/home/utils/actions/actions";
import {
  flippedColors,
  flippedDigits,
  MARKUP_COLOR_BLUE,
  MARKUP_COLOR_GRAY,
  MARKUP_COLOR_GREEN,
  MARKUP_COLOR_ORANGE,
  MARKUP_COLOR_PINK,
  MARKUP_COLOR_PURPLE,
  MARKUP_COLOR_RED,
  MARKUP_COLOR_WHITE,
  MARKUP_COLOR_YELLOW,
  markupColors,
  sudokuDigits,
} from "@/lib/pages/home/utils/constants";
import { getCellSizeScaledBy } from "@/lib/pages/home/utils/display";
import { exhaustiveGuard } from "@/lib/pages/home/utils/guards";
import {
  type KeypadMode,
  type MarkupColor,
  type PuzzleState,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";
import { getBrandedSudokuDigit } from "@/lib/pages/home/utils/validators/validators";

// #region CSS Properties
const COLOR_SWATCH_SIZE = getCellSizeScaledBy(0.8);
const ICON_SIZE: IconProps["width"] = getCellSizeScaledBy(0.55);
const ICON_BUTTON_SIZE: IconButtonProps["width"] = getCellSizeScaledBy(0.8);
const ICON_BUTTON_DIGIT_FONT_SIZE: IconButtonProps["textStyle"] =
  getCellSizeScaledBy(0.6);
const ICON_BUTTON_NONDIGIT_FONT_SIZE: IconButtonProps["textStyle"] =
  getCellSizeScaledBy(0.33);
// #endregion

const brandedSudokuDigitsForFlippedKeypad: ReadonlyArray<SudokuDigit> =
  flippedDigits.map(getBrandedSudokuDigit);
const brandedSudokuDigits: ReadonlyArray<SudokuDigit> = sudokuDigits.map(
  getBrandedSudokuDigit,
);

// #region Color Pad

// #region Color Button
type ColorButtonProps = {
  markupColor: MarkupColor;
  puzzleState: PuzzleState;
  tooltipText: string;
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>;
};

const ColorButton = ({
  markupColor,
  puzzleState,
  tooltipText,
  setPuzzleState,
}: ColorButtonProps) => (
  <GridItem colSpan={2} height={COLOR_SWATCH_SIZE} width={COLOR_SWATCH_SIZE}>
    <Tooltip content={tooltipText}>
      <Button
        aria-label={tooltipText}
        height={COLOR_SWATCH_SIZE}
        padding="0"
        unstyled
        width={COLOR_SWATCH_SIZE}
        onClick={() =>
          handleColorPadInput(puzzleState, markupColor, setPuzzleState)
        }
      >
        <ColorSwatch
          aria-hidden="true"
          height={COLOR_SWATCH_SIZE}
          rounded="md"
          value={markupColor}
          width={COLOR_SWATCH_SIZE}
        />
      </Button>
    </Tooltip>
  </GridItem>
);
// #endregion

const colorPadTooltipTexts = {
  [MARKUP_COLOR_GRAY]: "Gray (1)",
  [MARKUP_COLOR_WHITE]: "White (2)",
  [MARKUP_COLOR_PINK]: "Pink (3)",
  [MARKUP_COLOR_RED]: "Red (4)",
  [MARKUP_COLOR_ORANGE]: "Orange (5)",
  [MARKUP_COLOR_YELLOW]: "Yellow (6)",
  [MARKUP_COLOR_GREEN]: "Green (7)",
  [MARKUP_COLOR_BLUE]: "Blue (8)",
  [MARKUP_COLOR_PURPLE]: "Purple (9)",
};

type ColorPadProps = {
  puzzleState: PuzzleState;
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>;
};

const ColorPad = ({ puzzleState, setPuzzleState }: ColorPadProps) => {
  const { userSettings } = useUserSettings();
  const markupColorsInOrder = userSettings.isFlipKeypadEnabled
    ? flippedColors
    : markupColors;

  return (
    <>
      {markupColorsInOrder.map((markupColor) => (
        <ColorButton
          key={markupColor}
          markupColor={markupColor}
          puzzleState={puzzleState}
          tooltipText={colorPadTooltipTexts[markupColor]}
          setPuzzleState={setPuzzleState}
        />
      ))}
    </>
  );
};
// #endregion

// #region Number Pad

// #region Number Button
type NumberButtonProps = {
  alignItems?: IconButtonProps["alignItems"];
  ariaLabel: IconButtonProps["aria-label"];
  justifyContent?: IconButtonProps["justifyContent"];
  padding?: IconButtonProps["padding"];
  sudokuDigit: SudokuDigit;
  fontSize: IconButtonProps["fontSize"];
  onClick: () => void;
};

const NumberButton = ({
  alignItems,
  ariaLabel,
  sudokuDigit,
  justifyContent,
  padding,
  fontSize,
  onClick,
}: NumberButtonProps) => (
  <GridItem colSpan={2}>
    <Tooltip content={sudokuDigit}>
      <IconButton
        aria-label={ariaLabel}
        color="white"
        colorPalette="blue"
        fontSize={fontSize}
        height={ICON_BUTTON_SIZE}
        minWidth={ICON_BUTTON_SIZE}
        padding="0"
        rounded="md"
        onClick={onClick}
        {...(alignItems && { alignItems })}
        {...(justifyContent && { justifyContent })}
        {...(padding && { padding })}
      >
        {sudokuDigit}
      </IconButton>
    </Tooltip>
  </GridItem>
);
// #endregion

const getAlignItemsForCornerNumberButton = (
  sudokuDigit: SudokuDigit,
): IconButtonProps["alignItems"] => {
  const sudokuDigitAsNumber = Number(sudokuDigit);

  if (sudokuDigitAsNumber <= 3) {
    return "start";
  }
  if (sudokuDigitAsNumber <= 6) {
    return "center";
  }
  return "end";
};

const getJustifyContentForCornerNumberButton = (sudokuDigit: SudokuDigit) => {
  const sudokuDigitAsNumber = Number(sudokuDigit);

  if (sudokuDigitAsNumber % 3 === 1) {
    return "start";
  }
  if (sudokuDigitAsNumber % 3 === 2) {
    return "center";
  }
  return "end";
};

type NumberPadProps = {
  keypadMode: KeypadMode;
  puzzleState: PuzzleState;
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>;
};

const NumberPad = ({
  keypadMode,
  puzzleState,
  setPuzzleState,
}: NumberPadProps) => {
  const { userSettings } = useUserSettings();
  const sudokuDigitsInOrder = userSettings.isFlipKeypadEnabled
    ? brandedSudokuDigitsForFlippedKeypad
    : brandedSudokuDigits;

  return (
    <>
      {sudokuDigitsInOrder.map((sudokuDigit) => {
        if (keypadMode === "Digit") {
          return (
            <NumberButton
              ariaLabel={`Enter digit ${sudokuDigit}`}
              sudokuDigit={sudokuDigit}
              key={sudokuDigit}
              fontSize={ICON_BUTTON_DIGIT_FONT_SIZE}
              onClick={() =>
                handleDigitInput(puzzleState, sudokuDigit, setPuzzleState)
              }
            />
          );
        }
        if (keypadMode === "Center") {
          return (
            <NumberButton
              ariaLabel={`Enter center markup ${sudokuDigit}`}
              sudokuDigit={sudokuDigit}
              key={sudokuDigit}
              fontSize={ICON_BUTTON_NONDIGIT_FONT_SIZE}
              onClick={() =>
                handleCenterMarkupInput(
                  puzzleState,
                  sudokuDigit,
                  setPuzzleState,
                )
              }
            />
          );
        }
        if (keypadMode === "Corner") {
          return (
            <NumberButton
              alignItems={getAlignItemsForCornerNumberButton(sudokuDigit)}
              ariaLabel={`Enter corner markup ${sudokuDigit}`}
              sudokuDigit={sudokuDigit}
              justifyContent={getJustifyContentForCornerNumberButton(
                sudokuDigit,
              )}
              key={sudokuDigit}
              padding={getCellSizeScaledBy(0.09)}
              fontSize={ICON_BUTTON_NONDIGIT_FONT_SIZE}
              onClick={() =>
                handleCornerMarkupInput(
                  puzzleState,
                  sudokuDigit,
                  setPuzzleState,
                )
              }
            />
          );
        }
        if (keypadMode === "Color") {
          return null;
        }
        return exhaustiveGuard(keypadMode);
      })}
    </>
  );
};
// #endregion

// #region Multiselect Switch
const multiselectSwitchStyle: CSSProperties & Record<`--${string}`, string> = {
  "--switch-width": getCellSizeScaledBy(1.1),
  "--switch-height": getCellSizeScaledBy(0.5),
  "--switch-indicator-font-size": getCellSizeScaledBy(0.2),
};

type MultiselectSwitchProps = {
  isMultiselectMode: boolean;
  setIsMultiselectMode: Dispatch<SetStateAction<boolean>>;
};

const MultiselectSwitch = ({
  isMultiselectMode,
  setIsMultiselectMode,
}: MultiselectSwitchProps) => (
  <GridItem
    alignItems="center"
    colSpan={3}
    display="flex"
    height="full"
    justifyContent="center"
    rounded="md"
    width="full"
  >
    <Tooltip content="Multiple cells can be selected while this is toggled">
      <Switch.Root
        checked={isMultiselectMode}
        colorPalette="blue"
        style={multiselectSwitchStyle}
        onCheckedChange={(event) => setIsMultiselectMode(event.checked)}
      >
        <Switch.HiddenInput />
        <Switch.Label srOnly>Multiselect mode</Switch.Label>
        <Switch.Control>
          <Switch.Thumb />
          <Switch.Indicator
            fallback={
              <Icon as={GrCheckbox} fontSize={getCellSizeScaledBy(0.22)} />
            }
          >
            <Icon
              as={GrMultiple}
              color="white"
              fontSize={getCellSizeScaledBy(0.22)}
            />
          </Switch.Indicator>
        </Switch.Control>
      </Switch.Root>
    </Tooltip>
  </GridItem>
);
// #endregion

// #region Clear Button
type ClearButtonProps = {
  puzzleState: PuzzleState;
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>;
};

const ClearButton = ({ puzzleState, setPuzzleState }: ClearButtonProps) => (
  <GridItem colSpan={3}>
    <Tooltip
      content="Clear the selected cells"
      positioning={{ placement: "bottom" }}
    >
      <IconButton
        aria-label="Clear selected cells"
        color="white"
        colorPalette="blue"
        height={ICON_BUTTON_SIZE}
        rounded="md"
        width="full"
        onClick={() => handleClearCell(puzzleState, setPuzzleState)}
      >
        <Icon height={ICON_SIZE} width={ICON_SIZE}>
          <FiDelete />
        </Icon>
      </IconButton>
    </Tooltip>
  </GridItem>
);
// #endregion

// #region Keypad Component
type KeypadProps = {
  isMultiselectMode: boolean;
  keypadMode: KeypadMode;
  puzzleState: PuzzleState;
  setIsMultiselectMode: Dispatch<SetStateAction<boolean>>;
  setPuzzleState: Dispatch<SetStateAction<PuzzleState>>;
};

export const Keypad = ({
  isMultiselectMode,
  keypadMode,
  puzzleState,
  setIsMultiselectMode,
  setPuzzleState,
}: KeypadProps) => (
  <SimpleGrid
    columns={6}
    gap={getCellSizeScaledBy(0.06)}
    height="fit-content"
    width={getCellSizeScaledBy(2.52)}
  >
    {keypadMode === "Color" ? (
      <ColorPad
        key="color-pad"
        puzzleState={puzzleState}
        setPuzzleState={setPuzzleState}
      />
    ) : (
      <NumberPad
        key="number-pad"
        keypadMode={keypadMode}
        puzzleState={puzzleState}
        setPuzzleState={setPuzzleState}
      />
    )}

    <MultiselectSwitch
      isMultiselectMode={isMultiselectMode}
      key="multiselect-switch"
      setIsMultiselectMode={setIsMultiselectMode}
    />
    <ClearButton
      key="clear-button"
      puzzleState={puzzleState}
      setPuzzleState={setPuzzleState}
    />
  </SimpleGrid>
);
// #endregion
