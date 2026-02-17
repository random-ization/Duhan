import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useQuery } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { qRef } from '../utils/convexRefs';

interface DailyPhraseData {
  id: string;
  korean: string;
  romanization: string;
  translation: string;
}

const DailyPhrase: React.FC = () => {
  const { language } = useAuth();
  const labels = getLabels(language);

  const phrase = useQuery(
    qRef<{ language: string }, DailyPhraseData | null>('vocab:getDailyPhrase'),
    { language }
  );
  const loading = phrase === undefined;
  const error = phrase === null;

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-100">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-20 bg-yellow-200 rounded"></div>
          <div className="h-10 w-3/4 bg-yellow-200 rounded"></div>
          <div className="h-4 w-1/2 bg-yellow-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !phrase) {
    return null; // Hide on error
  }

  return (
    <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-2xl p-6 border border-yellow-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-amber-600" />
        <h3 className="text-sm font-bold text-amber-900 tracking-wide">
          {labels.dashboard?.daily?.label || 'Daily Phrase'}
        </h3>
      </div>

      {/* Korean Sentence */}
      <div className="mb-3">
        <p className="text-3xl font-bold text-foreground leading-tight mb-2">{phrase.korean}</p>
      </div>

      {/* Romanization */}
      <div className="mb-3">
        <p className="text-base text-muted-foreground font-medium italic">{phrase.romanization}</p>
      </div>

      {/* Translation */}
      <div className="pt-3 border-t border-yellow-200/50">
        <p className="text-muted-foreground leading-relaxed">{phrase.translation}</p>
      </div>
    </div>
  );
};

export default DailyPhrase;
