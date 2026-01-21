import React, { useState, useCallback, useMemo } from 'react';
import { Pencil, AlignLeft, Check, X, Volume2, ArrowRight } from 'lucide-react';
import { ExtendedVocabularyItem, VocabSettings, QuestionType, SessionStats } from '../types';
import { Language } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import { shuffleArray } from '../utils';
import { useTTS } from '../../../hooks/useTTS';

interface LearnModeViewProps {
  words: ExtendedVocabularyItem[];
  settings: VocabSettings;
  language: Language;
  allWords: ExtendedVocabularyItem[]; // For generating distractors
  onComplete: (stats: SessionStats) => void;
  onRecordMistake?: (word: ExtendedVocabularyItem) => void;
}

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

const LearnModeViewInner: React.FC<LearnModeViewProps> = React.memo(
  ({ words, settings, language, allWords, onComplete, onRecordMistake }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const { speak: speakTTS } = useTTS();
    const speakKorean = useCallback(
      (text: string) => {
        void speakTTS(text);
      },
      [speakTTS]
    );
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
    const progressPercent =
      learnQueue.length > 0 ? ((learnIndex + 1) / learnQueue.length) * 100 : 0;

    const generateDistractors = useCallback(
      (correctAnswer: string, count: number = 3): string[] => {
        const pool: ExtendedVocabularyItem[] = allWords.filter(
          w => (currentQuestionType.includes('K_TO_N') ? w.english : w.korean) !== correctAnswer
        );
        const shuffled: ExtendedVocabularyItem[] = shuffleArray(pool);
        return shuffled
          .slice(0, count)
          .map(w => (currentQuestionType.includes('K_TO_N') ? w.english : w.korean));
      },
      [allWords, currentQuestionType]
    );

    const checkAnswer = useCallback(() => {
      if (!currentItem) return;

      let correct = false;
      if (currentQuestionType.startsWith('CHOICE')) {
        const correctAnswer = currentQuestionType.includes('K_TO_N')
          ? currentItem.english
          : currentItem.korean;
        correct = selectedAnswer === correctAnswer;
      } else if (currentQuestionType.startsWith('WRITING')) {
        const correctAnswer = currentQuestionType.includes('N_TO_K')
          ? currentItem.korean
          : currentItem.english;
        correct = userInput.trim().toLowerCase() === correctAnswer.toLowerCase();
      }

      setIsCorrect(correct);
      setShowFeedback(true);

      if (correct) {
        setSessionStats(prev => ({ ...prev, correct: [...prev.correct, currentItem] }));
      } else {
        setSessionStats(prev => ({ ...prev, incorrect: [...prev.incorrect, currentItem] }));
        onRecordMistake?.(currentItem);
      }
    }, [currentItem, currentQuestionType, selectedAnswer, userInput, onRecordMistake]);

    const handleNext = useCallback(() => {
      if (learnIndex < learnQueue.length - 1) {
        setLearnIndex(learnIndex + 1);
        setCurrentQuestionType(pickQuestionType(settings));
        setSelectedAnswer(null);
        setUserInput('');
        setShowFeedback(false);
        setIsCorrect(false);
      } else {
        onComplete(sessionStats);
      }
    }, [learnIndex, learnQueue.length, sessionStats, onComplete, settings]);

    if (!currentItem) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center text-slate-400">
            <p className="text-lg font-medium">{labels.noWords}</p>
          </div>
        </div>
      );
    }

    const prompt = currentQuestionType.includes('K_TO_N')
      ? currentItem.korean
      : currentItem.english;
    const correctAnswer = currentQuestionType.includes('K_TO_N')
      ? currentItem.english
      : currentItem.korean;

    // Generate choices for multiple choice
    const choices = currentQuestionType.startsWith('CHOICE')
      ? shuffleArray([correctAnswer, ...generateDistractors(correctAnswer)])
      : [];

    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col gap-6">
          {/* Progress Bar */}
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="bg-[#E4DBCF] rounded-2xl p-8 min-h-[500px] flex flex-col relative shadow-sm">
            {/* Question Prompt */}
            <div className="flex-1 flex flex-col items-center justify-center mb-8">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                {currentQuestionType.startsWith('WRITING') ? (
                  <Pencil className="w-4 h-4" />
                ) : (
                  <AlignLeft className="w-4 h-4" />
                )}
                {currentQuestionType.startsWith('WRITING')
                  ? labels.writingMode
                  : labels.multipleChoice}
              </div>

              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-5xl font-bold text-slate-800 text-center">{prompt}</h2>
                {currentQuestionType.includes('K_TO_N') && (
                  <button
                    onClick={() => speakKorean(prompt)}
                    className="p-2 rounded-full bg-white hover:bg-slate-100 text-indigo-600 transition-colors"
                  >
                    <Volume2 className="w-6 h-6" />
                  </button>
                )}
              </div>

              {currentItem.pos && (
                <div className="inline-block px-3 py-1 bg-white/70 text-slate-600 text-xs font-medium rounded-full">
                  {currentItem.pos}
                </div>
              )}
            </div>

            {/* Answers Section */}
            <div className="space-y-4">
              {currentQuestionType.startsWith('CHOICE') ? (
                // Multiple Choice
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {choices.map((choice, idx) => {
                    const isSelected = selectedAnswer === choice;
                    const isCorrectChoice = choice === correctAnswer;
                    const showCorrect = showFeedback && isCorrectChoice;
                    const showWrong = showFeedback && isSelected && !isCorrectChoice;

                    return (
                      <button
                        key={idx}
                        onClick={() => !showFeedback && setSelectedAnswer(choice)}
                        disabled={showFeedback}
                        className={`p-4 rounded-xl text-left font-medium transition-all ${
                          showCorrect
                            ? 'bg-emerald-100 border-2 border-emerald-500 text-emerald-700'
                            : showWrong
                              ? 'bg-red-100 border-2 border-red-500 text-red-700'
                              : isSelected
                                ? 'bg-white border-2 border-indigo-500 text-indigo-700'
                                : 'bg-white border border-slate-300 hover:border-indigo-300 text-slate-700'
                        } ${showFeedback ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg">{choice}</span>
                          {showCorrect && <Check className="w-5 h-5 text-emerald-500" />}
                          {showWrong && <X className="w-5 h-5 text-red-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Writing Input
                <div className="space-y-4">
                  <input
                    type="text"
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && !showFeedback && checkAnswer()}
                    disabled={showFeedback}
                    placeholder={labels.typeAnswer || 'Type your answer...'}
                    className={`w-full p-4 text-lg rounded-xl border-2 transition-all ${
                      showFeedback
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-red-500 bg-red-50'
                        : 'border-slate-300 focus:border-indigo-500'
                    } focus:outline-none`}
                    autoFocus
                  />
                  {showFeedback && !isCorrect && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-sm text-emerald-700">
                        <span className="font-bold">
                          {labels.correctAnswer || 'Correct answer'}:
                        </span>{' '}
                        {correctAnswer}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="mt-8 flex justify-center">
              {!showFeedback ? (
                <button
                  onClick={checkAnswer}
                  disabled={
                    currentQuestionType.startsWith('CHOICE') ? !selectedAnswer : !userInput.trim()
                  }
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center gap-2"
                >
                  {labels.checkAnswer || 'Check Answer'}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className={`px-8 py-3 font-bold rounded-xl transition-all flex items-center gap-2 ${
                    isCorrect
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {learnIndex < learnQueue.length - 1 ? (
                    <>
                      {labels.next || 'Next'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  ) : (
                    <>{labels.finish || 'Finish'}</>
                  )}
                </button>
              )}
            </div>

            {/* Question Counter */}
            <div className="mt-4 text-center text-slate-500 text-sm font-medium">
              {learnIndex + 1} / {learnQueue.length}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
LearnModeViewInner.displayName = 'LearnModeView';

const LearnModeView: React.FC<LearnModeViewProps> = props => {
  const resetKey = useMemo(() => {
    const wordKey = props.words.map(w => w.id || w.korean).join('|');
    return `${props.settings.learn.batchSize}-${props.settings.learn.random ? 1 : 0}-${wordKey}`;
  }, [props.words, props.settings.learn.batchSize, props.settings.learn.random]);
  return <LearnModeViewInner key={resetKey} {...props} />;
};

export default LearnModeView;
