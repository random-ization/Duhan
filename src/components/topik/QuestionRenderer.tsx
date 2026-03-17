import React, { useMemo, useCallback, useState } from 'react';
import { useMutation, useAction } from 'convex/react';
import { TopikQuestion, Language, Annotation } from '../../types';
import { Check, X, Sparkles, Bookmark, BookmarkCheck } from 'lucide-react';
import { getLabels } from '../../utils/i18n';
import { sanitizeStrictHtml } from '../../utils/sanitize';
import { aRef, NOTE_PAGES } from '../../utils/convexRefs';
import { Button } from '../ui';

interface QuestionRendererProps {
  question: TopikQuestion;
  questionIndex: number;
  userAnswer?: number;
  correctAnswer?: number;
  language: Language;
  showCorrect: boolean;
  onAnswerChange?: (optionIndex: number) => void;
  onTextSelect?: (e: React.MouseEvent) => void;
  onAnnotationClick?: (annotationId: string, e: React.MouseEvent) => void;
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

interface ReviewCopy {
  aiErrorMessage: string;
  saveFailedMessage: string;
  saveFailedShort: string;
  savedToast: string;
  analyzing: string;
  aiTitle: string;
  viewNotebook: string;
  saved: string;
  save: string;
  saving: string;
  translation: string;
  keyPoint: string;
  analysis: string;
  wrongOptions: string;
  optionLabel: string;
}

// Korean serif font for authentic TOPIK paper look
const FONT_SERIF = "font-['Batang','KoPubBatang','Times_New_Roman',serif]";

// Unicode circle numbers for TOPIK-style options
const CIRCLE_NUMBERS = ['①', '②', '③', '④'];
const TOPIK_BOGI_HEADER = '<보 기>';
const DEFAULT_AI_ERROR_MESSAGE = 'AI is busy right now. Please try again later.';
const DEFAULT_SAVE_FAILED_MESSAGE = 'Failed to save. Please try again.';
const HIGHLIGHT_BASE_CLASS =
  'box-decoration-clone cursor-pointer transition-all duration-200 px-0.5 rounded-sm ';

type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';
type HighlightVariant = 'note' | 'active' | 'default';

const HIGHLIGHT_STYLE_MAP: Record<HighlightVariant, Record<HighlightColor, string>> = {
  note: {
    yellow:
      'bg-yellow-50/50 dark:bg-yellow-500/15 border-b-4 border-double border-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-500/25',
    green:
      'bg-green-50/50 dark:bg-green-500/15 border-b-4 border-double border-green-500 hover:bg-green-100 dark:hover:bg-green-500/25',
    blue: 'bg-blue-50/50 dark:bg-blue-500/15 border-b-4 border-double border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/25',
    pink: 'bg-pink-50/50 dark:bg-pink-500/15 border-b-4 border-double border-pink-500 hover:bg-pink-100 dark:hover:bg-pink-500/25',
  },
  active: {
    yellow: 'bg-yellow-400 text-yellow-900',
    green: 'bg-green-400 text-green-900',
    blue: 'bg-blue-400 text-blue-900',
    pink: 'bg-pink-400 text-pink-900',
  },
  default: {
    yellow: 'bg-yellow-300/60 hover:bg-yellow-400/60',
    green: 'bg-green-300/60 hover:bg-green-400/60',
    blue: 'bg-blue-300/60 hover:bg-blue-400/60',
    pink: 'bg-pink-300/60 hover:bg-pink-400/60',
  },
};

const normalizeHighlightColor = (color: string): HighlightColor => {
  if (color === 'green' || color === 'blue' || color === 'pink') return color;
  return 'yellow';
};

const getQuestionText = (question: TopikQuestion): string =>
  question.question || question.passage || '';

const getNotebookTitle = (questionText: string, questionIndex: number): string =>
  questionText.length > 30
    ? questionText.substring(0, 30) + '...'
    : questionText || `TOPIK Q${questionIndex + 1}`;

const buildTopikAnalysisNoteText = (aiAnalysis: AIAnalysis, optionLabel: string) => {
  const sections: string[] = [];
  if (aiAnalysis.translation?.trim()) {
    sections.push(`Translation\n${aiAnalysis.translation.trim()}`);
  }
  if (aiAnalysis.keyPoint?.trim()) {
    sections.push(`Key Point\n${aiAnalysis.keyPoint.trim()}`);
  }
  if (aiAnalysis.analysis?.trim()) {
    sections.push(`Analysis\n${aiAnalysis.analysis.trim()}`);
  }
  const wrongOptions = Object.entries(aiAnalysis.wrongOptions || {})
    .map(([key, value]) => `${optionLabel} ${key}: ${value}`)
    .filter(line => line.trim().length > 0);
  if (wrongOptions.length > 0) {
    sections.push(`Wrong Options\n${wrongOptions.join('\n')}`);
  }
  return sections.join('\n\n');
};

const stringifyUnknown = (val: unknown): string => {
  try {
    return JSON.stringify(val);
  } catch {
    return '[Complex Data]';
  }
};

const safeToString = (val: unknown): string | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (typeof val === 'object') {
    const record = val as Record<string, unknown>;
    if (typeof record.text === 'string') return record.text;
    return stringifyUnknown(val);
  }
  if (typeof val === 'function' || typeof val === 'symbol') return val.toString();
  return stringifyUnknown(val);
};

