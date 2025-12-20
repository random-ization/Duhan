import React, { useMemo, useCallback, useState } from 'react';
import { TopikQuestion, Language, Annotation } from '../../types';
import { Volume2, Check, X, Sparkles, Loader2 } from 'lucide-react';
import { getLabels } from '../../utils/i18n';
import { api } from '../../services/api';

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
  hidePassage?: boolean; // Hide passage for grouped questions (non-first)
  showInlineNumber?: boolean; // Show number inline with question text
}

// Korean serif font for authentic TOPIK paper look
const FONT_SERIF = "font-['Batang','KoPubBatang','Times_New_Roman',serif]";
const FONT_SANS = "font-sans";

// Unicode circle numbers for TOPIK-style options
const CIRCLE_NUMBERS = ['①', '②', '③', '④'];

const CircleNumber = ({ num, isSelected }: { num: number; isSelected: boolean }) => {
  return (
    <span
      className={`text-lg mr-2 flex-shrink-0 ${FONT_SERIF} ${isSelected ? 'font-bold' : ''}`}
    >
      {CIRCLE_NUMBERS[num - 1] || num}
    </span>
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
    hidePassage = false,
    showInlineNumber = false,
  }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const contextKey = useMemo(
      () => `${contextPrefix}-Q${questionIndex}`,
      [contextPrefix, questionIndex]
    );

    // AI Analysis state
    interface AIAnalysis {
      translation: string;
      keyPoint: string;
      analysis: string;
      wrongOptions: Record<string, string>;
    }
    const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // AI Analysis handler
    const handleAIAnalysis = useCallback(async () => {
      if (aiLoading || aiAnalysis) return;

      setAiLoading(true);
      setAiError(null);

      try {
        const questionText = question.question || question.passage || '';
        // Map language to API format
        const langMap: Record<string, string> = {
          'zh-CN': 'zh',
          'zh': 'zh',
          'ko': 'ko',
          'en': 'en',
          'vi': 'vi',
          'mn': 'mn'
        };
        const response = await api.analyzeTopikQuestion({
          question: questionText,
          options: question.options,
          correctAnswer: correctAnswer ?? 0,
          type: 'TOPIK_QUESTION',
          language: langMap[language] || 'zh'
        });

        if (response.success && response.data) {
          setAiAnalysis(response.data);
        } else {
          setAiError('AI 老师正在休息，请稍后再试');
        }
      } catch (err) {
        console.error('[AI Analysis] Error:', err);
        setAiError('AI 老师正在休息，请稍后再试');
      } finally {
        setAiLoading(false);
      }
    }, [question, correctAnswer, language, aiLoading, aiAnalysis]);

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

    // Layout logic for options:
    // - Very short options (1-2 chars, like ㉠ ㉡ ㉢ ㉣) => 4 columns horizontal
    // - Medium options (≤15 chars, like 排序题 ㉠-㉡-㉢-㉣) => 2 columns
    // - Long options (>15 chars, sentence-like) => 1 column
    const allVeryShort = question.options.every(opt => opt.length <= 2);
    const hasLongOptions = question.options.some(opt => opt.length > 15);

    return (
      <div className="break-inside-avoid">
        {/* Standard layout - number on left, content on right */}
        {!showInlineNumber && (
          <div className="flex items-start">
            {/* Question Number - always visible on left */}
            <span className={`text-lg font-bold mr-3 min-w-[32px] ${FONT_SERIF}`}>
              {questionIndex + 1}.
            </span>

            <div className="flex-1">
              {/* Image */}
              {(question.imageUrl || question.image) && (
                <div className="mb-4 flex justify-center bg-white p-2 border border-black/10 rounded">
                  <img src={question.imageUrl || question.image} alt={`Question ${questionIndex + 1}`} className="max-h-[300px] object-contain" />
                </div>
              )}

              {/* Passage */}
              {!hidePassage && question.passage && !(question.imageUrl || question.image) && (
                <div
                  className={`mb-4 p-5 border border-gray-400 bg-white ${FONT_SERIF} text-lg leading-loose text-justify whitespace-pre-wrap text-black`}
                  onMouseUp={onTextSelect}
                  dangerouslySetInnerHTML={{ __html: highlightText(question.passage) }}
                />
              )}

              {/* Question Text */}
              {question.question && (
                <div
                  className={`text-lg leading-loose mb-3 cursor-text text-black ${FONT_SERIF}`}
                  onMouseUp={onTextSelect}
                  dangerouslySetInnerHTML={{
                    __html: highlightText(question.question.replace(/\(\s*\)/g, '( &nbsp;&nbsp;&nbsp;&nbsp; )'))
                  }}
                />
              )}

              {/* Context Box */}
              {question.contextBox && (
                <div className="mb-4 border border-black p-4 bg-white">
                  <div
                    className={`${FONT_SERIF} text-lg leading-loose whitespace-pre-wrap text-black`}
                    onMouseUp={onTextSelect}
                    dangerouslySetInnerHTML={{ __html: highlightText(question.contextBox) }}
                  />
                </div>
              )}

              {/* Options */}
              <div className={`
                grid gap-y-2 gap-x-4
                ${allVeryShort ? 'grid-cols-4' : hasLongOptions ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}
              `}>
                {question.options.map((option, optionIndex) => {
                  const status = getOptionStatus(optionIndex);
                  const isSelected = userAnswer === optionIndex;
                  let optionClass = `flex items-center cursor-pointer py-1 px-2 rounded -ml-2 transition-colors duration-150 relative `;

                  if (status === 'correct') {
                    optionClass += " text-green-700 font-bold bg-green-50/50";
                  } else if (status === 'incorrect') {
                    optionClass += " text-red-700 font-bold bg-red-50/50";
                  } else {
                    optionClass += " hover:bg-blue-50";
                  }

                  if (showCorrect) optionClass += " cursor-text";

                  const content = (
                    <React.Fragment>
                      <CircleNumber num={optionIndex + 1} isSelected={isSelected || status === 'correct'} />
                      <span className={`text-lg ${FONT_SERIF} ${isSelected ? 'font-bold text-blue-900 underline decoration-blue-500 decoration-2 underline-offset-4' : ''}`}>
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

              {/* AI Analysis Section */}
              {showCorrect && (
                <div className="mt-4">
                  {/* AI Analysis Button */}
                  {!aiAnalysis && (
                    <button
                      onClick={handleAIAnalysis}
                      disabled={aiLoading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {aiLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span className="font-medium">
                        {aiLoading ? '分析中...' : 'AI 老师解析'}
                      </span>
                    </button>
                  )}

                  {/* Error Message */}
                  {aiError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {aiError}
                    </div>
                  )}

                  {/* AI Analysis Card */}
                  {aiAnalysis && (
                    <div className="mt-3 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        <span className="font-bold text-indigo-700">AI 老师解析</span>
                      </div>

                      {/* Translation */}
                      <div className="mb-4">
                        <div className="text-sm font-semibold text-indigo-700 mb-1.5">
                          题干翻译
                        </div>
                        <div className="text-gray-700 leading-relaxed bg-white/60 p-3 rounded-lg">
                          {aiAnalysis.translation}
                        </div>
                      </div>

                      {/* Key Point */}
                      <div className="mb-4">
                        <div className="text-sm font-semibold text-indigo-700 mb-1.5">
                          核心考点
                        </div>
                        <div className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-sm font-medium">
                          {aiAnalysis.keyPoint}
                        </div>
                      </div>

                      {/* Analysis */}
                      <div className="mb-4">
                        <div className="text-sm font-semibold text-indigo-700 mb-1.5">
                          正解分析
                        </div>
                        <div className="text-gray-700 leading-relaxed bg-white/60 p-3 rounded-lg">
                          {aiAnalysis.analysis}
                        </div>
                      </div>

                      {/* Wrong Options */}
                      {aiAnalysis.wrongOptions && Object.keys(aiAnalysis.wrongOptions).length > 0 && (
                        <div>
                          <div className="text-sm font-semibold text-indigo-700 mb-1.5">
                            干扰项排除
                          </div>
                          <div className="space-y-2">
                            {Object.entries(aiAnalysis.wrongOptions).map(([key, value]) => (
                              <div key={key} className="bg-white/60 p-3 rounded-lg">
                                <span className="font-medium text-gray-600">选项 {key}：</span>
                                <span className="text-gray-700">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inline number layout - for grouped questions (Q19-20, Q46, etc.) */}
        {showInlineNumber && (
          <div>
            {/* Passage - shown first, only if not hidden (for first question in group) */}
            {!hidePassage && question.passage && (
              <div
                className={`mb-6 p-5 border border-gray-400 bg-white ${FONT_SERIF} text-lg leading-loose text-justify whitespace-pre-wrap text-black`}
                onMouseUp={onTextSelect}
                dangerouslySetInnerHTML={{ __html: highlightText(question.passage) }}
              />
            )}

            {/* Question Text with inline number */}
            {question.question && (
              <div className="flex items-start mb-3">
                <span className={`text-lg font-bold mr-2 min-w-[32px] ${FONT_SERIF}`}>
                  {questionIndex + 1}.
                </span>
                <div
                  className={`text-lg leading-loose flex-1 cursor-text text-black ${FONT_SERIF}`}
                  onMouseUp={onTextSelect}
                  dangerouslySetInnerHTML={{
                    __html: highlightText(question.question.replace(/\(\s*\)/g, '( &nbsp;&nbsp;&nbsp;&nbsp; )'))
                  }}
                />
              </div>
            )}

            {/* Context Box */}
            {question.contextBox && (
              <div className="mb-4 border border-black p-4 bg-white ml-8">
                <div
                  className={`${FONT_SERIF} text-lg leading-loose whitespace-pre-wrap text-black`}
                  onMouseUp={onTextSelect}
                  dangerouslySetInnerHTML={{ __html: highlightText(question.contextBox) }}
                />
              </div>
            )}

            {/* Options - indented */}
            <div className={`ml-8 grid gap-y-2 gap-x-4 ${allVeryShort ? 'grid-cols-4' : hasLongOptions ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
              {question.options.map((option, optionIndex) => {
                const status = getOptionStatus(optionIndex);
                const isSelected = userAnswer === optionIndex;
                let optionClass = `flex items-center cursor-pointer py-1 px-2 rounded -ml-2 transition-colors duration-150 relative `;

                if (status === 'correct') {
                  optionClass += " text-green-700 font-bold bg-green-50/50";
                } else if (status === 'incorrect') {
                  optionClass += " text-red-700 font-bold bg-red-50/50";
                } else {
                  optionClass += " hover:bg-blue-50";
                }

                if (showCorrect) optionClass += " cursor-text";

                const content = (
                  <React.Fragment>
                    <CircleNumber num={optionIndex + 1} isSelected={isSelected || status === 'correct'} />
                    <span className={`text-lg ${FONT_SERIF} ${isSelected ? 'font-bold text-blue-900 underline decoration-blue-500 decoration-2 underline-offset-4' : ''}`}>
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
              <div className="mt-4 ml-8 p-4 bg-gray-100 border-l-4 border-black text-sm font-sans">
                <div className="font-bold mb-1">{labels.explanation || '해설'}</div>
                <div className="leading-relaxed">{question.explanation}</div>
              </div>
            )}

            {/* AI Analysis Section - Inline Layout */}
            {showCorrect && (
              <div className="mt-4 ml-8">
                {/* AI Analysis Button */}
                {!aiAnalysis && (
                  <button
                    onClick={handleAIAnalysis}
                    disabled={aiLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      {aiLoading ? '分析中...' : 'AI 老师解析'}
                    </span>
                  </button>
                )}

                {/* Error Message */}
                {aiError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {aiError}
                  </div>
                )}

                {/* AI Analysis Card */}
                {aiAnalysis && (
                  <div className="mt-3 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      <span className="font-bold text-indigo-700">AI 老师解析</span>
                    </div>

                    {/* Translation */}
                    <div className="mb-4">
                      <div className="text-sm font-semibold text-indigo-700 mb-1.5">
                        题干翻译
                      </div>
                      <div className="text-gray-700 leading-relaxed bg-white/60 p-3 rounded-lg">
                        {aiAnalysis.translation}
                      </div>
                    </div>

                    {/* Key Point */}
                    <div className="mb-4">
                      <div className="text-sm font-semibold text-indigo-700 mb-1.5">
                        核心考点
                      </div>
                      <div className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-sm font-medium">
                        {aiAnalysis.keyPoint}
                      </div>
                    </div>

                    {/* Analysis */}
                    <div className="mb-4">
                      <div className="text-sm font-semibold text-indigo-700 mb-1.5">
                        正解分析
                      </div>
                      <div className="text-gray-700 leading-relaxed bg-white/60 p-3 rounded-lg">
                        {aiAnalysis.analysis}
                      </div>
                    </div>

                    {/* Wrong Options */}
                    {aiAnalysis.wrongOptions && Object.keys(aiAnalysis.wrongOptions).length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-indigo-700 mb-1.5">
                          干扰项排除
                        </div>
                        <div className="space-y-2">
                          {Object.entries(aiAnalysis.wrongOptions).map(([key, value]) => (
                            <div key={key} className="bg-white/60 p-3 rounded-lg">
                              <span className="font-medium text-gray-600">选项 {key}：</span>
                              <span className="text-gray-700">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);
