import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface StreakRowProps {
  done?: number;
  labels?: readonly string[];
}

function buildWeekdayLabels(language: string): readonly string[] {
  try {
    const formatter = new Intl.DateTimeFormat(language, { weekday: 'narrow' });
    const monday = new Date(Date.UTC(2021, 0, 4)); // 2021-01-04 is a Monday
    return Array.from({ length: 7 }, (_, index) =>
      formatter.format(new Date(monday.getTime() + index * 24 * 60 * 60 * 1000))
    );
  } catch {
    return ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  }
}

export function StreakRow({ done = 0, labels }: StreakRowProps) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const resolvedLabels = useMemo(
    () => (labels && labels.length > 0 ? labels : buildWeekdayLabels(language)),
    [labels, language]
  );
  return (
    <div className="flex gap-[6px]">
      {resolvedLabels.map((d, i) => {
        const isDone = i < done;
        const isLastDone = i === done - 1;
        
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-[6px]">
            <div
              className={`w-full aspect-square rounded-[12px] grid place-items-center text-[13px] font-bold relative ${
                isDone ? 'bg-k-mint text-[#2F5847]' : 'bg-[rgba(31,27,23,0.05)] text-k-sub'
              }`}
            >
              {isDone ? '✓' : ''}
              {isLastDone && (
                <div className="absolute -top-1 -right-1 text-[12px]">🔥</div>
              )}
            </div>
            <div className="text-[10px] text-k-sub font-semibold font-k-sans">
              {d}
            </div>
          </div>
        );
      })}
    </div>
  );
}