const getReviewCopy = (labels: ReturnType<typeof getLabels>): ReviewCopy => {
  const review = labels.dashboard?.topik?.mobile?.review;
  const common = labels.common;
  const {
    aiError = DEFAULT_AI_ERROR_MESSAGE,
    saveFailed = DEFAULT_SAVE_FAILED_MESSAGE,
    saveFailedShort = 'Save failed',
    savedToast = 'Saved to notebook',
    aiThinking = 'Analyzing...',
    aiTitle = 'AI Analysis',
    saved = 'Saved',
    save = 'Save',
    saving = 'Saving...',
    translation = 'Translation',
    keyPoint = 'Key Point',
    analysis = 'Analysis',
    wrongOptions = 'Wrong Options',
  } = review ?? {};

  return {
    aiErrorMessage: aiError,
    saveFailedMessage: saveFailed,
    saveFailedShort,
    savedToast,
    analyzing: aiThinking,
    aiTitle,
    viewNotebook: common?.viewNotebook || 'View notebook →',
    saved,
    save,
    saving,
    translation,
    keyPoint,
    analysis,
    wrongOptions,
    optionLabel: common?.option || 'Option',
  };
};

const CircleNumber = ({ num, isSelected }: { num: number; isSelected: boolean }) => {
  return (
    <span className={`text-lg mr-2 flex-shrink-0 ${FONT_SERIF} ${isSelected ? 'font-bold' : ''}`}>
      {CIRCLE_NUMBERS[num - 1] || num}
    </span>
  );
};

const TextSelectionWrapper = ({
  children,
  onMouseUp,
}: {
  children: React.ReactNode;
  onMouseUp?: (e: React.MouseEvent) => void;
}) => (
  <div onMouseUp={onMouseUp} role="none">
    {children}
  </div>
);

const PassageView = ({
  question,
  highlightText,
  onTextSelect,
  hidePassage = false,
  isInline = false,
}: {
  question: TopikQuestion;
  highlightText: (t: string) => string;
  onTextSelect?: (e: React.MouseEvent) => void;
  hidePassage?: boolean;
  isInline?: boolean;
}) => {
  if (hidePassage || !question.passage) return null;
  // Standard layout hides passage if image exists
  if (!isInline && (question.imageUrl || question.image)) return null;

  const className = isInline
    ? `mb-6 p-5 border border-border bg-card ${FONT_SERIF} text-lg leading-loose text-justify whitespace-pre-wrap text-foreground indent-8`
    : `mb-4 p-5 border border-border bg-card ${FONT_SERIF} text-lg leading-loose text-justify whitespace-pre-wrap text-foreground indent-8`;

  return (
    <div className={className}>
      <TextSelectionWrapper onMouseUp={onTextSelect}>
        <div dangerouslySetInnerHTML={{ __html: highlightText(question.passage) }} />
      </TextSelectionWrapper>
    </div>
  );
};

