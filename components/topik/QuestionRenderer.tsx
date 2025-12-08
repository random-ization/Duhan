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

// 仿真 TOPIK 样式常量
const FONT_SERIF = "font-serif";
const FONT_SANS = "font-sans";

// 圆圈数字
const getCircleNumber = (idx: number) => ['①', '②', '③', '④'][idx] || `${idx + 1}`;

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
  }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const contextKey = useMemo(
      () => `${contextPrefix}-Q${questionIndex}`,
      [contextPrefix, questionIndex]
    );

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
          // Use text (primary) or selectedText (alias), skip if neither exists
          const annotatedText = annotation.text || annotation.selectedText;
          if (!annotatedText) return;

          const colorMap: Record<string, string> = {
            green: 'bg-green-200',
            blue: 'bg-blue-200',
            pink: 'bg-pink-200',
            yellow: 'bg-yellow-200'
          };
          const highlightClass = colorMap[annotation.color || 'yellow'] || 'bg-yellow-200';

          const regex = new RegExp(
            `(${annotatedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
            'gi'
          );
          result = result.replace(regex, `<mark class="${highlightClass} px-0.5">$1</mark>`);
        });
        return result;
      },
      [questionAnnotations]
    );

    // Determine if answer is correct/incorrect
    const getOptionStatus = useCallback(
      (optionIndex: number) => {
        if (!showCorrect) return null;
        if (optionIndex === correctAnswer) return 'correct';
        if (optionIndex === userAnswer && optionIndex !== correctAnswer) return 'incorrect';
        return null;
      },
      [showCorrect, correctAnswer, userAnswer]
    );

    // 判断选项是否需要换行 (长选项用单列)
    const hasLongOptions = question.options.some(opt => opt.length > 25);

    return (
      <div className="break-inside-avoid">
        {/* 题号 + 题干 (PDF Style: 1. Question Text) */}
        <div className="flex gap-3 mb-4">
          <span className={`text-[18px] font-bold text-slate-900 ${FONT_SERIF} min-w-[32px] shrink-0 pt-0.5`}>
            {questionIndex + 1}.
          </span>

          <div className="flex-1 min-w-0">
            {/* 图片材料 */}
            {question.imageUrl && (
              <div className="mb-4 flex justify-center bg-white p-2 border border-slate-200 rounded">
                <img
                  src={question.imageUrl}
                  alt={`Question ${questionIndex + 1}`}
                  className="max-h-[300px] object-contain"
                />
              </div>
            )}

            {/* 阅读文章 (Passage) */}
            {question.passage && (
              <div
                className={`mb-4 p-5 border border-slate-300 bg-white ${FONT_SERIF} text-[16px] leading-[1.9] text-justify whitespace-pre-wrap text-slate-800 cursor-text`}
                onMouseUp={onTextSelect}
                dangerouslySetInnerHTML={{ __html: highlightText(question.passage) }}
              />
            )}

            {/* 题目文字 */}
            {question.questionText && (
              <div
                className={`${FONT_SANS} text-[17px] font-semibold text-slate-900 leading-snug mb-4 cursor-text`}
                onMouseUp={onTextSelect}
                dangerouslySetInnerHTML={{
                  __html: highlightText(
                    question.questionText.replace(/\(\s*\)/g, '( &nbsp;&nbsp;&nbsp;&nbsp; )')
                  )
                }}
              />
            )}

            {/* 选项 (Options) - PDF 2列布局 */}
            <div className={`grid ${hasLongOptions ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-x-6 gap-y-2'}`}>
              {question.options.map((option, optionIndex) => {
                const status = getOptionStatus(optionIndex);
                const isSelected = userAnswer === optionIndex;

                // 动态样式
                // Dynamic styles
                const cursorStyle = showCorrect ? 'cursor-text' : 'cursor-pointer';
                let optionClass = `flex items-start gap-2 ${cursorStyle} py-2 px-3 rounded transition-all border select-text `;

                if (status === 'correct') {
                  optionClass += "bg-green-50 border-green-400 text-green-900";
                } else if (status === 'incorrect') {
                  optionClass += "bg-red-50 border-2 border-red-500 text-red-900";
                } else if (isSelected) {
                  optionClass += "bg-indigo-50 border-indigo-300 text-indigo-900";
                } else {
                  optionClass += "border-transparent hover:bg-slate-100";
                }

                if (showCorrect) {
                  optionClass += " cursor-not-allowed";
                }

                return (
                  <button
                    key={optionIndex}
                    onClick={() => !showCorrect && onAnswerChange?.(optionIndex)}
                    onMouseUp={onTextSelect}
                    aria-disabled={showCorrect}
                    className={optionClass}
                  >
                    {/* 圆圈数字 ①②③④ */}
                    <span className={`text-[16px] ${FONT_SANS} shrink-0 ${isSelected || status ? 'font-bold' : 'text-slate-500'}`}>
                      {getCircleNumber(optionIndex)}
                    </span>

                    {/* 选项文字 */}
                    <span className={`text-[15px] leading-snug flex-1 text-left ${isSelected && !showCorrect ? 'font-medium' : ''}`}>
                      {option}
                    </span>

                    {/* 正确/错误图标 */}
                    {status === 'correct' && <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />}
                    {status === 'incorrect' && <X className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* 解析 (仅复习模式) */}
            {showCorrect && question.explanation && (
              <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r text-sm">
                <div className="font-bold text-blue-900 mb-1">
                  {labels.explanation || '解析'}
                </div>
                <div className="text-blue-800 leading-relaxed">{question.explanation}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
