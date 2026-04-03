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
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="bg-card rounded-[3rem] shadow-2xl p-8 sm:p-12 border border-border/40 animate-in zoom-in-95 relative overflow-hidden group">
          {/* Subtle Background Glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full" />

          <div className="text-center mb-12 relative z-10">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-primary text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20 rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <Trophy className="w-12 h-12" strokeWidth={2.5} />
            </div>
            <h3 className="text-4xl font-black text-foreground mb-2 italic tracking-tighter">
              {labels.sessionComplete || 'Session Complete!'}
            </h3>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] opacity-70">
              {labels.sessionSummary || 'Your progress today'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 relative z-10">
            {/* Incorrect List */}
            <div className="bg-rose-500/5 dark:bg-rose-500/10 rounded-[2.5rem] p-8 border border-rose-500/20">
              <div className="flex items-center mb-6 text-rose-600 dark:text-rose-400 font-black italic text-xl tracking-tight">
                <XCircle className="w-6 h-6 mr-3" />
                {labels.incorrect} ({sessionStats.incorrect.length})
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {sessionStats.incorrect.length === 0 ? (
                  <div className="py-8 text-center bg-card/50 rounded-[1.5rem] border border-dashed border-rose-200 dark:border-rose-800">
                    <p className="text-sm text-rose-400 font-bold italic">
                      {labels.noneGreatJob || 'Perfect run!'}
                    </p>
                  </div>
                ) : (
                  sessionStats.incorrect.map((w, _i) => (
                    <div
                      key={w.id}
                      className="flex justify-between items-center bg-card p-4 rounded-[1.2rem] border border-border/40 shadow-sm group/item hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-black italic tracking-tight text-lg">{w.korean}</span>
                      <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase opacity-60 truncate ml-4">
                        {w.english}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Correct List */}
            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 rounded-[2.5rem] p-8 border border-emerald-500/20">
              <div className="flex items-center mb-6 text-emerald-600 dark:text-emerald-400 font-black italic text-xl tracking-tight">
                <CheckCircle className="w-6 h-6 mr-3" />
                {labels.correct} ({sessionStats.correct.length})
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {sessionStats.correct.length === 0 ? (
                  <div className="py-8 text-center bg-card/50 rounded-[1.5rem] border border-dashed border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm text-emerald-400 font-bold italic">Keep going!</p>
                  </div>
                ) : (
                  sessionStats.correct.map((w, _i) => (
                    <div
                      key={w.id}
                      className="flex justify-between items-center bg-card p-4 rounded-[1.2rem] border border-border/40 shadow-sm group/item hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-black italic tracking-tight text-lg">{w.korean}</span>
                      <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase opacity-60 truncate ml-4">
                        {w.english}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 relative z-10">
            <Button
              variant="ghost"
              size="auto"
              onClick={onNewSession}
              className="flex-1 py-5 bg-black dark:bg-zinc-800 text-white font-black rounded-[1.8rem] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center text-lg italic tracking-tight"
            >
              {labels.newSession || 'Start New Session'}{' '}
              <ChevronRight className="w-6 h-6 ml-3" strokeWidth={3} />
            </Button>
            {sessionStats.incorrect.length > 0 && (
              <Button
                variant="ghost"
                size="auto"
                onClick={onReviewIncorrect}
                className="flex-1 py-5 bg-card border-2 border-border/40 text-muted-foreground font-black rounded-[1.8rem] hover:bg-muted transition-all active:scale-[0.98] text-sm uppercase tracking-widest"
              >
                {labels.reviewIncorrect || 'Review Mistakes'}
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
