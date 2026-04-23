import { useMutation, useQuery } from 'convex/react';
import { USER_SETTINGS } from '../utils/convexRefs';
import {
  DEFAULT_GLOBAL_USER_SETTINGS,
  type GlobalUserSettings,
  type GlobalUserSettingsUpdate,
  type StoredGlobalUserSettings,
} from '../types/globalUserSettings';

export function useGlobalSettings() {
  const dbSettings = useQuery(USER_SETTINGS.getSettings);
  const storedSettings = useQuery(USER_SETTINGS.getStoredSettings);
  const updateSettingsMutation = useMutation(USER_SETTINGS.updateSettings);

  const settings: GlobalUserSettings = {
    ...DEFAULT_GLOBAL_USER_SETTINGS,
    ...(dbSettings || {}),
  };

  const updateSettings = async (updates: GlobalUserSettingsUpdate) => {
    await updateSettingsMutation(updates);
  };

  return {
    settings,
    storedSettings,
    updateSettings,
    isLoading: dbSettings === undefined,
  };
}
