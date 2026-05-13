import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { DRail } from './ui/DRail';
import { DesignChip } from './ui/DesignChip';

type WeakArea = {
  type: string;
  score: number;
  label: string;
  subLabel: string;
};

type UpcomingExam = {
  round: number;
  date?: number;
  title: string;
} | null;

interface Props {
  upcomingExam: UpcomingExam;
  weakAreas: WeakArea[];
}

const TYPE_ROUTES: Record<string, string> = {
  READING: '/topik',
  LISTENING: '/topik',
  WRITING: '/topik',
};

const TYPE_TONES: Record<string, 'pink' | 'mint' | 'butter' | 'lilac' | 'sky'> = {
  READING: 'sky',
  LISTENING: 'mint',
  WRITING: 'butter',
};

export function DesktopTopikCountdownCard({ upcomingExam, weakAreas }: Props) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  
  // Use state to track current time, updated via effect
  const [now, setNow] = useState(() => Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const daysLeft = useMemo(() => {
    if (!upcomingExam?.date) return null;
    const diffMs = upcomingExam.date - now;
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  }, [upcomingExam?.date, now]);

  const shownWeak = weakAreas.slice(0, 2);

  return (
    <DRail
      kanji="試"
      title={t('dashboard.desktop.topikCountdown.title', { defaultValue: 'TOPIK 备考' })}
      action={`${t('dashboard.desktop.topikCountdown.lobby', { defaultValue: '入口' })} →`}
      onActionClick={() => navigate('/topik')}
      pad={14}
    >
      {upcomingExam ? (
        <div className="mb-3 flex items-baseline gap-2">
          {daysLeft !== null ? (
            <>
              <span className="text-[28px] font-extrabold tracking-[-1px] text-k-ink">
                {daysLeft}
              </span>
              <span className="text-[11px] font-bold text-k-sub">
                {t('dashboard.desktop.topikCountdown.daysLeft', { defaultValue: '天后' })}
              </span>
            </>
          ) : null}
          <span className="ml-auto truncate text-[10px] font-bold text-k-sub">
            {upcomingExam.title}
          </span>
        </div>
      ) : (
        <div className="mb-3 rounded-[10px] bg-[rgba(31,27,23,0.04)] px-3 py-2 text-[11px] font-semibold text-k-sub">
          {t('dashboard.desktop.topikCountdown.noUpcoming', { defaultValue: '暂无报名的考试' })}
        </div>
      )}

      {shownWeak.length > 0 ? (
        <>
          <div className="mb-1.5 text-[10px] font-extrabold tracking-[1px] text-k-sub">
            {t('dashboard.desktop.topikCountdown.weakAreasLabel', { defaultValue: '薄弱项' })}
          </div>
          {shownWeak.map((w, i) => (
            <button
              key={`${w.type}-${i}`}
              type="button"
              onClick={() => navigate(TYPE_ROUTES[w.type] || '/topik')}
              className="flex w-full items-center gap-2 py-[7px] text-left"
              style={{
                borderBottom: i < shownWeak.length - 1 ? '1px solid var(--color-k-line)' : 'none',
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-extrabold text-k-ink">{w.label}</div>
                <div className="truncate text-[10px] font-semibold text-k-sub">{w.subLabel}</div>
              </div>
              <DesignChip tone={TYPE_TONES[w.type] || 'muted'} size="sm">
                {w.score}
              </DesignChip>
            </button>
          ))}
        </>
      ) : (
        <div className="py-2 text-center text-[11px] font-semibold text-k-sub opacity-60">
          {t('dashboard.desktop.topikCountdown.noWeakAreas', {
            defaultValue: '完成一次模拟题即可看到薄弱项',
          })}
        </div>
      )}
    </DRail>
  );
}

export default DesktopTopikCountdownCard;
