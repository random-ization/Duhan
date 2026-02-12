import React, { useState } from 'react';
import { Trophy, Keyboard, Layers, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useQuery } from 'convex/react';
import { VOCAB, qRef } from '../utils/convexRefs';
import { useData } from '../contexts/DataContext';

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

  const cards: PracticeCard[] = [
    {
      id: 'topik',
      title: t('nav.topik', { defaultValue: 'TOPIK' }),
      subtitle: t('dashboard.topik.realExam', { defaultValue: 'Mock exams and review flows' }),
      path: '/topik',
      icon: <Trophy size={20} className="text-amber-600" />,
      badge: `${topikExams.length} ${t('common.exams', { defaultValue: 'Exams' })}`,
      accent: 'from-amber-50 to-yellow-100 border-amber-200',
    },
    {
      id: 'typing',
      title: t('sidebar.typing', { defaultValue: 'Typing' }),
      subtitle: t('typing.subtitle', { defaultValue: 'Speed + accuracy drills' }),
      path: '/typing',
      icon: <Keyboard size={20} className="text-indigo-600" />,
      badge: `${typingStats?.highestWpm || 0} WPM`,
      accent: 'from-indigo-50 to-blue-100 border-indigo-200',
    },
    {
      id: 'vocab',
      title: t('dashboard.vocab.title', { defaultValue: 'Vocab Book' }),
      subtitle: t('dashboard.vocab.subtitle', { defaultValue: 'Daily spaced repetition' }),
      path: '/vocab-book',
      icon: <Layers size={20} className="text-emerald-600" />,
      badge: `${dueReviews} ${t('vocab.due', { defaultValue: 'Due' })}`,
      accent: 'from-emerald-50 to-teal-100 border-emerald-200',
    },
  ];

  return (
    <section className="mx-auto w-full max-w-4xl space-y-4">
      {cards.map(card => (
        <button
          key={card.id}
          type="button"
          onClick={() => navigate(card.path)}
          className={`w-full rounded-3xl border bg-gradient-to-br p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${card.accent}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-white p-2.5 shadow-sm">{card.icon}</div>
              <div>
                <h2 className="text-lg font-black text-slate-900">{card.title}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">{card.subtitle}</p>
                {card.badge && (
                  <span className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                    {card.badge}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </div>
        </button>
      ))}
    </section>
  );
}
