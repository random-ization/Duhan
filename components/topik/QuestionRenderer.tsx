import React, { useMemo, useCallback } from 'react';
import { TopikQuestion, Language, Annotation } from '../../types';
import { Volume2, Check, X } from 'lucide-react';
import { getLabels } from '../../utils/i18n';

interface QuestionRendererProps {
  question: TopikQuestion;
  questionIndex: number;
  userAnswer?: number;
  correctAnswer?: number;
  language: Language;
  showCorrect: boolean;
  onAnswerChange?: (optionIndex: number) => void;
  onTextSelect?: () => void;
  annotations?: Annotation[];
  contextPrefix?: string;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = React.memo(({
  question,
  questionIndex,
  userAnswer,
  correctAnswer,
  language,
  showCorrect,
  onAnswerChange,
  onTextSelect,
  annotations = [],
  contextPrefix = ''
}) => {
  const labels = useMemo(() => getLabels(language), [language]);
  const contextKey = useMemo(() => `${contextPrefix}-Q${questionIndex}`, [contextPrefix, questionIndex]);

  // Get annotations for this question
  const questionAnnotations = useMemo(() => 
    annotations.filter(a => a.contextKey === contextKey),
    [annotations, contextKey]
  );

  // Highlight annotated text
  const highlightText = useCallback((text: string) => {
    if (questionAnnotations.length === 0) return text;

    let result = text;
    questionAnnotations.forEach(annotation => {
      const regex = new RegExp(`(${annotation.selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    });
    return result;
  }, [questionAnnotations]);

  // Play audio for listening questions
  const playAudio = useCallback((audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play();
  }, []);

  // Determine if answer is correct/incorrect
  const getOptionStatus = useCallback((optionIndex: number) => {
    if (!showCorrect) return null;
    if (optionIndex === correctAnswer) return 'correct';
    if (optionIndex === userAnswer && optionIndex !== correctAnswer) return 'incorrect';
    return null;
  }, [showCorrect, correctAnswer, userAnswer]);

  const getOptionClass = (optionIndex: number) => {
    const status = getOptionStatus(optionIndex);
    const isSelected = userAnswer === optionIndex;

    if (status === 'correct') {
      return 'border-2 border-green-600 bg-green-50';
    }
    if (status === 'incorrect') {
      return 'border-2 border-red-600 bg-red-50';
    }
    if (isSelected) {
      return 'border-2 border-blue-600 bg-blue-50';
    }
    return 'border border-gray-300 hover:border-gray-400 bg-white';
  };

  return (
    <div className="space-y-4">
      {/* Question Number */}
      <div className="flex items-center space-x-2">
        <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
          {questionIndex + 1}
        </span>
        <span className="text-sm text-gray-600">
          {question.points} {labels.points || 'points'}
        </span>
      </div>

      {/* Image (if present) */}
      {question.imageUrl && (
        <div className="flex justify-center">
          <img
            src={question.imageUrl}
            alt={`Question ${questionIndex + 1}`}
            className="max-w-full h-auto rounded-lg shadow-md"
            style={{ maxHeight: '400px' }}
          />
        </div>
      )}

      {/* Audio Button (if listening question) */}
      {question.audioUrl && (
        <button
          onClick={() => playAudio(question.audioUrl!)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Volume2 className="w-5 h-5" />
          <span>{labels.playAudio || 'Play Audio'}</span>
        </button>
      )}

      {/* Question Text */}
      {question.questionText && (
        <div
          className="text-lg leading-relaxed cursor-text"
          onMouseUp={onTextSelect}
          dangerouslySetInnerHTML={{ __html: highlightText(question.questionText) }}
        />
      )}

      {/* Passage/Context (for reading questions) */}
      {question.passage && (
        <div
          className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-base leading-relaxed cursor-text"
          onMouseUp={onTextSelect}
          dangerouslySetInnerHTML={{ __html: highlightText(question.passage) }}
        />
      )}

      {/* Options */}
      <div className="space-y-3 mt-4">
        {question.options.map((option, optionIndex) => {
          const status = getOptionStatus(optionIndex);
          
          return (
            <button
              key={optionIndex}
              onClick={() => !showCorrect && onAnswerChange?.(optionIndex)}
              disabled={showCorrect}
              className={`
                w-full text-left p-4 rounded-lg transition-all duration-200
                ${getOptionClass(optionIndex)}
                ${showCorrect ? 'cursor-not-allowed' : 'cursor-pointer'}
                flex items-center justify-between
              `}
            >
              <div className="flex items-center space-x-3 flex-1">
                <span className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium text-sm shrink-0">
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span className="flex-1">{option}</span>
              </div>
              
              {/* Status Icons */}
              {status === 'correct' && (
                <Check className="w-6 h-6 text-green-600 shrink-0" />
              )}
              {status === 'incorrect' && (
                <X className="w-6 h-6 text-red-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation (only show in review mode) */}
      {showCorrect && question.explanation && (
        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
          <div className="font-semibold text-blue-900 mb-2">
            {labels.explanation || 'Explanation'}:
          </div>
          <div className="text-blue-800">{question.explanation}</div>
        </div>
      )}
    </div>
  );
});
