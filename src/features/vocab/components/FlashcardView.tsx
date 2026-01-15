import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Volume2, Hand, Keyboard, CheckCircle, XCircle } from 'lucide-react';
import { ExtendedVocabularyItem, VocabSettings } from '../types';
import { Language } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import { getLocalizedContent } from '../../../utils/languageUtils';
import { speak } from '../utils';

interface FlashcardViewProps {
  words: ExtendedVocabularyItem[];
  settings: VocabSettings;
  language: Language;
  onComplete: (stats: {
    correct: ExtendedVocabularyItem[];
    incorrect: ExtendedVocabularyItem[];
  }) => void;
  onSaveWord?: (word: ExtendedVocabularyItem) => void;
}

const FlashcardView: React.FC<FlashcardViewProps> = React.memo(
  ({ words, settings, language, onComplete, onSaveWord }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const [cardIndex, setCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [sessionStats, setSessionStats] = useState<{
      correct: ExtendedVocabularyItem[];
      incorrect: ExtendedVocabularyItem[];
    }>({
      correct: [],
      incorrect: [],
    });

    // Drag State
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const currentCard = words[cardIndex];

    const resetDrag = useCallback(() => {
      setDragStart(null);
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
    }, []);

    const handleDragStart = useCallback((x: number, y: number) => {
      setDragStart({ x, y });
      setIsDragging(true);
    }, []);

    const handleDragMove = (x: number, y: number) => {
      if (!dragStart) return;
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;
      setDragOffset({ x: deltaX, y: deltaY });
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
          <span className="flex items-center">
            <Keyboard className="w-3 h-3 mr-1" /> {labels.keyLeft}
          </span>
          <span className="flex items-center">
            <Keyboard className="w-3 h-3 mr-1" /> {labels.keySpace}
          </span>
          <span className="flex items-center">
            <Keyboard className="w-3 h-3 mr-1" /> {labels.keyRight}
          </span>
        </div>

        <div
          className="perspective-1000 w-full max-w-2xl h-96 relative cursor-pointer group mb-8 select-none touch-none"
          onClick={() => !isDragging && setIsFlipped(!isFlipped)}
          onMouseDown={e => handleDragStart(e.clientX, e.clientY)}
          onMouseMove={e => handleDragMove(e.clientX, e.clientY)}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={e => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={e => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={handleDragEnd}
          ref={cardRef}
        >
          <div
            className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
            style={{
              transform: isDragging
                ? `translateX(${dragOffset.x}px) rotate(${dragOffset.x * 0.05}deg) ${isFlipped ? 'rotateY(180deg)' : ''}`
                : undefined,
              transition: isDragging ? 'none' : 'transform 0.5s',
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
                  <h3 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
                    {currentCard.korean}
                  </h3>
                  <div
                    className="p-3 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                    onClick={e => {
                      e.stopPropagation();
                      speak(currentCard.korean);
                    }}
                    onMouseDown={e => e.stopPropagation()} // Prevent drag
                  >
                    <Volume2 className="w-6 h-6" />
                  </div>
                </>
              ) : (
                <h3 className="text-4xl font-medium text-slate-800 leading-tight">
                  {getLocalizedContent(currentCard, 'meaning', language) || currentCard.english}
                </h3>
              )}

              <div className="absolute bottom-8 text-slate-400 text-sm font-medium flex items-center gap-2">
                <Hand className="w-4 h-4" />
                {labels.clickToFlip}
              </div>
            </div>

            {/* Back */}
            <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-2xl shadow-xl border-b-4 border-emerald-100 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
              {/* POS Badge */}
              {currentCard.partOfSpeech && (
                <div className={`mb-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${currentCard.partOfSpeech === 'VERB_T' ? 'bg-blue-100 text-blue-700' :
                  currentCard.partOfSpeech === 'VERB_I' ? 'bg-red-100 text-red-700' :
                    currentCard.partOfSpeech === 'ADJ' ? 'bg-purple-100 text-purple-700' :
                      currentCard.partOfSpeech === 'NOUN' ? 'bg-green-100 text-green-700' :
                        currentCard.partOfSpeech === 'ADV' ? 'bg-orange-100 text-orange-700' :
                          currentCard.partOfSpeech === 'PARTICLE' ? 'bg-gray-100 text-gray-700' :
                            'bg-slate-100 text-slate-700'
                  }`}>
                  {currentCard.partOfSpeech === 'VERB_T' ? (labels.pos?.verb_t || 'v.t.') :
                    currentCard.partOfSpeech === 'VERB_I' ? (labels.pos?.verb_i || 'v.i.') :
                      currentCard.partOfSpeech === 'ADJ' ? (labels.pos?.adj || 'adj.') :
                        currentCard.partOfSpeech === 'NOUN' ? (labels.pos?.noun || 'n.') :
                          currentCard.partOfSpeech === 'ADV' ? (labels.pos?.adv || 'adv.') :
                            currentCard.partOfSpeech === 'PARTICLE' ? (labels.pos?.particle || 'part.') :
                              currentCard.partOfSpeech}
                </div>
              )}

              {settings.flashcard.cardFront === 'KOREAN' ? (
                <>
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                    {labels.definition}
                  </div>
                  <p className="text-3xl font-medium text-indigo-600 mb-2">
                    {getLocalizedContent(currentCard, 'meaning', language) || currentCard.english}
                  </p>
                  {/* Hanja */}
                  {currentCard.hanja && (
                    <p className="text-lg text-slate-500 mb-4">漢字: {currentCard.hanja}</p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-5xl font-bold text-indigo-600 mb-2">{currentCard.korean}</h3>
                  {/* Hanja */}
                  {currentCard.hanja && (
                    <p className="text-lg text-slate-500 mb-2">漢字: {currentCard.hanja}</p>
                  )}
                  <div
                    className="mb-4 p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 inline-block"
                    onClick={e => {
                      e.stopPropagation();
                      speak(currentCard.korean);
                    }}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <Volume2 className="w-5 h-5" />
                  </div>
                </>
              )}

              {/* Tips Section (Yellow Background) */}
              {currentCard.tips && (currentCard.tips.synonyms || currentCard.tips.antonyms || currentCard.tips.nuance) && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg w-full max-w-lg mb-3">
                  {currentCard.tips.synonyms && currentCard.tips.synonyms.length > 0 && (
                    <p className="text-sm text-yellow-800 mb-1">
                      <span className="font-bold">≈</span> {currentCard.tips.synonyms.join(', ')}
                    </p>
                  )}
                  {currentCard.tips.antonyms && currentCard.tips.antonyms.length > 0 && (
                    <p className="text-sm text-yellow-800 mb-1">
                      <span className="font-bold">≠</span> {currentCard.tips.antonyms.join(', ')}
                    </p>
                  )}
                  {currentCard.tips.nuance && (
                    <p className="text-sm text-yellow-700">
                      <span className="mr-1">💡</span>{currentCard.tips.nuance}
                    </p>
                  )}
                </div>
              )}

              {/* Example Sentence (Slate Background) */}
              {currentCard.exampleSentence && (
                <div className="bg-slate-50 p-3 rounded-lg w-full max-w-lg">
                  <p className="text-slate-800 text-base mb-1">{currentCard.exampleSentence}</p>
                  {currentCard.exampleTranslation && (
                    <p className="text-slate-500 text-sm">
                      {getLocalizedContent(currentCard, 'exampleTranslation', language)}
                    </p>
                  )}
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
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
              {labels.donTKnow}
            </span>
          </button>
          <button
            onClick={() => handleCardRate(true)}
            className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-emerald-100 rounded-xl shadow-sm hover:bg-emerald-50 hover:border-emerald-200 transition-all group active:scale-95"
          >
            <CheckCircle className="w-8 h-8 text-emerald-400 group-hover:text-emerald-500 mb-2" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {labels.know}
            </span>
          </button>
        </div>

        <div className="mt-4 text-slate-400 text-sm font-medium">
          {cardIndex + 1} / {words.length}
        </div>
      </div>
    );
  }
);
FlashcardView.displayName = "FlashcardView";

export default FlashcardView;
