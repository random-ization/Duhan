import React from 'react';
import { LanguageSwitcher } from '../../../components/common/LanguageSwitcher';
import { ChevronDown, Globe } from 'lucide-react';
import type { ProfileLabels } from '../types';

interface ProfileSettingsTabProps {
  labels: ProfileLabels;
}

export const ProfileSettingsTab: React.FC<ProfileSettingsTabProps> = ({ labels }) => {
  return (
    <div className="max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <details className="group bg-card rounded-2xl border border-border shadow-sm overflow-hidden" open>
        <summary className="font-bold text-foreground p-4 cursor-pointer list-none flex justify-between items-center transition-colors">
          {labels.profile?.settingsTitle || 'General Settings'}
          <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180 text-muted-foreground" />
        </summary>
        <div className="p-4 pt-1 border-t border-border/50">
          <div className="bg-muted/40 rounded-xl p-4 border border-border mt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-400/15 rounded-lg shrink-0">
                <Globe size={20} className="text-indigo-600 dark:text-indigo-200" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-foreground mb-1">
                  {labels.profile?.displayLanguage || 'Display Language'}
                </label>
                <p className="text-sm text-muted-foreground mb-4">
                  {labels.profile?.languageDesc ||
                    'Choose the language for the interface and learning materials.'}
                </p>
                <div className="max-w-xs">
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
};
