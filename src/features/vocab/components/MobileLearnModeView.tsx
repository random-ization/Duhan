import React, { useState, useMemo, useCallback } from 'react';
import { ArrowRight, Check, X, Pencil, AlignLeft, Volume2 } from 'lucide-react';

import { Language } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import { useTTS } from '../../../hooks/useTTS';
import { cn } from '../../../lib/utils';
import { BottomSheet } from '../../../components/common/BottomSheet';
import { Button } from '../../../components/ui';
import { Input } from '../../../components/ui';
import { ExtendedVocabularyItem, VocabSettings, SessionStats, QuestionType } from '../types';
import { shuffleArray } from '../utils';

interface MobileLearnModeViewProps {
  words: ExtendedVocabularyItem[];
  settings: VocabSettings;
  language: Language;
  allWords: ExtendedVocabularyItem[];
  onComplete: (stats: SessionStats) => void;
  onRecordMistake?: (word: ExtendedVocabularyItem) => void;
  onExit?: () => void;
}

// Reuse logic from LearnModeView
const pickQuestionType = (settings: VocabSettings): QuestionType => {
  const availableTypes: QuestionType[] = [];
  const { types, answers } = settings.learn;
  if (types.multipleChoice && answers.native) availableTypes.push('CHOICE_K_TO_N');
  if (types.multipleChoice && answers.korean) availableTypes.push('CHOICE_N_TO_K');
  if (types.writing && answers.korean) availableTypes.push('WRITING_N_TO_K');
  if (types.writing && answers.native) availableTypes.push('WRITING_K_TO_N');
  const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
  return randomType || 'CHOICE_K_TO_N';
};

