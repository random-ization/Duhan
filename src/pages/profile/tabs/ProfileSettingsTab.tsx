import React, { useEffect, useState } from 'react';
import { LanguageSwitcher } from '../../../components/common/LanguageSwitcher';
import { Bell, ChevronDown, Globe } from 'lucide-react';
import type { ProfileLabels } from '../types';
import { useGlobalSettings } from '../../../hooks/useGlobalSettings';
import {
  AUDIO_REPEAT_COUNT_VALUES,
  AUDIO_SPEED_VALUES,
  DICTATION_GAP_SECOND_VALUES,
  DICTATION_PLAY_COUNT_VALUES,
  type AudioSpeed,
} from '../../../types/globalUserSettings';
import { getLanguageLabel } from '../../../utils/languageUtils';
import type { Language } from '../../../types';
import { Button, Slider, Switch } from '../../../components/ui';

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
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <div className="grid h-11 w-11 place-items-center rounded-[1.2rem] border border-white/10 bg-emerald-500/12 text-emerald-600 shadow-xl dark:text-emerald-200">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-[0.16em]">
              {settingsCenter?.reviewSectionTitle || 'Review & Flashcards'}
            </h2>
            <p className="text-sm font-semibold text-muted-foreground">
              {settingsCenter?.reviewSectionDescription ||
                'Keep your review controls in sync across profile, flashcards, and quick settings.'}
            </p>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <label className="flex items-center justify-between rounded-[1.75rem] border border-border/80 bg-muted/35 p-5">
            <div className="pr-4">
              <p className="font-black text-foreground">
                {vocabLabels?.autoPlay || 'Auto play pronunciation'}
              </p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                {settingsCenter?.flashcardAutoPlayDescription ||
                  'Play Korean audio automatically when a new flashcard appears.'}
              </p>
            </div>
            <Switch
              checked={settings.flashcardAutoTTS}
              onCheckedChange={checked => {
                void updateSettings({ flashcardAutoTTS: checked });
              }}
              className="h-6 w-11 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-background border border-border"
            />
          </label>

          <div className="rounded-[1.75rem] border border-border/80 bg-muted/35 p-5">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-muted-foreground">
              {vocabLabels?.cardFront || 'Default Card Front'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: 'KOREAN' as const,
                  title: settingsCenter?.flashcardKoreanFirstTitle || vocabLabels?.koreanFront || 'Korean first',
                  description:
                    settingsCenter?.flashcardKoreanFirstDescription ||
                    'Show the Korean term on the front side.',
                },
                {
                  value: 'NATIVE' as const,
                  title: settingsCenter?.flashcardMeaningFirstTitle || vocabLabels?.meaningFront || 'Meaning first',
                  description:
                    settingsCenter?.flashcardMeaningFirstDescription ||
                    'Lead with the translation or native meaning.',
                },
              ].map(option => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    void updateSettings({ flashcardFront: option.value });
                  }}
                  className={`${pillClass} flex-col items-start px-4 py-4 text-left ${
                    settings.flashcardFront === option.value
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-sm dark:border-emerald-300/35 dark:bg-emerald-400/12 dark:text-emerald-100'
                      : 'border-border bg-card text-foreground hover:border-emerald-200 dark:hover:border-emerald-300/25'
                  }`}
                >
                  <span className="text-base">{option.title}</span>
                  <span className="mt-1 text-xs font-bold text-muted-foreground">
                    {option.description}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/80 bg-muted/35 p-5">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-muted-foreground">
              {vocabLabels?.ratingMode || 'Rating Mode'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: 'PASS_FAIL' as const,
                  title: vocabLabels?.passFail || 'Pass / Fail',
                  description:
                    settingsCenter?.passFailModeDescription ||
                    vocabLabels?.passFailDesc ||
                    'Fast two-button grading for focused sessions.',
                },
                {
                  value: 'FOUR_BUTTONS' as const,
                  title: vocabLabels?.fourButtons || '4 Buttons',
                  description:
                    settingsCenter?.fourButtonsModeDescription ||
                    vocabLabels?.fourButtonsDesc ||
                    'Again, Hard, Good, Easy with finer control.',
                },
              ].map(option => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    void updateSettings({ flashcardRatingMode: option.value });
                  }}
                  className={`${pillClass} flex-col items-start px-4 py-4 text-left ${
                    settings.flashcardRatingMode === option.value
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-sm dark:border-emerald-300/35 dark:bg-emerald-400/12 dark:text-emerald-100'
                      : 'border-border bg-card text-foreground hover:border-emerald-200 dark:hover:border-emerald-300/25'
                  }`}
                >
                  <span className="text-base">{option.title}</span>
                  <span className="mt-1 text-xs font-bold text-muted-foreground">
                    {option.description}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <div className="grid h-11 w-11 place-items-center rounded-[1.2rem] border border-white/10 bg-amber-500/12 text-amber-700 shadow-xl dark:text-amber-200">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-[0.16em]">
              {settingsCenter?.audioSectionTitle || 'Audio & Dictation'}
            </h2>
            <p className="text-sm font-semibold text-muted-foreground">
              {settingsCenter?.audioSectionDescription ||
                'One source of truth for listening loops, playback speed, and dictation pacing.'}
            </p>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-[1.75rem] border border-border/80 bg-muted/35 p-5">
              <div className="pr-4">
                <p className="font-black text-foreground">
                  {vocabLabels?.playMeaning || 'Play meaning'}
                </p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {settingsCenter?.playMeaningDescription ||
                    'Read the translated meaning after the Korean word.'}
                </p>
              </div>
              <Switch
                checked={settings.listenPlayMeaning}
                onCheckedChange={checked => {
                  void updateSettings({ listenPlayMeaning: checked });
                }}
                className="h-6 w-11 data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-background border border-border"
              />
            </label>

            <label className="flex items-center justify-between rounded-[1.75rem] border border-border/80 bg-muted/35 p-5">
              <div className="pr-4">
                <p className="font-black text-foreground">
                  {vocabLabels?.playExampleTranslation || 'Play example translation'}
                </p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {settingsCenter?.playExampleTranslationDescription ||
                    'Include translated examples in listen mode playback.'}
                </p>
              </div>
              <Switch
                checked={settings.listenPlayExampleTranslation}
                onCheckedChange={checked => {
                  void updateSettings({ listenPlayExampleTranslation: checked });
                }}
                className="h-6 w-11 data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-background border border-border"
              />
            </label>
          </div>

          <div className="rounded-[1.75rem] border border-border/80 bg-muted/35 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Repeat className="h-4 w-4 text-amber-700 dark:text-amber-200" />
              <p className="text-sm font-black uppercase tracking-[0.14em] text-muted-foreground">
                {vocabLabels?.repeatCount || 'Repeat count'}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {AUDIO_REPEAT_COUNT_VALUES.map(option => (
                <Button
                  key={String(option)}
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    void updateSettings({ audioRepeatCount: option });
                  }}
                  className={`${pillClass} py-3 ${
                    settings.audioRepeatCount === option
                      ? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-300/35 dark:bg-amber-400/12 dark:text-amber-100'
                      : 'border-border bg-card text-foreground hover:border-amber-200 dark:hover:border-amber-300/25'
                  }`}
                >
                  {option === 'INFINITE' ? '∞' : `${option}x`}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/80 bg-muted/35 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-amber-700 dark:text-amber-200" />
              <p className="text-sm font-black uppercase tracking-[0.14em] text-muted-foreground">
                {vocabLabels?.speed || 'Speed'}
              </p>
            </div>
            <Slider
              min={0.8}
              max={1.4}
              step={0.2}
              value={settings.audioSpeed}
              onChange={event => {
                const nextValue = Number(event.target.value);
                void updateSettings({ audioSpeed: getNearestAudioSpeed(nextValue) });
              }}
              className="w-full !h-2 bg-muted rounded-full accent-amber-500"
            />
            <div className="mt-4 grid grid-cols-4 gap-2">
              {AUDIO_SPEED_VALUES.map(option => (
                <Button
                  key={option}
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    void updateSettings({ audioSpeed: option });
                  }}
                  className={`${pillClass} py-3 ${
                    settings.audioSpeed === option
                      ? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-300/35 dark:bg-amber-400/12 dark:text-amber-100'
                      : 'border-border bg-card text-foreground hover:border-amber-200 dark:hover:border-amber-300/25'
                  }`}
                >
                  {option.toFixed(1)}x
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/80 bg-muted/35 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Mic className="h-4 w-4 text-rose-600 dark:text-rose-200" />
              <p className="text-sm font-black uppercase tracking-[0.14em] text-muted-foreground">
                {settingsCenter?.dictationAdvancedTitle || 'Dictation Advanced'}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-black text-foreground">
                  {vocabLabels?.repeatCount || 'Repetitions'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DICTATION_PLAY_COUNT_VALUES.map(option => (
                    <Button
                      key={option}
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={() => {
                        void updateSettings({ dictationPlayCount: option });
                      }}
                      className={`${pillClass} py-3 ${
                        settings.dictationPlayCount === option
                          ? 'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-300/35 dark:bg-rose-400/12 dark:text-rose-100'
                          : 'border-border bg-card text-foreground hover:border-rose-200 dark:hover:border-rose-300/25'
                      }`}
                    >
                      {option}x
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-black text-foreground">
                  {vocabLabels?.playGap || 'Repeat interval'}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {DICTATION_GAP_SECOND_VALUES.map(option => (
                    <Button
                      key={option}
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={() => {
                        void updateSettings({ dictationGapSeconds: option });
                      }}
                      className={`${pillClass} py-3 ${
                        settings.dictationGapSeconds === option
                          ? 'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-300/35 dark:bg-rose-400/12 dark:text-rose-100'
                          : 'border-border bg-card text-foreground hover:border-rose-200 dark:hover:border-rose-300/25'
                      }`}
                    >
                      {option}s
                    </Button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between rounded-[1.5rem] border border-border/80 bg-card/90 p-4">
                <div className="pr-4">
                  <p className="font-black text-foreground">
                    {vocabLabels?.autoNext || 'Auto next'}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    {settingsCenter?.dictationAutoNextDescription ||
                      'Automatically move forward after each dictation item finishes.'}
                  </p>
                </div>
                <Switch
                  checked={settings.dictationAutoNext}
                  onCheckedChange={checked => {
                    void updateSettings({ dictationAutoNext: checked });
                  }}
                  className="h-6 w-11 data-[state=checked]:bg-rose-500 data-[state=unchecked]:bg-background border border-border"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 rounded-[1.75rem] border border-border/80 bg-card/70 px-4 py-3 text-sm font-semibold text-muted-foreground shadow-sm">
        <Settings2 className="h-4 w-4" />
        {settingsCenter?.globalSyncNotice ||
          'Changes apply globally across Profile, flashcards, listen mode, and dictation quick settings.'}
      </div>
    </div>
  );
};
