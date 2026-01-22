import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Trophy, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getLabels } from '../../../utils/i18n';

interface VocabItem {
  id: string;
  korean: string;
  english: string;
  unit: number;
}

interface VocabMatchProps {
  words: VocabItem[];
  onComplete?: (time: number, moves: number) => void;
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
    const cardList: MatchCard[] = [];

    selectedWords.forEach((word, idx) => {
      cardList.push({
        id: `korean-${idx}`,
        content: word.korean,
        pairId: word.id,
        type: 'korean',
        isMatched: false,
      });
      cardList.push({
        id: `english-${idx}`,
        content: word.english,
        pairId: word.id,
        type: 'english',
        isMatched: false,
      });
    });

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
        setTimeout(() => {
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
              onComplete?.(timer, moves + 1);
            }
            return newPairs;
          });
          setSelectedCards([]);
          setIsLocked(false);
        }, 300);
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
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-12 text-center">
        <p className="text-slate-500 font-medium">
          {(
            labels.vocab?.minWordsMatch || 'Need at least {count} words to start matching game'
          ).replace('{count}', String(totalPairs))}
        </p>
      </div>
    );
  }

  // Victory Screen
  if (gameState === 'COMPLETE') {
    return (
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-green-50" />
        <div className="relative z-10">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-yellow-100 flex items-center justify-center">
            <Trophy className="w-12 h-12 text-yellow-600" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">
            🎉 {labels.vocab?.matchTitle || 'Perfect Match!'}
          </h2>
          <p className="text-slate-500 mb-6">
            {labels.vocab?.matchDesc || 'You matched all words!'}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm mx-auto">
            <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
              <div className="text-3xl font-black text-slate-900">{formatTime(timer)}</div>
              <div className="text-xs text-slate-400 font-bold">{labels.vocab?.time || 'Time'}</div>
            </div>
            <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
              <div className="text-3xl font-black text-slate-900">{moves}</div>
              <div className="text-xs text-slate-400 font-bold">
                {labels.vocab?.moves || 'Moves'}
              </div>
            </div>
          </div>

          <button
            onClick={restartGame}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-black rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            {labels.vocab?.restart || 'Restart'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-slate-400" />
          <span className="font-black text-xl">{formatTime(timer)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span className="font-bold">
            {matchedPairs} / {totalPairs} {labels.vocab?.pairs || 'Pairs'}
          </span>
        </div>
        <div className="text-sm font-medium text-slate-400">
          {labels.vocab?.moves || 'Moves'}: <span className="text-white font-black">{moves}</span>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-4 gap-3 md:gap-5">
        {cards.map((card, idx) => {
          const state = cardStates[card.id] || 'normal';
          let cardClass =
            'aspect-square rounded-2xl border-2 flex items-center justify-center cursor-pointer transition-all text-center p-2';

          if (state === 'normal') {
            cardClass +=
              ' bg-white border-slate-900 border-b-[6px] hover:bg-slate-50 active:border-b-2 active:translate-y-1';
          } else if (state === 'selected') {
            cardClass +=
              ' bg-[#FEE500] border-slate-900 border-b-[2px] translate-y-[4px] shadow-none';
          } else if (state === 'matched') {
            cardClass += ' bg-[#4ADE80] border-green-600 opacity-0 pointer-events-none';
          } else if (state === 'wrong') {
            cardClass += ' bg-red-50 border-red-500 border-b-[6px] animate-shake';
          }

          return (
            <button
              key={`${card.id}:${idx}`}
              onClick={() => handleCardClick(card.id)}
              disabled={state === 'matched' || isLocked}
              className={cardClass}
            >
              <span
                className={`font-bold ${card.type === 'korean' ? 'text-lg md:text-xl' : 'text-sm md:text-base'} ${
                  state === 'matched'
                    ? 'text-white'
                    : state === 'wrong'
                      ? 'text-red-600'
                      : 'text-slate-900'
                }`}
              >
                {card.content}
              </span>
            </button>
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
