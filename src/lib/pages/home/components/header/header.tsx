import {
  Box,
  Button,
  Flex,
  Group,
  IconButton,
  Kbd,
  Menu,
  Portal,
  RadioGroup,
  Text,
  VStack,
} from "@chakra-ui/react";
import { type ReactNode } from "react";
import { ImKeyboard } from "react-icons/im";
import { MdOutlineSettings } from "react-icons/md";

import { Stopwatch } from "@/lib/pages/home/components/stopwatch/stopwatch";
import { Tooltip } from "@/lib/pages/home/components/tooltip/tooltip";
import { useSudokuStopwatch } from "@/lib/pages/home/hooks/use-sudoku-stopwatch/use-sudoku-stopwatch";
import {
  type UserSettings,
  useUserSettings,
} from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import { puzzleDifficultyLevels } from "@/lib/pages/home/utils/constants";
import { type PuzzleDifficultyLevel } from "@/lib/pages/home/utils/types";

// #region Shortcuts Menu

// #region Shortcut Tooltip Text Components
const MoveSelectionTooltipText = () => (
  <>
    <Kbd>Arrows</Kbd>: &nbsp;Move the current selection in the indicated
    direction if only one cell is selected.
  </>
);
const ExpandSelectionTooltipText = () => (
  <>
    <Kbd>Ctrl&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;Arrow</Kbd>,&nbsp;
    <Kbd>Shift&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;Arrow</Kbd>: &nbsp;Add a cell to
    the current selection.
  </>
);
const SelectAllCellsTooltipText = () => (
  <>
    <Kbd>Ctrl&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;A</Kbd>: &nbsp;Select all cells.
  </>
);
const DeselectAllCellsTooltipText = () => (
  <>
    <Kbd>
      Ctrl&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;Shift&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;A
    </Kbd>
    : &nbsp;Deselect all cells.
  </>
);
const InvertSelectionTooltipText = () => (
  <>
    <Kbd>Ctrl&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;I</Kbd>: &nbsp;Invert the current
    selection.
  </>
);
const SelectDeselectCellTooltipText = () => (
  <>
    <Kbd>Mouse&nbsp;&nbsp;&nbsp;&nbsp;Click</Kbd>,&nbsp;<Kbd>Tap</Kbd>:
    &nbsp;Select or deselect a cell.
  </>
);
const SelectMultipleCellsTooltipText = () => (
  <>
    <Kbd>
      Mouse&nbsp;&nbsp;&nbsp;&nbsp;Click&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;Drag
    </Kbd>
    ,&nbsp;
    <Kbd>Touch&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;Drag</Kbd>: &nbsp;Select multiple
    cells.
  </>
);
const HighlightMatchesTooltipText = () => (
  <>
    <Kbd>Double&nbsp;&nbsp;&nbsp;&nbsp;Click</Kbd>,&nbsp;
    <Kbd>Double&nbsp;&nbsp;&nbsp;&nbsp;Tap</Kbd>: &nbsp;Select all matching,
    non-empty cells. Strict highlighting selects only cells with identical
    contents.
  </>
);
const MultiselectTooltipText = () => (
  <>
    <Kbd>M</Kbd>: &nbsp;Toggle multiselect mode.
  </>
);
const ClearSelectedCellsTooltipText = () => (
  <>
    <Kbd>Backspace</Kbd>,&nbsp;<Kbd>Delete</Kbd>,&nbsp;<Kbd>Escape</Kbd>:
    &nbsp;Clear the selected cells.
  </>
);
const DigitModeTooltipText = () => (
  <>
    <Kbd>Z</Kbd>: &nbsp;Switch to Digit mode.
  </>
);
const CenterMarkupModeTooltipText = () => (
  <>
    <Kbd>X</Kbd>: &nbsp;Switch to Center Markup mode.
  </>
);
const CornerMarkupModeTooltipText = () => (
  <>
    <Kbd>C</Kbd>: &nbsp;Switch to Corner Markup mode.
  </>
);
const ColorMarkupModeTooltipText = () => (
  <>
    <Kbd>V</Kbd>: &nbsp;Switch to Color Markup mode.
  </>
);
const EnterDigitsMarkupsTooltipText = () => (
  <>
    <Kbd>1-9</Kbd>&nbsp;&nbsp;(Number Row, Numpad, or Keypad): &nbsp;Enter
    digits or markups depending on the keypad mode.
  </>
);
const CenterMarkupTooltipText = () => (
  <>
    <Kbd>Ctrl&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;Number</Kbd>: &nbsp;Enter a center
    markup.
  </>
);
const CornerMarkupTooltipText = () => (
  <>
    <Kbd>Shift&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;Number</Kbd>: &nbsp;Enter a corner
    markup.
  </>
);
const ColorMarkupTooltipText = () => (
  <>
    <Kbd>Alt&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;Number</Kbd>: &nbsp;Enter a color
    markup.
  </>
);
const UndoTooltipText = () => (
  <>
    <Kbd>Ctrl&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;Z</Kbd>: &nbsp;Undo the last move.
  </>
);
const RedoTooltipText = () => (
  <>
    <Kbd>
      Ctrl&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;Shift&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;Z
    </Kbd>
    ,&nbsp;
    <Kbd>Ctrl&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;Y</Kbd>: &nbsp;Redo the last undone
    move.
  </>
);
// #endregion

