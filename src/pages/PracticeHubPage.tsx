import React from 'react';
import { Trophy, Keyboard, Layers, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useQuery } from 'convex/react';
import { VOCAB, qRef } from '../utils/convexRefs';
import { useTopikExams } from '../hooks/useTopikExams';
import { useIsMobile } from '../hooks/useIsMobile';
import { Button } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

type PracticeCard = {
  id: 'topik' | 'typing' | 'vocab';
  title: string;
  subtitle: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
  accent: string;
};

export default function PracticeHubPage() {
  const isMobile = useIsMobile();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const topikExams = useTopikExams();
  const reviewSummary = useQuery(VOCAB.getReviewSummary, user ? { savedByUserOnly: true } : 'skip');
  const typingStats = useQuery(
    qRef<Record<string, never>, { highestWpm: number } | null>('typing:getUserStats'),
    {}
  );
  const dueReviews = reviewSummary?.dueNow ?? 0;

  const cards: PracticeCard[] = [
    {
      id: 'topik',
      title: t('nav.topik', { defaultValue: 'TOPIK' }),
      subtitle: t('dashboard.topik.realExam', { defaultValue: 'Mock exams and review flows' }),
      path: '/topik',
      icon: <Trophy size={20} className="text-amber-600 dark:text-amber-300" />,
      badge: `${topikExams.length} ${t('common.exams', { defaultValue: 'Exams' })}`,
      accent:
        'from-amber-50 to-yellow-100 border-amber-200 dark:from-amber-400/12 dark:to-yellow-400/12 dark:border-amber-300/20',
    },
    {
      id: 'typing',
      title: t('sidebar.typing', { defaultValue: 'Typing' }),
      subtitle: t('typing.subtitle', { defaultValue: 'Speed + accuracy drills' }),
      path: '/typing',
      icon: <Keyboard size={20} className="text-indigo-600 dark:text-indigo-300" />,
      badge: `${typingStats?.highestWpm || 0} ${t('typing.unit', { defaultValue: 'WPM' })}`,
      accent:
        'from-indigo-50 to-blue-100 border-indigo-200 dark:from-indigo-400/12 dark:to-blue-400/12 dark:border-indigo-300/20',
    },
    {
      id: 'vocab',
      title: t('dashboard.vocab.title', { defaultValue: 'Vocab Book' }),
      subtitle: t('dashboard.vocab.subtitle', { defaultValue: 'Daily spaced repetition' }),
      path: '/vocab-book',
      icon: <Layers size={20} className="text-emerald-600 dark:text-emerald-300" />,
      badge: `${dueReviews} ${t('vocab.due', { defaultValue: 'Due' })}`,
      accent:
        'from-emerald-50 to-teal-100 border-emerald-200 dark:from-emerald-400/12 dark:to-teal-400/12 dark:border-emerald-300/20',
    },
  ];

  return (
    <section className="mx-auto w-full max-w-5xl space-y-4">
      {!isMobile && (
        <header className="mb-2">
          <h1 className="text-3xl font-black text-foreground">
            {t('nav.practice', { defaultValue: 'Practice' })}
          </h1>
          <p className="text-sm font-semibold text-muted-foreground mt-1">
            {t('dashboard.practice.subtitle', {
              defaultValue: 'Choose your drill and keep the streak alive.',
            })}
          </p>
        </header>
      )}
      <div
        className={isMobile ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'}
      >
        {cards.map(card => (
          <Button
            key={card.id}
            type="button"
            onClick={() => navigate(card.path)}
            variant="ghost"
            size="auto"
            className={`w-full rounded-3xl border bg-gradient-to-br p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${card.accent} !block !whitespace-normal !shadow-none ${!isMobile ? 'h-full' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-card p-2.5 shadow-sm">{card.icon}</div>
                <div>
                  <h2 className="text-lg font-black text-foreground">{card.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    {card.subtitle}
                  </p>
                  {card.badge && (
                    <span className="mt-3 inline-flex rounded-full border border-border bg-card px-2.5 py-1 text-xs font-bold text-muted-foreground">
                      {card.badge}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </div>
          </Button>
        ))}
      </div>
    </section>
  );
}
