import React, { useState, useMemo, useCallback } from 'react';
import { Volume2, Eye, EyeOff } from 'lucide-react';
import { ExtendedVocabularyItem, VocabSettings } from '../types';
import { Language } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import { getLocalizedContent } from '../../../utils/languageUtils';
import { getPosStyle } from '../utils';
import { useTTS } from '../../../hooks/useTTS';
import { Button } from '../../../components/ui';

interface ListViewProps {
  words: ExtendedVocabularyItem[];
  settings: VocabSettings;
  language: Language;
}

// Helper function to get part of speech label
const getPosLabel = (
  partOfSpeech: string | undefined,
  pos: string | undefined,
  labels: ReturnType<typeof getLabels>
): string => {
  const posType = partOfSpeech ?? pos ?? 'NOUN';

  switch (posType) {
    case 'VERB_T':
      return labels.pos?.verb_t ?? 'v.t.';
    case 'VERB_I':
      return labels.pos?.verb_i ?? 'v.i.';
    case 'ADJ':
      return labels.pos?.adj ?? 'adj.';
    case 'NOUN':
      return labels.pos?.noun ?? 'n.';
    case 'ADV':
      return labels.pos?.adv ?? 'adv.';
    case 'PARTICLE':
      return labels.pos?.particle ?? 'part.';
    default:
      return posType;
  }
};

const ListView: React.FC<ListViewProps> = React.memo(({ words, settings, language }) => {
  const labels = useMemo(() => getLabels(language), [language]);
  const { speak: speakTTS } = useTTS();
  const speakKorean = useCallback(
    (text: string) => {
      void speakTTS(text);
    },
    [speakTTS]
  );
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
            speakKorean(textToSpeak);
          }
        }
        return newSet;
      });
    },
    [settings.flashcard.autoTTS, speakKorean]
  );

  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">{labels.noWords}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        {words.map((word, idx) => {
          const isRevealed = revealedItems.has(word.id);

          return (
            <div
              key={`${word.id}:${idx}`}
              className={`p-6 border-b border-border last:border-b-0 hover:bg-muted transition-colors ${
                idx % 2 === 0 ? 'bg-card' : 'bg-muted/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Korean Word */}
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-muted-foreground">{word.korean}</h3>
                    <Button
                      variant="ghost"
                      size="auto"
                      onClick={() => speakKorean(word.korean)}
                      className="p-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${getPosStyle(
                        word.partOfSpeech ?? word.pos ?? 'NOUN'
                      )}`}
                    >
                      {getPosLabel(word.partOfSpeech, word.pos, labels)}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
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
                        <div className="bg-muted p-3 rounded-lg space-y-1">
                          <p className="text-muted-foreground">{word.exampleSentence}</p>
                          {word.exampleTranslation && (
                            <p className="text-sm text-muted-foreground">
                              {getLocalizedContent(word, 'exampleTranslation', language)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reveal Button */}
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={() => toggleReveal(word.id, word.korean)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    isRevealed
                      ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      : 'bg-muted text-muted-foreground hover:bg-muted'
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
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
ListView.displayName = 'ListView';

export default ListView;
