import { useContext } from 'react';

import { GlobalSettingsContext } from '../contexts/globalSettingsContext';

export function useGlobalSettings() {
  return useContext(GlobalSettingsContext);
}
