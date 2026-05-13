import { createContext } from 'react';

import {
  DEFAULT_GLOBAL_USER_SETTINGS,
  type GlobalUserSettings,
  type GlobalUserSettingsUpdate,
} from '../types/globalUserSettings';

export type GlobalSettingsContextValue = {
  settings: GlobalUserSettings;
  storedSettings: Partial<GlobalUserSettings> | null | undefined;
  updateSettings: (updates: GlobalUserSettingsUpdate) => Promise<void>;
  isLoading: boolean;
};

const noopUpdateSettings = async (_updates: GlobalUserSettingsUpdate) => {};

// Public routes render outside the lazy Convex provider tree. They still need
// a stable settings shape for route/language fallbacks, but must not touch
// Convex hooks or pull the SDK into the public entry chunk.
export const GlobalSettingsContext = createContext<GlobalSettingsContextValue>({
  settings: DEFAULT_GLOBAL_USER_SETTINGS,
  storedSettings: undefined,
  updateSettings: noopUpdateSettings,
  isLoading: false,
});
