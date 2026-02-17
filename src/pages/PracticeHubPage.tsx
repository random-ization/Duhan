import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Trophy, Keyboard, Layers, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useQuery } from 'convex/react';
import { VOCAB, qRef } from '../utils/convexRefs';
import { useData } from '../contexts/DataContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { Button } from '../components/ui';

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
  const { topikExams } = useData();
  const vocabBook = useQuery(VOCAB.getVocabBook, { includeMastered: true, limit: 300 });
  const typingStats = useQuery(
    qRef<Record<string, never>, { highestWpm: number } | null>('typing:getUserStats'),
    {}
  );
  const [now] = useState(() => Date.now());

  const dueReviews = (vocabBook || []).filter(
    item =>
      item.progress.status !== 'MASTERED' &&
      !!item.progress.nextReviewAt &&
      item.progress.nextReviewAt <= now
  ).length;

  if (!isMobile) {
    return <Navigate to="/topik" replace />;
  }

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
    <section className="mx-auto w-full max-w-4xl space-y-4">
      {cards.map(card => (
        <Button
          key={card.id}
          type="button"
          onClick={() => navigate(card.path)}
          variant="ghost"
          size="auto"
          className={`w-full rounded-3xl border bg-gradient-to-br p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${card.accent} !block !whitespace-normal !shadow-none`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-card p-2.5 shadow-sm">{card.icon}</div>
              <div>
                <h2 className="text-lg font-black text-foreground">{card.title}</h2>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">{card.subtitle}</p>
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
    </section>
  );
}
