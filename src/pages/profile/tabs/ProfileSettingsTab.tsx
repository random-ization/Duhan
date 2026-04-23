import React, { useEffect, useState } from 'react';
import { LanguageSwitcher } from '../../../components/common/LanguageSwitcher';
import { Bell, ChevronDown, Globe } from 'lucide-react';
import type { ProfileLabels } from '../types';

interface ProfileSettingsTabProps {
  labels: ProfileLabels;
}

type NotificationPrefs = {
  dailyReminder: boolean;
  examCountdown: boolean;
  communityActivity: boolean;
};

const NOTIFICATION_PREFS_KEY = 'profile_notification_prefs_v1';

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  dailyReminder: true,
  examCountdown: true,
  communityActivity: false,
};

function parseNotificationPrefs(raw: string | null): NotificationPrefs {
  if (!raw) return DEFAULT_NOTIFICATION_PREFS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return DEFAULT_NOTIFICATION_PREFS;
    }
    const candidate = parsed as Record<string, unknown>;
    return {
      dailyReminder:
        typeof candidate.dailyReminder === 'boolean'
          ? candidate.dailyReminder
          : DEFAULT_NOTIFICATION_PREFS.dailyReminder,
      examCountdown:
        typeof candidate.examCountdown === 'boolean'
          ? candidate.examCountdown
          : DEFAULT_NOTIFICATION_PREFS.examCountdown,
      communityActivity:
        typeof candidate.communityActivity === 'boolean'
          ? candidate.communityActivity
          : DEFAULT_NOTIFICATION_PREFS.communityActivity,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export const ProfileSettingsTab: React.FC<ProfileSettingsTabProps> = ({ labels }) => {
  const getInitialPrefs = (): NotificationPrefs => {
    if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFS;
    const saved = window.localStorage.getItem(NOTIFICATION_PREFS_KEY);
    return parseNotificationPrefs(saved);
  };

  const [prefs, setPrefs] = useState<NotificationPrefs>(getInitialPrefs);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const togglePref = (key: keyof NotificationPrefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const notificationItems: Array<{
    key: keyof NotificationPrefs;
    title: string;
    description: string;
  }> = [
    {
      key: 'dailyReminder',
      title: 'Daily study reminders',
      description: 'Get a reminder when your daily review queue is waiting.',
    },
    {
      key: 'examCountdown',
      title: 'TOPIK countdown',
      description: 'Receive countdown nudges before upcoming TOPIK exams.',
    },
    {
      key: 'communityActivity',
      title: 'Friend activity',
      description: 'Get notified when study friends post new learning activity.',
    },
  ];

  return (
    <div className="max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <details
        className="group bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
        open
      >
        <summary className="font-bold text-foreground p-4 cursor-pointer list-none flex justify-between items-center transition-colors">
          {labels.profile?.settingsTitle || 'General Settings'}
          <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180 text-muted-foreground" />
        </summary>
        <div className="p-4 pt-1 border-t border-border/50">
          <div className="bg-muted/40 rounded-xl p-4 border border-border mt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-400/15 rounded-lg shrink-0">
                <Bell size={20} className="text-amber-600 dark:text-amber-200" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-foreground mb-1">
                  Notifications
                </label>
                <p className="text-sm text-muted-foreground mb-4">
                  Control study reminders and progress alerts.
                </p>
                <div className="space-y-2">
                  {notificationItems.map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => togglePref(item.key)}
                      className="w-full rounded-lg border border-border bg-background/70 px-3 py-2 text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">{item.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </div>
                        </div>
                        <span
                          className={`inline-flex h-6 min-w-[44px] items-center rounded-full border px-2 text-[11px] font-bold ${
                            prefs[item.key]
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                              : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300'
                          }`}
                        >
                          {prefs[item.key] ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
