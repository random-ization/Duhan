import React, { useState, lazy, Suspense, type ReactNode } from 'react';
import type { LearnerStatsDto } from '../../convex/learningStats';
import { Sparkles, Brain, Target, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';

const DesktopReviewDashboardPage = lazy(() => import('./desktop/DesktopReviewDashboardPage'));
import { useQuery } from 'convex/react';
import { VOCAB, qRef, NoArgs } from '@/utils/convexRefs';
import { useContextualSidebar } from '@/hooks/useContextualSidebar';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  ContextualCountBadge,
  ContextualListItemButton,
  ContextualPrimaryActionButton,
  ContextualSection,
} from '@/components/layout/contextualSidebarBlocks';
import {
  Card as KsoftCard,
  Chip,
  HanjaSeal,
  KT,
  PageShell,
  SectionHead,
} from '@/components/mobile/ksoft/ksoft';
import {
  KsoftEmptyState,
  KsoftImmersiveHeader,
} from '@/components/mobile/ksoft/KsoftMobilePrimitives';

export default function ReviewDashboardPage() {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const [now] = useState(() => Date.now());
  const isMobile = useIsMobile();

  const reviewSummary = useQuery(VOCAB.getReviewSummary, {}) || null;
  const reviewQueue = useQuery(VOCAB.getDueForReview) || [];
  const userStats = useQuery(qRef<NoArgs, LearnerStatsDto>('userStats:getStats'));
  const streak = userStats?.streak ?? 0;

  const dueItems = reviewQueue.filter(
    item => !!item.progress.nextReviewAt && item.progress.nextReviewAt <= now
  );
  const dueNowCount = reviewSummary?.dueNow ?? dueItems.length;
  const learnedCount = reviewSummary
    ? Math.max(0, reviewSummary.total - reviewSummary.unlearned)
    : reviewQueue.filter(i => i.progress.status !== 'NEW').length;
  const accuracy =
    reviewSummary && reviewSummary.total > 0
      ? Math.round((reviewSummary.mastered / reviewSummary.total) * 100)
      : 0;
  const visibleDueItems = dueItems.slice(0, 200);
  const reviewSidebarContent = (
    <div className="space-y-3">
      <ContextualSection
        title={t('reviewPage.sidebar.views', { defaultValue: 'Views' })}
        badge={<ContextualCountBadge value={dueNowCount} tone="warning" />}
        withRail
      >
        <ContextualListItemButton
          icon={Sparkles}
          label={t('reviewPage.dashboard.title', { defaultValue: 'Daily Review' })}
          subtitle={t('reviewPage.sidebar.dailyHint', {
            defaultValue: 'Start from your due queue',
          })}
          active
          onClick={() => navigate('/review')}
        />
        <ContextualListItemButton
          icon={Clock}
          label={t('reviewPage.sidebar.quickMode', { defaultValue: 'Quick Review' })}
          subtitle={t('reviewPage.modes.quick.desc', {
            defaultValue: '10 random due words • 2 mins',
          })}
          trailing={<ContextualCountBadge value={Math.min(dueNowCount, 10)} tone="accent" />}
          onClick={() => navigate('/review/quiz?mode=quick')}
        />
      </ContextualSection>

      <ContextualSection title={t('reviewPage.modes.title', { defaultValue: 'Choose a Mode' })}>
        <ContextualListItemButton
          icon={Brain}
          label={t('reviewPage.modes.full.title', { defaultValue: 'Full Review' })}
          subtitle={t('reviewPage.modes.full.desc', {
            count: dueNowCount,
            defaultValue: `Clear all ${dueNowCount} due words`,
          })}
          onClick={() => navigate('/review/quiz?mode=full')}
        />
        <ContextualListItemButton
          icon={Target}
          label={t('reviewPage.modes.weak.title', { defaultValue: 'Weakest Words' })}
          subtitle={t('reviewPage.modes.weak.desc', {
            defaultValue: 'Focus on difficult items',
          })}
          onClick={() => navigate('/review/quiz?mode=weak')}
        />
      </ContextualSection>

      <ContextualPrimaryActionButton
        label={t('reviewPage.modes.full.btn', { defaultValue: 'Start All' })}
        onClick={() => navigate('/review/quiz?mode=full')}
      />
    </div>
  );

  useContextualSidebar({
    id: 'review-dashboard-context',
    title: t('reviewPage.dashboard.title', { defaultValue: 'Daily Review' }),
    subtitle: t('reviewPage.sidebar.subtitle', { defaultValue: 'Keep your queue under control' }),
    content: reviewSidebarContent,
    enabled: !isMobile,
  });

  if (isMobile) {
    const modeCards = [
      {
        seal: '速',
        tone: KT.butter,
        title: t('reviewPage.modes.quick.title', { defaultValue: 'Quick Review' }),
        desc: t('reviewPage.modes.quick.desc', {
          defaultValue: '10 random due words • 2 mins',
        }),
        meta: `${Math.min(dueNowCount, 10)}`,
        path: '/review/quiz?mode=quick',
      },
      {
        seal: '復',
        tone: KT.pink,
        title: t('reviewPage.modes.full.title', { defaultValue: 'Full Review' }),
        desc: t('reviewPage.modes.full.desc', {
          count: dueNowCount,
          defaultValue: `Clear all ${dueNowCount} due words`,
        }),
        meta: `${dueNowCount}`,
        path: '/review/quiz?mode=full',
      },
      {
        seal: '弱',
        tone: KT.mint,
        title: t('reviewPage.modes.weak.title', { defaultValue: 'Weakest Words' }),
        desc: t('reviewPage.modes.weak.desc', {
          defaultValue: 'Focus on difficult items',
        }),
        meta: `${reviewQueue.filter(i => i.progress.status !== 'NEW').length}`,
        path: '/review/quiz?mode=weak',
      },
    ];

    return (
      <PageShell>
        <KsoftImmersiveHeader
          eyebrow="復 · REVIEW"
          title={t('reviewPage.dashboard.title', { defaultValue: 'Daily Review' })}
          subtitle={t('reviewPage.dashboard.subtitle', {
            count: dueNowCount,
            defaultValue: `Keep your streak alive! You have ${dueNowCount} words due.`,
          })}
          seal="復"
          onBack={() => navigate('/courses')}
        />
        <main style={{ padding: '4px 20px 112px', display: 'grid', gap: 22 }}>
          <KsoftCard
            pad={22}
            style={{
              background: `linear-gradient(135deg, ${KT.ink} 0%, ${KT.indigo} 100%)`,
              color: KT.card,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: 18,
                top: 10,
                fontFamily: KT.serif,
                fontSize: 86,
                color: 'rgba(255,255,255,0.08)',
                lineHeight: 1,
              }}
            >
              復
            </div>
            <div style={{ position: 'relative', display: 'grid', gap: 18 }}>
              <Chip tone="butter">{t('reviewPage.queue.due', { defaultValue: 'Due Review' })}</Chip>
              <div>
                <div style={{ fontSize: 56, lineHeight: 0.95, fontWeight: 900 }}>{dueNowCount}</div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'rgba(255,255,255,0.74)',
                  }}
                >
                  {t('reviewPage.stats.due_sub', { defaultValue: 'Ready to review' })}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  [t('reviewPage.stats.accuracy', { defaultValue: 'Accuracy' }), `${accuracy}%`],
                  [
                    t('reviewPage.stats.learned', { defaultValue: 'Words Learned' }),
                    `${learnedCount}`,
                  ],
                  [
                    t('reviewPage.dashboard.streakDays', {
                      days: streak,
                      defaultValue: `${streak} Days`,
                    }),
                    `${streak}`,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: 18,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        fontWeight: 800,
                        color: 'rgba(255,255,255,0.62)',
                      }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </KsoftCard>

          <section>
            <SectionHead
              kanji="式"
              title={t('reviewPage.modes.title', { defaultValue: 'Choose a Mode' })}
            />
            <div style={{ display: 'grid', gap: 10 }}>
              {modeCards.map(card => (
                <button
                  key={card.path}
                  type="button"
                  onClick={() => navigate(card.path)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr auto',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    border: `1px solid ${KT.line}`,
                    background: KT.card,
                    borderRadius: 22,
                    boxShadow: KT.sh,
                    padding: 14,
                    textAlign: 'left',
                    fontFamily: KT.font,
                  }}
                >
                  <HanjaSeal c={card.seal} size={48} bg={card.tone} color={KT.ink} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: KT.ink, fontSize: 16, fontWeight: 900 }}>{card.title}</div>
                    <div
                      style={{
                        marginTop: 4,
                        color: KT.sub,
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.4,
                      }}
                    >
                      {card.desc}
                    </div>
                  </div>
                  <div style={{ color: KT.crimson, fontSize: 20, fontWeight: 900 }}>
                    {card.meta}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <SectionHead
              kanji="列"
              title={t('reviewPage.queue.title', { defaultValue: 'Word Queue' })}
            />
            {dueItems.length === 0 ? (
              <KsoftEmptyState
                title={t('reviewPage.queue.empty_due', {
                  defaultValue: 'No words due for review! Good job.',
                })}
                description={t('reviewPage.queue.empty_mastered', {
                  defaultValue: 'List of mastered words will appear here.',
                })}
              />
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {visibleDueItems.slice(0, 12).map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      border: `1px solid ${KT.line}`,
                      background: KT.card,
                      borderRadius: 18,
                      padding: 12,
                      boxShadow: KT.shSm,
                    }}
                  >
                    <HanjaSeal c={item.word.charAt(0)} size={38} bg={KT.bg2} color={KT.crimson} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: KT.ink, fontSize: 16, fontWeight: 900 }}>
                        {item.word}
                      </div>
                      <div style={{ marginTop: 3, color: KT.sub, fontSize: 12, fontWeight: 700 }}>
                        {item.meaning}
                      </div>
                    </div>
                    <Chip tone="pink">{item.partOfSpeech}</Chip>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </PageShell>
    );
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DesktopReviewDashboardPage
        dueNowCount={dueNowCount}
        learnedCount={learnedCount}
        accuracy={accuracy}
        streak={streak}
        dueItems={dueItems}
        visibleDueItems={visibleDueItems}
        navigate={navigate}
        t={t}
      />
    </Suspense>
  );
}
