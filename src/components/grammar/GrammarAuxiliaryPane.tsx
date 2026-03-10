import React, { useState } from 'react';
import { Button, Textarea } from '../ui';
import { useTranslation } from 'react-i18next';
import { GrammarPointData } from '../../types';
import { Sparkles } from 'lucide-react';

interface GrammarAuxiliaryPaneProps {
  grammar: GrammarPointData | null;
  onToggleStatus: (grammarId: string) => void;
  isLoading?: boolean;
}

const GrammarAuxiliaryPane: React.FC<GrammarAuxiliaryPaneProps> = ({
  grammar,
  onToggleStatus,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [sentenceInput, setSentenceInput] = useState('');

  if (!grammar) {
    return (
      <aside className="w-80 border-l-2 border-slate-900 dark:border-border bg-card flex flex-col z-20 shrink-0 opacity-50 m-4 rounded-xl border-2 shadow-[8px_8px_0px_0px_#0f172a] dark:shadow-[8px_8px_0px_0px_rgba(148,163,184,0.1)]">
        <div className="p-6 text-center text-muted-foreground font-black mt-10">
          <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center opacity-20">
            <Sparkles className="w-8 h-8" />
          </div>
          {t('grammarModule.selectGrammarHint', 'Select a grammar point to begin studying')}
        </div>
      </aside>
    );
  }

  const isMastered = grammar.status === 'MASTERED';
  const progressPercent = grammar.proficiency || (isMastered ? 100 : 0);

  return (
    <aside className="w-80 flex flex-col z-20 shrink-0 text-foreground m-4 gap-4">
      {/* Progress Card */}
      <div className="bg-card border-2 border-slate-900 dark:border-border rounded-xl shadow-[6px_6px_0px_0px_#0f172a] dark:shadow-[6px_6px_0px_0px_rgba(148,163,184,0.2)] p-6 overflow-hidden relative">
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="flex flex-col">
            <span className="font-black text-xs uppercase tracking-tighter text-slate-400">
              {t('grammarModule.proficiency', 'STUDY PROGRESS')}
            </span>
            <span className="font-black text-xl italic uppercase">
              {t('grammarModule.status', 'Proficiency')}
            </span>
          </div>
          <Button
            onClick={() => onToggleStatus(grammar.id)}
            disabled={isLoading}
            className={`
                            h-10 px-4 font-black text-xs border-2 border-slate-900 dark:border-border transition-all
                            shadow-[4px_4px_0px_0px_#0f172a] dark:shadow-[4px_4px_0px_0px_rgba(148,163,184,0.26)]
                            active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                            ${
                              isMastered
                                ? 'bg-emerald-400 hover:bg-emerald-500 text-slate-900'
                                : 'bg-white hover:bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                            }
                        `}
          >
            {isMastered
              ? t('grammarModule.unmarkMastery', 'Mastered')
              : t('grammarModule.markMastery', 'Mark learned')}
          </Button>
        </div>

        {/* Circular indicator logic or just a bolder progress bar */}
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-black inline-block py-1 px-2 uppercase rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                {grammar.status || 'NEW'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl font-black inline-block text-slate-900 dark:text-slate-100">
                {progressPercent}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-border shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)]">
            <div
              style={{ width: `${progressPercent}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 border-r-2 border-slate-900 dark:border-indigo-400 transition-all duration-500"
            />
          </div>
        </div>

        {/* Visual Flair Pattern */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 -mr-8 -mt-8 rounded-full blur-2xl" />
      </div>

      {/* AI Checker Card */}
      <div className="bg-indigo-500 border-2 border-slate-900 dark:border-indigo-400 rounded-xl shadow-[6px_6px_0px_0px_#0f172a] dark:shadow-[6px_6px_0px_0px_rgba(148,163,184,0.2)] flex-1 flex flex-col overflow-hidden">
        <div className="p-5 border-b-2 border-slate-900 dark:border-indigo-400 flex items-center justify-between bg-white/10">
          <h3 className="font-black text-white text-sm uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI SEN-CHECKER
          </h3>
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        </div>

        <div className="p-5 flex-1 flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-black text-indigo-100 uppercase mb-2">
              Sentence Practice with:
            </p>
            <div className="bg-slate-900/40 text-white px-3 py-2 rounded-lg font-bold border border-white/20 inline-block text-sm">
              {grammar.title}
            </div>
          </div>

          <Textarea
            rows={6}
            className="flex-1 w-full p-4 border-2 border-slate-900 dark:border-slate-800 rounded-xl text-sm font-bold focus-visible:shadow-[4px_4px_0px_0px_#0f172a] shadow-none outline-none resize-none bg-white dark:bg-slate-900 dark:text-slate-100 transition-shadow placeholder:text-slate-400"
            placeholder={t(
              'grammarModule.aiPlaceholder',
              'Type your sentence here and let AI check it...'
            )}
            value={sentenceInput}
            onChange={e => setSentenceInput(e.target.value)}
          />

          <Button className="w-full py-6 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black rounded-xl border-2 border-slate-900 dark:border-slate-100 uppercase tracking-widest hover:translate-x-[2px] hover:translate-y-[2px] transition-transform shadow-[4px_4px_0px_0px_#ffffff] dark:shadow-[4px_4px_0px_0px_#475569]">
            {t('grammarModule.checkNow', 'Check now')}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default GrammarAuxiliaryPane;
