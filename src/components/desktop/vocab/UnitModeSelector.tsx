import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../../hooks/useLocalizedNavigate';
import { HanjaSeal } from '../ui/HanjaSeal';
import type { UnitProgressDto } from '../../../../convex/vocab/vocabTypes';

interface UnitModeSelectorProps {
  courseId: string;
  unitId: number;
  unitProgress: UnitProgressDto;
  onBack: () => void;
}

type ModeId = 'flashcard' | 'learn' | 'test' | 'match';

export function UnitModeSelector({
  courseId,
  unitId,
  unitProgress,
  onBack,
}: UnitModeSelectorProps) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();

  const { totalWords, masteredWords } = unitProgress;
  const hasWords = totalWords > 0;

  const modes: { id: ModeId; icon: string; label: string; tone: string }[] = [
    {
      id: 'flashcard',
      icon: '🎴',
      label: t('coursesOverview.desktop.vocabulary.modes.flashcard', { defaultValue: '闪卡' }),
      tone: 'pink',
    },
    {
      id: 'learn',
      icon: '📖',
      label: t('coursesOverview.desktop.vocabulary.modes.learn', { defaultValue: '学习' }),
      tone: 'lilac',
    },
    {
      id: 'test',
      icon: '📝',
      label: t('coursesOverview.desktop.vocabulary.modes.test', { defaultValue: '考试' }),
      tone: 'mint',
    },
    {
      id: 'match',
      icon: '🧩',
      label: t('coursesOverview.desktop.vocabulary.modes.match', { defaultValue: '拼图' }),
      tone: 'butter',
    },
  ];

  const handleModeClick = (mode: ModeId) => {
    if (!hasWords) return;

    const searchParams = new URLSearchParams();
    searchParams.set('courseId', courseId);
    searchParams.set('mode', mode);
    searchParams.set('unit', String(unitId));
    searchParams.set('category', 'ALL');

    navigate(`/vocab-book/practice?${searchParams.toString()}`);
  };

  return (
    <div>
      {/* Header with back button, unit number, and progress */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-k-line bg-k-card text-k-sub transition-colors hover:border-k-crimson hover:text-k-crimson"
            aria-label={t('common.back', { defaultValue: '返回' })}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <HanjaSeal c="課" size={32} bg="var(--color-k-crimson)" round={9} />
          <div>
            <div className="text-[14px] font-extrabold text-k-ink">
              {t('coursesOverview.desktop.vocabulary.unit', { defaultValue: 'Unit' })} {unitId}
            </div>
            <div className="text-[11px] font-semibold text-k-sub">
              {masteredWords}/{totalWords}
            </div>
          </div>
        </div>
      </div>

      {/* Mode buttons */}
      <div className="grid grid-cols-4 gap-4">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => handleModeClick(m.id)}
            disabled={!hasWords}
            className={`flex flex-col items-center gap-2.5 rounded-2xl border-[1.5px] border-k-line bg-k-card p-4 transition-all ${
              hasWords
                ? 'cursor-pointer hover:scale-[1.02] hover:border-k-crimson hover:shadow-lg active:scale-95'
                : 'cursor-not-allowed opacity-50'
            }`}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                hasWords ? `bg-k-${m.tone}-deep/10` : 'bg-k-bg2'
              }`}
            >
              {m.icon}
            </div>
            <div className="text-[13px] font-extrabold text-k-ink">{m.label}</div>
          </button>
        ))}
      </div>

      {/* Empty unit message */}
      {!hasWords && (
        <div className="mt-4 rounded-xl bg-k-bg2 px-4 py-3 text-center">
          <p className="text-[12px] font-semibold text-k-sub">
            {t('coursesOverview.desktop.vocabulary.emptyUnit', {
              defaultValue: '该单元暂无词汇',
            })}
          </p>
        </div>
      )}
    </div>
  );
}
