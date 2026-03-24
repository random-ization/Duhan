import React, { useState, useMemo, useCallback } from 'react';
import { ArrowRight, Check, X, Pencil, AlignLeft, Volume2 } from 'lucide-react';

import { Language } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import { useTTS } from '../../../hooks/useTTS';
import { cn } from '../../../lib/utils';
import { BottomSheet } from '../../../components/common/BottomSheet';
import { Button } from '../../../components/ui';
import { Input } from '../../../components/ui';
import { getPosColorClass } from '../../../utils/posColors';

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

const isChoiceQuestionType = (questionType: QuestionType): boolean =>
  questionType.startsWith('CHOICE');
const isWritingQuestionType = (questionType: QuestionType): boolean =>
  questionType.startsWith('WRITING');
const isKoreanToNativeType = (questionType: QuestionType): boolean =>
  questionType.includes('K_TO_N');

const getPromptForType = (
  questionType: QuestionType,
  item: ExtendedVocabularyItem | undefined
): string | undefined => (isKoreanToNativeType(questionType) ? item?.korean : item?.english);

const getCorrectAnswerForType = (
  questionType: QuestionType,
  item: ExtendedVocabularyItem | undefined
): string | undefined => (isKoreanToNativeType(questionType) ? item?.english : item?.korean);

const shouldAutoSpeak = (questionType: QuestionType, correct: boolean): boolean =>
  questionType.includes('N_TO_K') || (questionType.includes('K_TO_N') && !correct);

const getChoiceVariantClass = (
  reveal: boolean,
  isCorrectChoice: boolean,
  isSelected: boolean
): string => {
  if (reveal) {
    if (isCorrectChoice) return 'bg-emerald-100 border-emerald-500 text-emerald-700 shadow-none';
    if (isSelected) return 'bg-red-100 border-red-500 text-red-700 shadow-none';
    return 'opacity-50 bg-muted border-border';
  }
  if (isSelected) return 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200';
  return 'bg-card border-border text-muted-foreground hover:bg-muted';
};

const canSubmitCurrentAnswer = (
  questionType: QuestionType,
  selectedAnswer: string | null,
  userInput: string
): boolean => {
  if (isChoiceQuestionType(questionType)) return Boolean(selectedAnswer);
  return Boolean(userInput.trim());
};