export const MobileLearnModeView: React.FC<MobileLearnModeViewProps> = ({
  words,
  settings,
  language,
  allWords,
  onComplete,
  onRecordMistake,
  onExit,
}) => {
  const labels = useMemo(() => getLabels(language), [language]);
  const { speak: speakTTS } = useTTS();

  // State
  const [learnQueue] = useState<ExtendedVocabularyItem[]>(() => {
    const queue = settings.learn.random ? shuffleArray([...words]) : [...words];
    return queue.slice(0, settings.learn.batchSize);
  });
  const [learnIndex, setLearnIndex] = useState(0);
  const [currentQuestionType, setCurrentQuestionType] = useState<QuestionType>(() =>
    pickQuestionType(settings)
  );
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({ correct: [], incorrect: [] });

  const currentItem = learnQueue[learnIndex];
  const progressPercent = learnQueue.length > 0 ? ((learnIndex + 1) / learnQueue.length) * 100 : 0;

  // Helpers
  const generateDistractors = useCallback(
    (correctAnswer: string, count: number = 3): string[] => {
      const pool = allWords.filter(
        w => (currentQuestionType.includes('K_TO_N') ? w.english : w.korean) !== correctAnswer
      );
      const shuffled = shuffleArray(pool);
      return shuffled
        .slice(0, count)
        .map(w => (currentQuestionType.includes('K_TO_N') ? w.english : w.korean));
    },
    [allWords, currentQuestionType]
  );

  const prompt = currentQuestionType.includes('K_TO_N')
    ? currentItem?.korean
    : currentItem?.english;
  const correctAnswer = currentQuestionType.includes('K_TO_N')
    ? currentItem?.english
    : currentItem?.korean;

  const choices = useMemo(() => {
    if (!currentItem || !currentQuestionType.startsWith('CHOICE')) return [];
    return shuffleArray([correctAnswer!, ...generateDistractors(correctAnswer!)]);
  }, [currentItem, currentQuestionType, correctAnswer, generateDistractors]);

  const checkAnswer = useCallback(() => {
    if (!currentItem) return;
    let correct = false;

    if (currentQuestionType.startsWith('CHOICE')) {
      correct = selectedAnswer === correctAnswer;
    } else {
      correct = userInput.trim().toLowerCase() === correctAnswer?.toLowerCase();
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    // Auto speak if korean
    if (
      currentQuestionType.includes('N_TO_K') ||
      (currentQuestionType.includes('K_TO_N') && !correct)
    ) {
      speakTTS(currentItem.korean);
    }

    if (correct) {
      setSessionStats(prev => ({ ...prev, correct: [...prev.correct, currentItem] }));
    } else {
      setSessionStats(prev => ({ ...prev, incorrect: [...prev.incorrect, currentItem] }));
      onRecordMistake?.(currentItem);
    }
  }, [
    currentItem,
    currentQuestionType,
    selectedAnswer,
    userInput,
    correctAnswer,
    onRecordMistake,
    speakTTS,
  ]);

  const handleNext = () => {
    if (learnIndex < learnQueue.length - 1) {
      setLearnIndex(prev => prev + 1);
      setCurrentQuestionType(pickQuestionType(settings));
      setSelectedAnswer(null);
      setUserInput('');
      setShowFeedback(false);
      setIsCorrect(false);
    } else {
      onComplete(sessionStats);
    }
  };

  if (!currentItem)
    return (
      <div className="p-8 text-center text-muted-foreground">
        {labels.noWords || 'No words yet.'}
      </div>
    );

  return (
    <div className="min-h-screen bg-muted flex flex-col pb-safe">
      {/* Header */}
      <div className="bg-card px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-muted-foreground">
            {learnIndex + 1} / {learnQueue.length}
          </span>
        </div>
        {onExit && (
          <Button variant="ghost" size="icon" onClick={onExit} className="text-muted-foreground">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Top Progress */}
      <div className="h-1.5 bg-muted w-full">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Question Card */}
        <div className="bg-card rounded-[2rem] shadow-sm border border-border p-8 flex flex-col items-center justify-center min-h-[30vh] md:min-h-[40vh] mb-6 relative overflow-hidden">
          <div className="absolute top-6 left-6 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {currentQuestionType.startsWith('WRITING') ? (
              <Pencil className="w-3 h-3" />
            ) : (
              <AlignLeft className="w-3 h-3" />
            )}
            {currentQuestionType.startsWith('WRITING')
              ? labels.writingMode || 'Writing'
              : labels.multipleChoice || 'Multiple Choice'}
          </div>

          <h2
            className={cn(
              'font-black text-foreground text-center leading-tight',
              prompt && prompt.length > 20 ? 'text-2xl' : 'text-4xl'
            )}
          >
            {prompt}
          </h2>
          {currentQuestionType.includes('K_TO_N') && (
            <Button
              variant="ghost"
              size="auto"
              onClick={() => speakTTS(prompt || '')}
              className="mt-4 p-3 rounded-full bg-muted text-indigo-600 active:scale-95 transition-transform"
            >
              <Volume2 className="w-6 h-6" />
            </Button>
          )}
          {currentItem.pos && (
            <span className="mt-4 px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-bold uppercase">
              {currentItem.pos}
            </span>
          )}
        </div>

        {/* Interact Area */}
        <div className="flex-1">
          {currentQuestionType.startsWith('CHOICE') ? (
            <div className="grid grid-cols-1 gap-3">
              {choices.map((choice, idx) => {
                const isSelected = selectedAnswer === choice;
                const isCorrectChoice = choice === correctAnswer;
                const reveal = showFeedback;

                let variantClass = 'bg-card border-border text-muted-foreground hover:bg-muted';
                if (reveal) {
                  if (isCorrectChoice)
                    variantClass = 'bg-emerald-100 border-emerald-500 text-emerald-700 shadow-none';
                  else if (isSelected)
                    variantClass = 'bg-red-100 border-red-500 text-red-700 shadow-none';
                  else variantClass = 'opacity-50 bg-muted border-border';
                } else if (isSelected) {
                  variantClass =
                    'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200';
                }

                return (
                  <Button
                    variant="ghost"
                    size="auto"
                    key={idx}
                    disabled={reveal}
                    onClick={() => setSelectedAnswer(choice)}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 text-left font-bold text-lg transition-all active:scale-[0.98] shadow-sm flex items-center justify-between',
                      variantClass
                    )}
                  >
                    <span>{choice}</span>
                    {reveal && isCorrectChoice && <Check className="w-5 h-5 text-emerald-600" />}
                    {reveal && isSelected && !isCorrectChoice && (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                autoFocus
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                className="h-16 text-xl rounded-xl border-2 border-border bg-card focus:border-indigo-500 font-bold text-center"
                placeholder="Type answer..."
                disabled={showFeedback}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer Action */}
      <div className="p-4 bg-card border-t border-border sticky bottom-0 z-20">
        {!showFeedback ? (
          <Button
            size="lg"
            className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-indigo-200"
            onClick={() => {
              if (currentQuestionType.startsWith('WRITING') && !userInput.trim()) return;
              if (currentQuestionType.startsWith('CHOICE') && !selectedAnswer) return;
              checkAnswer();
            }}
            disabled={
              currentQuestionType.startsWith('CHOICE') ? !selectedAnswer : !userInput.trim()
            }
          >
            {labels.checkAnswer || 'Check Answer'}
          </Button>
        ) : (
          <Button
            size="lg"
            className={cn(
              'w-full h-14 text-lg font-bold rounded-xl shadow-lg',
              isCorrect
                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
                : 'bg-primary hover:bg-muted shadow-slate-200'
            )}
            onClick={handleNext}
          >
            {learnIndex < learnQueue.length - 1 ? (
              <span className="flex items-center gap-2">
                {labels.next || 'Next'} <ArrowRight className="w-5 h-5" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {labels.finish || 'Finish'} <ArrowRight className="w-5 h-5" />
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Incorrect Sheet */}
      <BottomSheet
        isOpen={showFeedback && !isCorrect}
        onClose={() => {}} // Block closing by click outside? Or let it close but buttons are in footer anyway
        height="auto"
        title={labels.incorrect || 'Incorrect'}
      >
        <div className="pb-8">
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 mb-4">
            <p className="text-sm font-bold text-red-400 uppercase tracking-wider mb-1">
              Correct Answer
            </p>
            <p className="text-xl font-black text-red-700">{correctAnswer}</p>
          </div>
          {/* Provide context/explanation if available later */}
        </div>
      </BottomSheet>
    </div>
  );
};