const ContextBoxView = ({
  question,
  questionIndex,
  highlightText,
  onTextSelect,
  isInline = false,
}: {
  question: TopikQuestion;
  questionIndex: number;
  highlightText: (t: string) => string;
  onTextSelect?: (e: React.MouseEvent) => void;
  isInline?: boolean;
}) => {
  if (!question.contextBox || question.imageUrl || question.image) return null;

  const qNum = questionIndex + 1;
  const isNewFormat = question.instruction?.includes('주어진 문장이 들어갈 곳으로');
  const showBogiHeader = qNum >= 39 && qNum <= 41 && !isNewFormat;
  const containerClass = isInline ? 'mb-4 bg-card ml-8' : 'mb-4 bg-card';

  if (showBogiHeader) {
    return (
      <div className={containerClass}>
        <div className="flex items-center justify-center gap-2 mb-0">
          <div className="flex-1 h-px bg-foreground"></div>
          <span className={`${FONT_SERIF} text-base font-bold tracking-widest px-2`}>
            {TOPIK_BOGI_HEADER}
          </span>
          <div className="flex-1 h-px bg-foreground"></div>
        </div>
        <div className="border border-foreground border-t-0 p-4">
          <TextSelectionWrapper onMouseUp={onTextSelect}>
            <div
              className={`${FONT_SERIF} text-lg leading-loose whitespace-pre-wrap text-foreground indent-8`}
              dangerouslySetInnerHTML={{ __html: highlightText(question.contextBox) }}
            />
          </TextSelectionWrapper>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="border border-foreground p-4">
        <TextSelectionWrapper onMouseUp={onTextSelect}>
          <div
            className={`${FONT_SERIF} text-lg leading-loose whitespace-pre-wrap text-foreground`}
            dangerouslySetInnerHTML={{ __html: highlightText(question.contextBox) }}
          />
        </TextSelectionWrapper>
      </div>
    </div>
  );
};

const OptionsView = ({
  question,
  userAnswer,
  showCorrect,
  onAnswerChange,
  onTextSelect,
  highlightText,
  getOptionStatus,
  isInline = false,
}: {
  question: TopikQuestion;
  userAnswer?: number;
  showCorrect: boolean;
  onAnswerChange?: (i: number) => void;
  onTextSelect?: (e: React.MouseEvent) => void;
  highlightText: (t: string) => string;
  getOptionStatus: (i: number) => 'correct' | 'incorrect' | null;
  isInline?: boolean;
}) => {
  const allVeryShort = question.options.every(opt => opt.length <= 2);
  const hasLongOptions = question.options.some(opt => opt.length > 15);

  const getGridCols = () => {
    if (allVeryShort) return 'grid-cols-4';
    if (hasLongOptions) return 'grid-cols-1';
    return 'grid-cols-1 md:grid-cols-2';
  };

  const gridClass = `${isInline ? 'ml-8 ' : ''}grid gap-y-2 gap-x-4 ${getGridCols()}`;

  // Image-based options
  if (question.optionImages?.some(Boolean)) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {question.optionImages.map((imgUrl, optionIndex) => {
          const status = getOptionStatus(optionIndex);
          const isSelected = userAnswer === optionIndex;
          const getContainerClass = () => {
            let cls = `relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all cursor-pointer `;
            if (status === 'correct') cls += 'border-green-500 ring-4 ring-green-200';
            else if (status === 'incorrect') cls += 'border-red-500 ring-4 ring-red-200';
            else if (isSelected) cls += 'border-blue-500 ring-4 ring-blue-200';
            else cls += 'border-border hover:border-border';
            if (showCorrect) cls += ' cursor-default';
            return cls;
          };

          const getNumberBadgeClass = () => {
            const base =
              'absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ';
            if (status === 'correct') return base + 'bg-green-500 text-white';
            if (status === 'incorrect') return base + 'bg-red-500 text-white';
            if (isSelected) return base + 'bg-blue-500 text-white';
            return base + 'bg-card/80 text-muted-foreground border border-border';
          };

          const containerClass = getContainerClass();
          const numberBadgeClass = getNumberBadgeClass();

          const imageContent = (
            <>
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt={String(optionIndex + 1)}
                  className="w-full h-full object-contain bg-card"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                  <span className="text-4xl font-bold">{optionIndex + 1}</span>
                </div>
              )}
              <div className={numberBadgeClass}>{CIRCLE_NUMBERS[optionIndex]}</div>
              {status === 'correct' && (
                <Check className="absolute top-2 right-2 w-6 h-6 text-green-600 bg-card rounded-full p-0.5" />
              )}
              {status === 'incorrect' && (
                <X className="absolute top-2 right-2 w-6 h-6 text-red-600 bg-card rounded-full p-0.5" />
              )}
            </>
          );

          return showCorrect ? (
            <div key={`${question.id}-opt-${optionIndex}`} className={containerClass}>
              {imageContent}
            </div>
          ) : (
            <Button
              key={`${question.id}-opt-${optionIndex}`}
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => onAnswerChange?.(optionIndex)}
              className={`${containerClass} p-0`}
            >
              {imageContent}
            </Button>
          );
        })}
      </div>
    );
  }

  // Text-based options
  return (
    <div className={gridClass}>
      {question.options.map((option, optionIndex) => {
        const status = getOptionStatus(optionIndex);
        const isSelected = userAnswer === optionIndex;
        let optionClass = `flex items-center cursor-pointer py-1 px-2 rounded -ml-2 transition-colors duration-150 relative `;

        if (status === 'correct')
          optionClass +=
            ' text-green-700 dark:text-green-200 font-bold bg-green-50/50 dark:bg-green-500/15';
        else if (status === 'incorrect')
          optionClass +=
            ' text-red-700 dark:text-red-200 font-bold bg-red-50/50 dark:bg-red-500/15';
        else optionClass += ' hover:bg-blue-50 dark:hover:bg-blue-500/15';

        if (showCorrect) optionClass += ' cursor-text';

        const content = (
          <React.Fragment>
            <CircleNumber num={optionIndex + 1} isSelected={isSelected || status === 'correct'} />
            <span
              className={`text-lg ${FONT_SERIF} ${isSelected ? 'font-bold text-blue-900 dark:text-blue-200 underline decoration-blue-500 dark:decoration-blue-300 decoration-2 underline-offset-4' : ''}`}
            >
              <span dangerouslySetInnerHTML={{ __html: highlightText(option) }} />
            </span>
            {status === 'correct' && <Check className="w-5 h-5 text-green-600 ml-2" />}
            {status === 'incorrect' && <X className="w-5 h-5 text-red-600 ml-2" />}
          </React.Fragment>
        );

        const commonProps = {
          key: `${isInline ? 'inline-' : ''}${question.id}-opt-${optionIndex}`,
          onMouseUp: onTextSelect,
          className: optionClass,
        };

        return showCorrect ? (
          <div {...commonProps}>{content}</div>
        ) : (
          <Button
            {...commonProps}
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => onAnswerChange?.(optionIndex)}
            className={`${optionClass} justify-start font-normal`}
          >
            {content}
          </Button>
        );
      })}
    </div>
  );
};