// #region Shortcut Data
type ShortcutItem = {
  keyboardShortcut: string | Array<string>;
  shortcutName: string;
  tooltipText?: ReactNode;
  value: string;
};

type ShortcutGroup = {
  label: string;
  items: Array<ShortcutItem>;
};

const shortcutGroups: Array<ShortcutGroup> = [
  {
    label: "Selection",
    items: [
      {
        keyboardShortcut: "Arrows",
        shortcutName: "Move Selection",
        tooltipText: <MoveSelectionTooltipText />,
        value: "move-selection",
      },
      {
        keyboardShortcut: ["Ctrl + Arrow", "Shift + Arrow"],
        shortcutName: "Expand Selection",
        tooltipText: <ExpandSelectionTooltipText />,
        value: "expand-selection",
      },
      {
        keyboardShortcut: "Ctrl + A",
        shortcutName: "Select All Cells",
        tooltipText: <SelectAllCellsTooltipText />,
        value: "select-all-cells",
      },
      {
        keyboardShortcut: "Ctrl + Shift + A",
        shortcutName: "Deselect All Cells",
        tooltipText: <DeselectAllCellsTooltipText />,
        value: "deselect-all-cells",
      },
      {
        keyboardShortcut: "Ctrl + I",
        shortcutName: "Invert Selection",
        tooltipText: <InvertSelectionTooltipText />,
        value: "invert-selection",
      },
      {
        keyboardShortcut: ["Mouse Click", "Tap"],
        shortcutName: "Select / Deselect Cell",
        tooltipText: <SelectDeselectCellTooltipText />,
        value: "select-deselect-cell",
      },
      {
        keyboardShortcut: ["Mouse Click + Drag", "Touch + Drag"],
        shortcutName: "Select Multiple Cells",
        tooltipText: <SelectMultipleCellsTooltipText />,
        value: "select-multiple-cells",
      },
      {
        keyboardShortcut: ["Double Click", "Double Tap"],
        shortcutName: "Highlight Matches",
        tooltipText: <HighlightMatchesTooltipText />,
        value: "highlight-matches",
      },
      {
        keyboardShortcut: "M",
        shortcutName: "Multiselect Toggle",
        tooltipText: <MultiselectTooltipText />,
        value: "multiselect-toggle",
      },
      {
        keyboardShortcut: ["Backspace", "Delete", "Escape"],
        shortcutName: "Clear Selected Cells",
        tooltipText: <ClearSelectedCellsTooltipText />,
        value: "clear-selected-cells",
      },
    ],
  },
  {
    label: "Keypad Modes",
    items: [
      {
        keyboardShortcut: "Z",
        shortcutName: "Digit Mode",
        tooltipText: <DigitModeTooltipText />,
        value: "digit-mode",
      },
      {
        keyboardShortcut: "X",
        shortcutName: "Center Markup Mode",
        tooltipText: <CenterMarkupModeTooltipText />,
        value: "center-markup-mode",
      },
      {
        keyboardShortcut: "C",
        shortcutName: "Corner Markup Mode",
        tooltipText: <CornerMarkupModeTooltipText />,
        value: "corner-markup-mode",
      },
      {
        keyboardShortcut: "V",
        shortcutName: "Color Markup Mode",
        tooltipText: <ColorMarkupModeTooltipText />,
        value: "color-markup-mode",
      },
    ],
  },
  {
    label: "Number Entry",
    items: [
      {
        keyboardShortcut: "1 - 9",
        shortcutName: "Enter Digits / Markups",
        tooltipText: <EnterDigitsMarkupsTooltipText />,
        value: "enter-digits-markups",
      },
    ],
  },
  {
    label: "Markup Entry",
    items: [
      {
        keyboardShortcut: "Ctrl + Number",
        shortcutName: "Center Markup",
        tooltipText: <CenterMarkupTooltipText />,
        value: "center-markup",
      },
      {
        keyboardShortcut: "Shift + Number",
        shortcutName: "Corner Markup",
        tooltipText: <CornerMarkupTooltipText />,
        value: "corner-markup",
      },
      {
        keyboardShortcut: "Alt + Number",
        shortcutName: "Color Markup",
        tooltipText: <ColorMarkupTooltipText />,
        value: "color-markup",
      },
    ],
  },
  {
    label: "History",
    items: [
      {
        keyboardShortcut: "Ctrl + Z",
        shortcutName: "Undo",
        tooltipText: <UndoTooltipText />,
        value: "undo",
      },
      {
        keyboardShortcut: ["Ctrl + Shift + Z", "Ctrl + Y"],
        shortcutName: "Redo",
        tooltipText: <RedoTooltipText />,
        value: "redo",
      },
    ],
  },
];

