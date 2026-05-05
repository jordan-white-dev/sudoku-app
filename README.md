# Sudoku App

A web-based Sudoku app built with React and Chakra UI, featuring shareable puzzle URLs, multiple markup modes, undo/redo history, puzzle-specific session persistence, and a responsive interface for desktop and mobile.

**Live app:** https://jordan-white-dev.vercel.app/

## Table of Contents

- [How to Use the App](#how-to-use-the-app)
- [Shortcuts](#shortcuts)
- [Settings](#settings)
- [Persistence](#persistence)
- [Responsive Design](#responsive-design)
- [Attribution](#attribution)

## How to Use the App

### Starting a Puzzle

When the app loads, it automatically generates a playable Sudoku puzzle and serves it at its own dedicated URL, allowing every puzzle to be revisited or shared. From there, you can begin solving immediately or generate a new puzzle.

### Difficulty Label

Every active puzzle displays a **Difficulty** label directly above the puzzle controls showing one of four levels: Standard, Intermediate, Advanced, or Expert. This label reflects the computed difficulty of the actual puzzle — not the difficulty level you selected as a preference. A puzzle generated at a higher target difficulty may still display a lower level if the generator could not find a matching puzzle within its attempt limit.

### Selecting Cells

- Click or tap a cell to select or deselect it.
- Click/touch and drag to select multiple cells.
- Turn on **multiselect mode** to freely add or remove cells from the current selection.

A single selected cell is highlighted with a blue border.

When multiple cells are selected, connected groups of cells share a single border.

![One selected cell bordered in blue on the left. Five cells with a shared blue border along their outer edge on the right.](images/single-select-vs-multiselect.png)

### Entering Content

When one or more cells are selected, inputs can be entered using the on-screen keypad or the number keys on the keyboard.

The keypad has four input modes:

- **Digit**
- **Center Markup**
- **Corner Markup**
- **Color Markup**

Digit enters a number into the cell.

Center and corner markups are smaller notations for tracking number candidates.

Color markup applies background colors as an alternate tracking method.

![Cells with: "358" center markups, a "3" corner markup, and blue and orange background colors. Then a digit cell with the number "2". Then two cells with "47" center markups. Finally, a cell with "58" center markups and a green background color.](images/digit-and-markups-example.png)

### Puzzle Actions

- **New Puzzle**
- **Undo/Redo**
- **Check Solution**
- **Restart Puzzle**

The app includes controls for generating a new puzzle, undoing and redoing moves, checking the current solution, and restarting the puzzle. Restarting can be done with or without resetting elapsed time.

## Shortcuts

### Selection

- **`Arrows`:** Move the current selection in the indicated direction.
- **`Ctrl + Arrow`, `Shift + Arrow`:** Add a cell to the current selection.
- **`Ctrl + A`:** Select all cells.
- **`Ctrl + Shift + A`:** Deselect all cells.
- **`Ctrl + I`:** Invert the current selection.
- **`Mouse Click`, `Tap`:** Select or deselect a cell.
- **`Mouse Click + Drag`, `Touch + Drag`:** Select multiple cells.
- **`Double Click`, `Double Tap`:** Select all matching, non-empty cells. Strict highlighting selects only cells with identical contents.
- **`M`:** Toggle multiselect mode.
- **`Escape`, `Backspace`, `Delete`:** Clear the selected cells.

### Keypad Modes

- **`Z`:** Switch to Digit mode.
- **`X`:** Switch to Center Markup mode.
- **`C`:** Switch to Corner Markup mode.
- **`V`:** Switch to Color Markup mode.

### Number Entry

- **`1 – 9` (Number Row, Numpad, or Keypad):** Enter digits or markups depending on the keypad mode.

### Markup Entry

- **`Ctrl + Number`:** Enter a center markup.
- **`Shift + Number`:** Enter a corner markup.
- **`Alt + Number`:** Enter a color markup.

### History

- **`Ctrl + Z`:** Undo the last move.
- **`Ctrl + Shift + Z`, `Ctrl + Y`:** Redo the last undone move.

## Settings

All settings are off by default.

![The open settings menu with Conflict Checker, Show Seen Cells, Strict Highlights, Flip Keypad, Dashed Grid, Disable Stopwatch, Hide Stopwatch, and Show Row + Column Labels settings. The Show Seen Cells and Disable Stopwatch settings are checked.](images/settings-menu.png)

### Conflict Checker

Highlights invalid cells in red when a digit conflicts with another matching digit in the same row, column, or box.

![Multiple cells in the same row, column, and/or box highlighted in red.](images/conflict-cells-example.png)

### Show Seen Cells

When a single cell is selected, all cells it sees in its row, column, and box are highlighted in yellow.

![A single selected cell with all other cells in its row, column, and box highlighted in yellow.](images/show-seen-cells-example.png)

### Strict Highlights

Controls how double-click cell selection works.

- **Off:** cells are highlighted if they share a matching digit or one or more matching markups
- **On:** cells are highlighted only if their contents match exactly

### Flip Keypad

Changes the arrangement of keypad buttons from:

```
1 2 3
4 5 6
7 8 9
```

to:

```
7 8 9
4 5 6
1 2 3
```

### Dashed Grid

Changes interior puzzle borders from solid lines to dashed lines.

### Disable Stopwatch

Disables the stopwatch. No solve time is shown on the completion dialog.

### Hide Stopwatch

Hides the stopwatch from view. If the stopwatch is enabled, the solve time still appears on the completion dialog.

### Show Row + Column Labels

Adds row labels along the left of the puzzle and column labels along the top.

## Persistence

The app uses **session storage** to preserve state while the browser tab remains open. That includes:

- the current board state
- undo/redo history
- elapsed time for each puzzle
- multiselect mode
- keypad mode

Because progress is stored per puzzle, users can move between puzzles using browser navigation and keep their puzzle-specific progress intact within the same tab session.

## Attribution

This project builds on and draws inspiration from several excellent tools and resources:

- **Vite React Chakra Starter**  
  [agustinusnathaniel/vite-react-chakra-starter](https://github.com/agustinusnathaniel/vite-react-chakra-starter/)

- **`sudoku` package**  
  [dachev/sudoku](https://github.com/dachev/sudoku)

- **Sven's Sudoku App**  
  [sudokupad.app](https://sudokupad.app/)

- **Chakra UI**  
  [chakra-ui.com](https://chakra-ui.com/)

- **React Icons**  
  [react-icons.github.io/react-icons](https://react-icons.github.io/react-icons/)
