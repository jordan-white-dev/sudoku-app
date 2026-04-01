// #region Markup Colors
export const MARKUP_COLOR_GRAY = "#c2bcbc";
export const MARKUP_COLOR_WHITE = "#ffffff";
export const MARKUP_COLOR_PINK = "#f79cf7";
export const MARKUP_COLOR_RED = "#f98987";
export const MARKUP_COLOR_ORANGE = "#f5ae51";
export const MARKUP_COLOR_YELLOW = "#fef28c";
export const MARKUP_COLOR_GREEN = "#94cb9c";
export const MARKUP_COLOR_BLUE = "#8cc2fa";
export const MARKUP_COLOR_PURPLE = "#bf5fca";

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