const AIAnalysisSection = ({
  showCorrect,
  aiAnalysis,
  aiLoading,
  aiError,
  isSaving,
  isSaved,
  handleAIAnalysis,
  handleSaveToNotebook,
  copy,
  isInline = false,
}: {
  showCorrect: boolean;
  aiAnalysis: AIAnalysis | null;
  aiLoading: boolean;
  aiError: string | null;
  isSaving: boolean;
  isSaved: boolean;
  handleAIAnalysis: () => void;
  handleSaveToNotebook: () => void;
  copy: ReviewCopy;
  isInline?: boolean;
}) => {
  if (!showCorrect) return null;
  return (
    <div className={isInline ? 'mt-4 ml-8' : 'mt-4'}>
      {!aiAnalysis && (
        <Button
          type="button"
          size="auto"
          onClick={handleAIAnalysis}
          loading={aiLoading}
          loadingText={copy.analyzing}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <>
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">{copy.aiTitle}</span>
          </>
        </Button>
      )}
      {aiError && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-400/30 rounded-lg text-red-700 dark:text-red-200 text-sm">
          {aiError}
        </div>
      )}
      {aiAnalysis && (
        <SanitizedAIAnalysisDisplay
          analysis={aiAnalysis}
          isSaving={isSaving}
          isSaved={isSaved}
          onSave={handleSaveToNotebook}
          copy={copy}
        />
      )}
    </div>
  );
};

const ExplanationView = ({
  showCorrect,
  question,
  labels,
  isInline = false,
}: {
  showCorrect: boolean;
  question: TopikQuestion;
  labels: { explanation?: string };
  isInline?: boolean;
}) => {
  if (!showCorrect || !question.explanation) return null;
  return (
    <div
      className={`mt-4 ${isInline ? 'ml-8' : ''} p-4 bg-muted border-l-4 border-foreground text-sm font-sans`}
    >
      <div className="font-bold mb-1">{labels.explanation || '해설'}</div>
      <div className="leading-relaxed">{question.explanation}</div>
    </div>
  );
};

const QuestionTextView = ({
  question,
  questionIndex,
  highlightText,
  onTextSelect,
  isInline,
}: {
  question: TopikQuestion;
  questionIndex: number;
  highlightText: (t: string) => string;
  onTextSelect?: (e: React.MouseEvent) => void;
  isInline: boolean;
}) => {
  if (!question.question) return null;

  const html = highlightText(
    question.question.replaceAll(/\(\s*\)/g, '( &nbsp;&nbsp;&nbsp;&nbsp; )')
  );

  if (isInline) {
    return (
      <div className="flex items-start mb-3">
        <span className={`text-lg font-bold mr-2 min-w-[32px] ${FONT_SERIF}`}>
          {questionIndex + 1}.
        </span>
        <div className={`text-lg leading-loose flex-1 cursor-text text-foreground ${FONT_SERIF}`}>
          <TextSelectionWrapper onMouseUp={onTextSelect}>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </TextSelectionWrapper>
        </div>
      </div>
    );
  }

  return (
    <div className={`text-lg leading-loose mb-3 cursor-text text-foreground ${FONT_SERIF}`}>
      <TextSelectionWrapper onMouseUp={onTextSelect}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </TextSelectionWrapper>
    </div>
  );
};

