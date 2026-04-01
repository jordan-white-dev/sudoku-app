import {
  ColorSwatch,
  GridItem,
  Icon,
  IconButton,
  type IconButtonProps,
  type IconProps,
  SimpleGrid,
  Square,
  Stack,
  Switch,
  Text,
} from "@chakra-ui/react";
import { type Dispatch, type SetStateAction } from "react";
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
import { exhaustiveGuard } from "@/lib/pages/home/utils/guards";
import { getBrandedSudokuDigit } from "@/lib/pages/home/utils/transforms/transforms";
import {
  type KeypadMode,
  type MarkupColor,
  type PuzzleHistory,
  type SudokuDigit,
} from "@/lib/pages/home/utils/types";

// #region CSS Properties
const COLOR_SWATCH_SIZE: IconProps["width"] = {
  base: "8",
  sm: "11",
  md: "16",
};
const ICON_SIZE: IconProps["width"] = { base: "6", sm: "8", md: "11" };
const ICON_BUTTON_SIZE: IconButtonProps["size"] = {
  base: "xs",
  sm: "lg",
  md: "2xl",
};
const ICON_BUTTON_TEXT_STYLE_DIGIT: IconButtonProps["textStyle"] = {
  base: "lg",
  sm: "3xl",
  md: "5xl",
};
const ICON_BUTTON_TEXT_STYLE_NONDIGIT: IconButtonProps["textStyle"] = {
  base: "xs",
  sm: "lg",
  md: "2xl",
};
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
  puzzleHistory: PuzzleHistory;
  tooltipText: string;
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>;
};

const ColorButton = ({
  markupColor,
  puzzleHistory,
  tooltipText,
  setPuzzleHistory,
}: ColorButtonProps) => (
  <GridItem colSpan={2} height={COLOR_SWATCH_SIZE} width={COLOR_SWATCH_SIZE}>
    <Tooltip content={tooltipText}>
      <ColorSwatch
        height={COLOR_SWATCH_SIZE}
        rounded="md"
        value={markupColor}
        width={COLOR_SWATCH_SIZE}
        onClick={() =>
          handleColorPadInput(puzzleHistory, markupColor, setPuzzleHistory)
        }
      />
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
  puzzleHistory: PuzzleHistory;
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>;
};

const ColorPad = ({ puzzleHistory, setPuzzleHistory }: ColorPadProps) => {
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
          puzzleHistory={puzzleHistory}
          tooltipText={colorPadTooltipTexts[markupColor]}
          setPuzzleHistory={setPuzzleHistory}
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
  justifyContent?: IconButtonProps["justifyContent"];
  padding?: IconButtonProps["padding"];
  sudokuDigit: SudokuDigit;
  textStyle: IconButtonProps["textStyle"];
  onClick: () => void;
};

const NumberButton = ({
  alignItems,
  sudokuDigit,
  justifyContent,
  padding,
  textStyle,
  onClick,
}: NumberButtonProps) => (
  <GridItem colSpan={2}>
    <Tooltip content={sudokuDigit}>
      <Square aspectRatio="square">
        <IconButton
          aspectRatio="square"
          color="white"
          colorPalette="blue"
          rounded="md"
          size={ICON_BUTTON_SIZE}
          textStyle={textStyle}
          onClick={onClick}
          {...(alignItems && { alignItems })}
          {...(justifyContent && { justifyContent })}
          {...(padding && { padding })}
        >
          {sudokuDigit}
        </IconButton>
      </Square>
    </Tooltip>
  </GridItem>
);
// #endregion

const getAlignItemsForCornerNumberButton = (
  sudokuDigit: SudokuDigit,
): IconButtonProps["alignItems"] => {
  const sudokuDigitAsNumber = Number(sudokuDigit);

  if (sudokuDigitAsNumber <= 3) return "start";
  else if (sudokuDigitAsNumber <= 6) return "center";
  else return "end";
};

const getJustifyContentForCornerNumberButton = (sudokuDigit: SudokuDigit) => {
  const sudokuDigitAsNumber = Number(sudokuDigit);

  if (sudokuDigitAsNumber % 3 === 1) return "start";
  else if (sudokuDigitAsNumber % 3 === 2) return "center";
  else return "end";
};

type NumberPadProps = {
  keypadMode: KeypadMode;
  puzzleHistory: PuzzleHistory;
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>;
};

