import { Volume2, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { ExtendedVocabItem } from '../../pages/VocabModulePage';
import { useTranslation } from 'react-i18next';
import { useState } from 'react'; // Added missing import for useState

interface MobileFlashcardPlayerProps {
  readonly words: ExtendedVocabItem[]; // Current filtered words
  readonly currentIndex: number;
  readonly onReview: (word: ExtendedVocabItem, quality: number) => void;
  readonly onStar: (id: string) => void;
  readonly onSpeak: (text: string) => void;
  readonly isStarred: (id: string) => boolean;
  readonly onNext: () => void;
  readonly onPrev: () => void;
}

export default function MobileFlashcardPlayer({
  words,
  currentIndex,
  onReview,
  onStar,
  onSpeak,
  isStarred,
  onNext: _onNext,
  onPrev: _onPrev,
}: MobileFlashcardPlayerProps) {
  const { t } = useTranslation();
  const [isFlipped, setIsFlipped] = useState(false);
  const currentWord = words[currentIndex];
  const korean = currentWord?.korean || currentWord?.word || '';
  const frontText = korean || currentWord?.meaning || currentWord?.english || '';

  if (!currentWord) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <p>{t('vocab.noWords') || 'No words available'}</p>
      </div>
    );
  }

  const handleGrade = (quality: number) => {
    onReview(currentWord, quality);
    setIsFlipped(false); // Reset flip for next card (managed by parent index change)
  };

  return (
    <div className="flex flex-col h-full">
      {/* Card Container */}
      <div
        className="flex-1 relative perspective-1000 mb-6 min-h-[340px]"
        onClick={() => setIsFlipped(!isFlipped)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsFlipped(!isFlipped);
          }
        }}
      >
        <motion.div
          className="w-full h-full relative preserve-3d transition-all duration-500"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 backface-hidden bg-white rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="absolute top-4 left-4 px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase">
              {currentWord.partOfSpeech || 'Word'}
            </div>

            <button
              className="absolute top-4 right-4 text-slate-300 hover:text-yellow-400 active:scale-90 transition-transform"
              onClick={e => {
                e.stopPropagation();
                onStar(currentWord.id);
              }}
            >
              <Star
                className={`w-6 h-6 ${isStarred(currentWord.id) ? 'fill-yellow-400 text-yellow-400' : ''}`}
              />
            </button>

            <div className="w-full h-full pt-14 grid grid-rows-[1fr,auto,auto]">
              <div className="px-8 text-center flex flex-col items-center justify-center">
                <h2 className="text-4xl font-black text-slate-900 mb-2 break-all">{frontText}</h2>
                {currentWord.pronunciation && (
                  <p className="text-lg text-slate-400 font-medium font-mono">
                    [{currentWord.pronunciation}]
                  </p>
                )}
              </div>

              <div className="w-full flex justify-center pb-4">
                <button
                  className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors active:scale-95"
                  onClick={e => {
                    e.stopPropagation();
                    onSpeak(korean || frontText);
                  }}
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              </div>

              <div className="pb-6 text-xs text-slate-400 font-medium uppercase tracking-wide text-center">
                Tap to Flip
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 backface-hidden bg-slate-900 rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.2)] flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="flex-1 flex flex-col items-center justify-center">
              <h2 className="text-2xl font-black text-white mb-4 leading-tight">
                {currentWord.meaning || currentWord.english}
              </h2>
              {currentWord.exampleSentence && (
                <div className="text-sm text-slate-400 italic mt-4 border-t border-slate-700 pt-4 w-full">
                  <p className="mb-1 text-slate-300">&quot;{currentWord.exampleSentence}&quot;</p>
                  <p className="text-xs opacity-70">{currentWord.exampleMeaning}</p>
                </div>
              )}
            </div>
            <div className="absolute bottom-6 w-full flex justify-center">
              <button
                className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider hover:text-white"
                onClick={e => {
                  e.stopPropagation();
                  onSpeak(korean);
                }}
              >
                <Volume2 className="w-4 h-4" /> Listen Again
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-4 gap-2">
        <GradeButton
          label={t('vocab.rating.again') || 'Again'}
          color="red"
          onClick={() => handleGrade(1)}
        />
        <GradeButton
          label={t('vocab.rating.hard') || 'Hard'}
          color="slate"
          onClick={() => handleGrade(2)}
        />
        <GradeButton
          label={t('vocab.rating.good') || 'Good'}
          color="blue"
          onClick={() => handleGrade(3)}
        />
        <GradeButton
          label={t('vocab.rating.easy') || 'Easy'}
          color="green"
          onClick={() => handleGrade(4)}
        />
      </div>
    </div>
  );
}

function GradeButton({
  label,
  color,
  onClick,
}: {
  readonly label: string;
  readonly color: 'red' | 'slate' | 'blue' | 'green';
  readonly onClick: () => void;
}) {
  const colorStyles = {
    red: 'bg-red-100 text-red-600 border-red-200 active:bg-red-200',
    slate: 'bg-slate-200 text-slate-600 border-slate-300 active:bg-slate-300',
    blue: 'bg-blue-100 text-blue-600 border-blue-200 active:bg-blue-200',
    green: 'bg-green-100 text-green-600 border-green-200 active:bg-green-200',
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-4 rounded-xl font-bold text-xs uppercase border-b-4 active:border-b-0 active:translate-y-1 transition-all h-20 ${colorStyles[color]}`}
    >
      {label}
    </button>
  );
}