const QuestionMainContent = ({
  question,
  questionIndex,
  userAnswer,
  showCorrect,
  onAnswerChange,
  onTextSelect,
  onAnnotationClick,
  hidePassage,
  isInline,
  highlightText,
  getOptionStatus,
  labels,
  aiAnalysis,
  aiLoading,
  aiError,
  isSaving,
  isSaved,
  handleAIAnalysis,
  handleSaveToNotebook,
  reviewCopy,
}: {
  question: TopikQuestion;
  questionIndex: number;
  userAnswer?: number;
  showCorrect: boolean;
  onAnswerChange?: (optionIndex: number) => void;
  onTextSelect?: (e: React.MouseEvent) => void;
  onAnnotationClick?: (annotationId: string, e: React.MouseEvent) => void;
  hidePassage: boolean;
  isInline: boolean;
  highlightText: (t: string) => string;
  getOptionStatus: (i: number) => 'correct' | 'incorrect' | null;
  labels: { explanation?: string };
  aiAnalysis: AIAnalysis | null;
  aiLoading: boolean;
  aiError: string | null;
  isSaving: boolean;
  isSaved: boolean;
  handleAIAnalysis: () => void;
  handleSaveToNotebook: () => void;
  reviewCopy: ReviewCopy;
}) => {
  const questionImage = question.imageUrl || question.image;
  const handleMarkedClick = (e: React.MouseEvent) => {
    if (!onAnnotationClick) return;
    const target = e.target;
    if (!(target instanceof Element)) return;
    const mark = target.closest('mark[data-annotation-id]');
    if (!(mark instanceof HTMLElement)) return;
    const annotationId = mark.dataset.annotationId;
    if (!annotationId) return;
    e.preventDefault();
    e.stopPropagation();
    onAnnotationClick(annotationId, e);
  };

  return (
    <div className={isInline ? undefined : 'flex items-start'} onClickCapture={handleMarkedClick}>
      {!isInline && (
        <span className={`text-lg font-bold mr-3 min-w-[32px] ${FONT_SERIF}`}>
          {questionIndex + 1}.
        </span>
      )}
      <div className={isInline ? undefined : 'flex-1'}>
        {!isInline && questionImage && (
          <div className="mb-4 flex justify-center bg-card p-2 border border-foreground/10 rounded">
            <img
              src={questionImage}
              alt={String(questionIndex + 1)}
              className="max-h-[300px] object-contain"
            />
          </div>
        )}
        <PassageView
          question={question}
          highlightText={highlightText}
          onTextSelect={onTextSelect}
          hidePassage={hidePassage}
          isInline={isInline}
        />
        <QuestionTextView
          question={question}
          questionIndex={questionIndex}
          highlightText={highlightText}
          onTextSelect={onTextSelect}
          isInline={isInline}
        />
        <ContextBoxView
          question={question}
          questionIndex={questionIndex}
          highlightText={highlightText}
          onTextSelect={onTextSelect}
          isInline={isInline}
        />
        <OptionsView
          question={question}
          userAnswer={userAnswer}
          showCorrect={showCorrect}
          onAnswerChange={onAnswerChange}
          onTextSelect={onTextSelect}
          highlightText={highlightText}
          getOptionStatus={getOptionStatus}
          isInline={isInline}
        />
        <ExplanationView
          showCorrect={showCorrect}
          question={question}
          labels={labels}
          isInline={isInline}
        />
        <AIAnalysisSection
          showCorrect={showCorrect}
          aiAnalysis={aiAnalysis}
          aiLoading={aiLoading}
          aiError={aiError}
          isSaving={isSaving}
          isSaved={isSaved}
          handleAIAnalysis={handleAIAnalysis}
          handleSaveToNotebook={handleSaveToNotebook}
          copy={reviewCopy}
          isInline={isInline}
        />
      </div>
    </div>
  );
};

const resolveOptionStatus = (
  optionIndex: number,
  showCorrect: boolean,
  correctAnswer?: number,
  userAnswer?: number
): 'correct' | 'incorrect' | null => {
  if (!showCorrect) return null;
  if (optionIndex === correctAnswer) return 'correct';
  if (optionIndex === userAnswer && optionIndex !== correctAnswer) return 'incorrect';
  return null;
};

