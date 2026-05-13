import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { USER_SETTINGS } from '../utils/convexRefs';
import {
  DEFAULT_GLOBAL_USER_SETTINGS,
  type GlobalUserSettings,
  type GlobalUserSettingsUpdate,
} from '../types/globalUserSettings';
import {
  GlobalSettingsContext,
  type GlobalSettingsContextValue,
} from './globalSettingsContext';

export function GlobalSettingsProvider({ children }: { children: ReactNode }) {
  const dbSettings = useQuery(USER_SETTINGS.getSettings);
  const storedSettings = useQuery(USER_SETTINGS.getStoredSettings);
  const updateSettingsMutation = useMutation(USER_SETTINGS.updateSettings);

  const value = useMemo<GlobalSettingsContextValue>(
    () => ({
      settings: {
        ...DEFAULT_GLOBAL_USER_SETTINGS,
        ...(dbSettings || {}),
      } as GlobalUserSettings,
      storedSettings,
      updateSettings: async (updates: GlobalUserSettingsUpdate) => {
        await updateSettingsMutation(updates);
      },
      isLoading: dbSettings === undefined,
    }),
    [dbSettings, storedSettings, updateSettingsMutation]
  );

  return <GlobalSettingsContext.Provider value={value}>{children}</GlobalSettingsContext.Provider>;
}
