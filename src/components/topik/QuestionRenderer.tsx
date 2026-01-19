import React, { useMemo, useCallback, useState } from 'react';
import { useMutation, useAction } from 'convex/react';
import { TopikQuestion, Language, Annotation } from '../../types';
import { Check, X, Sparkles, Loader2, Bookmark, BookmarkCheck } from 'lucide-react';
import { getLabels } from '../../utils/i18n';
import { sanitizeStrictHtml } from '../../utils/sanitize';
import { aRef, mRef } from '../../utils/convexRefs';

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

// AI Analysis state
interface AIAnalysis {
  translation: string;
  keyPoint: string;
  analysis: string;
  wrongOptions: Record<string, string>;
}

// Korean serif font for authentic TOPIK paper look
const FONT_SERIF = "font-['Batang','KoPubBatang','Times_New_Roman',serif]";

// Unicode circle numbers for TOPIK-style options
const CIRCLE_NUMBERS = ['①', '②', '③', '④'];

const CircleNumber = ({ num, isSelected }: { num: number; isSelected: boolean }) => {
  return (
    <span className={`text-lg mr-2 flex-shrink-0 ${FONT_SERIF} ${isSelected ? 'font-bold' : ''}`}>
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

    // Save to notebook state
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Convex AI action
    const analyzeQuestionAction = useAction(
      aRef<
        { question: string; options: string[]; correctAnswer: number; type: string },
        { success?: boolean; data?: AIAnalysis }
      >('ai:analyzeQuestion')
    );

    // AI Analysis handler - Using Convex
    const handleAIAnalysis = useCallback(async () => {
      if (aiLoading || aiAnalysis) return;

      setAiLoading(true);
      setAiError(null);

      try {
        const questionText = question.question || question.passage || '';

        const result = (await analyzeQuestionAction({
          question: questionText,
          options: question.options,
          correctAnswer: correctAnswer ?? 0,
          type: 'TOPIK_QUESTION',
        })) as { success?: boolean; data?: AIAnalysis };

        if (result?.success && result.data) {
          setAiAnalysis(result.data);
        } else {
          setAiError('AI 老师正在休息，请稍后再试');
        }
      } catch (err) {
        console.error('[AI Analysis] Error:', err);
        setAiError('AI 老师正在休息，请稍后再试');
      } finally {
        setAiLoading(false);
      }
    }, [question, correctAnswer, aiLoading, aiAnalysis, analyzeQuestionAction]);

    // Save to Notebook handler
    const [showSaveToast, setShowSaveToast] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const saveNotebook = useMutation(
      mRef<
        { type: string; title: string; content: Record<string, unknown>; tags?: string[] },
        unknown
      >('notebooks:save')
    );

    const handleSaveToNotebook = useCallback(async () => {
      if (!aiAnalysis || isSaving || isSaved) return;

      setIsSaving(true);
      setSaveError(null);

      try {
        const questionText = question.question || question.passage || '';
        const title =
          questionText.length > 30
            ? questionText.substring(0, 30) + '...'
            : questionText || `TOPIK Q${questionIndex + 1}`;

        console.log('[Save to Notebook] Saving...', { title, type: 'MISTAKE' });

        const result = await saveNotebook({
          type: 'MISTAKE',
          title,
          content: {
            questionText,
            options: question.options,
            correctAnswer: correctAnswer ?? 0,
            imageUrl: question.imageUrl || question.image,
            aiAnalysis: {
              translation: aiAnalysis.translation,
              keyPoint: aiAnalysis.keyPoint,
              analysis: aiAnalysis.analysis,
              wrongOptions: aiAnalysis.wrongOptions,
            },
          },
          tags: ['TOPIK', 'AI-Analysis', 'Review'],
        });

        console.log('[Save to Notebook] Result:', result);

        if (result) {
          setIsSaved(true);
          setShowSaveToast(true);
          // Auto hide toast after 4 seconds
          setTimeout(() => setShowSaveToast(false), 4000);
        } else {
          throw new Error('Save failed');
        }
      } catch (err: unknown) {
        console.error('[Save to Notebook] Error:', err);
        setSaveError((err as Error)?.message || '保存失败，请重试');
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 4000);
      } finally {
        setIsSaving(false);
      }
    }, [aiAnalysis, isSaving, isSaved, question, questionIndex, correctAnswer, saveNotebook]);

    // Helper for highlight styles
    // 高亮默认用色块背景，有笔记的用下划线区分
    const getHighlightClass = useCallback(
      (color: string = 'yellow', isActive: boolean, hasNote: boolean = false) => {
        const base =
          'box-decoration-clone cursor-pointer transition-all duration-200 px-0.5 rounded-sm ';

        // 有笔记的标注：下划线样式 (Debug: 增强区分度 - 双下划线)
        if (hasNote && !isActive) {
          switch (color) {
            case 'green':
              return (
                base + 'bg-green-50/50 border-b-4 border-double border-green-500 hover:bg-green-100'
              );
            case 'blue':
              return (
                base + 'bg-blue-50/50 border-b-4 border-double border-blue-500 hover:bg-blue-100'
              );
            case 'pink':
              return (
                base + 'bg-pink-50/50 border-b-4 border-double border-pink-500 hover:bg-pink-100'
              );
            case 'yellow':
            default:
              return (
                base +
                'bg-yellow-50/50 border-b-4 border-double border-yellow-500 hover:bg-yellow-100'
              );
          }
        }

        // 激活状态：深色背景
        if (isActive) {
          switch (color) {
            case 'green':
              return base + 'bg-green-400 text-green-900';
            case 'blue':
              return base + 'bg-blue-400 text-blue-900';
            case 'pink':
              return base + 'bg-pink-400 text-pink-900';
            case 'yellow':
            default:
              return base + 'bg-yellow-400 text-yellow-900';
          }
        }

        // 默认高亮（无笔记）：色块背景
        switch (color) {
          case 'green':
            return base + 'bg-green-300/60 hover:bg-green-400/60';
          case 'blue':
            return base + 'bg-blue-300/60 hover:bg-blue-400/60';
          case 'pink':
            return base + 'bg-pink-300/60 hover:bg-pink-400/60';
          case 'yellow':
          default:
            return base + 'bg-yellow-300/60 hover:bg-yellow-400/60';
        }
      },
      []
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
          const annotatedText = annotation.text || annotation.selectedText;
          if (!annotatedText) return;
          const isActive =
            activeAnnotationId === annotation.id ||
            (annotation.id === 'temp' && !activeAnnotationId);
          const hasNote = !!(annotation.note && annotation.note.trim());
          const className = getHighlightClass(annotation.color || 'yellow', isActive, hasNote);
          const regex = new RegExp(
            `(${annotatedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
            'gi'
          );
          result = result.replace(
            regex,
            `<mark data-annotation-id="${annotation.id}" class="${className}">$1</mark>`
          );
        });
        // Sanitize the final HTML to prevent XSS
        return sanitizeStrictHtml(result);
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
                  <img
                    src={question.imageUrl || question.image}
                    alt={`Question ${questionIndex + 1}`}
                    className="max-h-[300px] object-contain"
                  />
                </div>
              )}

              {/* Passage */}
              {!hidePassage && question.passage && !(question.imageUrl || question.image) && (
                <div
                  className={`mb-4 p-5 border border-gray-400 bg-white ${FONT_SERIF} text-lg leading-loose text-justify whitespace-pre-wrap text-black indent-8`}
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
                    __html: highlightText(
                      question.question.replace(/\(\s*\)/g, '( &nbsp;&nbsp;&nbsp;&nbsp; )')
                    ),
                  }}
                />
              )}

              {/* Context Box - with 보기 header for Q39-41 (unless new format instruction) */}
              {question.contextBox &&
                !(question.imageUrl || question.image) &&
                (() => {
                  const qNum = questionIndex + 1;
                  // Show 보기 header for Q39-41, but NOT if instruction contains new format text
                  const isNewFormat = question.instruction?.includes('주어진 문장이 들어갈 곳으로');
                  const showBogiHeader = qNum >= 39 && qNum <= 41 && !isNewFormat;

                  return (
                    <div className="mb-4 bg-white">
                      {showBogiHeader ? (
                        <>
                          {/* 보기 Header */}
                          <div className="flex items-center justify-center gap-2 mb-0">
                            <div className="flex-1 h-px bg-black"></div>
                            <span
                              className={`${FONT_SERIF} text-base font-bold tracking-widest px-2`}
                            >
                              &lt;보 &nbsp; 기&gt;
                            </span>
                            <div className="flex-1 h-px bg-black"></div>
                          </div>
                          {/* Content Box without top border */}
                          <div className="border border-black border-t-0 p-4">
                            <div
                              className={`${FONT_SERIF} text-lg leading-loose whitespace-pre-wrap text-black indent-8`}
                              onMouseUp={onTextSelect}
                              dangerouslySetInnerHTML={{
                                __html: highlightText(question.contextBox),
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        /* Regular box without 보기 header for other questions */
                        <div className="border border-black p-4">
                          <div
                            className={`${FONT_SERIF} text-lg leading-loose whitespace-pre-wrap text-black`}
                            onMouseUp={onTextSelect}
                            dangerouslySetInnerHTML={{ __html: highlightText(question.contextBox) }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* Options - Image or Text based */}
              {question.optionImages && question.optionImages.some(img => img) ? (
                // Image-based options (Listening Q1-3)
                <div className="grid grid-cols-2 gap-4">
                  {question.optionImages.map((imgUrl, optionIndex) => {
                    const status = getOptionStatus(optionIndex);
                    const isSelected = userAnswer === optionIndex;

                    let containerClass = `relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all cursor-pointer `;
                    if (status === 'correct') {
                      containerClass += 'border-green-500 ring-4 ring-green-200';
                    } else if (status === 'incorrect') {
                      containerClass += 'border-red-500 ring-4 ring-red-200';
                    } else if (isSelected) {
                      containerClass += 'border-blue-500 ring-4 ring-blue-200';
                    } else {
                      containerClass += 'border-slate-200 hover:border-slate-400';
                    }

                    if (showCorrect) containerClass += ' cursor-default';

                    const imageContent = (
                      <>
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={`Option ${optionIndex + 1}`}
                            className="w-full h-full object-contain bg-white"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <span className="text-4xl font-bold">{optionIndex + 1}</span>
                          </div>
                        )}
                        <div
                          className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            status === 'correct'
                              ? 'bg-green-500 text-white'
                              : status === 'incorrect'
                                ? 'bg-red-500 text-white'
                                : isSelected
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white/80 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {CIRCLE_NUMBERS[optionIndex]}
                        </div>
                        {status === 'correct' && (
                          <Check className="absolute top-2 right-2 w-6 h-6 text-green-600 bg-white rounded-full p-0.5" />
                        )}
                        {status === 'incorrect' && (
                          <X className="absolute top-2 right-2 w-6 h-6 text-red-600 bg-white rounded-full p-0.5" />
                        )}
                      </>
                    );

                    if (showCorrect) {
                      return (
                        <div key={optionIndex} className={containerClass}>
                          {imageContent}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={optionIndex}
                        onClick={() => onAnswerChange?.(optionIndex)}
                        className={containerClass}
                      >
                        {imageContent}
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Text-based options
                <div
                  className={`
                  grid gap-y-2 gap-x-4
                  ${allVeryShort ? 'grid-cols-4' : hasLongOptions ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}
                `}
                >
                  {question.options.map((option, optionIndex) => {
                    const status = getOptionStatus(optionIndex);
                    const isSelected = userAnswer === optionIndex;
                    let optionClass = `flex items-center cursor-pointer py-1 px-2 rounded -ml-2 transition-colors duration-150 relative `;

                    if (status === 'correct') {
                      optionClass += ' text-green-700 font-bold bg-green-50/50';
                    } else if (status === 'incorrect') {
                      optionClass += ' text-red-700 font-bold bg-red-50/50';
                    } else {
                      optionClass += ' hover:bg-blue-50';
                    }

                    if (showCorrect) optionClass += ' cursor-text';

                    const content = (
                      <React.Fragment>
                        <CircleNumber
                          num={optionIndex + 1}
                          isSelected={isSelected || status === 'correct'}
                        />
                        <span
                          className={`text-lg ${FONT_SERIF} ${isSelected ? 'font-bold text-blue-900 underline decoration-blue-500 decoration-2 underline-offset-4' : ''}`}
                        >
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
              )}

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
                      <span className="font-medium">{aiLoading ? '分析中...' : 'AI 老师解析'}</span>
                    </button>
                  )}

                  {/* Error Message */}
                  {aiError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {aiError}
                    </div>
                  )}

                  {/* AI Analysis Card - Using Sanitized Logic */}
                  {aiAnalysis && (
                    <SanitizedAIAnalysisDisplay
                      analysis={aiAnalysis}
                      isSaving={isSaving}
                      isSaved={isSaved}
                      onSave={handleSaveToNotebook}
                    />
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
                className={`mb-6 p-5 border border-gray-400 bg-white ${FONT_SERIF} text-lg leading-loose text-justify whitespace-pre-wrap text-black indent-8`}
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
                    __html: highlightText(
                      question.question.replace(/\(\s*\)/g, '( &nbsp;&nbsp;&nbsp;&nbsp; )')
                    ),
                  }}
                />
              </div>
            )}

            {/* Context Box - with 보기 header for Q39-41 (unless new format instruction) */}
            {question.contextBox &&
              !(question.imageUrl || question.image) &&
              (() => {
                const qNum = questionIndex + 1;
                const isNewFormat = question.instruction?.includes('주어진 문장이 들어갈 곳으로');
                const showBogiHeader = qNum >= 39 && qNum <= 41 && !isNewFormat;

                return (
                  <div className="mb-4 bg-white ml-8">
                    {showBogiHeader ? (
                      <>
                        {/* 보기 Header */}
                        <div className="flex items-center justify-center gap-2 mb-0">
                          <div className="flex-1 h-px bg-black"></div>
                          <span
                            className={`${FONT_SERIF} text-base font-bold tracking-widest px-2`}
                          >
                            &lt;보 &nbsp; 기&gt;
                          </span>
                          <div className="flex-1 h-px bg-black"></div>
                        </div>
                        {/* Content Box without top border */}
                        <div className="border border-black border-t-0 p-4">
                          <div
                            className={`${FONT_SERIF} text-lg leading-loose whitespace-pre-wrap text-black indent-8`}
                            onMouseUp={onTextSelect}
                            dangerouslySetInnerHTML={{ __html: highlightText(question.contextBox) }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="border border-black p-4">
                        <div
                          className={`${FONT_SERIF} text-lg leading-loose whitespace-pre-wrap text-black`}
                          onMouseUp={onTextSelect}
                          dangerouslySetInnerHTML={{ __html: highlightText(question.contextBox) }}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

            {/* Options - indented */}
            <div
              className={`ml-8 grid gap-y-2 gap-x-4 ${allVeryShort ? 'grid-cols-4' : hasLongOptions ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}
            >
              {question.options.map((option, optionIndex) => {
                const status = getOptionStatus(optionIndex);
                const isSelected = userAnswer === optionIndex;
                let optionClass = `flex items-center cursor-pointer py-1 px-2 rounded -ml-2 transition-colors duration-150 relative `;

                if (status === 'correct') {
                  optionClass += ' text-green-700 font-bold bg-green-50/50';
                } else if (status === 'incorrect') {
                  optionClass += ' text-red-700 font-bold bg-red-50/50';
                } else {
                  optionClass += ' hover:bg-blue-50';
                }

                if (showCorrect) optionClass += ' cursor-text';

                const content = (
                  <React.Fragment>
                    <CircleNumber
                      num={optionIndex + 1}
                      isSelected={isSelected || status === 'correct'}
                    />
                    <span
                      className={`text-lg ${FONT_SERIF} ${isSelected ? 'font-bold text-blue-900 underline decoration-blue-500 decoration-2 underline-offset-4' : ''}`}
                    >
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
                    <span className="font-medium">{aiLoading ? '分析中...' : 'AI 老师解析'}</span>
                  </button>
                )}

                {/* Error Message */}
                {aiError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {aiError}
                  </div>
                )}

                {/* AI Analysis Card - Using Sanitized Logic */}
                {aiAnalysis && (
                  <SanitizedAIAnalysisDisplay
                    analysis={aiAnalysis}
                    isSaving={isSaving}
                    isSaved={isSaved}
                    onSave={handleSaveToNotebook}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Save Success/Error Toast */}
        {showSaveToast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div
              className={`${saveError ? 'bg-red-600' : 'bg-emerald-600'} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3`}
            >
              {saveError ? <X className="w-5 h-5" /> : <BookmarkCheck className="w-5 h-5" />}
              <div>
                <p className="font-medium">{saveError ? '保存失败' : '已保存到笔记本'}</p>
                {saveError ? (
                  <p className="text-red-100 text-sm">{saveError}</p>
                ) : (
                  <a
                    href="/notebook"
                    className="text-emerald-100 text-sm hover:text-white underline"
                  >
                    查看我的笔记 →
                  </a>
                )}
              </div>
              <button
                onClick={() => {
                  setShowSaveToast(false);
                  setSaveError(null);
                }}
                className={`ml-2 p-1 ${saveError ? 'hover:bg-red-500' : 'hover:bg-emerald-500'} rounded`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
QuestionRenderer.displayName = 'QuestionRenderer';

/**
 * Robust component to display AI Analysis without crashing
 * Prevents white screen issues by strictly sanitizing all inputs
 * Handles cases where AI returns nested objects instead of strings
 */
const SanitizedAIAnalysisDisplay = ({
  analysis,
  isSaving,
  isSaved,
  onSave,
}: {
  analysis: AIAnalysis; // Use the moved AIAnalysis interface here
  isSaving: boolean;
  isSaved: boolean;
  onSave: () => void;
}) => {
  // Helper to safely convert anything to string or return null
  const safeString = (val: unknown): string | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
      try {
        // If it's a simple object with a 'text' property (common AI failure mode), use that
        const record = val as Record<string, unknown>;
        if (typeof record.text === 'string') return record.text;
        return JSON.stringify(val);
      } catch {
        return '[Complex Data]';
      }
    }
    return String(val);
  };

  // Helper to safely extract wrong options
  const safeWrongOptions = (opts: unknown): [string, string][] => {
    if (!opts || typeof opts !== 'object') return [];
    try {
      return Object.entries(opts as Record<string, unknown>).map(([k, v]) => [
        String(k),
        safeString(v) || '',
      ]);
    } catch {
      return [];
    }
  };

  const translation = safeString(analysis.translation);
  const keyPoint = safeString(analysis.keyPoint);
  const analysisText = safeString(analysis.analysis);
  const wrongOptions = safeWrongOptions(analysis.wrongOptions);

  return (
    <div className="mt-3 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl shadow-sm relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <span className="font-bold text-indigo-700">AI 老师解析</span>
        </div>

        {/* Save to Notebook Button */}
        <button
          onClick={onSave}
          disabled={isSaving || isSaved}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            isSaved
              ? 'bg-emerald-100 text-emerald-700 cursor-default'
              : isSaving
                ? 'bg-indigo-100 text-indigo-500 cursor-wait'
                : 'bg-white/70 text-indigo-600 hover:bg-white hover:shadow-sm border border-indigo-200'
          }`}
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="w-4 h-4" />
              已收藏
            </>
          ) : isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Bookmark className="w-4 h-4" />
              收藏
            </>
          )}
        </button>
      </div>

      {/* Translation */}
      {translation && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-indigo-700 mb-1.5">题干翻译</div>
          <div className="text-gray-700 leading-relaxed bg-white/60 p-3 rounded-lg">
            {translation}
          </div>
        </div>
      )}

      {/* Key Point */}
      {keyPoint && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-indigo-700 mb-1.5">核心考点</div>
          <div className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-sm font-medium">
            {keyPoint}
          </div>
        </div>
      )}

      {/* Analysis */}
      {analysisText && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-indigo-700 mb-1.5">正解分析</div>
          <div className="text-gray-700 leading-relaxed bg-white/60 p-3 rounded-lg">
            {analysisText}
          </div>
        </div>
      )}

      {/* Wrong Options */}
      {wrongOptions.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-indigo-700 mb-1.5">干扰项排除</div>
          <div className="space-y-2">
            {wrongOptions.map(([key, value]) => (
              <div key={key} className="bg-white/60 p-3 rounded-lg">
                <span className="font-medium text-gray-600">选项 {key}：</span>
                <span className="text-gray-700">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