const mobileShortcutItems: Array<ShortcutItem> = [
  {
    keyboardShortcut: "Tap",
    shortcutName: "Select / Deselect Cell",
    tooltipText: (
      <>
        <Kbd>Tap</Kbd>: &nbsp;Select or deselect a cell.
      </>
    ),
    value: "select-deselect-cell",
  },
  {
    keyboardShortcut: "Touch + Drag",
    shortcutName: "Select Multiple Cells",
    tooltipText: (
      <>
        <Kbd>Touch&nbsp;&nbsp;+&nbsp;&nbsp;&nbsp;Drag</Kbd>: &nbsp;Select
        multiple cells.
      </>
    ),
    value: "select-multiple-cells",
  },
  {
    keyboardShortcut: "Double Tap",
    shortcutName: "Highlight Matches",
    tooltipText: (
      <>
        <Kbd>Double&nbsp;&nbsp;&nbsp;&nbsp;Tap</Kbd>: &nbsp;Select all matching,
        non-empty cells. Strict highlighting selects only cells with identical
        contents.
      </>
    ),
    value: "highlight-matches",
  },
];
// #endregion

// #region Shortcuts Menu Components
const ShortcutCommand = ({
  keyboardShortcut,
}: {
  keyboardShortcut: string | Array<string>;
}) => (
  <Menu.ItemCommand>
    {Array.isArray(keyboardShortcut) ? (
      <VStack gap="1" alignItems="end">
        {keyboardShortcut.map((shortcut) => (
          <Kbd key={shortcut}>{shortcut}</Kbd>
        ))}
      </VStack>
    ) : (
      <Kbd>{keyboardShortcut}</Kbd>
    )}
  </Menu.ItemCommand>
);

const ShortcutMenuItem = ({
  keyboardShortcut,
  shortcutName,
  tooltipText,
  value,
}: ShortcutItem) => (
  <Tooltip content={tooltipText} key={value}>
    <Menu.Item backgroundColor="transparent" value={value}>
      <Box
        flex="1"
        alignSelf={Array.isArray(keyboardShortcut) ? "flex-start" : "center"}
      >
        {shortcutName}
      </Box>
      <ShortcutCommand keyboardShortcut={keyboardShortcut} />
    </Menu.Item>
  </Tooltip>
);

