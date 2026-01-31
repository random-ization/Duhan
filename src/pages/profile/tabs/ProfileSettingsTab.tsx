import React from 'react';
import { LanguageSwitcher } from '../../../components/common/LanguageSwitcher';

interface ProfileSettingsTabProps {
  labels: any;
}

export const ProfileSettingsTab: React.FC<ProfileSettingsTabProps> = ({ labels }) => {
  return (
    <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">
        {labels.profile?.settingsTitle || 'General Settings'}
      </h3>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {labels.profile?.displayLanguage || 'Display Language'}
          </label>
          <div className="p-1">
            <div className="max-w-xs">
              <LanguageSwitcher />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {labels.profile?.languageDesc ||
                'Choose the language for the interface and learning materials.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
