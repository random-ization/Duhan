import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Trophy, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getLabels } from '../../../utils/i18n';
import { Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';

interface VocabItem {
  id: string;
  korean: string;
  english: string;
  unit: number;
}

interface VocabMatchProps {
  readonly words: VocabItem[];
  readonly onComplete?: (time: number, moves: number) => void;
}

interface MatchCard {
  id: string;
  content: string;
  pairId: string;
  type: 'korean' | 'english';
  isMatched: boolean;
}

type CardState = 'normal' | 'selected' | 'matched' | 'wrong';
type GameState = 'PLAYING' | 'COMPLETE';

export default function VocabMatch({ words, onComplete }: VocabMatchProps) {
  const { language } = useAuth();
  const labels = getLabels(language);
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [timer, setTimer] = useState(0);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [gameState, setGameState] = useState<GameState>('PLAYING');
  const [isLocked, setIsLocked] = useState(false);

  const totalPairs = 8;

  // Shuffle array helper
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Initialize logic moved to render check
  // Track words key to only reinitialize when actual content changes
  const wordsKey = words.map(w => w.id).join(',');
  const wordsKeyRef = useRef(wordsKey);
  const hasInitialized = useRef(false);

  // Initialize cards
  const initializeCards = useCallback(() => {
    const selectedWords = shuffleArray(words).slice(0, totalPairs);

    const cardList: MatchCard[] = selectedWords.flatMap((word, idx) => [
      {
        id: `korean-${idx}`,
        content: word.korean,
        pairId: word.id,
        type: 'korean',
        isMatched: false,
      },
      {
        id: `english-${idx}`,
        content: word.english,
        pairId: word.id,
        type: 'english',
        isMatched: false,
      },
    ]);

    const shuffledCards = shuffleArray(cardList);
    setCards(shuffledCards);

    const initialStates: Record<string, CardState> = {};
    shuffledCards.forEach(card => {
      initialStates[card.id] = 'normal';
    });
    setCardStates(initialStates);

    // Reset game state
    setTimer(0);
    setMoves(0);
    setMatchedPairs(0);
    setGameState('PLAYING');
    setSelectedCards([]);
    setIsLocked(false);
  }, [words, totalPairs]); // Removed implicit shuffleArray dependency as it is a helper function defined outside hook if moved, but here it is defined inside. Wait, shuffleArray is defined inside component.

  useEffect(() => {
    // Only initialize if not done yet, or if words actually changed
    if (!hasInitialized.current || wordsKeyRef.current !== wordsKey) {
      wordsKeyRef.current = wordsKey;
      hasInitialized.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      initializeCards();
    }
  }, [wordsKey, initializeCards]);

  // Timer
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to handle successful match
  const handleMatchSuccess = useCallback(
    (firstId: string, secondId: string, currentMoves: number) => {
      setCardStates(prev => ({
        ...prev,
        [firstId]: 'matched',
        [secondId]: 'matched',
      }));
      setCards(prev =>
        prev.map(c => (c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c))
      );
      setMatchedPairs(p => {
        const newPairs = p + 1;
        if (newPairs >= totalPairs) {
          setGameState('COMPLETE');
          onComplete?.(timer, currentMoves);
        }
        return newPairs;
      });
      setSelectedCards([]);
      setIsLocked(false);
    },
    [onComplete, timer, totalPairs]
  );

  const handleCardClick = (cardId: string) => {
    if (isLocked || gameState !== 'PLAYING') return;
    if (cardStates[cardId] === 'matched' || cardStates[cardId] === 'selected') return;

    const newSelected = [...selectedCards, cardId];
    setSelectedCards(newSelected);
    setCardStates(prev => ({ ...prev, [cardId]: 'selected' }));

    if (newSelected.length === 2) {
      setIsLocked(true);
      setMoves(m => m + 1);

      const [firstId, secondId] = newSelected;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (
        firstCard &&
        secondCard &&
        firstCard.pairId === secondCard.pairId &&
        firstCard.type !== secondCard.type
      ) {
        // Match!
        setTimeout(() => handleMatchSuccess(firstId, secondId, moves + 1), 300);
      } else {
        // Mismatch
        setCardStates(prev => ({
          ...prev,
          [firstId]: 'wrong',
          [secondId]: 'wrong',
        }));

        setTimeout(() => {
          setCardStates(prev => ({
            ...prev,
            [firstId]: 'normal',
            [secondId]: 'normal',
          }));
          setSelectedCards([]);
          setIsLocked(false);
        }, 800);
      }
    }
  };

  const restartGame = () => {
    setTimer(0);
    setMoves(0);
    setMatchedPairs(0);
    setGameState('PLAYING');
    setSelectedCards([]);
    setIsLocked(false);
    initializeCards();
  };

  if (words.length < totalPairs) {
    return (
      <div className="bg-card rounded-[3rem] border border-border/40 shadow-2xl p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <RefreshCw className="w-8 h-8" />
        </div>
        <p className="text-muted-foreground font-black italic tracking-tight">
          {(labels.vocab?.minWordsMatch || 'Need at least {count} words to start matching').replace(
            '{count}',
            String(totalPairs)
          )}
        </p>
      </div>
    );
  }

  // Victory Screen
  if (gameState === 'COMPLETE') {
    return (
      <div className="bg-card rounded-[3.5rem] border border-border/40 shadow-2xl p-10 text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-emerald-500/5" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-500/10 blur-[80px] rounded-full" />

        <div className="relative z-10">
          <div className="w-24 h-24 mx-auto mb-8 rounded-[2rem] bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-xl shadow-yellow-500/20 rotate-12 group-hover:rotate-0 transition-transform duration-500">
            <Trophy className="w-12 h-12 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-4xl font-black text-foreground mb-3 italic tracking-tighter">
            🎉 {labels.vocab?.matchTitle || 'Great Job!'}
          </h2>
          <p className="text-muted-foreground mb-10 font-bold uppercase tracking-widest text-[10px] opacity-70">
            {labels.vocab?.matchDesc || 'Master of words'}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-5 mb-10 max-w-sm mx-auto">
            <div className="bg-muted/50 backdrop-blur-sm border border-border/40 rounded-[2rem] p-6 group-hover:bg-card transition-colors">
              <div className="text-3xl font-black text-foreground italic tracking-tighter">
                {formatTime(timer)}
              </div>
              <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                {labels.vocab?.time || 'Time'}
              </div>
            </div>
            <div className="bg-muted/50 backdrop-blur-sm border border-border/40 rounded-[2rem] p-6 group-hover:bg-card transition-colors">
              <div className="text-3xl font-black text-foreground italic tracking-tighter">
                {moves}
              </div>
              <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                {labels.vocab?.moves || 'Moves'}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="auto"
            onClick={restartGame}
            className="w-full max-w-xs py-5 bg-black dark:bg-zinc-800 text-white font-black rounded-[2rem] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="text-lg italic tracking-tight">
              {labels.vocab?.restart || 'Try Again'}
            </span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar (Glass style) */}
      <div className="bg-card/80 backdrop-blur-xl p-5 rounded-[2.5rem] border border-border/40 shadow-xl flex justify-between items-center px-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />

        <div className="flex flex-col items-start relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-4 h-4 text-primary" />
            <span className="font-black text-2xl italic tracking-tighter text-foreground">
              {formatTime(timer)}
            </span>
          </div>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
            Duration
          </span>
        </div>

        <div className="flex flex-col items-center relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
            <span className="font-black text-2xl italic tracking-tighter text-foreground">
              {matchedPairs} <span className="text-muted-foreground text-sm">/ {totalPairs}</span>
            </span>
          </div>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
            Correct
          </span>
        </div>

        <div className="flex flex-col items-end relative z-10">
          <div className="text-2xl font-black text-foreground italic tracking-tighter mb-1">
            {moves}
          </div>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
            {labels.vocab?.moves || 'Moves'}
          </span>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card, idx) => {
          const state = cardStates[card.id] || 'normal';
          const isSelected = state === 'selected';
          const isWrong = state === 'wrong';
          const isMatched = state === 'matched';

          return (
            <Button
              variant="ghost"
              size="auto"
              key={`${card.id}:${idx}`}
              onClick={() => handleCardClick(card.id)}
              disabled={isMatched || isLocked}
              className={cn(
                'aspect-square rounded-[2rem] border-2 flex items-center justify-center cursor-pointer transition-all duration-300 text-center p-3 relative group overflow-hidden',
                state === 'normal' &&
                  'bg-card border-border/40 shadow-sm hover:border-primary/50 hover:bg-muted/30 active:scale-95',
                isSelected &&
                  'bg-primary border-primary shadow-xl shadow-primary/20 scale-105 active:scale-100',
                isMatched &&
                  'bg-emerald-500 border-emerald-500 scale-95 opacity-0 pointer-events-none rotate-12 transition-all duration-1000',
                isWrong && 'bg-rose-50 border-rose-500 dark:bg-rose-500/10 animate-shake'
              )}
            >
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity',
                  isSelected && 'opacity-100'
                )}
              />

              <span
                className={cn(
                  'font-black italic tracking-tighter transition-colors relative z-10 transition-transform duration-300',
                  card.type === 'korean'
                    ? 'text-xl sm:text-2xl'
                    : 'text-xs sm:text-sm font-bold uppercase tracking-wider',
                  state === 'normal' && 'text-foreground opacity-80',
                  isSelected && 'text-white scale-110',
                  isWrong && 'text-rose-600 dark:text-rose-400'
                )}
              >
                {card.content}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Shake Animation */}
      <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake { animation: shake 0.3s ease-in-out; }
            `}</style>
    </div>
  );
}
