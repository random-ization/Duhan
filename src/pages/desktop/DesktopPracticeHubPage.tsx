import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { qRef, mRef } from '../../utils/convexRefs';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import type { Id } from '../../../convex/_generated/dataModel';
import type { TFunction } from 'i18next';

type Mistake = {
  _id: Id<'mistakes'>;
  _creationTime: number;
  userId: Id<'users'>;
  wordId?: Id<'words'>;
  korean: string;
  english: string;
  context?: string;
  reviewCount?: number;
  createdAt: number;
};

type MistakeStats = {
  count: number;
};

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

type ReviewAggregate = {
  dueVocabCount: number;
  dueNoteCount: number;
  savedSentenceCount: number;
  savedGrammarCount: number;
  savedWordCount: number;
};

type RecentAssetItem = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  createdAt: number;
  source?: string;
  sourceRefId?: string;
};

interface DesktopReviewDashboardProps {
  dueNowCount: number;
  learnedCount: number;
  accuracy: number;
  streak: number;
  dueItems: unknown[];
  visibleDueItems: unknown[];
  navigate: (path: string) => void;
  t?: TFunction;
}

export default function DesktopPracticeHubPage({
  dueNowCount,
  learnedCount,
  accuracy,
  streak,
  dueItems: _dueItems,
  visibleDueItems: _visibleDueItems,
  navigate,
  t: passedT,
}: DesktopReviewDashboardProps) {
  const { t: localT } = useTranslation('public');
  const t = passedT || localT;

  // Sentence/Grammar review aggregate
  const reviewAggregate = useQuery(
    qRef<Record<string, never>, ReviewAggregate>('learningAssets:getReviewAggregate')
  );
  const recentAssets = useQuery(
    qRef<{ limit?: number }, RecentAssetItem[]>('learningAssets:getRecentSavedAssets'),
    { limit: 12 }
  );
  const savedSentences = (recentAssets ?? []).filter(a => a.kind === 'sentence');
  const savedGrammar = (recentAssets ?? []).filter(a => a.kind === 'grammar');

  // Fetch the user's mistake list.
  const mistakes = useQuery(qRef<{ limit?: number }, Mistake[]>('user:getMistakes'), {
    limit: 200,
  });

  // 获取错题数量
  const mistakesCount = useQuery(
    qRef<Record<string, never>, MistakeStats>('user:getMistakesCount')
  );

  // 删除单个错题
  const removeMistake = useMutation(
    mRef<{ mistakeId: Id<'mistakes'> }, void>('user:removeMistake')
  );

  // 清空所有错题
  const clearMistakes = useMutation(mRef<Record<string, never>, void>('user:clearMistakes'));

  const handleRemoveMistake = async (mistakeId: Id<'mistakes'>) => {
    try {
      await removeMistake({ mistakeId });
    } catch (error) {
      console.error('Failed to remove mistake:', error);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm(t('coursesOverview.desktop.review.clearConfirm'))) {
      try {
        await clearMistakes();
      } catch (error) {
        console.error('Failed to clear mistakes:', error);
      }
    }
  };

  const dueReviews = mistakesCount?.count ?? 0;

  return (
    <div className="p-6">
      <div className="mb-4 text-[12px] font-bold text-k-sub">
        {t('coursesOverview.desktop.review.title').toUpperCase()}
      </div>

      <div className="mb-[18px] grid grid-cols-4 gap-[14px]">
        {[
          {
            k: '復',
            l: t('reviewPage.dashboard.title', { defaultValue: 'Vocabulary Review' }),
            n: dueNowCount.toString(),
            s: t('reviewPage.stats.due_sub', { defaultValue: 'Due for review' }),
            tone: 'var(--color-k-pink-deep)',
            action: true,
            path: '/review/quiz?mode=full',
            cta: t('common.start', 'Start'),
          },
          {
            k: '學',
            l: t('reviewPage.stats.learned', { defaultValue: 'Words Learned' }),
            n: learnedCount.toString(),
            s: t('reviewPage.stats.learned_sub', { defaultValue: 'Total words mastered' }),
            tone: 'var(--color-k-mint-deep)',
          },
          {
            k: '績',
            l: t('reviewPage.stats.accuracy', { defaultValue: 'Accuracy' }),
            n: `${accuracy}%`,
            s: t('reviewPage.stats.accuracy_sub', { defaultValue: 'Mastery rate' }),
            tone: 'var(--color-k-butter-deep)',
          },
          {
            k: '火',
            l: t('dashboard.desktop.streak', { defaultValue: 'Streak' }),
            n: streak.toString(),
            s: t('dashboard.desktop.consecutiveDays', { defaultValue: 'Days' }),
            tone: 'var(--color-k-crimson)',
          },
        ].map((m, i) => (
          <DesktopCard key={i} pad={22}>
            <div className="mb-[14px] flex items-center justify-between">
              <HanjaSeal c={m.k} size={48} bg={m.tone} round={12} />
              <div className="font-k-serif text-[44px] font-medium leading-none tracking-[-1.2px] text-k-ink">
                {m.n}
              </div>
            </div>
            <div className="text-[16px] font-extrabold text-k-ink">{m.l}</div>
            <div className="mt-1 text-[11px] font-semibold text-k-sub">{m.s}</div>
            {m.action && dueNowCount > 0 && (
              <button
                onClick={() => navigate(m.path || '/review/quiz')}
                className="mt-[14px] cursor-pointer rounded-[11px] border-none bg-k-ink px-[16px] py-[10px] text-[12px] font-extrabold text-k-bg transition-transform hover:-translate-y-1"
              >
                {m.cta || 'Start'} →
              </button>
            )}
          </DesktopCard>
        ))}
      </div>

      <div className="mb-8">
        <div className="mb-4 text-[12px] font-bold text-k-sub">
          {t('coursesOverview.desktop.review.mistakesTitle', {
            defaultValue: 'MISTAKES',
          }).toUpperCase()}
        </div>
        <div className="grid grid-cols-2 gap-[14px]">
          {[
            {
              k: '誤',
              l: t('coursesOverview.desktop.review.totalMistakes'),
              n: (mistakesCount?.count ?? 0).toString(),
              s: t('coursesOverview.desktop.review.pendingReview'),
              tone: 'var(--color-k-crimson)',
            },
            {
              k: '清',
              l: t('coursesOverview.desktop.review.clearMistakes'),
              n: (mistakesCount?.count ?? 0) > 0 ? t('common.clear', 'Clear') : '0',
              s: t('coursesOverview.desktop.review.mainSource'),
              tone: 'var(--color-k-ink)',
              action: true,
            },
          ].map((m, i) => (
            <DesktopCard key={i} pad={22}>
              <div className="mb-[14px] flex items-center justify-between">
                <HanjaSeal c={m.k} size={48} bg={m.tone} round={12} />
                <div className="font-k-serif text-[44px] font-medium leading-none tracking-[-1.2px] text-k-ink">
                  {m.n}
                </div>
              </div>
              <div className="text-[16px] font-extrabold text-k-ink">{m.l}</div>
              <div className="mt-1 text-[11px] font-semibold text-k-sub">{m.s}</div>
              {m.action && (mistakesCount?.count ?? 0) > 0 && (
                <button
                  onClick={handleClearAll}
                  className="mt-[14px] cursor-pointer rounded-[11px] border-none bg-k-ink px-[16px] py-[10px] text-[12px] font-extrabold text-k-bg transition-transform hover:-translate-y-1"
                >
                  {t('coursesOverview.desktop.review.clearMistakes')} →
                </button>
              )}
            </DesktopCard>
          ))}
        </div>
      </div>

      {/* Sentence & Grammar Review Section */}
      <div className="mb-8">
        <div className="mb-4 text-[12px] font-bold text-k-sub">SENTENCE & GRAMMAR REVIEW</div>
        <div className="grid grid-cols-2 gap-[14px]">
          <DesktopCard pad={22}>
            <div className="mb-[14px] flex items-center justify-between">
              <HanjaSeal c="文" size={48} bg="var(--color-k-sky-deep)" round={12} />
              <div className="font-k-serif text-[44px] font-medium leading-none tracking-[-1.2px] text-k-ink">
                {reviewAggregate?.savedSentenceCount ?? 0}
              </div>
            </div>
            <div className="text-[16px] font-extrabold text-k-ink">
              {t('reviewPage.modes.sentence.title', { defaultValue: 'Saved Sentences' })}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-k-sub">
              {t('reviewPage.modes.sentence.desc', {
                defaultValue: 'Review saved sentences in context',
              })}
            </div>
            {(reviewAggregate?.savedSentenceCount ?? 0) > 0 && (
              <button
                onClick={() => navigate('/review/quiz?mode=sentences')}
                className="mt-[14px] cursor-pointer rounded-[11px] border-none bg-k-ink px-[16px] py-[10px] text-[12px] font-extrabold text-k-bg transition-transform hover:-translate-y-1"
              >
                {t('common.start', 'Start')} →
              </button>
            )}
          </DesktopCard>
          <DesktopCard pad={22}>
            <div className="mb-[14px] flex items-center justify-between">
              <HanjaSeal c="法" size={48} bg="var(--color-k-lilac-deep)" round={12} />
              <div className="font-k-serif text-[44px] font-medium leading-none tracking-[-1.2px] text-k-ink">
                {reviewAggregate?.savedGrammarCount ?? 0}
              </div>
            </div>
            <div className="text-[16px] font-extrabold text-k-ink">
              {t('reviewPage.modes.grammar.title', { defaultValue: 'Saved Grammar' })}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-k-sub">
              {t('reviewPage.modes.grammar.desc', {
                defaultValue: 'Practice saved grammar patterns',
              })}
            </div>
            {(reviewAggregate?.savedGrammarCount ?? 0) > 0 && (
              <button
                onClick={() => navigate('/review/quiz?mode=grammar')}
                className="mt-[14px] cursor-pointer rounded-[11px] border-none bg-k-ink px-[16px] py-[10px] text-[12px] font-extrabold text-k-bg transition-transform hover:-translate-y-1"
              >
                {t('common.start', 'Start')} →
              </button>
            )}
          </DesktopCard>
        </div>

        {/* Recent Saved Items Preview */}
        {(savedSentences.length > 0 || savedGrammar.length > 0) && (
          <div className="mt-4 grid grid-cols-2 gap-[14px]">
            {savedSentences.length > 0 && (
              <DesktopCard pad={0}>
                <div
                  className="border-b px-[20px] py-[10px] text-[11px] font-bold text-k-sub"
                  style={{ borderColor: 'var(--color-k-line)' }}
                >
                  最近收藏句子
                </div>
                {savedSentences.slice(0, 4).map((s, i) => (
                  <div
                    key={s.id}
                    className="px-[20px] py-[10px] text-[12px]"
                    style={{
                      borderBottom:
                        i < Math.min(savedSentences.length, 4) - 1
                          ? '1px solid var(--color-k-line)'
                          : 'none',
                    }}
                  >
                    <div className="font-bold text-k-ink truncate">{s.title}</div>
                    {s.subtitle && (
                      <div className="text-[10px] text-k-sub truncate mt-0.5">{s.subtitle}</div>
                    )}
                  </div>
                ))}
              </DesktopCard>
            )}
            {savedGrammar.length > 0 && (
              <DesktopCard pad={0}>
                <div
                  className="border-b px-[20px] py-[10px] text-[11px] font-bold text-k-sub"
                  style={{ borderColor: 'var(--color-k-line)' }}
                >
                  最近收藏语法
                </div>
                {savedGrammar.slice(0, 4).map((g, i) => (
                  <div
                    key={g.id}
                    className="px-[20px] py-[10px] text-[12px]"
                    style={{
                      borderBottom:
                        i < Math.min(savedGrammar.length, 4) - 1
                          ? '1px solid var(--color-k-line)'
                          : 'none',
                    }}
                  >
                    <div className="font-bold text-k-ink truncate">{g.title}</div>
                    {g.subtitle && (
                      <div className="text-[10px] text-k-sub truncate mt-0.5">{g.subtitle}</div>
                    )}
                  </div>
                ))}
              </DesktopCard>
            )}
          </div>
        )}
      </div>

      <DesktopCard pad={0}>
        <div
          className="border-b px-[20px] py-[14px] flex items-center justify-between"
          style={{ borderColor: 'var(--color-k-line)' }}
        >
          <span className="text-[13px] font-extrabold text-k-ink">
            {t('coursesOverview.desktop.review.mistakeList')}
          </span>
          {dueReviews > 0 && (
            <span className="text-[11px] font-bold text-k-sub">
              {t('coursesOverview.desktop.review.totalCount', { count: dueReviews })}
            </span>
          )}
        </div>

        {mistakes === undefined ? (
          <div className="px-[20px] py-12 text-center text-[14px] font-semibold text-k-sub">
            {t('common.loading', 'Loading...')}
          </div>
        ) : mistakes.length === 0 ? (
          <div className="px-[20px] py-12 text-center">
            <div className="text-[18px] font-extrabold text-k-ink">
              {t('coursesOverview.desktop.review.greatJob')}
            </div>
            <div className="mt-2 text-[14px] font-semibold text-k-sub">
              {t('coursesOverview.desktop.review.noMistakes')}
            </div>
          </div>
        ) : (
          mistakes.map((e, i, a) => (
            <div
              key={e._id}
              className="flex items-center gap-[14px] px-[20px] py-[14px] transition-colors hover:bg-k-bg2"
              style={{ borderBottom: i < a.length - 1 ? '1px solid var(--color-k-line)' : 'none' }}
            >
              <HanjaSeal c="誤" size={32} bg="var(--color-k-crimson)" round={8} />
              <div className="flex-1">
                <div className="text-[13px] font-extrabold text-k-ink">{e.korean}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-k-sub">
                  {e.english} {e.context && `· ${e.context}`}
                </div>
              </div>
              <DesignChip tone="muted" size="sm">
                {formatDate(e.createdAt)}
              </DesignChip>
              {e.reviewCount && e.reviewCount > 0 && (
                <DesignChip tone="pink" size="sm">
                  {t('coursesOverview.desktop.review.reviewCount', { count: e.reviewCount })}
                </DesignChip>
              )}
              <button
                onClick={() => handleRemoveMistake(e._id)}
                className="cursor-pointer rounded-[9px] border px-[12px] py-[7px] text-[11px] font-bold text-k-crimson transition-transform hover:-translate-y-0.5 hover:bg-k-crimson hover:text-k-bg"
                style={{ borderColor: 'var(--color-k-line2)', background: 'var(--color-k-card)' }}
              >
                {t('coursesOverview.desktop.review.remove')}
              </button>
            </div>
          ))
        )}
      </DesktopCard>
    </div>
  );
}
