import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { TOPIK } from '../../utils/convexRefs';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import type { TopikExamDto } from '../../../convex/topik';

function DRail({ kanji, title, action, children, pad = 14 }: { kanji?: string; title: string; action?: string; children: React.ReactNode; pad?: number }) {
  return (
    <div className="mb-[22px]">
      <div className="mb-2.5 flex items-baseline px-0.5">
        {kanji && (
          <span className="mr-1.5 font-k-serif text-[14px] font-medium text-k-crimson">
            {kanji}
          </span>
        )}
        <span className="text-[11px] font-extrabold tracking-[0.4px] text-k-ink">
          {title}
        </span>
        {action && (
          <span className="ml-auto cursor-pointer text-[10px] font-bold text-k-sub hover:text-k-ink">
            {action}
          </span>
        )}
      </div>
      <div className="rounded-[14px] bg-k-card shadow-k-sh-sm" style={{ padding: pad }}>
        {children}
      </div>
    </div>
  );
}

export default function DesktopTopikWritingPage() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  
  // Get writing prompt list
  const examsResult = useQuery(TOPIK.getExams, { type: 'WRITING', limit: 1 });
  const exams = Array.isArray(examsResult) ? examsResult : [];
  const activeExam = exams[0];
  const isLoading = examsResult === undefined;

  const wordCount = text.length;

  const content = (
    <div className="grid grid-cols-[1fr_320px] gap-[18px]">
      <div>
        <DesktopCard pad={22} className="mb-[14px]">
          {activeExam ? (
            <>
              <DesignChip tone="crimson" size="sm">
                {t('coursesOverview.desktop.topikWriting.roundLabel', { count: activeExam.round })} · {activeExam.title}
              </DesignChip>
              <div className="mt-3.5 font-k-serif text-[18px] font-medium leading-[1.6] text-k-ink">
                {activeExam.description || t('coursesOverview.desktop.topikWriting.defaultDescription')}
              </div>
            </>
          ) : isLoading ? (
            <div className="py-4 text-center text-k-sub font-bold">{t('coursesOverview.desktop.topikWriting.fetchingExam')}</div>
          ) : (
            <div className="py-4 text-center text-k-sub font-bold">{t('coursesOverview.desktop.topikWriting.noChallenge')}</div>
          )}
        </DesktopCard>

        <DesktopCard pad={0} className="min-h-[380px] flex flex-col">
          <div
            className="flex items-center gap-2.5 border-b px-[20px] py-[14px]"
            style={{ borderColor: 'var(--color-k-line)' }}
          >
            <span className="text-[13px] font-extrabold text-k-ink">{t('coursesOverview.desktop.topikWriting.answerArea')}</span>
            <DesignChip tone="muted" size="sm">{t('coursesOverview.desktop.topikWriting.wordCount', { count: wordCount })}</DesignChip>
            <div className="flex-1" />
            <DesignChip tone="butter" size="sm">⏱ 00:00 / 50:00</DesignChip>
          </div>
          <textarea
            className="flex-1 p-6 font-k-serif text-[16px] font-medium leading-[2] tracking-[0.1px] text-k-ink border-none outline-none resize-none bg-transparent"
            placeholder={t('coursesOverview.desktop.topikWriting.placeholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </DesktopCard>

        <div className="mt-3.5 flex gap-2.5">
          <button
            className="cursor-pointer rounded-[11px] border px-[16px] py-[11px] text-[12px] font-bold transition-transform hover:-translate-y-0.5"
            style={{ borderColor: 'var(--color-k-line2)', background: 'var(--color-k-card)' }}
          >
            📝 {t('coursesOverview.desktop.topikWriting.template')}
          </button>
          <button
            className="cursor-pointer rounded-[11px] border px-[16px] py-[11px] text-[12px] font-bold transition-transform hover:-translate-y-0.5"
            style={{ borderColor: 'var(--color-k-line2)', background: 'var(--color-k-card)' }}
          >
            💾 {t('coursesOverview.desktop.topikWriting.save')}
          </button>
          <div className="flex-1" />
          <button
            disabled={!activeExam || wordCount < 10}
            className="cursor-pointer rounded-[11px] border-none px-[22px] py-[11px] text-[13px] font-extrabold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-k-crimson)', color: 'var(--color-k-card)' }}
          >
            {t('coursesOverview.desktop.topikWriting.submit')} →
          </button>
        </div>
      </div>

      {/* AI feedback rail */}
      <div>
        <DRail kanji="評" title={t('coursesOverview.desktop.topikWriting.aiFeedback')} pad={16}>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {[
              { l: t('coursesOverview.desktop.topikWriting.contentScore'), s: 0 },
              { l: t('coursesOverview.desktop.topikWriting.grammarScore'), s: 0 },
              { l: t('coursesOverview.desktop.topikWriting.vocabScore'), s: 0 },
              { l: t('coursesOverview.desktop.topikWriting.structureScore'), s: 0 },
            ].map((m, i) => (
              <div key={i} className="rounded-[10px] bg-k-bg2 p-2.5 text-center">
                <div className="text-[10px] font-extrabold text-k-sub">{m.l}</div>
                <div className="mt-1 font-k-serif text-[18px] font-bold text-k-ink">{m.s || '-'}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] leading-[1.6] text-k-sub font-medium">
            {t('coursesOverview.desktop.topikWriting.aiFeedbackNote')}
          </div>
        </DRail>

        <DRail kanji="考" title={t('coursesOverview.desktop.topikWriting.gradingCriteria')} pad={16}>
          <ul className="m-0 space-y-2 p-0 text-[11px] font-bold text-k-ink">
            <li className="flex gap-2">
              <span className="text-k-crimson">01</span>
              <span>{t('coursesOverview.desktop.topikWriting.criteria1')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-k-crimson">02</span>
              <span>{t('coursesOverview.desktop.topikWriting.criteria2')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-k-crimson">03</span>
              <span>{t('coursesOverview.desktop.topikWriting.criteria3')}</span>
            </li>
          </ul>
        </DRail>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-4 text-[12px] font-bold text-k-sub">
        TOPIK WRITING
      </div>
      {content}
    </div>
  );
}
