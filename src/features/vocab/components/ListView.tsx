import React, { useState, useMemo, useCallback } from 'react';
import { Volume2, Eye, EyeOff } from 'lucide-react';
import { ExtendedVocabularyItem, VocabSettings } from '../types';
import { Language } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import { getLocalizedContent } from '../../../utils/languageUtils';
import { speak, getPosStyle } from '../utils';

interface ListViewProps {
  words: ExtendedVocabularyItem[];
  settings: VocabSettings;
  language: Language;
}

const ListView: React.FC<ListViewProps> = React.memo(({ words, settings, language }) => {
  const labels = useMemo(() => getLabels(language), [language]);
  const [revealedItems, setRevealedItems] = useState<Set<string>>(new Set());

  const toggleReveal = useCallback(
    (id: string, textToSpeak: string) => {
      setRevealedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
          if (settings.flashcard.autoTTS) {
            speak(textToSpeak);
          }
        }
        return newSet;
      });
    },
    [settings.flashcard.autoTTS]
  );

  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center text-slate-400">
          <p className="text-lg font-medium">{labels.noWords}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {words.map((word, idx) => {
          const isRevealed = revealedItems.has(word.id);

          return (
            <div
              key={word.id}
              className={`p-6 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Korean Word */}
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-slate-800">{word.korean}</h3>
                    <button
                      onClick={() => speak(word.korean)}
                      className="p-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${getPosStyle(
                        word.partOfSpeech || word.pos || 'NOUN'
                      )}`}
                    >
                      {word.partOfSpeech === 'VERB_T' ? (labels.pos?.verb_t || 'v.t.') :
                        word.partOfSpeech === 'VERB_I' ? (labels.pos?.verb_i || 'v.i.') :
                          word.partOfSpeech === 'ADJ' ? (labels.pos?.adj || 'adj.') :
                            word.partOfSpeech === 'NOUN' ? (labels.pos?.noun || 'n.') :
                              word.partOfSpeech === 'ADV' ? (labels.pos?.adv || 'adv.') :
                                word.partOfSpeech === 'PARTICLE' ? (labels.pos?.particle || 'part.') :
                                  (word.partOfSpeech || word.pos)}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {labels.unit} {word.unit}
                    </span>
                  </div>

                  {/* English Translation (Revealed) */}
                  {isRevealed && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <p className="text-lg text-indigo-600 font-medium">
                        {getLocalizedContent(word, 'meaning', language) || word.english}
                      </p>

                      {word.exampleSentence && (
                        <div className="bg-slate-100 p-3 rounded-lg space-y-1">
                          <p className="text-slate-700">{word.exampleSentence}</p>
                          {word.exampleTranslation && (
                            <p className="text-sm text-slate-500">
                              {getLocalizedContent(word, 'exampleTranslation', language)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reveal Button */}
                <button
                  onClick={() => toggleReveal(word.id, word.korean)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${isRevealed
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {isRevealed ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      {labels.hide || 'Hide'}
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      {labels.reveal || 'Reveal'}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
ListView.displayName = "ListView";

export default ListView;