const buildHighlightedText = (
  text: string,
  questionAnnotations: Annotation[],
  activeAnnotationId: string | null | undefined,
  getHighlightClass: (isActive: boolean, hasNote?: boolean, color?: string) => string
): string => {
  if (questionAnnotations.length === 0) return text;

  let result = text;
  const sorted = questionAnnotations
    .slice()
    .sort((a, b) => (b.updatedAt || b.timestamp || 0) - (a.updatedAt || a.timestamp || 0));

  // Deduplicate by selected quote to avoid stacking <mark> tags after repeated saves.
  const dedupedByText = new Map<string, Annotation>();
  sorted.forEach(annotation => {
    const annotatedText = annotation.text || annotation.selectedText;
    if (!annotatedText) return;
    const key = annotatedText.trim().toLowerCase();
    if (!key) return;
    const existing = dedupedByText.get(key);
    if (!existing) {
      dedupedByText.set(key, annotation);
      return;
    }

    const incomingIsActive = activeAnnotationId === annotation.id;
    const existingIsActive = activeAnnotationId === existing.id;
    if (incomingIsActive && !existingIsActive) {
      dedupedByText.set(key, annotation);
    }
  });

  dedupedByText.forEach(annotation => {
    const annotatedText = annotation.text || annotation.selectedText;
    if (!annotatedText) return;
    const isActive =
      activeAnnotationId === annotation.id || (annotation.id === 'temp' && !activeAnnotationId);
    const hasNote = Boolean(annotation.note?.trim());
    // If a record has neither color nor note, it is treated as deleted and should not render.
    if (!annotation.color && !hasNote) return;
    const className = getHighlightClass(isActive, hasNote, annotation.color || 'yellow');
    const annotatedRegExpSource = annotatedText.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const regex = new RegExp(`(${annotatedRegExpSource})`, 'gi');
    result = result.replace(
      regex,
      `<mark data-annotation-id="${annotation.id}" class="${className}">$1</mark>`
    );
  });

  // Sanitize the final HTML to prevent XSS
  return sanitizeStrictHtml(result);
};

const useQuestionReviewActions = ({
  question,
  questionIndex,
  correctAnswer,
  contextPrefix,
  optionLabel,
  aiErrorMessage,
  saveFailedMessage,
}: {
  question: TopikQuestion;
  questionIndex: number;
  correctAnswer?: number;
  contextPrefix: string;
  optionLabel: string;
  aiErrorMessage: string;
  saveFailedMessage: string;
}) => {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const analyzeQuestionAction = useAction(
    aRef<
      { question: string; options: string[]; correctAnswer: number; type: string },
      { success?: boolean; data?: AIAnalysis }
    >('ai:analyzeQuestion')
  );

  const ingestFromSource = useMutation(NOTE_PAGES.ingestFromSource);

  const triggerSaveToast = useCallback((error: string | null = null) => {
    setSaveError(error);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 4000);
  }, []);

  const dismissSaveToast = useCallback(() => {
    setShowSaveToast(false);
    setSaveError(null);
  }, []);

  const handleAIAnalysis = useCallback(async () => {
    if (aiLoading || aiAnalysis) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const result = (await analyzeQuestionAction({
        question: getQuestionText(question),
        options: question.options,
        correctAnswer: correctAnswer ?? 0,
        type: 'TOPIK_QUESTION',
      })) as { success?: boolean; data?: AIAnalysis };

      if (result?.success && result.data) setAiAnalysis(result.data);
      else setAiError(aiErrorMessage);
    } catch (err) {
      console.error('[AI Analysis] Error:', err);
      setAiError(aiErrorMessage);
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, aiAnalysis, analyzeQuestionAction, question, correctAnswer, aiErrorMessage]);

  const handleSaveToNotebook = useCallback(async () => {
    if (!aiAnalysis || isSaving || isSaved) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const questionText = getQuestionText(question);
      const title = getNotebookTitle(questionText, questionIndex);
      const examId = contextPrefix.startsWith('TOPIK-') ? contextPrefix.slice(6) : contextPrefix;
      const contentId = examId || 'topik-review';
      const noteText = buildTopikAnalysisNoteText(aiAnalysis, optionLabel);
      const questionNumber =
        typeof question.number === 'number' ? question.number : questionIndex + 1;

      console.log('[Save to Notebook] Saving...', { title, source: 'TOPIK_ANALYSIS' });

      const result = await ingestFromSource({
        sourceModule: 'TOPIK_ANALYSIS',
        sourceRef: {
          module: 'TOPIK_ANALYSIS',
          contentId,
          questionIndex,
          questionNumber,
          contextKey: `${contextPrefix}-Q${questionIndex}`,
        },
        noteType: 'ai_mistake',
        title,
        quote: questionText,
        note: noteText || undefined,
        tags: ['topik', 'ai-analysis', 'review'],
        status: 'Inbox',
        dedupeKey: `topik-analysis|${contentId}|q${questionIndex}`,
        contentId,
        contentTitle: `TOPIK ${contentId}`,
      });

      console.log('[Save to Notebook] Result:', result);

      if (!result) throw new Error('Save failed');
      setIsSaved(true);
      triggerSaveToast();
    } catch (err: unknown) {
      console.error('[Save to Notebook] Error:', err);
      triggerSaveToast((err as Error)?.message || saveFailedMessage);
    } finally {
      setIsSaving(false);
    }
  }, [
    aiAnalysis,
    isSaving,
    isSaved,
    question,
    questionIndex,
    correctAnswer,
    contextPrefix,
    optionLabel,
    ingestFromSource,
    triggerSaveToast,
    saveFailedMessage,
  ]);

  return {
    aiAnalysis,
    aiLoading,
    aiError,
    isSaving,
    isSaved,
    showSaveToast,
    saveError,
    handleAIAnalysis,
    handleSaveToNotebook,
    dismissSaveToast,
  };
};

