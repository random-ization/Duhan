import React, { useMemo } from 'react';
import { Trophy, XCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { ExtendedVocabularyItem } from '../types';
import { Language } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import { Button } from '../../../components/ui';

interface SessionSummaryProps {
  language: Language;
  sessionStats: {
    correct: ExtendedVocabularyItem[];
    incorrect: ExtendedVocabularyItem[];
  };
  onNewSession: () => void;
  onReviewIncorrect: () => void;
}

const SessionSummary: React.FC<SessionSummaryProps> = React.memo(
  ({ language, sessionStats, onNewSession, onReviewIncorrect }) => {
    const labels = useMemo(() => getLabels(language), [language]);

    return (
      <div className="max-w-4xl mx-auto w-full">
        <div className="bg-card rounded-2xl shadow-xl p-8 border-b-4 border-indigo-500 animate-in zoom-in-95">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-bold text-muted-foreground mb-2">
              {labels.sessionComplete}
            </h3>
            <p className="text-muted-foreground">{labels.sessionSummary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Incorrect List */}
            <div className="bg-red-50 rounded-xl p-6">
              <div className="flex items-center mb-4 text-red-700 font-bold">
                <XCircle className="w-5 h-5 mr-2" />
                {labels.incorrect} ({sessionStats.incorrect.length})
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {sessionStats.incorrect.length === 0 ? (
                  <p className="text-sm text-red-400 italic">{labels.noneGreatJob}</p>
                ) : (
                  sessionStats.incorrect.map((w, _i) => (
                    <div
                      key={w.id}
                      className="flex justify-between bg-card p-3 rounded-lg border border-red-100 text-sm"
                    >
                      <span className="font-bold">{w.korean}</span>
                      <span className="text-muted-foreground truncate max-w-[50%]">
                        {w.english}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Correct List */}
            <div className="bg-emerald-50 rounded-xl p-6">
              <div className="flex items-center mb-4 text-emerald-700 font-bold">
                <CheckCircle className="w-5 h-5 mr-2" />
                {labels.correct} ({sessionStats.correct.length})
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {sessionStats.correct.map((w, _i) => (
                  <div
                    key={w.id}
                    className="flex justify-between bg-card p-3 rounded-lg border border-emerald-100 text-sm"
                  >
                    <span className="font-bold">{w.korean}</span>
                    <span className="text-muted-foreground truncate max-w-[50%]">{w.english}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <Button
              variant="ghost"
              size="auto"
              onClick={onNewSession}
              className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center shadow-lg shadow-indigo-200"
            >
              {labels.newSession} <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            {sessionStats.incorrect.length > 0 && (
              <Button
                variant="ghost"
                size="auto"
                onClick={onReviewIncorrect}
                className="flex-1 py-4 bg-card border border-border text-muted-foreground font-bold rounded-xl hover:bg-muted transition-colors"
              >
                {labels.reviewIncorrect}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
);
SessionSummary.displayName = 'SessionSummary';

export default SessionSummary;
