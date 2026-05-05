import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useContext,
  useMemo,
} from "react";
import useLocalStorageState from "use-local-storage-state";

import {
  puzzleDifficultyLevels,
  USER_SETTINGS_LOCAL_STORAGE_KEY,
} from "@/lib/pages/home/utils/constants";
import { type PuzzleDifficultyLevel } from "@/lib/pages/home/utils/types";

// #region Context
export type UserSettings = {
  isConflictCheckerEnabled: boolean;
  isDashedGridEnabled: boolean;
  isStopwatchDisabled: boolean;
  isFlipKeypadEnabled: boolean;
  isHideStopwatchEnabled: boolean;
  isShowRowAndColumnLabelsEnabled: boolean;
  isShowSeenCellsEnabled: boolean;
  isStrictHighlightsEnabled: boolean;
  preferredDifficultyLevel: PuzzleDifficultyLevel;
};

type UserSettingsContextValue = {
  userSettings: UserSettings;
  setUserSettings: Dispatch<SetStateAction<UserSettings>>;
};

export const defaultUserSettings: UserSettings = {
  isConflictCheckerEnabled: false,
  isDashedGridEnabled: false,
  isStopwatchDisabled: false,
  isFlipKeypadEnabled: false,
  isHideStopwatchEnabled: false,
  isShowRowAndColumnLabelsEnabled: false,
  isShowSeenCellsEnabled: false,
  isStrictHighlightsEnabled: false,
  preferredDifficultyLevel: "Standard",
};

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(
  undefined,
);
// #endregion

// #region Provider
export const UserSettingsProvider = ({ children }: PropsWithChildren) => {
  const [userSettings, setUserSettings] = useLocalStorageState<UserSettings>(
    USER_SETTINGS_LOCAL_STORAGE_KEY,
    {
      defaultValue: defaultUserSettings,
    },
  );

  const value = useMemo(
    () => ({
      userSettings,
      setUserSettings,
    }),
    [userSettings, setUserSettings],
  );

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
};
// #endregion

// #region Storage Reader
export const getPreferredDifficultyRatingFromStorage = (): number => {
  try {
    const rawStoredValue = window.localStorage.getItem(
      USER_SETTINGS_LOCAL_STORAGE_KEY,
    );

    if (rawStoredValue === null) {
      return 0;
    }

    const parsedStoredValue = JSON.parse(rawStoredValue);

    if (typeof parsedStoredValue !== "object" || parsedStoredValue === null) {
      return 0;
    }

    const storedPreferredDifficultyLevel =
      parsedStoredValue.preferredDifficultyLevel;

    if (!puzzleDifficultyLevels.includes(storedPreferredDifficultyLevel)) {
      return 0;
    }

    return puzzleDifficultyLevels.indexOf(storedPreferredDifficultyLevel);
  } catch {
    return 0;
  }
};
// #endregion

// #region Hook
export const useUserSettings = () => {
  const context = useContext(UserSettingsContext);

  if (!context) {
    throw new Error("useUserSettings must be used inside UserSettingsProvider");
  }

  return context;
};
// #endregion