const ShortcutsMenu = () => (
  <Menu.Root>
    <Menu.Trigger asChild alignSelf="center" color="white" cursor="pointer">
      <Button aria-label="Keyboard shortcuts" unstyled>
        <ImKeyboard />
      </Button>
    </Menu.Trigger>
    <Portal>
      <Menu.Positioner>
        <Menu.Content hideBelow="sm" maxHeight="33vh">
          {shortcutGroups.map((shortcutGroup, groupIndex) => (
            <Box key={shortcutGroup.label}>
              {groupIndex > 0 && <Menu.Separator />}
              <Menu.ItemGroup>
                <Menu.ItemGroupLabel>{shortcutGroup.label}</Menu.ItemGroupLabel>
                {shortcutGroup.items.map((item) => (
                  <ShortcutMenuItem key={item.value} {...item} />
                ))}
              </Menu.ItemGroup>
            </Box>
          ))}
        </Menu.Content>

        <Menu.Content hideFrom="sm">
          {mobileShortcutItems.map((item) => (
            <ShortcutMenuItem key={item.value} {...item} />
          ))}
        </Menu.Content>
      </Menu.Positioner>
    </Portal>
  </Menu.Root>
);
// #endregion

// #endregion

// #region Settings Menu

type BooleanUserSettingKey = {
  [Key in keyof UserSettings]: UserSettings[Key] extends boolean ? Key : never;
}[keyof UserSettings];

// #region Settings Checkbox
type SettingsCheckboxProps = {
  settingKey: BooleanUserSettingKey;
  settingLabel: string;
  userSettings: UserSettings;
  onCheckedChange: (checked: boolean) => void;
};

const SettingsCheckbox = ({
  settingKey,
  settingLabel,
  userSettings,
  onCheckedChange,
}: SettingsCheckboxProps) => (
  <Menu.CheckboxItem
    checked={userSettings[settingKey]}
    closeOnSelect={false}
    key={settingKey}
    value={settingKey}
    onCheckedChange={onCheckedChange}
  >
    {settingLabel}
    <Menu.ItemIndicator />
  </Menu.CheckboxItem>
);
// #endregion

// #region Difficulty Radio Group
const DIFFICULTY_GROUP_HEADING_ID = "difficulty-group-heading";

const DifficultyRadioGroup = () => {
  const { userSettings, setUserSettings } = useUserSettings();

  const handleDifficultyChange = ({ value }: { value: string | null }) => {
    if (value === null) {
      return;
    }

    const isValidLevel = (
      puzzleDifficultyLevels as ReadonlyArray<string>
    ).includes(value);

    if (!isValidLevel) {
      return;
    }

    const selectedLevel = value as PuzzleDifficultyLevel;

    setUserSettings((currentUserSettings) => ({
      ...currentUserSettings,
      preferredDifficultyLevel: selectedLevel,
    }));
  };

  return (
    <Box
      aria-labelledby={DIFFICULTY_GROUP_HEADING_ID}
      paddingX="2"
      paddingY="1"
      role="group"
    >
      <Text
        fontWeight="semibold"
        id={DIFFICULTY_GROUP_HEADING_ID}
        marginBottom="1"
      >
        Difficulty
      </Text>
      <RadioGroup.Root
        colorPalette="blue"
        value={userSettings.preferredDifficultyLevel}
        onValueChange={handleDifficultyChange}
      >
        <VStack alignItems="start">
          {puzzleDifficultyLevels.map((level) => (
            <RadioGroup.Item key={level} value={level}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl>
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemText>{level}</RadioGroup.ItemText>
            </RadioGroup.Item>
          ))}
        </VStack>
      </RadioGroup.Root>
    </Box>
  );
};
// #endregion

