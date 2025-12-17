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
  onTextSelect?: (e: React.MouseEvent) => void;
  annotations?: Annotation[];
  activeAnnotationId?: string | null;
  contextPrefix?: string;
}

const FONT_SERIF = "font-serif";
const FONT_SANS = "font-sans";

const CircleNumber = ({ num, isSelected }: { num: number; isSelected: boolean }) => {
  return (
    <div
      className={`
        inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full border border-black text-xs md:text-sm font-serif mr-2 leading-none flex-shrink-0 transition-colors
        ${isSelected ? 'bg-black text-white' : 'bg-transparent text-black'}
      `}
    >
      {num}
    </div>
  );
};

export const QuestionRenderer: React.FC<QuestionRendererProps> = React.memo(
  ({
    question,
    questionIndex,
    userAnswer,
    correctAnswer,
    language,
    showCorrect,
    onAnswerChange,
    onTextSelect,
    annotations = [],
    contextPrefix = '',
    activeAnnotationId,
  }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const contextKey = useMemo(
      () => `${contextPrefix}-Q${questionIndex}`,
      [contextPrefix, questionIndex]
    );

    // Helper for highlight styles
    // 高亮默认用色块背景，有笔记的用下划线区分
    const getHighlightClass = (color: string = 'yellow', isActive: boolean, hasNote: boolean = false) => {
      const base = "box-decoration-clone cursor-pointer transition-all duration-200 px-0.5 rounded-sm ";

      // 有笔记的标注：下划线样式 (Debug: 增强区分度 - 双下划线)
      if (hasNote && !isActive) {
        switch (color) {
          case 'green': return base + 'bg-green-50/50 border-b-4 border-double border-green-500 hover:bg-green-100';
          case 'blue': return base + 'bg-blue-50/50 border-b-4 border-double border-blue-500 hover:bg-blue-100';
          case 'pink': return base + 'bg-pink-50/50 border-b-4 border-double border-pink-500 hover:bg-pink-100';
          case 'yellow': default: return base + 'bg-yellow-50/50 border-b-4 border-double border-yellow-500 hover:bg-yellow-100';
        }
      }

      // 激活状态：深色背景
      if (isActive) {
        switch (color) {
          case 'green': return base + 'bg-green-400 text-green-900';
          case 'blue': return base + 'bg-blue-400 text-blue-900';
          case 'pink': return base + 'bg-pink-400 text-pink-900';
          case 'yellow': default: return base + 'bg-yellow-400 text-yellow-900';
        }
      }

      // 默认高亮（无笔记）：色块背景
      switch (color) {
        case 'green': return base + 'bg-green-300/60 hover:bg-green-400/60';
        case 'blue': return base + 'bg-blue-300/60 hover:bg-blue-400/60';
        case 'pink': return base + 'bg-pink-300/60 hover:bg-pink-400/60';
        case 'yellow': default: return base + 'bg-yellow-300/60 hover:bg-yellow-400/60';
      }
    };

    // Get annotations for this question
    const questionAnnotations = useMemo(
      () => annotations.filter(a => a.contextKey === contextKey),
      [annotations, contextKey]
    );

    // Highlight annotated text
    const highlightText = useCallback(
      (text: string) => {
        if (questionAnnotations.length === 0) return text;
        let result = text;
        questionAnnotations.forEach(annotation => {
          const annotatedText = annotation.text || annotation.selectedText;
          if (!annotatedText) return;
          const isActive = activeAnnotationId === annotation.id || (annotation.id === 'temp' && !activeAnnotationId);
          const hasNote = !!(annotation.note && annotation.note.trim());
          const className = getHighlightClass(annotation.color || 'yellow', isActive, hasNote);
          const regex = new RegExp(`(${annotatedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          result = result.replace(regex, `<mark data-annotation-id="${annotation.id}" class="${className}">$1</mark>`);
        });
        return result;
      },
      [questionAnnotations, activeAnnotationId, getHighlightClass]
    );

    const getOptionStatus = useCallback(
      (optionIndex: number) => {
        if (!showCorrect) return null;
        if (optionIndex === correctAnswer) return 'correct';
        if (optionIndex === userAnswer && optionIndex !== correctAnswer) return 'incorrect';
        return null;
      },
      [showCorrect, correctAnswer, userAnswer]
    );

    // 2-column only if ALL options are very short (single words/short phrases)
    // Sentence-like options should use single column
    const hasLongOptions = question.options.some(opt => opt.length > 8);

    return (
      <div className="break-inside-avoid">
        {/* Question Header */}
        <div className="flex items-start mb-2">
          <span className={`text-lg font-bold mr-3 min-w-[24px] ${FONT_SERIF}`}>
            {questionIndex + 1}.
          </span>

          <div className="flex-1 w-full min-w-0">
            {/* Image - support both imageUrl and image field names */}
            {(question.imageUrl || question.image) && (
              <div className="mb-4 flex justify-center bg-white p-2 border border-black/10 rounded">
                <img src={question.imageUrl || question.image} alt={`Question ${questionIndex + 1}`} className="max-h-[300px] object-contain" />
              </div>
            )}

            {/* Passage - hide if question has image (IMAGE type questions like Q5-10) */}
            {question.passage && !(question.imageUrl || question.image) && (
              <div
                className={`mb-4 p-5 border border-gray-400 bg-white w-full ${FONT_SERIF} text-lg leading-loose text-justify whitespace-pre-wrap text-black`}
                onMouseUp={onTextSelect}
                dangerouslySetInnerHTML={{ __html: highlightText(question.passage) }}
              />
            )}

            {/* Question Text */}
            {question.question && (
              <div
                className={`text-lg leading-loose w-full mb-3 cursor-text text-black ${FONT_SERIF}`}
                onMouseUp={onTextSelect}
                dangerouslySetInnerHTML={{
                  __html: highlightText(question.question.replace(/\(\s*\)/g, '( &nbsp;&nbsp;&nbsp;&nbsp; )'))
                }}
              />
            )}

            {/* Options */}
            <div className={`
              grid gap-y-2 gap-x-4
              ${hasLongOptions ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}
            `}>
              {question.options.map((option, optionIndex) => {
                const status = getOptionStatus(optionIndex);
                const isSelected = userAnswer === optionIndex;
                let optionClass = `flex items-center cursor-pointer py-1 px-2 rounded -ml-2 transition-colors duration-150 relative `;

                // Conditional Styles for Review/active
                if (status === 'correct') {
                  // User requested to remove box/border styles, keeping only text color and icon
                  optionClass += " text-green-700 font-bold bg-green-50/50";
                } else if (status === 'incorrect') {
                  optionClass += " text-red-700 font-bold bg-red-50/50";
                } else if (isSelected) {
                  // Reference style: blue text, underline, heavy decoration
                  optionClass += " hover:bg-blue-50";
                } else {
                  optionClass += " hover:bg-blue-50";
                }

                if (showCorrect) optionClass += " cursor-text";

                const content = (
                  <React.Fragment>
                    <CircleNumber num={optionIndex + 1} isSelected={isSelected || status === 'correct'} />
                    <span className={`text-lg ${isSelected ? 'font-bold text-blue-900 underline decoration-blue-500 decoration-2 underline-offset-4' : ''}`}>
                      <span dangerouslySetInnerHTML={{ __html: highlightText(option) }} />
                    </span>
                    {status === 'correct' && <Check className="w-5 h-5 text-green-600 ml-2" />}
                    {status === 'incorrect' && <X className="w-5 h-5 text-red-600 ml-2" />}
                  </React.Fragment>
                );

                if (showCorrect) {
                  return (
                    <div key={optionIndex} onMouseUp={onTextSelect} className={optionClass}>
                      {content}
                    </div>
                  );
                }

                return (
                  <button
                    key={optionIndex}
                    onClick={() => onAnswerChange?.(optionIndex)}
                    onMouseUp={onTextSelect}
                    className={optionClass}
                  >
                    {content}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showCorrect && question.explanation && (
              <div className="mt-4 p-4 bg-gray-100 border-l-4 border-black text-sm font-sans">
                <div className="font-bold mb-1">{labels.explanation || '해설'}</div>
                <div className="leading-relaxed">{question.explanation}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
