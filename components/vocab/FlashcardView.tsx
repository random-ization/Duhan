import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Volume2, Hand, Keyboard, CheckCircle, XCircle } from 'lucide-react';
import { ExtendedVocabularyItem, VocabSettings } from './types';
import { Language } from '../../types';
import { getLabels } from '../../utils/i18n';
import { speak } from './utils';

interface FlashcardViewProps {
  words: ExtendedVocabularyItem[];
  settings: VocabSettings;
  language: Language;
  onComplete: (stats: { correct: ExtendedVocabularyItem[]; incorrect: ExtendedVocabularyItem[] }) => void;
  onSaveWord?: (word: ExtendedVocabularyItem) => void;
}

const FlashcardView: React.FC<FlashcardViewProps> = React.memo(({
  words,
  settings,
  language,
  onComplete,
  onSaveWord,
}) => {
  const labels = useMemo(() => getLabels(language), [language]);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState<{ correct: ExtendedVocabularyItem[]; incorrect: ExtendedVocabularyItem[] }>({ 
    correct: [], 
    incorrect: [] 
  });

  // Drag State
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const currentCard = words[cardIndex];

  const resetDrag = useCallback(() => {
    setDragStart(null);
    setDragOffset({x: 0, y: 0});
    setIsDragging(false);
  }, []);

  const handleDragStart = useCallback((x: number, y: number) => {
    setDragStart({x, y});
    setIsDragging(true);
  }, []);

  const handleDragMove = (x: number, y: number) => {
    if (!dragStart) return;
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    setDragOffset({x: deltaX, y: deltaY});
  };

  const handleDragEnd = () => {
    if (!dragStart) return;
    
    const threshold = 100;
    if (dragOffset.x > threshold) {
      handleCardRate(true);
    } else if (dragOffset.x < -threshold) {
      handleCardRate(false);
    }
    
    resetDrag();
  };

  const handleCardRate = (know: boolean) => {
    if (!currentCard) return;

    const updatedStats = {
      correct: know ? [...sessionStats.correct, currentCard] : sessionStats.correct,
      incorrect: !know ? [...sessionStats.incorrect, currentCard] : sessionStats.incorrect,
    };
    setSessionStats(updatedStats);

    // If "Don't Know", save it
    if (!know && onSaveWord) {
      onSaveWord(currentCard);
    }

    if (cardIndex + 1 < words.length) {
      setCardIndex(cardIndex + 1);
      setIsFlipped(false);
    } else {
      // Session complete
      onComplete(updatedStats);
    }
  };

  // Keyboard controls
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setIsFlipped(!isFlipped);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleCardRate(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleCardRate(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, cardIndex]);

  if (!currentCard) {
    return <div className="text-center text-slate-500">{labels.noWords}</div>;
  }

  return (
    <div className="flex flex-col items-center">
      {/* Keyboard Hint */}
      <div className="hidden md:flex gap-8 text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">
        <span className="flex items-center"><Keyboard className="w-3 h-3 mr-1" /> {labels.keyLeft}</span>
        <span className="flex items-center"><Keyboard className="w-3 h-3 mr-1" /> {labels.keySpace}</span>
        <span className="flex items-center"><Keyboard className="w-3 h-3 mr-1" /> {labels.keyRight}</span>
      </div>

      <div 
        className="perspective-1000 w-full max-w-2xl h-96 relative cursor-pointer group mb-8 select-none touch-none" 
        onClick={() => !isDragging && setIsFlipped(!isFlipped)}
        onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleDragEnd}
        ref={cardRef}
      >
        <div 
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{ 
            transform: isDragging 
              ? `translateX(${dragOffset.x}px) rotate(${dragOffset.x * 0.05}deg) ${isFlipped ? 'rotateY(180deg)' : ''}` 
              : undefined,
            transition: isDragging ? 'none' : 'transform 0.5s'
          }}
        >
          {/* Drag Overlays */}
          {isDragging && dragOffset.x > 50 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-emerald-500/20 rounded-2xl border-4 border-emerald-500">
              <CheckCircle className="w-32 h-32 text-emerald-600 opacity-50" />
            </div>
          )}
          {isDragging && dragOffset.x < -50 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-500/20 rounded-2xl border-4 border-red-500">
              <XCircle className="w-32 h-32 text-red-600 opacity-50" />
            </div>
          )}

          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-white rounded-2xl shadow-xl border-b-4 border-indigo-100 flex flex-col items-center justify-center p-8 text-center">
            <div className="absolute top-6 left-6 text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
              {labels.unit} {currentCard.unit}
            </div>
            
            {settings.flashcard.cardFront === 'KOREAN' ? (
              <>
                <h3 className="text-5xl font-bold text-slate-900 leading-tight mb-6">{currentCard.korean}</h3>
                <div 
                  className="p-3 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                  onClick={(e) => { e.stopPropagation(); speak(currentCard.korean); }}
                  onMouseDown={(e) => e.stopPropagation()} // Prevent drag
                >
                  <Volume2 className="w-6 h-6" />
                </div>
              </>
            ) : (
              <h3 className="text-4xl font-medium text-slate-800 leading-tight">{currentCard.english}</h3>
            )}

            <div className="absolute bottom-8 text-slate-400 text-sm font-medium flex items-center gap-2">
              <Hand className="w-4 h-4" />
              {labels.clickToFlip}
            </div>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-2xl shadow-xl border-b-4 border-emerald-100 flex flex-col items-center justify-center p-8 text-center">
            {settings.flashcard.cardFront === 'KOREAN' ? (
              <>
                <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">{labels.definition}</div>
                <p className="text-3xl font-medium text-indigo-600 mb-6">{currentCard.english}</p>
              </>
            ) : (
              <>
                <h3 className="text-5xl font-bold text-indigo-600 mb-4">{currentCard.korean}</h3>
                <div 
                  className="mb-6 p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 inline-block"
                  onClick={(e) => { e.stopPropagation(); speak(currentCard.korean); }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Volume2 className="w-5 h-5" />
                </div>
              </>
            )}

            {currentCard.exampleSentence && (
              <div className="bg-slate-50 p-4 rounded-lg w-full max-w-lg">
                <p className="text-slate-800 text-lg mb-1">{currentCard.exampleSentence}</p>
                {currentCard.exampleTranslation && <p className="text-slate-500 text-sm">{currentCard.exampleTranslation}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Flashcard Controls (X / O) */}
      <div className="flex gap-6 w-full max-w-sm justify-center">
        <button 
          onClick={() => handleCardRate(false)}
          className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-red-100 rounded-xl shadow-sm hover:bg-red-50 hover:border-red-200 transition-all group active:scale-95"
        >
          <XCircle className="w-8 h-8 text-red-400 group-hover:text-red-500 mb-2" />
          <span className="text-xs font-bold text-red-400 uppercase tracking-wider">{labels.donTKnow}</span>
        </button>
        <button 
          onClick={() => handleCardRate(true)}
          className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-emerald-100 rounded-xl shadow-sm hover:bg-emerald-50 hover:border-emerald-200 transition-all group active:scale-95"
        >
          <CheckCircle className="w-8 h-8 text-emerald-400 group-hover:text-emerald-500 mb-2" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{labels.know}</span>
        </button>
      </div>
      
      <div className="mt-4 text-slate-400 text-sm font-medium">
        {cardIndex + 1} / {words.length}
      </div>
    </div>
  );
});

export default FlashcardView;
