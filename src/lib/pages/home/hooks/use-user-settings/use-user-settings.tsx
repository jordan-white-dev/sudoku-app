import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useContext,
  useMemo,
} from "react";
import useSessionStorageState from "use-session-storage-state";

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
};

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(
  undefined,
);
// #endregion

// #region Provider
export const UserSettingsProvider = ({ children }: PropsWithChildren) => {
  const [userSettings, setUserSettings] = useSessionStorageState<UserSettings>(
    "user-settings",
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

// #region Hook
export const useUserSettings = () => {
  const context = useContext(UserSettingsContext);

  if (!context)
    throw Error("useUserSettings must be used inside UserSettingsProvider");

  return context;
};
// #endregion
