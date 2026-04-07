import { Button, Dialog, Flex, HStack, Portal, Text } from "@chakra-ui/react";
import { ImStopwatch } from "react-icons/im";
import { MdOutlinePauseCircle, MdOutlinePlayCircle } from "react-icons/md";

import { useSudokuStopwatch } from "@/lib/pages/home/hooks/use-sudoku-stopwatch/use-sudoku-stopwatch";
import { useUserSettings } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";

// #region Dialog Trigger
const StopwatchDialogTrigger = () => {
  const { formattedStopwatchTime, isStopwatchRunning, pauseStopwatch } =
    useSudokuStopwatch();

  const ariaLabel = isStopwatchRunning
    ? `Pause stopwatch, current time: ${formattedStopwatchTime}`
    : `Resume stopwatch, current time: ${formattedStopwatchTime}`;

  return (
    <Dialog.Trigger asChild>
      <Button
        aria-label={ariaLabel}
        color="white"
        cursor="pointer"
        width={formattedStopwatchTime.length === 5 ? "5.25rem" : "6rem"}
        onClick={pauseStopwatch}
        textStyle="2xl"
        unstyled
      >
        <HStack aria-hidden="true" justifyContent="space-between">
          <Text fontFamily="sans-serif" fontWeight="medium" textStyle="xl">
            {formattedStopwatchTime}
          </Text>
          {isStopwatchRunning ? (
            <MdOutlinePauseCircle />
          ) : (
            <MdOutlinePlayCircle />
          )}
        </HStack>
      </Button>
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
