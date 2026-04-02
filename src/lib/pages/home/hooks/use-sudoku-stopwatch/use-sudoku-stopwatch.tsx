import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useStopwatch } from "react-timer-hook";
import useSessionStorageState from "use-session-storage-state";

import { useUserSettings } from "@/lib/pages/home/hooks/use-user-settings/use-user-settings";
import { type RawBoardState } from "@/lib/pages/home/utils/types";

// #region Formatting and Offset Utilities
const getFormattedStopwatchMinutes = (
  hours: number,
  minutes: number,
  totalSeconds: number,
) => {
  if (totalSeconds >= 6000) {
    const hoursConvertedToMinutes = hours * 60;
    const totalMinutes = minutes + hoursConvertedToMinutes;

    return String(totalMinutes).padStart(3, "0");
  } else if (hours === 1) {
    const totalMinutes = minutes + 60;

    return String(totalMinutes).padStart(2, "0");
  }

  return String(minutes).padStart(2, "0");
};

const getOffsetTimestampFromTotalSeconds = (totalSeconds: number): Date => {
  const offsetTimestamp = new Date();
  offsetTimestamp.setSeconds(offsetTimestamp.getSeconds() + totalSeconds);

  return offsetTimestamp;
};
// #endregion

// #region Context
type SudokuStopwatchContextValue = {
  formattedStopwatchTime: string;
  isStopwatchRunning: boolean;
  pauseStopwatch: () => void;
  pauseStopwatchAndDisable: () => void;
  resetStopwatch: () => void;
  resumeStopwatchAndEnable: () => void;
  startStopwatch: () => void;
  startStopwatchIfEnabled: () => void;
};

const SudokuStopwatchContext = createContext<
  SudokuStopwatchContextValue | undefined
>(undefined);
// #endregion

// #region Provider
interface SudokuStopwatchProviderProps extends PropsWithChildren {
  rawBoardState: RawBoardState;
}

export const SudokuStopwatchProvider = ({
  children,
  rawBoardState,
}: SudokuStopwatchProviderProps) => {
  const { userSettings, setUserSettings } = useUserSettings();

  const [persistedStopwatchTotalSeconds, setPersistedStopwatchTotalSeconds] =
    useSessionStorageState<number>(
      `sudoku-stopwatch-persisted-total-seconds-${JSON.stringify(rawBoardState)}`,
      {
        defaultValue: 0,
      },
    );

  // #region Stopwatch Hook
  const {
    hours,
    isRunning: isStopwatchRunning,
    minutes,
    seconds,
    totalSeconds,
    pause: pauseStopwatch,
    reset,
    start,
  } = useStopwatch({
    autoStart: false,
    interval: 500,
    offsetTimestamp: getOffsetTimestampFromTotalSeconds(
      persistedStopwatchTotalSeconds,
    ),
  });
  // #endregion

  // #region Stopwatch Persistence
  const hasHydratedStopwatchFromSessionStorageRef = useRef(false);

  useEffect(() => {
    if (hasHydratedStopwatchFromSessionStorageRef.current) return;

    hasHydratedStopwatchFromSessionStorageRef.current = true;

    const hydratedOffsetDate = getOffsetTimestampFromTotalSeconds(
      persistedStopwatchTotalSeconds,
    );

    reset(hydratedOffsetDate, !userSettings.isStopwatchDisabled);
  }, [persistedStopwatchTotalSeconds, userSettings.isStopwatchDisabled, reset]);

  useEffect(
    () => setPersistedStopwatchTotalSeconds(totalSeconds),
    [totalSeconds, setPersistedStopwatchTotalSeconds],
  );
  // #endregion

  // #region Stopwatch Visibility + Disabled State
  const isStopwatchRunningRef = useRef(isStopwatchRunning);
  const isStopwatchDisabledRef = useRef(userSettings.isStopwatchDisabled);

  useEffect(() => {
    isStopwatchRunningRef.current = isStopwatchRunning;
  }, [isStopwatchRunning]);

  useEffect(() => {
    isStopwatchDisabledRef.current = userSettings.isStopwatchDisabled;
  }, [userSettings.isStopwatchDisabled]);

  const wasStopwatchRunningBeforePageWasHiddenRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasStopwatchRunningBeforePageWasHiddenRef.current =
          isStopwatchRunningRef.current;

        if (isStopwatchRunningRef.current) pauseStopwatch();

        return;
      }

      const shouldResumeStopwatch =
        wasStopwatchRunningBeforePageWasHiddenRef.current &&
        !isStopwatchDisabledRef.current;

      if (shouldResumeStopwatch) start();

      wasStopwatchRunningBeforePageWasHiddenRef.current = false;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pauseStopwatch, start]);
  // #endregion

  // #region Context Values + Actions
  const formattedStopwatchTime = useMemo(() => {
    const formattedMinutes = getFormattedStopwatchMinutes(
      hours,
      minutes,
      totalSeconds,
    );
    const formattedSeconds = String(seconds).padStart(2, "0");

    return `${formattedMinutes}:${formattedSeconds}`;
  }, [hours, minutes, seconds, totalSeconds]);

  const pauseStopwatchAndDisable = useCallback(() => {
    pauseStopwatch();
    setUserSettings((currentUserSettings) => ({
      ...currentUserSettings,
      isStopwatchDisabled: true,
    }));
  }, [pauseStopwatch, setUserSettings]);

  const resetStopwatch = useCallback(() => {
    reset(getOffsetTimestampFromTotalSeconds(0), true);
    setPersistedStopwatchTotalSeconds(0);
  }, [reset, setPersistedStopwatchTotalSeconds]);

  const resumeStopwatchAndEnable = useCallback(() => {
    start();
    setUserSettings((currentUserSettings) => ({
      ...currentUserSettings,
      isStopwatchDisabled: false,
    }));
  }, [setUserSettings, start]);

  const startStopwatch = useCallback(() => start(), [start]);

  const startStopwatchIfEnabled = useCallback(() => {
    if (!userSettings.isStopwatchDisabled) start();
  }, [userSettings.isStopwatchDisabled, start]);

  const sudokuStopwatchValue = useMemo(
    () => ({
      formattedStopwatchTime,
      isStopwatchRunning,
      pauseStopwatch,
      pauseStopwatchAndDisable,
      resetStopwatch,
      resumeStopwatchAndEnable,
      startStopwatch,
      startStopwatchIfEnabled,
    }),
    [
      formattedStopwatchTime,
      isStopwatchRunning,
      pauseStopwatch,
      pauseStopwatchAndDisable,
      resetStopwatch,
      resumeStopwatchAndEnable,
      startStopwatch,
      startStopwatchIfEnabled,
    ],
  );
  // #endregion

  return (
    <SudokuStopwatchContext.Provider value={sudokuStopwatchValue}>
      {children}
    </SudokuStopwatchContext.Provider>
  );
};
// #endregion

// #region Hook
export const useSudokuStopwatch = () => {
  const sudokuStopwatchContext = useContext(SudokuStopwatchContext);

  if (!sudokuStopwatchContext)
    throw Error(
      "useSudokuStopwatch must be used inside SudokuStopwatchProvider",
    );

  return sudokuStopwatchContext;
};
// #endregion
