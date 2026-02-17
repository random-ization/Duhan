import { useMemo } from 'react';
import { Volume2, Plus, ArrowRight, Book } from 'lucide-react';
import { BottomSheet } from '../common/BottomSheet';
import { useTTS } from '../../hooks/useTTS';
import { Button } from '../ui';

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
              <h2 className="text-4xl font-black text-foreground tracking-tight">{word}</h2>
              {pronunciation && (
                <span className="text-muted-foreground font-medium text-lg">[{pronunciation}]</span>
              )}
            </div>
            {lemma && lemma !== word && (
              <div className="text-sm font-bold text-muted-foreground mt-1 flex items-center gap-1">
                <ArrowRight size={12} />
                Dictionary form: <span className="text-muted-foreground">{lemma}</span>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="auto"
            type="button"
            onClick={handleSpeak}
            className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground active:scale-95 transition-transform active:bg-muted"
          >
            <Volume2 className="fill-current w-6 h-6" />
          </Button>
        </div>

        {/* Meaning Section */}
        <div className="bg-muted rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Book size={16} className="text-indigo-500" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Definition
            </span>
          </div>
          <p className="text-lg font-medium text-muted-foreground leading-relaxed">{meaning}</p>
        </div>

        {/* Grammar Section (If available) */}
        {safeGrammarMatches.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider pl-1">
              Related Grammar
            </h3>
            <div className="space-y-2">
              {safeGrammarMatches.map(g => (
                <div key={g.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-foreground">{g.title}</span>
                    <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {g.level}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">{g.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2">
          <Button
            variant="ghost"
            size="auto"
            type="button"
            onClick={onSave}
            className="w-full h-14 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-[20px] font-bold text-lg shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Plus strokeWidth={3} size={20} />
            Save to Notebook
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
