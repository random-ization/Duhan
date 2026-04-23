import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildLocalizedPath, isValidLanguage } from '../LanguageRouter';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';
import { getLegacySettingsMigrationPatch } from '../../utils/globalUserSettingsMigration';

const migratedUserIds = new Set<string>();

const hasMigrationUpdates = (value: Record<string, unknown>): boolean => Object.keys(value).length > 0;

export function ProtectedUserSettingsSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, language, setLanguage } = useAuth();
  const { settings, storedSettings, updateSettings, isLoading } = useGlobalSettings();

  useEffect(() => {
    if (!user?.id) return;
    if (storedSettings === undefined) return;
    if (migratedUserIds.has(user.id)) return;

    const updates = getLegacySettingsMigrationPatch(storedSettings);
    migratedUserIds.add(user.id);

    if (!hasMigrationUpdates(updates)) return;
    void updateSettings(updates);
  }, [storedSettings, updateSettings, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (isLoading) return;
    const nextLanguage = settings.displayLanguage;
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const currentPathLanguage = pathSegments[0];
    const resolvedPathLanguage = currentPathLanguage && isValidLanguage(currentPathLanguage)
      ? currentPathLanguage
      : language;

    if (resolvedPathLanguage !== nextLanguage) {
      setLanguage(nextLanguage);
      navigate(buildLocalizedPath(location.pathname, nextLanguage, location.search, location.hash), {
        replace: true,
      });
      return;
    }

    if (language !== nextLanguage) {
      setLanguage(nextLanguage);
    }
  }, [
    isLoading,
    language,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    setLanguage,
    settings.displayLanguage,
    user?.id,
  ]);

  return null;
}