// #region Settings Menu Component
const SettingsMenu = () => {
  const { pauseStopwatch, startStopwatch } = useSudokuStopwatch();
  const { userSettings, setUserSettings } = useUserSettings();

  const setUserSetting = (
    settingKey: BooleanUserSettingKey,
    isSettingEnabled: boolean,
  ) => {
    setUserSettings((currentUserSettings) => ({
      ...currentUserSettings,
      [settingKey]: isSettingEnabled,
    }));
  };

  const getSettingCheckedChangeHandler =
    (settingKey: BooleanUserSettingKey) => (checked: boolean) => {
      setUserSetting(settingKey, checked);
    };

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <IconButton
          alignSelf="center"
          aria-label="Settings"
          color="white"
          cursor="pointer"
          unstyled
        >
          <MdOutlineSettings />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel>Gameplay</Menu.ItemGroupLabel>
              <SettingsCheckbox
                settingKey="isConflictCheckerEnabled"
                settingLabel="Conflict Checker"
                userSettings={userSettings}
                onCheckedChange={getSettingCheckedChangeHandler(
                  "isConflictCheckerEnabled",
                )}
              />

              <SettingsCheckbox
                settingKey="isShowSeenCellsEnabled"
                settingLabel="Show Seen Cells"
                userSettings={userSettings}
                onCheckedChange={getSettingCheckedChangeHandler(
                  "isShowSeenCellsEnabled",
                )}
              />

              <SettingsCheckbox
                settingKey="isStrictHighlightsEnabled"
                settingLabel="Strict Highlights"
                userSettings={userSettings}
                onCheckedChange={getSettingCheckedChangeHandler(
                  "isStrictHighlightsEnabled",
                )}
              />
            </Menu.ItemGroup>
            <Menu.Separator />
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel>Visual</Menu.ItemGroupLabel>
              <SettingsCheckbox
                settingKey="isFlipKeypadEnabled"
                settingLabel="Flip Keypad"
                userSettings={userSettings}
                onCheckedChange={getSettingCheckedChangeHandler(
                  "isFlipKeypadEnabled",
                )}
              />

              <SettingsCheckbox
                settingKey="isDashedGridEnabled"
                settingLabel="Dashed Grid"
                userSettings={userSettings}
                onCheckedChange={getSettingCheckedChangeHandler(
                  "isDashedGridEnabled",
                )}
              />

              <SettingsCheckbox
                settingKey="isStopwatchDisabled"
                settingLabel="Disable Stopwatch"
                userSettings={userSettings}
                onCheckedChange={(checked) => {
                  if (checked) {
                    pauseStopwatch();
                  } else {
                    startStopwatch();
                  }

                  setUserSetting("isStopwatchDisabled", checked);
                }}
              />

              <Tooltip
                content="Unless disabled, the stopwatch continues to run and appears on the completion dialog as your final time."
                key="isHideStopwatchEnabled"
              >
                <Menu.CheckboxItem
                  checked={userSettings.isHideStopwatchEnabled}
                  closeOnSelect={false}
                  value="isHideStopwatchEnabled"
                  onCheckedChange={getSettingCheckedChangeHandler(
                    "isHideStopwatchEnabled",
                  )}
                >
                  Hide Stopwatch
                  <Menu.ItemIndicator />
                </Menu.CheckboxItem>
              </Tooltip>

              <SettingsCheckbox
                settingKey="isShowRowAndColumnLabelsEnabled"
                settingLabel="Show Row + Column Labels"
                userSettings={userSettings}
                onCheckedChange={getSettingCheckedChangeHandler(
                  "isShowRowAndColumnLabelsEnabled",
                )}
              />
            </Menu.ItemGroup>
            <Menu.Separator />
            <DifficultyRadioGroup />
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};
// #endregion

// #endregion

// #region Header Component
export const Header = () => {
  const { userSettings } = useUserSettings();
  return (
    <Flex
      align="start"
      as="header"
      backgroundColor="gray.fg"
      height="12"
      justifyContent={
        userSettings.isHideStopwatchEnabled ? "end" : "space-between"
      }
      padding="0.625rem 1rem"
      width="full"
    >
      <Box as="h1" color="white" srOnly>
        Sudoku
      </Box>
      <Stopwatch />
      <Group alignSelf="center">
        <ShortcutsMenu />
        <SettingsMenu />
      </Group>
    </Flex>
  );
};
// #endregion