const useQuestionHighlighting = ({
  annotations,
  contextKey,
  activeAnnotationId,
  showCorrect,
  correctAnswer,
  userAnswer,
}: {
  annotations: Annotation[];
  contextKey: string;
  activeAnnotationId?: string | null;
  showCorrect: boolean;
  correctAnswer?: number;
  userAnswer?: number;
}) => {
  const getHighlightClass = useCallback(
    (isActive: boolean, hasNote: boolean = false, color: string = 'yellow') => {
      const variant: HighlightVariant =
        hasNote && !isActive ? 'note' : isActive ? 'active' : 'default';
      const resolvedColor = normalizeHighlightColor(color);
      return HIGHLIGHT_BASE_CLASS + HIGHLIGHT_STYLE_MAP[variant][resolvedColor];
    },
    []
  );

  const questionAnnotations = useMemo(
    () => annotations.filter(annotation => annotation.contextKey === contextKey),
    [annotations, contextKey]
  );

  const highlightText = useCallback(
    (text: string) =>
      buildHighlightedText(text, questionAnnotations, activeAnnotationId, getHighlightClass),
    [questionAnnotations, activeAnnotationId, getHighlightClass]
  );

  const getOptionStatus = useCallback(
    (optionIndex: number) =>
      resolveOptionStatus(optionIndex, showCorrect, correctAnswer, userAnswer),
    [showCorrect, correctAnswer, userAnswer]
  );

  return { highlightText, getOptionStatus };
};

