import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
  List,
  CheckSquare,
  Keyboard,
  Grip,
} from 'lucide-react';
import type { Language } from '../../../types';
import { getLabels, Labels } from '../../../utils/i18n';
import { getLocalizedContent } from '../../../utils/languageUtils';
import TestCardTrueFalse from './test/TestCardTrueFalse';
import TestCardMultipleChoice from './test/TestCardMultipleChoice';
import TestCardFill10 from './test/TestCardFill10';
import TestCardWritten from './test/TestCardWritten';
import { Button, Select } from '../../../components/ui';

type WordInScope = {
  id: string;
  korean: string;
  english: string;
  meaning?: string;
  meaningEn?: string;
  meaningVi?: string;
  meaningMn?: string;
};

type AnswerLanguage = 'KOREAN' | 'NATIVE' | 'BOTH';
type TestStage = 'SETTINGS' | 'RUNNING' | 'RESULT';
type QuestionType = 'TRUE_FALSE' | 'MULTIPLE_CHOICE' | 'FILL_10' | 'WRITTEN';

type EnabledTypes = Record<QuestionType, boolean>;

type Direction = 'KR_TO_NATIVE' | 'NATIVE_TO_KR';

type TestCard =
  | {
      id: string;
      type: 'TRUE_FALSE';
      wordId: string;
      direction: Direction;
      prompt: string;
      statement: string;
      correctIsTrue: boolean;
      correctPair: { korean: string; native: string };
    }
  | {
      id: string;
      type: 'MULTIPLE_CHOICE';
      wordId: string;
      direction: Direction;
      prompt: string;
      options: string[];
      correctIndex: number;
      correctPair: { korean: string; native: string };
    }
  | {
      id: string;
      type: 'WRITTEN';
      wordId: string;
      direction: Direction;
      prompt: string;
      answer: string;
      correctPair: { korean: string; native: string };
    }
  | {
      id: string;
      type: 'FILL_10';
      direction: Direction;
      items: {
        wordId: string;
        prompt: string;
        answer: string;
        pair: { korean: string; native: string };
      }[];
      options: string[];
    };

type TestCardAnswer =
  | { type: 'TRUE_FALSE'; isTrue: boolean }
  | { type: 'MULTIPLE_CHOICE'; selectedIndex: number }
  | { type: 'WRITTEN'; input: string }
  | { type: 'FILL_10'; filled: string[]; directionUsed: Direction };

type Props = Readonly<{
  words: WordInScope[];
  language: Language;
  scopeTitle: string;
  onClose?: () => void;
  onFsrsReview?: (wordId: string, isCorrect: boolean) => void;
  onComplete?: () => void;
  showCloseButton?: boolean;
  resumeSnapshot?: VocabTestSessionSnapshot | null;
  onSessionSnapshot?: (snapshot: VocabTestSessionSnapshot) => void;
}>;

