import React, { useMemo } from 'react';
import { ChevronRight, Clock3, History, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type ExamAttempt } from '../../../types';
import { KT } from '../ksoft/ksoft';
import { MobileImmersiveHeader } from '../MobileImmersiveHeader';

interface MobileExamHistoryProps {
  history: ExamAttempt[];
  onBack: () => void;
  onReview: (attempt: ExamAttempt) => void;
  onDelete?: (id: string) => void;
}

export const MobileExamHistory: React.FC<MobileExamHistoryProps> = ({
  history,
  onBack,
  onReview,
  onDelete,
}) => {
  const { t } = useTranslation();

  const sortedHistory = useMemo(
    () => [...history].sort((left, right) => right.timestamp - left.timestamp),
    [history]
  );

  return (
    <div
      className="flex min-h-[100dvh] flex-col"
      style={{
        background: `radial-gradient(ellipse at 20% 0%, ${KT.bg2} 0%, ${KT.bg} 62%)`,
        color: KT.ink,
        fontFamily: KT.font,
      }}
    >
      <MobileImmersiveHeader
        title={t('dashboard.topik.examHistory', { defaultValue: 'Exam History' })}
        subtitle={t('topikLobby.viewAllHistory', { defaultValue: 'View all history' })}
        eyebrow={t('nav.topik', { defaultValue: 'TOPIK' })}
        onBack={onBack}
        backLabel={t('common.back', { defaultValue: 'Back' })}
        status={
          <span
            className="rounded-2xl border px-3 py-2 text-xs font-black shadow-sm"
            style={{ background: KT.card, borderColor: KT.line, color: KT.ink }}
          >
            {sortedHistory.length}
          </span>
        }
        className="sticky top-0 z-20"
      />

      <div className="flex-1 overflow-y-auto px-5 pb-mobile-safe pt-4">
        {sortedHistory.length === 0 ? (
          <div
            className="rounded-[22px] border p-6 text-center"
            style={{ background: KT.card, borderColor: KT.line, boxShadow: KT.shSm }}
          >
            <History className="mx-auto mb-3 h-7 w-7" style={{ color: KT.sub }} />
            <div className="text-sm font-bold" style={{ color: KT.sub }}>
              {t('topikExamList.noHistory', { defaultValue: 'No exam history yet' })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedHistory.map(attempt => {
              const maxScore = attempt.maxScore || attempt.totalScore || 100;
              const percent = maxScore > 0 ? Math.round((attempt.score / maxScore) * 100) : 0;
              const dateText = new Date(attempt.timestamp).toLocaleDateString();

              return (
                <div
                  key={attempt.id}
                  className="rounded-[18px] border p-4"
                  style={{ background: KT.card, borderColor: KT.line, boxShadow: KT.shSm }}
                >
                  <button
                    type="button"
                    onClick={() => onReview(attempt)}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: KT.bg2, color: KT.ink }}
                    >
                      <Clock3 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold" style={{ color: KT.ink }}>
                        {attempt.examTitle}
                      </div>
                      <div className="mt-1 text-xs font-semibold" style={{ color: KT.sub }}>
                        {dateText}
                      </div>
                      <div className="mt-2 text-xs font-bold" style={{ color: KT.sub }}>
                        {attempt.score}/{maxScore} ({percent}%)
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0" style={{ color: KT.sub }} />
                  </button>
                  {onDelete ? (
                    <button
                      type="button"
                      onClick={() => {
                        const confirmed = window.confirm(
                          t('topikExamList.deleteConfirm', {
                            defaultValue: 'Delete this attempt?',
                          })
                        );
                        if (confirmed) onDelete(attempt.id);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      style={{ background: KT.pink, color: KT.crimson }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('common.delete', { defaultValue: 'Delete' })}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
