// #region Markup Colors
export const MARKUP_COLOR_GRAY = "#cfcfc4";
export const MARKUP_COLOR_WHITE = "#ffffff";
export const MARKUP_COLOR_PINK = "#ffc5d3";
export const MARKUP_COLOR_RED = "#f9a5a4";
export const MARKUP_COLOR_ORANGE = "#fac898";
export const MARKUP_COLOR_YELLOW = "#ffee8c";
export const MARKUP_COLOR_GREEN = "#bee5b0";
export const MARKUP_COLOR_BLUE = "#b3ebf2";
export const MARKUP_COLOR_PURPLE = "#c3b5c5";

export const markupColors = [
  MARKUP_COLOR_GRAY,
  MARKUP_COLOR_WHITE,
  MARKUP_COLOR_PINK,
  MARKUP_COLOR_RED,
  MARKUP_COLOR_ORANGE,
  MARKUP_COLOR_YELLOW,
  MARKUP_COLOR_GREEN,
  MARKUP_COLOR_BLUE,
  MARKUP_COLOR_PURPLE,
] as const;

export const flippedColors = [
  MARKUP_COLOR_GREEN,
  MARKUP_COLOR_BLUE,
  MARKUP_COLOR_PURPLE,
  MARKUP_COLOR_RED,
  MARKUP_COLOR_ORANGE,
  MARKUP_COLOR_YELLOW,
  MARKUP_COLOR_GRAY,
  MARKUP_COLOR_WHITE,
  MARKUP_COLOR_PINK,
] as const;

// #region Markup Color Names
export const markupColorNames = {
  [MARKUP_COLOR_GRAY]: "Gray",
  [MARKUP_COLOR_WHITE]: "White",
  [MARKUP_COLOR_PINK]: "Pink",
  [MARKUP_COLOR_RED]: "Red",
  [MARKUP_COLOR_ORANGE]: "Orange",
  [MARKUP_COLOR_YELLOW]: "Yellow",
  [MARKUP_COLOR_GREEN]: "Green",
  [MARKUP_COLOR_BLUE]: "Blue",
  [MARKUP_COLOR_PURPLE]: "Purple",
} as const;
// #endregion

// #endregion

// #region Sudoku Digits
export const sudokuDigits = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
] as const;

export const flippedDigits = [
  "7",
  "8",
  "9",
  "4",
  "5",
  "6",
  "1",
  "2",
  "3",
] as const;
// #endregion

// #region Keypad Modes
export const keypadModes = ["Digit", "Color", "Center", "Corner"] as const;
// #endregion