export type VocabTestSessionSnapshot = {
  stage: 'RUNNING';
  answerLanguage: AnswerLanguage;
  enabledTypes: EnabledTypes;
  questionCount: number;
  cards: TestCard[];
  activeCardIndex: number;
  answers: Partial<Record<string, TestCardAnswer>>;
  startedAt: number | null;
  submitAttempted: boolean;
  timestamp: number;
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const normalizeText = (s: string) => s.trim().replaceAll(/\s+/g, ' ').toLowerCase();

const nativeLabelFromLanguage = (language: Language) => {
  const labels = getLabels(language);
  return labels.vocabTest?.nativeLanguage || 'English';
};

type TestSettingsProps = Readonly<{
  language: Language;
  scopeTitle: string;
  maxQuestions: number;
  effectiveQuestionCount: number;
  setQuestionCount: (n: number) => void;
  answerLanguage: AnswerLanguage;
  setAnswerLanguage: (l: AnswerLanguage) => void;
  enabledTypes: EnabledTypes;
  setEnabledTypes: React.Dispatch<React.SetStateAction<EnabledTypes>>;
  canUseMultipleChoice: boolean;
  enabledTypeList: QuestionType[];
  startTest: () => void;
  isStartDisabled: boolean;
}>;

type RunningScreenProps = Readonly<{
  cards: TestCard[];
  activeCardIndex: number;
  goToCard: (idx: number) => void;
  answeredCardCount: number;
  answers: Partial<Record<string, TestCardAnswer>>;
  isCardComplete: (card: TestCard, answer: TestCardAnswer | undefined) => boolean;
  submitAttempted: boolean;
  language: Language;
  upsertAnswer: (cardId: string, answer: TestCardAnswer) => void;
  isAllAnswered: boolean;
  submitTest: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onSetCardRef: (id: string, el: HTMLDivElement | null) => void;
  onClose?: () => void;
}>;

type ResultScreenProps = Readonly<{
  language: Language;
  stats: { totalQuestions: number; correctQuestions: number; seconds: number | null };
  setStage: (s: TestStage) => void;
  onClose?: () => void;
  labels: Labels;
  cards: TestCard[];
  answers: Partial<Record<string, TestCardAnswer>>;
}>;

function ResultScreen({
  language,
  stats,
  setStage,
  onClose,
  labels,
  cards,
  answers,
}: ResultScreenProps) {
  const getCorrectness = (card: TestCard, a: TestCardAnswer | undefined) => {
    if (!a) return null;
    const { total, correct } = calculateCardStats(card, a);
    return {
      correctCount: correct,
      totalCount: total,
      allCorrect: correct === total,
    };
  };

  const getCorrectnessLabel = (
    cardType: QuestionType,
    correctness: { correctCount: number; totalCount: number; allCorrect: boolean }
  ) => {
    if (cardType === 'FILL_10') {
      return `${correctness.correctCount}/${correctness.totalCount}`;
    }
    if (correctness.allCorrect) {
      return labels.vocabTest?.correct || 'Correct';
    }
    return labels.vocabTest?.wrong || 'Wrong';
  };

  const renderReviewCard = (card: TestCard, a: TestCardAnswer | undefined) => {
    if (card.type === 'TRUE_FALSE') {
      return (
        <TestCardTrueFalse
          language={language}
          prompt={card.prompt}
          statement={card.statement}
          mode="review"
          correctIsTrue={card.correctIsTrue}
          answered={a?.type === 'TRUE_FALSE' ? { isTrue: a.isTrue } : undefined}
          onSubmit={() => {}}
        />
      );
    }
    if (card.type === 'MULTIPLE_CHOICE') {
      return (
        <TestCardMultipleChoice
          language={language}
          prompt={card.prompt}
          options={card.options}
          mode="review"
          correctIndex={card.correctIndex}
          answered={a?.type === 'MULTIPLE_CHOICE' ? { selectedIndex: a.selectedIndex } : undefined}
          onSubmit={() => {}}
        />
      );
    }
    if (card.type === 'WRITTEN') {
      return (
        <TestCardWritten
          language={language}
          prompt={card.prompt}
          mode="review"
          correctAnswer={card.answer}
          answered={a?.type === 'WRITTEN' ? { input: a.input } : undefined}
          onSubmit={() => {}}
        />
      );
    }
    return (
      <TestCardFill10
        language={language}
        items={card.items.map(it => ({ wordId: it.wordId, pair: it.pair }))}
        initialDirection={card.direction}
        mode="review"
        answered={
          a?.type === 'FILL_10' ? { filled: a.filled, directionUsed: a.directionUsed } : undefined
        }
        onSubmit={() => {}}
      />
    );
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 min-h-0 flex flex-col">
        <div className="bg-card rounded-3xl border-2 border-foreground shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] p-8 shrink-0">
          <div className="text-3xl font-black text-foreground">
            {labels.vocabTest?.resultsTitle || 'Results'}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-muted border-2 border-border rounded-2xl p-4">
              <div className="text-2xl font-black text-foreground">
                {stats.correctQuestions}/{Math.max(stats.totalQuestions, 1)}
              </div>
              <div className="text-xs font-bold text-muted-foreground">
                {labels.vocabTest?.correct || 'Correct'}
              </div>
            </div>
            <div className="bg-muted border-2 border-border rounded-2xl p-4">
              <div className="text-2xl font-black text-foreground">
                {Math.round((stats.correctQuestions / Math.max(stats.totalQuestions, 1)) * 100)}%
              </div>
              <div className="text-xs font-bold text-muted-foreground">
                {labels.vocabTest?.accuracy || 'Accuracy'}
              </div>
            </div>
            <div className="bg-muted border-2 border-border rounded-2xl p-4">
              <div className="text-2xl font-black text-foreground">
                {stats.seconds === null ? '--' : `${stats.seconds}s`}
              </div>
              <div className="text-xs font-bold text-muted-foreground">
                {labels.vocabTest?.time || 'Time'}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={() => setStage('SETTINGS')}
              className="px-5 py-3 rounded-2xl bg-card border-2 border-foreground text-foreground font-black"
            >
              {labels.vocabTest?.newTest || 'New test'}
            </Button>
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-primary text-white font-black"
            >
              {labels.common?.close || 'Close'}
            </Button>
          </div>
        </div>

        <div className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="text-lg font-black text-foreground mb-3">
            {labels.vocabTest?.review || 'Review'}
          </div>
          <div className="space-y-6 pb-6">
            {cards.map((card, idx) => {
              const a = answers[card.id];
              const correctness = getCorrectness(card, a);

              return (
                <div
                  key={card.id}
                  className="rounded-3xl border-2 border-border bg-card p-6 sm:p-8"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-black text-muted-foreground">
                      {labels.vocabTest?.cardLabel || 'Card'} {idx + 1}
                    </div>
                    {correctness && (
                      <div
                        className={`text-xs font-black px-3 py-1 rounded-full ${
                          correctness.allCorrect
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {getCorrectnessLabel(card.type, correctness)}
                      </div>
                    )}
                  </div>

                  {renderReviewCard(card, a)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

type RunningCardProps = Readonly<{
  card: TestCard;
  idx: number;
  answered: TestCardAnswer | undefined;
  isComplete: boolean;
  isActive: boolean;
  isMissing: boolean;
  language: Language;
  upsertAnswer: (cardId: string, answer: TestCardAnswer) => void;
  goToCard: (idx: number) => void;
  cardsCount: number;
  getCardClassName: (isActive: boolean, isMissing: boolean) => string;
  getCardTypeText: (type: QuestionType) => string;
  onSetCardRef: (id: string, el: HTMLDivElement | null) => void;
}>;

function RunningCard({
  card,
  idx,
  answered,
  isComplete,
  isActive,
  isMissing,
  language,
  upsertAnswer,
  goToCard,
  cardsCount,
  getCardClassName,
  getCardTypeText,
  onSetCardRef,
}: RunningCardProps) {
  const labels = getLabels(language);
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      onSetCardRef(card.id, el);
    },
    [card.id, onSetCardRef]
  );

  const getStatusBadge = () => {
    if (isComplete) {
      return (
        <div className="px-3 py-1 rounded-full text-xs font-black bg-muted text-muted-foreground">
          {labels.vocabTest?.answered || 'Answered'}
        </div>
      );
    }
    if (isMissing) {
      return (
        <div className="px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-700">
          {labels.vocabTest?.notAnswered || 'Not answered'}
        </div>
      );
    }
    return null;
  };

  const getBottomStatus = () => {
    if (isComplete) {
      return labels.vocabTest?.answered || 'Answered';
    }
    return labels.vocabTest?.notAnswered || 'Not answered';
  };

  const renderCardInput = () => {
    if (card.type === 'TRUE_FALSE') {
      return (
        <TestCardTrueFalse
          language={language}
          prompt={card.prompt}
          statement={card.statement}
          answered={answered?.type === 'TRUE_FALSE' ? { isTrue: answered.isTrue } : undefined}
          onSubmit={isTrue => {
            upsertAnswer(card.id, { type: 'TRUE_FALSE', isTrue });
            if (idx < cardsCount - 1) goToCard(idx + 1);
          }}
        />
      );
    }
    if (card.type === 'MULTIPLE_CHOICE') {
      return (
        <TestCardMultipleChoice
          language={language}
          prompt={card.prompt}
          options={card.options}
          answered={
            answered?.type === 'MULTIPLE_CHOICE'
              ? { selectedIndex: answered.selectedIndex }
              : undefined
          }
          onSubmit={selectedIndex => {
            upsertAnswer(card.id, { type: 'MULTIPLE_CHOICE', selectedIndex });
            if (idx < cardsCount - 1) goToCard(idx + 1);
          }}
        />
      );
    }
    if (card.type === 'FILL_10') {
      return (
        <TestCardFill10
          language={language}
          items={card.items.map(it => ({ wordId: it.wordId, pair: it.pair }))}
          initialDirection={card.direction}
          answered={
            answered?.type === 'FILL_10'
              ? { filled: answered.filled, directionUsed: answered.directionUsed }
              : undefined
          }
          onSubmit={(filled, directionUsed) => {
            upsertAnswer(card.id, { type: 'FILL_10', filled, directionUsed });
            if (idx < cardsCount - 1) goToCard(idx + 1);
          }}
        />
      );
    }
    return (
      <TestCardWritten
        language={language}
        prompt={card.prompt}
        answered={answered?.type === 'WRITTEN' ? { input: answered.input } : undefined}
        onSubmit={input => {
          upsertAnswer(card.id, { type: 'WRITTEN', input });
          if (idx < cardsCount - 1) goToCard(idx + 1);
        }}
      />
    );
  };

  return (
    <div ref={setRef} style={{ scrollSnapAlign: 'start' }} className="vt-responsive-card">
      {/* Mobile Premium Card */}
      <div className="vt-mobile-card vt-card-paper w-full rounded-[2.5rem] p-7 flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-end mb-8 border-b border-slate-200 pb-5">
          <div>
            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">
              {labels.vocabTest?.cardLabel || 'Question'}
            </p>
            <h3 className="text-4xl font-black text-slate-900 leading-none tracking-tight">
              {String(idx + 1).padStart(2, '0')}
              <span className="text-xl text-slate-300">/{cardsCount}</span>
            </h3>
          </div>
          <div className="flex items-center space-x-1.5 bg-rose-50/80 text-rose-600 px-3 py-1.5 rounded-lg border border-rose-100 shadow-sm">
            <List className="w-3 h-3" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              {getCardTypeText(card.type)}
            </span>
          </div>
        </div>

        {renderCardInput()}

        <div className="mt-6 pt-5 border-t border-slate-100 flex justify-between items-center">
          <div
            className={`text-[11px] font-black tracking-widest uppercase ${isComplete ? 'text-blue-500' : 'text-slate-400'}`}
          >
            {isComplete
              ? labels.vocabTest?.answered || 'Answered'
              : labels.vocabTest?.notAnswered || 'Pending'}
          </div>
          {isMissing && (
            <div className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100 italic">
              {labels.vocabTest?.notAnswered || 'Please answer this'}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Original Card */}
      <div
        className={`vt-desktop-card rounded-3xl border-2 p-6 sm:p-8 transition-all ${getCardClassName(isActive, isMissing)}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black text-muted-foreground">
              {getCardTypeText(card.type)}
            </div>
            {card.type === 'FILL_10' && (
              <div className="text-2xl font-black text-foreground mt-2">
                {(labels.vocabTest?.fillPrompt || 'Complete the blanks') +
                  ` (${card.items.length}/10)`}
              </div>
            )}
          </div>
          {getStatusBadge()}
        </div>

        {renderCardInput()}

        <div className="mt-6 flex justify-between text-xs font-bold text-muted-foreground">
          <div>
            {labels.vocabTest?.cardLabel || 'Card'} {idx + 1}
          </div>
          <div className="truncate max-w-[60%]">{getBottomStatus()}</div>
        </div>
      </div>
    </div>
  );
}

function RunningScreen({
  cards,
  activeCardIndex,
  goToCard,
  answeredCardCount,
  answers,
  isCardComplete,
  submitAttempted,
  language,
  upsertAnswer,
  isAllAnswered,
  submitTest,
  scrollContainerRef,
  onSetCardRef,
  onClose,
}: RunningScreenProps) {
  const labels = getLabels(language);
  const active = cards[activeCardIndex];

  const getCardClassName = () => {
    return 'vt-card-paper';
  };

  const getCardTypeText = (type: QuestionType) => {
    if (type === 'TRUE_FALSE') {
      return labels.vocabTest?.questionTypeTrueFalse || 'True / False';
    }
    if (type === 'MULTIPLE_CHOICE') {
      return labels.vocabTest?.questionTypeMultipleChoice || 'Multiple choice';
    }
    if (type === 'FILL_10') {
      return labels.vocabTest?.questionTypeFill || 'Match 10';
    }
    return labels.vocabTest?.questionTypeWritten || 'Written';
  };

  return (
    <>
      <style>{`
        /* Desktop: Screen width >= 640px (sm in Tailwind) */
        @media (min-width: 640px) {
          .vt-mobile-card { display: none !important; }
          .vt-desktop-card { display: block !important; }
          .vt-desktop-only { display: flex !important; }
          .vt-mobile-only { display: none !important; }
          .vt-max-w-container { max-width: 56rem !important; } /* 4xl */
          .vt-scroll-container { scroll-snap-type: none !important; }
          .vt-inner-container { padding-bottom: 1.5rem !important; }
          .vt-card-spacing { margin-top: 1.5rem; }
        }

        /* Mobile: Screen width < 640px */
        @media (max-width: 639px) {
          .vt-mobile-card { display: flex !important; }
          .vt-desktop-card { display: none !important; }
          .vt-desktop-only { display: none !important; }
          .vt-mobile-only { display: flex !important; }
          .vt-max-w-container { max-width: 420px !important; }
          .vt-scroll-container { scroll-snap-type: y mandatory !important; }
          .vt-inner-container { padding-bottom: 6rem !important; }
          .vt-card-spacing { margin-top: 3rem; }
          
          .vt-mobile-bg {
              background-color: #E6E7E9;
              background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.045'/%3E%3C/svg%3E");
          }
        }

        .header-glass {
            background: rgba(230, 231, 233, 0.85);
            backdrop-filter: blur(24px) saturate(150%);
            border-bottom: 1px solid rgba(255,255,255,0.4);
        }

        .vt-card-paper {
            background: #FCFCFA;
            box-shadow: 
                0 16px 32px -12px rgba(0,0,0,0.08),
                inset 0 1px 1px rgba(255,255,255,1),
                inset 0 -2px 1px rgba(0,0,0,0.03);
            border: 1px solid rgba(0,0,0,0.06);
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.015'/%3E%3C/svg%3E");
        }

        .vt-test-option {
            background: linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%);
            border: 1px solid rgba(0,0,0,0.08);
            box-shadow: 0 4px 0px #E2E8F0, 0 8px 16px rgba(0,0,0,0.04);
            transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
        }
        .vt-test-option:active, .vt-test-option.selected {
            transform: translateY(4px);
            box-shadow: 0 0px 0px #E2E8F0, 0 2px 4px rgba(0,0,0,0.04);
            background: linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%);
            border-color: #3B82F6;
        }
        
        .vt-inset-slot {
            background: #F8F9FA;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 2px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,1);
            border: 1px solid rgba(0,0,0,0.08);
        }

        .vt-tactile-chip {
            background: linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%);
            border: 1px solid rgba(0,0,0,0.06);
            box-shadow: 0 3px 0px #CBD5E1, 0 4px 8px rgba(0,0,0,0.04);
            transition: all 0.1s;
            cursor: pointer;
        }
        .vt-tactile-chip:active, .vt-tactile-chip.selected {
            transform: translateY(3px);
            box-shadow: 0 0px 0px #CBD5E1, 0 1px 2px rgba(0,0,0,0.05);
            background: linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%);
            border-color: #3B82F6;
            color: #1D4ED8;
            font-weight: 900;
        }

        .vt-match-key {
            background: linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%);
            border: 1px solid rgba(0,0,0,0.08);
            box-shadow: 0 4px 0px #E2E8F0, 0 4px 8px rgba(0,0,0,0.04);
            transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            cursor: pointer;
            overflow: hidden;
        }
        .vt-match-key.selected {
            transform: translateY(4px);
            box-shadow: 0 0px 0px #E2E8F0, 0 1px 2px rgba(0,0,0,0.05);
            background: linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%);
            border-color: #3B82F6;
            color: #1D4ED8;
        }
        .vt-match-key.paired {
            transform: translateY(4px);
            box-shadow: 0 0px 0px #E2E8F0, inset 0 2px 4px rgba(0,0,0,0.04);
            background: #F1F5F9;
            border-color: #CBD5E1;
            color: #64748B;
        }
      `}</style>

      <div className="h-full flex flex-col vt-mobile-bg">
        {/* Mobile Header (similar to the demo) */}
        <header className="vt-mobile-only fixed top-0 left-0 right-0 px-5 pt-14 pb-4 header-glass z-50 flex items-center justify-between">
          <Button
            variant="ghost"
            size="auto"
            className="w-10 h-10 rounded-[12px] bg-white/60 border border-slate-200 text-slate-700 shadow-sm flex items-center justify-center active:scale-95 transition-transform hover:bg-white/60"
            onClick={() => {
              // Let the parent dictate close behavior. We just submit or close
              if (submitAttempted || isAllAnswered) {
                submitTest();
              } else if (onClose) {
                onClose();
              }
            }}
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">
              {labels.vocabTest?.title || 'Vocabulary Test'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="auto"
            className="w-10 h-10 flex items-center justify-center text-slate-400 active:scale-95 transition-transform hover:bg-transparent"
          >
            <FileText className="w-4 h-4" />
          </Button>
        </header>

        {/* Mobile Spacing for fixed header */}
        <div className="vt-mobile-only h-28 shrink-0"></div>

        {/* Desktop Header Container */}
        <div className="vt-desktop-only hidden max-w-4xl mx-auto w-full px-4 sm:px-6 mb-3 items-center justify-between shrink-0 pt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={() => goToCard(activeCardIndex - 1)}
              disabled={activeCardIndex === 0}
              className="w-10 h-10 rounded-xl bg-muted hover:bg-muted disabled:opacity-50 flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={() => goToCard(activeCardIndex + 1)}
              disabled={activeCardIndex >= cards.length - 1}
              className="w-10 h-10 rounded-xl bg-muted hover:bg-muted disabled:opacity-50 flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
          <div className="text-sm font-black text-muted-foreground">
            {activeCardIndex + 1}/{Math.max(cards.length, 1)} · {answeredCardCount}/
            {Math.max(cards.length, 1)}
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto scroll-smooth vt-scroll-container"
        >
          <div className="vt-max-w-container mx-auto w-full px-5 vt-inner-container vt-card-spacing space-y-6 sm:space-y-6">
            {cards.map((card, idx) => (
              <RunningCard
                key={`${card.id}:${idx}`}
                card={card}
                idx={idx}
                answered={answers[card.id]}
                isComplete={isCardComplete(card, answers[card.id])}
                isActive={active?.id === card.id}
                isMissing={submitAttempted && !isCardComplete(card, answers[card.id])}
                language={language}
                upsertAnswer={upsertAnswer}
                goToCard={goToCard}
                cardsCount={cards.length}
                getCardClassName={getCardClassName}
                getCardTypeText={getCardTypeText}
                onSetCardRef={onSetCardRef}
              />
            ))}

            {/* Mobile Submit Button */}
            <div className="vt-mobile-only flex pt-4 pb-12">
              <Button
                variant="ghost"
                size="auto"
                type="button"
                onClick={submitTest}
                className={`w-full py-5 rounded-[1.5rem] text-white font-black tracking-widest text-lg shadow-[0_8px_24px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-all ${
                  isAllAnswered ? 'bg-[#1A1A1C]' : 'bg-rose-600'
                }`}
              >
                {isAllAnswered
                  ? labels.vocabTest?.submitTest || '提交测验'
                  : labels.vocabTest?.unansweredWarning || '确认提交 (仍有未答题)'}
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Footer Container */}
        <div className="vt-desktop-only hidden border-t border-border bg-card/80 backdrop-blur shrink-0">
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-muted-foreground">
                Answered {answeredCardCount}/{Math.max(cards.length, 1)}
              </div>
              {submitAttempted && !isAllAnswered && (
                <div className="text-xs font-bold text-red-600 mt-0.5">
                  {labels.vocabTest?.unansweredWarning || 'Some questions are unanswered.'}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={submitTest}
              className={`px-5 py-3 rounded-2xl text-white font-black ${
                isAllAnswered ? 'bg-primary' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {labels.vocabTest?.submitTest || 'Submit test'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function SettingsScreen({
  language,
  scopeTitle,
  maxQuestions,
  effectiveQuestionCount,
  setQuestionCount,
  answerLanguage,
  setAnswerLanguage,
  enabledTypes,
  setEnabledTypes,
  canUseMultipleChoice,
  enabledTypeList,
  startTest,
  isStartDisabled,
}: TestSettingsProps) {
  const labels = getLabels(language);

  const toggleType = (key: QuestionType) => {
    if (key === 'MULTIPLE_CHOICE' && !canUseMultipleChoice) return;
    setEnabledTypes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getModeProps = (key: QuestionType) => {
    const isSelected = enabledTypes[key];
    const disabled = key === 'MULTIPLE_CHOICE' && !canUseMultipleChoice;

    let baseClass = 'vt-mode-key rounded-[1.2rem] p-4 flex flex-col items-center text-center';
    if (isSelected) baseClass += ' selected';
    if (disabled) baseClass += ' opacity-50 cursor-not-allowed';

    return {
      className: baseClass,
      onClick: () => {
        if (!disabled) toggleType(key);
      },
    };
  };

  return (
    <>
      <style>{`
        .vt-card-paper {
            background: #FCFCFA;
            box-shadow: 
                0 16px 32px -12px rgba(0,0,0,0.08),
                inset 0 1px 1px rgba(255,255,255,1),
                inset 0 -2px 1px rgba(0,0,0,0.03);
            border: 1px solid rgba(0,0,0,0.06);
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.015'/%3E%3C/svg%3E");
        }

        .vt-mode-key {
            background: linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%);
            border: 1px solid rgba(0,0,0,0.08);
            box-shadow: 0 4px 0px #E2E8F0, 0 8px 16px rgba(0,0,0,0.04);
            transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
            user-select: none;
        }
        
        .vt-mode-key.selected {
            transform: translateY(4px);
            background: linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%);
            border-color: #3B82F6;
            box-shadow: 
                0 0px 0px #E2E8F0,
                0 2px 4px rgba(0,0,0,0.04),
                inset 0 2px 6px rgba(59,130,246,0.15);
        }
        
        .vt-mode-key.selected .vt-mode-icon-container {
            background: #3B82F6;
            color: #FFFFFF;
            border-color: #2563EB;
            box-shadow: inset 0 1px 1px rgba(255,255,255,0.4);
        }
        .vt-mode-key.selected .vt-mode-title { color: #1D4ED8; }
        .vt-mode-key.selected .vt-mode-desc { color: #3B82F6; opacity: 0.8; }

        .vt-mode-key:active:not(.selected) {
            transform: translateY(2px);
            box-shadow: 0 2px 0px #E2E8F0, 0 4px 8px rgba(0,0,0,0.04);
        }
      `}</style>

      <div className="px-5 pt-8 pb-24 max-w-[420px] mx-auto w-full">
        <div className="vt-card-paper w-full rounded-[2.5rem] p-7 relative">
          <div className="text-center mb-10">
            <p className="text-[10px] font-black text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-full tracking-widest uppercase mb-3 border border-blue-100 shadow-sm">
              {scopeTitle}
            </p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {labels.vocabTest?.setupTitle || 'Set up your test'}
            </h3>
            <p className="text-[11px] font-bold text-slate-400 tracking-widest mt-1.5 uppercase">
              {maxQuestions} Words in queue
            </p>
          </div>

          <div className="mb-10 bg-[#F8F9FA] rounded-[1.5rem] p-5 border border-slate-200/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center mb-5 px-1">
              <span className="text-[12px] font-black text-slate-700 tracking-widest">
                {labels.vocabTest?.questions || 'Questions'}
              </span>
              <span className="text-lg font-black text-slate-900 bg-white px-3.5 py-1 rounded-[10px] border border-slate-200 shadow-sm">
                {effectiveQuestionCount}
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-200/80 rounded-full relative shadow-inner">
              <div
                className="absolute left-0 top-0 bottom-0 bg-slate-800 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] pointer-events-none"
                style={{ width: `${(effectiveQuestionCount / Math.max(1, maxQuestions)) * 100}%` }}
              ></div>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-10 pointer-events-none transition-transform"
                style={{ left: `${(effectiveQuestionCount / Math.max(1, maxQuestions)) * 100}%` }}
              ></div>
              <input
                type="range"
                min={1}
                max={Math.max(1, maxQuestions)}
                value={effectiveQuestionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
            </div>
          </div>

          <div className="mb-8">
            <p className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase ml-1 mb-4 flex justify-between">
              <span>{labels.vocabTest?.questionTypes || 'Modes'}</span>
              {enabledTypeList.length === 0 && (
                <span className="text-red-500 font-bold lowercase tracking-normal">
                  ({labels.vocabTest?.pickAtLeastOneType || 'pick 1'})
                </span>
              )}
            </p>

            <div className="grid grid-cols-2 gap-3 pb-2">
              {/* Multiple Choice */}
              <div {...getModeProps('MULTIPLE_CHOICE')}>
                <div className="vt-mode-icon-container w-10 h-10 rounded-[10px] bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 mb-3 transition-colors">
                  <List className="h-4 w-4" />
                </div>
                <h4 className="vt-mode-title text-[13px] font-black text-slate-800 tracking-wide mb-1">
                  {labels.vocabTest?.questionTypeMultipleChoice || 'Multiple choice'}
                </h4>
                <p className="vt-mode-desc text-[9px] font-bold text-slate-400 tracking-wider">
                  {!canUseMultipleChoice ? '(not enough words)' : 'Multiple Choice'}
                </p>
              </div>

              {/* True/False */}
              <div {...getModeProps('TRUE_FALSE')}>
                <div className="vt-mode-icon-container w-10 h-10 rounded-[10px] bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 mb-3 transition-colors">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <h4 className="vt-mode-title text-[13px] font-black text-slate-800 tracking-wide mb-1">
                  {labels.vocabTest?.questionTypeTrueFalse || 'True / False'}
                </h4>
                <p className="vt-mode-desc text-[9px] font-bold text-slate-400 tracking-wider">
                  True / False
                </p>
              </div>

              {/* Written */}
              <div {...getModeProps('WRITTEN')}>
                <div className="vt-mode-icon-container w-10 h-10 rounded-[10px] bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 mb-3 transition-colors">
                  <Keyboard className="h-4 w-4" />
                </div>
                <h4 className="vt-mode-title text-[13px] font-black text-slate-800 tracking-wide mb-1">
                  {labels.vocabTest?.questionTypeWritten || 'Written'}
                </h4>
                <p className="vt-mode-desc text-[9px] font-bold text-slate-400 tracking-wider">
                  Written
                </p>
              </div>

              {/* Fill 10 */}
              <div {...getModeProps('FILL_10')}>
                <div className="vt-mode-icon-container w-10 h-10 rounded-[10px] bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 mb-3 transition-colors">
                  <Grip className="h-4 w-4" />
                </div>
                <h4 className="vt-mode-title text-[13px] font-black text-slate-800 tracking-wide mb-1">
                  {labels.vocabTest?.questionTypeFill || 'Fill in 10'}
                </h4>
                <p className="vt-mode-desc text-[9px] font-bold text-slate-400 tracking-wider">
                  Fill in 10
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center bg-[#F8F9FA] rounded-[1.2rem] p-4 border border-slate-200 shadow-sm">
              <span className="text-[12px] font-black text-slate-700 tracking-widest pl-1">
                {labels.vocabTest?.answers || 'Answers'}
              </span>
              <Select
                value={answerLanguage}
                onChange={e => setAnswerLanguage(e.target.value as AnswerLanguage)}
                className="!h-9 !py-0 !text-[12px] !font-bold !bg-white !border !border-slate-200 !rounded-[8px] !shadow-none !w-auto"
              >
                <option value="KOREAN">{labels.vocabTest?.answerLanguageKorean || 'Korean'}</option>
                <option value="NATIVE">{nativeLabelFromLanguage(language)}</option>
                <option value="BOTH">{labels.vocabTest?.answerLanguageBoth || 'Both'}</option>
              </Select>
            </div>
          </div>

          <button
            type="button"
            onClick={startTest}
            disabled={isStartDisabled}
            className="w-full bg-slate-900 text-white font-black tracking-widest text-[14px] py-4 rounded-[1.2rem] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] hover:bg-slate-800 active:scale-95 transition-all outline-none disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
          >
            {labels.vocabTest?.startTest || 'START TEST'}
          </button>
        </div>
      </div>
    </>
  );
}

const calculateFillStats = (
  card: TestCard & { type: 'FILL_10' },
  a: TestCardAnswer | undefined
) => {
  const total = card.items.length;
  let correct = 0;
  if (a?.type === 'FILL_10') {
    const expected =
      a.directionUsed === 'KR_TO_NATIVE'
        ? card.items.map(i => i.pair.native)
        : card.items.map(i => i.pair.korean);
    a.filled.forEach((v, idx) => {
      if (normalizeText(v) === normalizeText(expected[idx] || '')) correct += 1;
    });
  }
  return { total, correct };
};

const calculateCardStats = (
  card: TestCard,
  a: TestCardAnswer | undefined
): { total: number; correct: number } => {
  if (card.type === 'FILL_10') {
    return calculateFillStats(card, a);
  }

  const total = 1;
  let correct = 0;
  if (card.type === 'TRUE_FALSE' && a?.type === 'TRUE_FALSE') {
    if (a.isTrue === card.correctIsTrue) correct = 1;
  } else if (card.type === 'MULTIPLE_CHOICE' && a?.type === 'MULTIPLE_CHOICE') {
    if (a.selectedIndex === card.correctIndex) correct = 1;
  } else if (card.type === 'WRITTEN' && a?.type === 'WRITTEN') {
    if (normalizeText(a.input) === normalizeText(card.answer)) correct = 1;
  }
  return { total, correct };
};

const processCardReview = (
  card: TestCard,
  a: TestCardAnswer | undefined,
  onFsrsReview?: (wordId: string, isCorrect: boolean) => void
) => {
  if (!a || !onFsrsReview) return;

  if (card.type === 'FILL_10') {
    if (a.type !== 'FILL_10') return;
    const expected =
      a.directionUsed === 'KR_TO_NATIVE'
        ? card.items.map(i => i.pair.native)
        : card.items.map(i => i.pair.korean);
    card.items.forEach((it, idx) => {
      const ok = normalizeText(a.filled[idx] || '') === normalizeText(expected[idx] || '');
      onFsrsReview(it.wordId, ok);
    });
    return;
  }

  if (card.type === 'TRUE_FALSE' && a.type === 'TRUE_FALSE') {
    onFsrsReview(card.wordId, a.isTrue === card.correctIsTrue);
  } else if (card.type === 'MULTIPLE_CHOICE' && a.type === 'MULTIPLE_CHOICE') {
    onFsrsReview(card.wordId, a.selectedIndex === card.correctIndex);
  } else if (card.type === 'WRITTEN' && a.type === 'WRITTEN') {
    onFsrsReview(card.wordId, normalizeText(a.input) === normalizeText(card.answer));
  }
};

export default function VocabTest({
  words,
  language,
  scopeTitle,
  onClose,
  onFsrsReview,
  onComplete,
  showCloseButton = true,
  resumeSnapshot,
  onSessionSnapshot,
}: Props) {
  const initialResume =
    resumeSnapshot && resumeSnapshot.stage === 'RUNNING' ? resumeSnapshot : null;
  const labels = useMemo(() => getLabels(language), [language]);
  const maxQuestions = words.length;

  const [stage, setStage] = useState<TestStage>(initialResume ? 'RUNNING' : 'SETTINGS');
  const [answerLanguage, setAnswerLanguage] = useState<AnswerLanguage>(
    initialResume?.answerLanguage ?? 'KOREAN'
  );
  const [enabledTypes, setEnabledTypes] = useState<EnabledTypes>(
    initialResume?.enabledTypes ?? {
      TRUE_FALSE: false,
      MULTIPLE_CHOICE: true,
      FILL_10: false,
      WRITTEN: false,
    }
  );

  const [questionCount, setQuestionCount] = useState(
    () => initialResume?.questionCount ?? Math.min(30, Math.max(1, maxQuestions))
  );
  const effectiveQuestionCount = useMemo(() => {
    return Math.min(Math.max(1, questionCount), Math.max(1, maxQuestions));
  }, [maxQuestions, questionCount]);

  const wordsWithNative = useMemo(() => {
    return words.map(w => ({
      ...w,
      native: getLocalizedContent(w as never, 'meaning', language) || w.english,
    }));
  }, [language, words]);

  const canUseMultipleChoice = wordsWithNative.length >= 4;

  const enabledTypeList = useMemo(() => {
    const list: QuestionType[] = [];
    (Object.keys(enabledTypes) as QuestionType[]).forEach(k => {
      if (enabledTypes[k]) list.push(k);
    });
    return list;
  }, [enabledTypes]);

  const isStartDisabled = useMemo(() => {
    if (enabledTypeList.length === 0) return true;
    if (enabledTypes.MULTIPLE_CHOICE && !canUseMultipleChoice) return true;
    return effectiveQuestionCount < 1;
  }, [
    canUseMultipleChoice,
    effectiveQuestionCount,
    enabledTypeList.length,
    enabledTypes.MULTIPLE_CHOICE,
  ]);

  const createTrueFalseCard = useCallback(
    (w: (typeof wordsWithNative)[number], idx: number, direction: Direction): TestCard => {
      const shouldBeTrue = Math.random() < 0.5;
      let statement = '';
      let correctIsTrue = shouldBeTrue;

      if (direction === 'KR_TO_NATIVE') {
        if (shouldBeTrue) {
          statement = w.native;
        } else {
          const distractor = wordsWithNative.find(d => d.id !== w.id) || w;
          statement = distractor.native;
          correctIsTrue = distractor.native === w.native;
        }
        return {
          id: `tf-${idx}-${w.id}`,
          type: 'TRUE_FALSE',
          wordId: w.id,
          direction,
          prompt: w.korean,
          statement,
          correctIsTrue,
          correctPair: { korean: w.korean, native: w.native },
        };
      }

      if (shouldBeTrue) {
        statement = w.korean;
      } else {
        const distractor = wordsWithNative.find(d => d.id !== w.id) || w;
        statement = distractor.korean;
        correctIsTrue = distractor.korean === w.korean;
      }
      return {
        id: `tf-${idx}-${w.id}`,
        type: 'TRUE_FALSE',
        wordId: w.id,
        direction,
        prompt: w.native,
        statement,
        correctIsTrue,
        correctPair: { korean: w.korean, native: w.native },
      };
    },
    [wordsWithNative]
  );

  const createMultipleChoiceCard = useCallback(
    (w: (typeof wordsWithNative)[number], idx: number, direction: Direction): TestCard | null => {
      if (!canUseMultipleChoice) return null;
      const pool = shuffleArray(wordsWithNative.filter(d => d.id !== w.id)).slice(0, 3);
      const optionsPairs = shuffleArray([w, ...pool]);

      const options = optionsPairs.map(p => (direction === 'KR_TO_NATIVE' ? p.native : p.korean));
      const correctIndex = optionsPairs.findIndex(p => p.id === w.id);
      return {
        id: `mc-${idx}-${w.id}`,
        type: 'MULTIPLE_CHOICE',
        wordId: w.id,
        direction,
        prompt: direction === 'KR_TO_NATIVE' ? w.korean : w.native,
        options,
        correctIndex,
        correctPair: { korean: w.korean, native: w.native },
      };
    },
    [canUseMultipleChoice, wordsWithNative]
  );

  const createWrittenCard = useCallback(
    (w: (typeof wordsWithNative)[number], idx: number, direction: Direction): TestCard => {
      return {
        id: `wr-${idx}-${w.id}`,
        type: 'WRITTEN',
        wordId: w.id,
        direction,
        prompt: direction === 'KR_TO_NATIVE' ? w.korean : w.native,
        answer: direction === 'KR_TO_NATIVE' ? w.native : w.korean,
        correctPair: { korean: w.korean, native: w.native },
      };
    },
    []
  );

  const createFillCards = useCallback(
    (fillWords: (typeof wordsWithNative)[number][], direction: Direction): TestCard[] => {
      const groups = chunk(fillWords, 10);
      return groups.map((group, groupIdx) => {
        const items = group.map(w => ({
          wordId: w.id,
          prompt: direction === 'KR_TO_NATIVE' ? w.korean : w.native,
          answer: direction === 'KR_TO_NATIVE' ? w.native : w.korean,
          pair: { korean: w.korean, native: w.native },
        }));
        const options = shuffleArray(items.map(i => i.answer));
        return {
          id: `fill-${direction}-${groupIdx}-${items.map(i => i.wordId).join('-')}`,
          type: 'FILL_10',
          direction,
          items,
          options,
        };
      });
    },
    []
  );

  const buildCards = useCallback((): TestCard[] => {
    const enabled = enabledTypeList.filter(t =>
      t === 'MULTIPLE_CHOICE' ? canUseMultipleChoice : true
    );
    const picked = shuffleArray(wordsWithNative).slice(
      0,
      Math.min(effectiveQuestionCount, wordsWithNative.length)
    );

    const cards: TestCard[] = [];

    const fixedDirection: Direction = answerLanguage === 'NATIVE' ? 'KR_TO_NATIVE' : 'NATIVE_TO_KR';

    const fillTargetsKrToNative: (typeof wordsWithNative)[number][] = [];
    const fillTargetsNativeToKr: (typeof wordsWithNative)[number][] = [];

    picked.forEach((w, idx) => {
      const t = enabled[Math.floor(Math.random() * enabled.length)];

      let direction: Direction = fixedDirection;
      if (answerLanguage === 'BOTH') {
        direction = Math.random() < 0.5 ? 'KR_TO_NATIVE' : 'NATIVE_TO_KR';
      }

      if (t === 'FILL_10') {
        if (direction === 'KR_TO_NATIVE') fillTargetsKrToNative.push(w);
        else fillTargetsNativeToKr.push(w);
        return;
      }

      if (t === 'TRUE_FALSE') {
        cards.push(createTrueFalseCard(w, idx, direction));
        return;
      }
      if (t === 'WRITTEN') {
        cards.push(createWrittenCard(w, idx, direction));
        return;
      }
      const mc = createMultipleChoiceCard(w, idx, direction);
      if (mc) cards.push(mc);
    });

    if (fillTargetsKrToNative.length > 0) {
      cards.push(...createFillCards(fillTargetsKrToNative, 'KR_TO_NATIVE'));
    }
    if (fillTargetsNativeToKr.length > 0) {
      cards.push(...createFillCards(fillTargetsNativeToKr, 'NATIVE_TO_KR'));
    }

    return shuffleArray(cards);
  }, [
    canUseMultipleChoice,
    answerLanguage,
    createFillCards,
    createMultipleChoiceCard,
    createTrueFalseCard,
    createWrittenCard,
    enabledTypeList,
    effectiveQuestionCount,
    wordsWithNative,
  ]);

  const [cards, setCards] = useState<TestCard[]>(initialResume?.cards ?? []);
  const [activeCardIndex, setActiveCardIndex] = useState(initialResume?.activeCardIndex ?? 0);
  const [answers, setAnswers] = useState<Partial<Record<string, TestCardAnswer>>>(
    initialResume?.answers ?? {}
  );
  const [startedAt, setStartedAt] = useState<number | null>(initialResume?.startedAt ?? null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(initialResume?.submitAttempted ?? false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const startTest = useCallback(() => {
    const nextCards = buildCards();
    setCards(nextCards);
    setAnswers({});
    setActiveCardIndex(0);
    setStartedAt(Date.now());
    setFinishedAt(null);
    setSubmitAttempted(false);
    setStage('RUNNING');
    requestAnimationFrame(() => {
      const first = nextCards[0];
      if (!first) return;
      cardRefs.current[first.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [buildCards]);

  const toResult = useCallback(() => {
    setFinishedAt(Date.now());
    setStage('RESULT');
    onComplete?.();
  }, [onComplete]);

  const goToCard = useCallback(
    (idx: number) => {
      const next = Math.max(0, Math.min(idx, cards.length - 1));
      setActiveCardIndex(next);
      const id = cards[next]?.id;
      if (id) cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [cards]
  );

  const upsertAnswer = (cardId: string, answer: TestCardAnswer) => {
    setAnswers(prev => ({ ...prev, [cardId]: answer }));
  };

  const isCardComplete = useCallback((card: TestCard, answer: TestCardAnswer | undefined) => {
    if (!answer) return false;
    if (card.type === 'TRUE_FALSE') return answer.type === 'TRUE_FALSE';
    if (card.type === 'MULTIPLE_CHOICE') return answer.type === 'MULTIPLE_CHOICE';
    if (card.type === 'WRITTEN') return answer.type === 'WRITTEN' && answer.input.trim().length > 0;
    return (
      answer.type === 'FILL_10' &&
      answer.filled.length === card.items.length &&
      answer.filled.every(v => v.trim().length > 0)
    );
  }, []);

  const answeredCardCount = useMemo(() => {
    return cards.reduce((acc, card) => {
      return isCardComplete(card, answers[card.id]) ? acc + 1 : acc;
    }, 0);
  }, [answers, cards, isCardComplete]);

  const isAllAnswered = useMemo(() => {
    return cards.length > 0 && answeredCardCount === cards.length;
  }, [answeredCardCount, cards.length]);

  const submitTest = useCallback(() => {
    setSubmitAttempted(true);
    if (!isAllAnswered) {
      const firstMissingIdx = cards.findIndex(card => !isCardComplete(card, answers[card.id]));
      if (firstMissingIdx >= 0) goToCard(firstMissingIdx);
      return;
    }

    cards.forEach(card => processCardReview(card, answers[card.id], onFsrsReview));
    toResult();
  }, [answers, cards, goToCard, isAllAnswered, isCardComplete, onFsrsReview, toResult]);

  const stats = useMemo(() => {
    let totalQuestions = 0;
    let correctQuestions = 0;

    cards.forEach(card => {
      const { total, correct } = calculateCardStats(card, answers[card.id]);
      totalQuestions += total;
      correctQuestions += correct;
    });

    const seconds =
      startedAt && finishedAt ? Math.max(0, Math.floor((finishedAt - startedAt) / 1000)) : null;
    return { totalQuestions, correctQuestions, seconds };
  }, [answers, cards, finishedAt, startedAt]);

  const onSetCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    cardRefs.current[id] = el;
  }, []);

  const buildSnapshot = useCallback((): VocabTestSessionSnapshot | null => {
    if (stage !== 'RUNNING' || cards.length === 0) return null;
    return {
      stage: 'RUNNING',
      answerLanguage,
      enabledTypes,
      questionCount,
      cards,
      activeCardIndex,
      answers,
      startedAt,
      submitAttempted,
      timestamp: Date.now(),
    };
  }, [
    stage,
    cards,
    answerLanguage,
    enabledTypes,
    questionCount,
    activeCardIndex,
    answers,
    startedAt,
    submitAttempted,
  ]);

  useEffect(() => {
    if (!onSessionSnapshot) return;
    const timer = setTimeout(() => {
      const snapshot = buildSnapshot();
      if (snapshot) onSessionSnapshot(snapshot);
    }, 1000);
    return () => clearTimeout(timer);
  }, [onSessionSnapshot, buildSnapshot]);

  useEffect(() => {
    if (!onSessionSnapshot) return;
    const onLeave = () => {
      const snapshot = buildSnapshot();
      if (snapshot) onSessionSnapshot(snapshot);
    };
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [onSessionSnapshot, buildSnapshot]);

  const renderStage = () => {
    switch (stage) {
      case 'SETTINGS':
        return (
          <SettingsScreen
            language={language}
            scopeTitle={scopeTitle}
            maxQuestions={maxQuestions}
            effectiveQuestionCount={effectiveQuestionCount}
            setQuestionCount={setQuestionCount}
            answerLanguage={answerLanguage}
            setAnswerLanguage={setAnswerLanguage}
            enabledTypes={enabledTypes}
            setEnabledTypes={setEnabledTypes}
            canUseMultipleChoice={canUseMultipleChoice}
            enabledTypeList={enabledTypeList}
            startTest={startTest}
            isStartDisabled={isStartDisabled}
          />
        );
      case 'RUNNING':
        return (
          <RunningScreen
            cards={cards}
            activeCardIndex={activeCardIndex}
            goToCard={goToCard}
            answeredCardCount={answeredCardCount}
            answers={answers}
            isCardComplete={isCardComplete}
            submitAttempted={submitAttempted}
            language={language}
            upsertAnswer={upsertAnswer}
            isAllAnswered={isAllAnswered}
            submitTest={submitTest}
            scrollContainerRef={scrollContainerRef}
            onSetCardRef={onSetCardRef}
            onClose={onClose}
          />
        );
      case 'RESULT':
        return (
          <ResultScreen
            language={language}
            stats={stats}
            setStage={setStage}
            onClose={onClose}
            labels={labels}
            cards={cards}
            answers={answers}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full min-h-0 p-2 sm:p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="font-black text-foreground">{scopeTitle}</div>
        {showCloseButton && onClose ? (
          <Button
            variant="ghost"
            size="auto"
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-muted hover:bg-muted flex items-center justify-center"
            aria-label={labels.common?.close || 'Close'}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
        ) : null}
      </div>

      <div className="flex-1 min-h-0">{renderStage()}</div>
    </div>
  );
}