const MobileQuestionCard: React.FC<{
  currentQuestionType: QuestionType;
  prompt: string | undefined;
  currentItem: ExtendedVocabularyItem;
  labels: ReturnType<typeof getLabels>;
  speakTTS: (text: string) => Promise<boolean>;
}> = ({ currentQuestionType, prompt, currentItem, labels, speakTTS }) => (
  <div className="bg-card rounded-[2rem] shadow-sm border border-border p-8 flex flex-col items-center justify-center min-h-[30vh] md:min-h-[40vh] mb-6 relative overflow-hidden">
    <div className="absolute top-6 left-6 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
      {isWritingQuestionType(currentQuestionType) ? (
        <Pencil className="w-3 h-3" />
      ) : (
        <AlignLeft className="w-3 h-3" />
      )}
      {isWritingQuestionType(currentQuestionType)
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
    {isKoreanToNativeType(currentQuestionType) && (
      <Button
        variant="ghost"
        size="auto"
        onClick={() => speakTTS(prompt || '')}
        className="mt-4 p-3 rounded-full bg-muted text-indigo-600 active:scale-95 transition-transform"
      >
        <Volume2 className="w-6 h-6" />
      </Button>
    )}
    {(currentItem.partOfSpeech || currentItem.pos) && (
      <span
        className={`mt-4 px-3 py-1 rounded-full text-xs font-bold uppercase inline-block ${getPosColorClass(currentItem.partOfSpeech || currentItem.pos)}`}
      >
        {currentItem.partOfSpeech || currentItem.pos}
      </span>
    )}
  </div>
);

const MobileInteractionArea: React.FC<{
  currentQuestionType: QuestionType;
  choices: string[];
  selectedAnswer: string | null;
  correctAnswer: string | undefined;
  showFeedback: boolean;
  setSelectedAnswer: (value: string) => void;
  userInput: string;
  setUserInput: (value: string) => void;
  labels: ReturnType<typeof getLabels>;
}> = ({
  currentQuestionType,
  choices,
  selectedAnswer,
  correctAnswer,
  showFeedback,
  setSelectedAnswer,
  userInput,
  setUserInput,
  labels,
}) => {
  if (isChoiceQuestionType(currentQuestionType)) {
    return (
      <div className="grid grid-cols-1 gap-3">
        {choices.map((choice, idx) => {
          const isSelected = selectedAnswer === choice;
          const isCorrectChoice = choice === correctAnswer;
          const reveal = showFeedback;
          const variantClass = getChoiceVariantClass(reveal, isCorrectChoice, isSelected);

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
              {reveal && isSelected && !isCorrectChoice && <X className="w-5 h-5 text-red-600" />}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        autoFocus
        value={userInput}
        onChange={e => setUserInput(e.target.value)}
        className="h-16 text-xl rounded-xl border-2 border-border bg-card focus:border-indigo-500 font-bold text-center"
        placeholder={labels.typeAnswer || 'Type your answer...'}
        disabled={showFeedback}
      />
    </div>
  );
};

const MobileFooterAction: React.FC<{
  showFeedback: boolean;
  currentQuestionType: QuestionType;
  selectedAnswer: string | null;
  userInput: string;
  labels: ReturnType<typeof getLabels>;
  checkAnswer: () => void;
  isCorrect: boolean;
  handleNext: () => void;
  learnIndex: number;
  total: number;
}> = ({
  showFeedback,
  currentQuestionType,
  selectedAnswer,
  userInput,
  labels,
  checkAnswer,
  isCorrect,
  handleNext,
  learnIndex,
  total,
}) => {
  if (!showFeedback) {
    const canSubmit = canSubmitCurrentAnswer(currentQuestionType, selectedAnswer, userInput);
    return (
      <Button
        size="lg"
        className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-indigo-200"
        onClick={checkAnswer}
        disabled={!canSubmit}
      >
        {labels.checkAnswer || 'Check Answer'}
      </Button>
    );
  }

  return (
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
      {learnIndex < total - 1 ? (
        <span className="flex items-center gap-2">
          {labels.next || 'Next'} <ArrowRight className="w-5 h-5" />
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {labels.finish || 'Finish'} <ArrowRight className="w-5 h-5" />
        </span>
      )}
    </Button>
  );
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

  const prompt = getPromptForType(currentQuestionType, currentItem);
  const correctAnswer = getCorrectAnswerForType(currentQuestionType, currentItem);

  const choices = useMemo(() => {
    if (!currentItem || !isChoiceQuestionType(currentQuestionType)) return [];
    return shuffleArray([correctAnswer!, ...generateDistractors(correctAnswer!)]);
  }, [currentItem, currentQuestionType, correctAnswer, generateDistractors]);

  const checkAnswer = useCallback(() => {
    if (!currentItem) return;
    let correct = false;

    if (isChoiceQuestionType(currentQuestionType)) {
      correct = selectedAnswer === correctAnswer;
    } else {
      correct = userInput.trim().toLowerCase() === correctAnswer?.toLowerCase();
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    // Auto speak if korean
    if (shouldAutoSpeak(currentQuestionType, correct)) {
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

      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <MobileQuestionCard
          currentQuestionType={currentQuestionType}
          prompt={prompt}
          currentItem={currentItem}
          labels={labels}
          speakTTS={speakTTS}
        />

        <div className="flex-1">
          <MobileInteractionArea
            currentQuestionType={currentQuestionType}
            choices={choices}
            selectedAnswer={selectedAnswer}
            correctAnswer={correctAnswer}
            showFeedback={showFeedback}
            setSelectedAnswer={setSelectedAnswer}
            userInput={userInput}
            setUserInput={setUserInput}
            labels={labels}
          />
        </div>
      </div>

      {/* Footer Action */}
      <div className="p-4 bg-card border-t border-border sticky bottom-0 z-20">
        <MobileFooterAction
          showFeedback={showFeedback}
          currentQuestionType={currentQuestionType}
          selectedAnswer={selectedAnswer}
          userInput={userInput}
          labels={labels}
          checkAnswer={checkAnswer}
          isCorrect={isCorrect}
          handleNext={handleNext}
          learnIndex={learnIndex}
          total={learnQueue.length}
        />
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
              {labels.correctAnswer || 'Correct Answer'}
            </p>
            <p className="text-xl font-black text-red-700">{correctAnswer}</p>
          </div>
          {/* Provide context/explanation if available later */}
        </div>
      </BottomSheet>
    </div>
  );
};