const SaveToastShell = ({
  containerClass,
  buttonClass,
  icon,
  title,
  body,
  onDismiss,
}: {
  containerClass: string;
  buttonClass: string;
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  onDismiss: () => void;
}) => (
  <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
    <div
      className={`${containerClass} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3`}
    >
      {icon}
      <div>
        <p className="font-medium">{title}</p>
        {body}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={onDismiss}
        className={`ml-2 p-1 ${buttonClass} rounded`}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

const SaveToast = ({
  show,
  saveError,
  saveFailedShort,
  savedToast,
  viewNotebook,
  onDismiss,
}: {
  show: boolean;
  saveError: string | null;
  saveFailedShort: string;
  savedToast: string;
  viewNotebook: string;
  onDismiss: () => void;
}) => {
  if (!show) return null;

  if (saveError) {
    return (
      <SaveToastShell
        containerClass="bg-red-600"
        buttonClass="hover:bg-red-500"
        icon={<X className="w-5 h-5" />}
        title={saveFailedShort}
        body={<p className="text-red-100 text-sm">{saveError}</p>}
        onDismiss={onDismiss}
      />
    );
  }

  return (
    <SaveToastShell
      containerClass="bg-emerald-600"
      buttonClass="hover:bg-emerald-500"
      icon={<BookmarkCheck className="w-5 h-5" />}
      title={savedToast}
      body={
        <a href="/notebook" className="text-emerald-100 text-sm hover:text-white underline">
          {viewNotebook}
        </a>
      }
      onDismiss={onDismiss}
    />
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
    onAnnotationClick,
    annotations = [],
    contextPrefix = '',
    activeAnnotationId,
    hidePassage = false,
    showInlineNumber = false,
  }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const reviewCopy = useMemo(() => getReviewCopy(labels), [labels]);
    const contextKey = useMemo(
      () => `${contextPrefix}-Q${questionIndex}`,
      [contextPrefix, questionIndex]
    );

    const {
      aiAnalysis,
      aiLoading,
      aiError,
      isSaving,
      isSaved,
      showSaveToast,
      saveError,
      handleAIAnalysis,
      handleSaveToNotebook,
      dismissSaveToast,
    } = useQuestionReviewActions({
      question,
      questionIndex,
      correctAnswer,
      contextPrefix,
      optionLabel: reviewCopy.optionLabel,
      aiErrorMessage: reviewCopy.aiErrorMessage,
      saveFailedMessage: reviewCopy.saveFailedMessage,
    });

    const { highlightText, getOptionStatus } = useQuestionHighlighting({
      annotations,
      contextKey,
      activeAnnotationId,
      showCorrect,
      correctAnswer,
      userAnswer,
    });

    return (
      <div className="break-inside-avoid">
        <QuestionMainContent
          question={question}
          questionIndex={questionIndex}
          userAnswer={userAnswer}
          showCorrect={showCorrect}
          onAnswerChange={onAnswerChange}
          onTextSelect={onTextSelect}
          onAnnotationClick={onAnnotationClick}
          hidePassage={hidePassage}
          isInline={showInlineNumber}
          highlightText={highlightText}
          getOptionStatus={getOptionStatus}
          labels={labels}
          aiAnalysis={aiAnalysis}
          aiLoading={aiLoading}
          aiError={aiError}
          isSaving={isSaving}
          isSaved={isSaved}
          handleAIAnalysis={handleAIAnalysis}
          handleSaveToNotebook={handleSaveToNotebook}
          reviewCopy={reviewCopy}
        />
        <SaveToast
          show={showSaveToast}
          saveError={saveError}
          saveFailedShort={reviewCopy.saveFailedShort}
          savedToast={reviewCopy.savedToast}
          viewNotebook={reviewCopy.viewNotebook}
          onDismiss={dismissSaveToast}
        />
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
  copy,
}: {
  analysis: AIAnalysis; // Use the moved AIAnalysis interface here
  isSaving: boolean;
  isSaved: boolean;
  onSave: () => void;
  copy: ReviewCopy;
}) => {
  const safeString = safeToString;

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

  const getSaveBtnClass = () => {
    const base =
      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ';
    if (isSaved) return base + 'bg-emerald-100 text-emerald-700 cursor-default';
    if (isSaving) return base + 'bg-indigo-100 text-indigo-500 cursor-wait';
    return (
      base + 'bg-card/70 text-indigo-600 hover:bg-card hover:shadow-sm border border-indigo-200'
    );
  };

  const getSaveBtnContent = () => {
    if (isSaved)
      return (
        <>
          <BookmarkCheck className="w-4 h-4" />
          {copy.saved}
        </>
      );
    return (
      <>
        <Bookmark className="w-4 h-4" />
        {copy.save}
      </>
    );
  };

  return (
    <div className="mt-3 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl shadow-sm relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <span className="font-bold text-indigo-700">{copy.aiTitle}</span>
        </div>

        {/* Save to Notebook Button */}
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={onSave}
          disabled={isSaving || isSaved}
          loading={isSaving}
          loadingText={copy.saving}
          className={getSaveBtnClass()}
        >
          {getSaveBtnContent()}
        </Button>
      </div>

      {/* Translation */}
      {translation && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-indigo-700 mb-1.5">{copy.translation}</div>
          <div className="text-muted-foreground leading-relaxed bg-card/60 p-3 rounded-lg">
            {translation}
          </div>
        </div>
      )}

      {/* Key Point */}
      {keyPoint && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-indigo-700 mb-1.5">{copy.keyPoint}</div>
          <div className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-sm font-medium">
            {keyPoint}
          </div>
        </div>
      )}

      {/* Analysis */}
      {analysisText && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-indigo-700 mb-1.5">{copy.analysis}</div>
          <div className="text-muted-foreground leading-relaxed bg-card/60 p-3 rounded-lg">
            {analysisText}
          </div>
        </div>
      )}

      {/* Wrong Options */}
      {wrongOptions.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-indigo-700 mb-1.5">{copy.wrongOptions}</div>
          <div className="space-y-2">
            {wrongOptions.map(([key, value]) => (
              <div key={key} className="bg-card/60 p-3 rounded-lg">
                <span className="font-medium text-muted-foreground">
                  {copy.optionLabel} {key}:
                </span>
                <span className="text-muted-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