const NumberPad = ({
  keypadMode,
  puzzleHistory,
  setPuzzleHistory,
}: NumberPadProps) => {
  const { userSettings } = useUserSettings();
  const sudokuDigitsInOrder = userSettings.isFlipKeypadEnabled
    ? brandedSudokuDigitsForFlippedKeypad
    : brandedSudokuDigits;

  return (
    <>
      {sudokuDigitsInOrder.map((sudokuDigit) => {
        if (keypadMode === "Digit")
          return (
            <NumberButton
              sudokuDigit={sudokuDigit}
              key={sudokuDigit}
              textStyle={ICON_BUTTON_TEXT_STYLE_DIGIT}
              onClick={() =>
                handleDigitInput(puzzleHistory, sudokuDigit, setPuzzleHistory)
              }
            />
          );
        else if (keypadMode === "Center")
          return (
            <NumberButton
              sudokuDigit={sudokuDigit}
              key={sudokuDigit}
              textStyle={ICON_BUTTON_TEXT_STYLE_NONDIGIT}
              onClick={() =>
                handleCenterMarkupInput(
                  puzzleHistory,
                  sudokuDigit,
                  setPuzzleHistory,
                )
              }
            />
          );
        else if (keypadMode === "Corner")
          return (
            <NumberButton
              alignItems={getAlignItemsForCornerNumberButton(sudokuDigit)}
              sudokuDigit={sudokuDigit}
              justifyContent={getJustifyContentForCornerNumberButton(
                sudokuDigit,
              )}
              key={sudokuDigit}
              padding={{ base: "1", md: "1.5" }}
              textStyle={ICON_BUTTON_TEXT_STYLE_NONDIGIT}
              onClick={() =>
                handleCornerMarkupInput(
                  puzzleHistory,
                  sudokuDigit,
                  setPuzzleHistory,
                )
              }
            />
          );
        else if (keypadMode === "Color") return null;
        else return exhaustiveGuard(keypadMode);
      })}
    </>
  );
};
// #endregion

// #region Multiselect Switch
type MultiselectSwitchProps = {
  isMultiselectMode: boolean;
  setIsMultiselectMode: Dispatch<SetStateAction<boolean>>;
};

const MultiselectSwitch = ({
  isMultiselectMode,
  setIsMultiselectMode,
}: MultiselectSwitchProps) => (
  <GridItem
    alignContent="center"
    border={{ sm: "2px solid" }}
    borderColor={{ sm: "blue.border" }}
    colSpan={3}
    height="full"
    rounded="md"
    width="full"
  >
    <Tooltip content="Multiple cells can be selected while this is toggled">
      <Stack alignItems="center" direction="column" gap="1">
        <Switch.Root
          checked={isMultiselectMode}
          colorPalette="blue"
          size="lg"
          onCheckedChange={(event) => setIsMultiselectMode(event.checked)}
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
            <Switch.Indicator fallback={<Icon as={GrCheckbox} />}>
              <Icon as={GrMultiple} />
            </Switch.Indicator>
          </Switch.Control>
        </Switch.Root>
        <Text
          alignSelf="center"
          fontWeight="semibold"
          hideBelow="md"
          justifySelf="center"
        >
          Multiselect
        </Text>
      </Stack>
    </Tooltip>
  </GridItem>
);
// #endregion

// #region Clear Button
type ClearButtonProps = {
  puzzleHistory: PuzzleHistory;
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>;
};

const ClearButton = ({ puzzleHistory, setPuzzleHistory }: ClearButtonProps) => (
  <GridItem colSpan={3}>
    <Tooltip
      content="Clear the selected cells"
      positioning={{ placement: "bottom" }}
    >
      <IconButton
        color="white"
        colorPalette="blue"
        rounded="md"
        size={ICON_BUTTON_SIZE}
        textStyle={ICON_BUTTON_TEXT_STYLE_DIGIT}
        width="full"
        onClick={() => handleClearCell(puzzleHistory, setPuzzleHistory)}
      >
        <Icon height={ICON_SIZE} width={ICON_SIZE}>
          <FiDelete />
        </Icon>
      </IconButton>
    </Tooltip>
  </GridItem>
);
// #endregion

type KeypadProps = {
  isMultiselectMode: boolean;
  keypadMode: KeypadMode;
  puzzleHistory: PuzzleHistory;
  setIsMultiselectMode: Dispatch<SetStateAction<boolean>>;
  setPuzzleHistory: Dispatch<SetStateAction<PuzzleHistory>>;
};

export const Keypad = ({
  isMultiselectMode,
  keypadMode,
  puzzleHistory,
  setIsMultiselectMode,
  setPuzzleHistory,
}: KeypadProps) => {
  return (
    <SimpleGrid
      columns={6}
      gap={{ base: "0.2916rem", sm: "1", md: "1.5" }}
      height="fit-content"
    >
      {keypadMode === "Color" ? (
        <ColorPad
          key="color-pad"
          puzzleHistory={puzzleHistory}
          setPuzzleHistory={setPuzzleHistory}
        />
      ) : (
        <NumberPad
          key="number-pad"
          keypadMode={keypadMode}
          puzzleHistory={puzzleHistory}
          setPuzzleHistory={setPuzzleHistory}
        />
      )}

      <MultiselectSwitch
        isMultiselectMode={isMultiselectMode}
        key="multiselect-switch"
        setIsMultiselectMode={setIsMultiselectMode}
      />
      <ClearButton
        key="clear-button"
        puzzleHistory={puzzleHistory}
        setPuzzleHistory={setPuzzleHistory}
      />
    </SimpleGrid>
  );
};
