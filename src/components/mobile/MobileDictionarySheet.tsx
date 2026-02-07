import React, { useMemo } from 'react';
import { Volume2, Plus, ArrowRight, Book } from 'lucide-react';
import { BottomSheet } from '../common/BottomSheet';
import { useTTS } from '../../hooks/useTTS';

// Define types locally or import if shared (mocking for speed/self-containment)
interface GrammarMatch {
  id: string;
  title: string;
  summary: string;
  type: string;
  level: string;
}

interface MobileDictionarySheetProps {
  readonly word: string;
  readonly meaning: string;
  readonly lemma?: string;
  readonly pronunciation?: string;
  readonly grammarMatches?: GrammarMatch[];
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: () => void;
}

export function MobileDictionarySheet({
  word,
  meaning,
  lemma,
  pronunciation,
  grammarMatches,
  isOpen,
  onClose,
  onSave,
}: Readonly<MobileDictionarySheetProps>) {
  const { speak } = useTTS();

  // Safety check for grammarMatches being undefined
  const safeGrammarMatches = useMemo(() => grammarMatches || [], [grammarMatches]);

  const handleSpeak = () => {
    speak(word);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} height="auto">
      <div className="pb-8 space-y-6">
        {/* Header Section: Word & Audio */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">{word}</h2>
              {pronunciation && (
                <span className="text-slate-400 font-medium text-lg">[{pronunciation}]</span>
              )}
            </div>
            {lemma && lemma !== word && (
              <div className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-1">
                <ArrowRight size={12} />
                Dictionary form: <span className="text-slate-600">{lemma}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSpeak}
            className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 active:scale-95 transition-transform active:bg-slate-200"
          >
            <Volume2 className="fill-current w-6 h-6" />
          </button>
        </div>

        {/* Meaning Section */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Book size={16} className="text-indigo-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Definition
            </span>
          </div>
          <p className="text-lg font-medium text-slate-800 leading-relaxed">{meaning}</p>
        </div>

        {/* Grammar Section (If available) */}
        {safeGrammarMatches.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pl-1">
              Related Grammar
            </h3>
            <div className="space-y-2">
              {safeGrammarMatches.map(g => (
                <div
                  key={g.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-900">{g.title}</span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {g.level}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-snug">{g.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onSave}
            className="w-full h-14 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-[20px] font-bold text-lg shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Plus strokeWidth={3} size={20} />
            Save to Notebook
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
