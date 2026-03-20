import React, { useState, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Brain, Target, Clock, Flame, ArrowLeft, Zap, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
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

export default function ReviewDashboardPage() {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const [now] = useState(() => Date.now());
  const isMobile = useIsMobile();

  const reviewSummary = useQuery(VOCAB.getReviewSummary, {}) || null;
  const reviewQueue = useQuery(VOCAB.getDueForReview) || [];
  const userStats = useQuery(
    qRef<NoArgs, { streak: number } & Record<string, unknown>>('userStats:getStats')
  );
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans pb-24">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/practice')}
              className="rounded-full hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-amber-500" />
                {t('reviewPage.dashboard.title', { defaultValue: 'Daily Review' })}
              </h1>
              <p className="text-muted-foreground mt-1 font-medium">
                {t('reviewPage.dashboard.subtitle', {
                  count: dueNowCount,
                  defaultValue: `Keep your streak alive! You have ${dueNowCount} words due.`,
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-full border border-border shadow-sm">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
              <span className="font-bold text-foreground">
                {t('reviewPage.dashboard.streakDays', {
                  days: streak,
                  defaultValue: `${streak} Days`,
                })}
              </span>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            icon={<Target className="text-emerald-500" />}
            label={t('reviewPage.stats.accuracy', { defaultValue: 'Accuracy' })}
            value={`${accuracy}%`}
            subtext={t('reviewPage.stats.accuracy_sub', {
              defaultValue: 'Derived from mastered ratio',
            })}
          />
          <StatsCard
            icon={<Zap className="text-indigo-500" />}
            label={t('reviewPage.stats.learned', { defaultValue: 'Words Learned' })}
            value={learnedCount}
            subtext={t('reviewPage.stats.learned_sub', { defaultValue: 'Total active words' })}
          />
          <StatsCard
            icon={<Clock className="text-rose-500" />}
            label={t('reviewPage.stats.due', { defaultValue: 'Due Now' })}
            value={dueNowCount}
            subtext={t('reviewPage.stats.due_sub', { defaultValue: 'Ready to review' })}
          />
        </div>

        {/* Main Review Modes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">
              {t('reviewPage.modes.title', { defaultValue: 'Choose a Mode' })}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ModeCard
              title={t('reviewPage.modes.quick.title', { defaultValue: 'Quick Review' })}
              description={t('reviewPage.modes.quick.desc', {
                defaultValue: '10 random due words • 2 mins',
              })}
              icon={<Zap className="w-8 h-8 text-amber-500" />}
              color="bg-amber-50 dark:bg-amber-900/10"
              borderColor="border-amber-200 dark:border-amber-800"
              btnText={t('reviewPage.modes.quick.btn', { defaultValue: 'Start Quick' })}
              onClick={() => navigate('/review/quiz?mode=quick')}
            />

            <ModeCard
              title={t('reviewPage.modes.full.title', { defaultValue: 'Full Review' })}
              description={t('reviewPage.modes.full.desc', {
                count: dueNowCount,
                defaultValue: `Clear all ${dueNowCount} due words`,
              })}
              icon={<Brain className="w-8 h-8 text-indigo-500" />}
              color="bg-indigo-50 dark:bg-indigo-900/10"
              borderColor="border-indigo-200 dark:border-indigo-800"
              btnText={t('reviewPage.modes.full.btn', { defaultValue: 'Start All' })}
              recommended
              recommendedText={t('reviewPage.modes.recommended', { defaultValue: 'RECOMMENDED' })}
              onClick={() => navigate('/review/quiz?mode=full')}
            />

            <ModeCard
              title={t('reviewPage.modes.weak.title', { defaultValue: 'Weakest Words' })}
              description={t('reviewPage.modes.weak.desc', {
                defaultValue: 'Focus on difficult items',
              })}
              icon={<Target className="w-8 h-8 text-rose-500" />}
              color="bg-rose-50 dark:bg-rose-900/10"
              borderColor="border-rose-200 dark:border-rose-800"
              btnText={t('reviewPage.modes.weak.btn', { defaultValue: 'Improve' })}
              onClick={() => navigate('/review/quiz?mode=weak')}
            />
          </div>
        </div>

        {/* Recent Activity / Tabs */}
        <div className="pt-4">
          <Tabs defaultValue="due" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                {t('reviewPage.queue.title', { defaultValue: 'Word Queue' })}
              </h2>
              <TabsList>
                <TabsTrigger value="due">
                  {t('reviewPage.queue.due', { defaultValue: 'Due Review' })}
                </TabsTrigger>
                <TabsTrigger value="learned">
                  {t('reviewPage.queue.mastered', { defaultValue: 'Mastered' })}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="due">
              <Card>
                <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                  {dueItems.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      {t('reviewPage.queue.empty_due', {
                        defaultValue: 'No words due for review! Good job.',
                      })}
                    </div>
                  ) : (
                    visibleDueItems.map(item => (
                      <div
                        key={item.id}
                        className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                            {item.word.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-lg">{item.word}</p>
                            <p className="text-sm text-muted-foreground">{item.meaning}</p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-amber-600 border-amber-200 bg-amber-50"
                        >
                          {t('reviewPage.queue.due', { defaultValue: 'Due Review' })}
                        </Badge>
                      </div>
                    ))
                  )}
                  {dueItems.length > visibleDueItems.length && (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      {t('reviewPage.queue.previewLimited', {
                        count: visibleDueItems.length,
                        total: dueItems.length,
                        defaultValue: `Showing first ${visibleDueItems.length} of ${dueItems.length} words`,
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="learned">
              <div className="p-8 text-center text-muted-foreground">
                {t('reviewPage.queue.empty_mastered', {
                  defaultValue: 'List of mastered words will appear here.',
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtext: string;
}

function StatsCard({ icon, label, value, subtext }: StatsCardProps) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-muted rounded-xl">{icon}</div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <h3 className="text-2xl font-bold text-foreground">{value}</h3>
          </div>
        </div>
        <div className="mt-4 flex items-center text-xs font-medium text-emerald-600">
          <BarChart3 className="w-3 h-3 mr-1" />
          {subtext}
        </div>
      </CardContent>
    </Card>
  );
}

interface ModeCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
  borderColor: string;
  btnText: string;
  recommended?: boolean;
  recommendedText?: string;
  onClick: () => void;
}

function ModeCard({
  title,
  description,
  icon,
  color,
  borderColor,
  btnText,
  recommended,
  onClick,
  recommendedText,
}: ModeCardProps) {
  return (
    <Card
      className={`relative overflow-hidden border-2 ${recommended ? 'border-indigo-500 dark:border-indigo-500 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20' : 'border-border hover:border-primary/40'} transition-all`}
    >
      {recommended && (
        <div className="absolute top-0 right-0 bg-indigo-500 text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-bl-xl">
          {recommendedText || 'RECOMMENDED'}
        </div>
      )}
      <CardContent className="p-6 flex flex-col h-full">
        <div
          className={`w-14 h-14 rounded-2xl ${color} border ${borderColor} flex items-center justify-center mb-4`}
        >
          {icon}
        </div>
        <h3 className="text-xl font-bold text-foreground mb-1">{title}</h3>
        <p className="text-muted-foreground font-medium mb-6 flex-1">{description}</p>
        <Button
          onClick={onClick}
          className={`w-full ${recommended ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
          variant={recommended ? 'default' : 'secondary'}
        >
          {btnText}
        </Button>
      </CardContent>
    </Card>
  );
}
