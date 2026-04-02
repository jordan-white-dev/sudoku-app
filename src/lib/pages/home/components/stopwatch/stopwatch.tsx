import {
  Button,
  Dialog,
  Flex,
  HStack,
  IconButton,
  Portal,
  Text,
} from "@chakra-ui/react";
import { ImStopwatch } from "react-icons/im";
import { MdOutlinePauseCircle, MdOutlinePlayCircle } from "react-icons/md";

import { useSudokuStopwatch } from "@/lib/pages/home/hooks/use-sudoku-stopwatch/use-sudoku-stopwatch";
import { useUserSettings } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";

// #region Dialog Trigger
const StopwatchDialogTrigger = () => {
  const { formattedStopwatchTime, isStopwatchRunning, pauseStopwatch } =
    useSudokuStopwatch();

  return (
    <Dialog.Trigger asChild>
      <HStack cursor="pointer">
        <Text
          color="white"
          fontFamily="sans-serif"
          fontWeight="medium"
          textStyle="lg"
          onClick={pauseStopwatch}
        >
          {formattedStopwatchTime}
        </Text>
        <IconButton
          alignSelf="center"
          aria-label={
            isStopwatchRunning ? "Pause stopwatch" : "Resume stopwatch"
          }
          color="white"
          cursor="pointer"
          onClick={pauseStopwatch}
          unstyled
        >
          {isStopwatchRunning ? (
            <MdOutlinePauseCircle />
          ) : (
            <MdOutlinePlayCircle />
          )}
        </IconButton>
      </HStack>
    </Dialog.Trigger>
  );
};
// #endregion

// #region Dialog Footer
const StopwatchDialogFooter = () => {
  const { pauseStopwatchAndDisable, resumeStopwatchAndEnable } =
    useSudokuStopwatch();

  return (
    <Dialog.Footer justifyContent="center">
      <Dialog.ActionTrigger asChild>
        <Button variant="outline" onClick={resumeStopwatchAndEnable}>
          Resume <MdOutlinePlayCircle />
        </Button>
      </Dialog.ActionTrigger>

      <Dialog.ActionTrigger asChild>
        <Button variant="outline" onClick={pauseStopwatchAndDisable}>
          Stay Paused <MdOutlinePauseCircle />
        </Button>
      </Dialog.ActionTrigger>
    </Dialog.Footer>
  );
};
// #endregion

// #region Stopwatch Component
export const Stopwatch = () => {
  const { userSettings } = useUserSettings();
  const { startStopwatchIfEnabled } = useSudokuStopwatch();

  return (
    <Flex
      gap="1.5"
      hidden={userSettings.isHideStopwatchEnabled}
      textAlign="center"
    >
      <Dialog.Root
        placement="center"
        size="xs"
        motionPreset="slide-in-bottom"
        onEscapeKeyDown={startStopwatchIfEnabled}
        onPointerDownOutside={startStopwatchIfEnabled}
      >
        <StopwatchDialogTrigger />

        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header justifyContent="center">
                <Dialog.Title>
                  <HStack>
                    <ImStopwatch />
                    <Text>Game Paused</Text>
                    <ImStopwatch />
                  </HStack>
                </Dialog.Title>
              </Dialog.Header>

              <StopwatchDialogFooter />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Flex>
  );
};
// #endregion
