import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, X } from 'lucide-react';
import type { Language } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import { getLocalizedContent } from '../../../utils/languageUtils';
import TestCardTrueFalse from './test/TestCardTrueFalse';
import TestCardMultipleChoice from './test/TestCardMultipleChoice';
import TestCardFill10 from './test/TestCardFill10';
import TestCardWritten from './test/TestCardWritten';
import { Button, Input, Select } from '../../../components/ui';

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
  showCloseButton?: boolean;
}>;

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
}>;

type ResultScreenProps = Readonly<{
  language: Language;
  stats: { totalQuestions: number; correctQuestions: number; seconds: number | null };
  setStage: (s: TestStage) => void;
  onClose?: () => void;
  labels: any;
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

  const getCorrectnessLabel = (cardType: QuestionType, correctness: any) => {
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
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-3xl border-2 border-foreground shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] p-8">
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

      <div className="mt-8">
        <div className="text-lg font-black text-foreground mb-3">
          {labels.vocabTest?.review || 'Review'}
        </div>
        <div className="space-y-6">
          {cards.map((card, idx) => {
            const a = answers[card.id];
            const correctness = getCorrectness(card, a);

            return (
              <div key={card.id} className="rounded-3xl border-2 border-border bg-card p-6 sm:p-8">
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
    <div
      ref={setRef}
      style={{ scrollSnapAlign: 'start' }}
      className={`rounded-3xl border-2 p-6 sm:p-8 transition-all ${getCardClassName(isActive, isMissing)}`}
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
}: RunningScreenProps) {
  const labels = getLabels(language);
  const format = (template: string, vars: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
  const active = cards[activeCardIndex];

  const getCardClassName = (isActive: boolean, isMissing: boolean) => {
    if (isActive) {
      if (isMissing) return 'border-red-600 bg-red-50 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]';
      return 'border-foreground bg-card shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]';
    }
    if (isMissing) return 'border-red-300 bg-red-50';
    return 'border-border bg-card';
  };

  const getCardTypeText = (type: QuestionType) => {
    if (type === 'TRUE_FALSE') {
      return labels.vocabTest?.questionTypeTrueFalse || 'True / False';
    }
    if (type === 'MULTIPLE_CHOICE') {
      return labels.vocabTest?.questionTypeMultipleChoice || 'Multiple choice';
    }
    if (type === 'FILL_10') {
      return labels.vocabTest?.questionTypeFill || 'Fill';
    }
    return labels.vocabTest?.questionTypeWritten || 'Written';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="flex items-center justify-between pb-3">
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
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
          <div className="space-y-6">
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
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-card/80 backdrop-blur">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-muted-foreground">
              {format(labels.vocabTest?.answeredCount || 'Answered {current}/{total}', {
                current: answeredCardCount,
                total: Math.max(cards.length, 1),
              })}
            </div>
            {submitAttempted && !isAllAnswered && (
              <div className="text-xs font-bold text-red-600 mt-0.5">
                {labels.vocabTest?.unansweredWarning ||
                  'Some questions are unanswered. Jumped to the first one.'}
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
  const format = (template: string, vars: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
  const getToggleClass = (key: QuestionType, disabled: boolean) => {
    if (enabledTypes[key]) return 'bg-blue-600';
    if (disabled) return 'bg-muted cursor-not-allowed';
    return 'bg-muted';
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-sm font-bold text-muted-foreground">{scopeTitle}</div>
          <div className="text-4xl font-black text-foreground mt-2">
            {labels.vocabTest?.setupTitle || 'Set up your test'}
          </div>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0">
          <FileText className="w-8 h-8 text-white" />
        </div>
      </div>

      <div className="mt-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-black text-foreground text-lg">
              {labels.vocabTest?.questions || 'Questions'}
            </div>
            <div className="text-muted-foreground text-sm">
              {format(labels.vocabTest?.maxQuestions || 'Max {count}', { count: maxQuestions })}
            </div>
          </div>
          <Input
            type="number"
            value={effectiveQuestionCount}
            min={1}
            max={Math.max(1, maxQuestions)}
            onChange={e =>
              setQuestionCount(
                Math.min(Math.max(1, Number(e.target.value)), Math.max(1, maxQuestions))
              )
            }
            className="w-24 !h-auto !py-3 text-center text-2xl font-black !bg-muted !border-2 !border-border !rounded-2xl !shadow-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="font-black text-foreground text-lg">
            {labels.vocabTest?.answers || 'Answers'}
          </div>
          <Select
            value={answerLanguage}
            onChange={e => setAnswerLanguage(e.target.value as AnswerLanguage)}
            className="!h-auto !px-4 !py-3 !bg-muted !border-2 !border-border !rounded-2xl font-bold !shadow-none"
          >
            <option value="KOREAN">{labels.vocabTest?.answerLanguageKorean || 'Korean'}</option>
            <option value="NATIVE">{nativeLabelFromLanguage(language)}</option>
            <option value="BOTH">{labels.vocabTest?.answerLanguageBoth || 'Both'}</option>
          </Select>
        </div>

        <div className="border-t border-border pt-6 space-y-5">
          <div className="font-black text-foreground text-lg">
            {labels.vocabTest?.questionTypes || 'Question types'}
          </div>

          {(
            [
              { key: 'TRUE_FALSE' },
              { key: 'MULTIPLE_CHOICE' },
              { key: 'FILL_10' },
              { key: 'WRITTEN' },
            ] as const
          ).map(row => {
            const disabled = row.key === 'MULTIPLE_CHOICE' && !canUseMultipleChoice;
            return (
              <div key={row.key} className="flex items-center justify-between">
                <div className="font-black text-foreground text-base">
                  {row.key === 'TRUE_FALSE' &&
                    (labels.vocabTest?.questionTypeTrueFalse || 'True / False')}
                  {row.key === 'MULTIPLE_CHOICE' &&
                    (labels.vocabTest?.questionTypeMultipleChoice || 'Multiple choice')}
                  {row.key === 'FILL_10' && (labels.vocabTest?.questionTypeFill || 'Fill')}
                  {row.key === 'WRITTEN' && (labels.vocabTest?.questionTypeWritten || 'Written')}
                  {disabled && (
                    <span className="ml-2 text-xs font-bold text-muted-foreground">
                      {labels.vocabTest?.notEnoughWords || '(not enough words)'}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="auto"
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    setEnabledTypes((prev: EnabledTypes) => ({
                      ...prev,
                      [row.key]: !prev[row.key],
                    }))
                  }
                  className={`w-12 h-7 rounded-full relative transition-all ${getToggleClass(row.key, disabled)}`}
                >
                  <span
                    className={`absolute top-0.5 transition-all w-6 h-6 rounded-full bg-card shadow ${
                      enabledTypes[row.key] ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </Button>
              </div>
            );
          })}

          {enabledTypeList.length === 0 && (
            <div className="text-sm font-bold text-red-600">
              {labels.vocabTest?.pickAtLeastOneType || 'Pick at least one type.'}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="ghost"
            size="auto"
            type="button"
            onClick={startTest}
            disabled={isStartDisabled}
            className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {labels.vocabTest?.startTest || 'Start test'}
          </Button>
        </div>
      </div>
    </div>
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
  showCloseButton = true,
}: Props) {
  const labels = useMemo(() => getLabels(language), [language]);
  const maxQuestions = words.length;

  const [stage, setStage] = useState<TestStage>('SETTINGS');
  const [answerLanguage, setAnswerLanguage] = useState<AnswerLanguage>('KOREAN');
  const [enabledTypes, setEnabledTypes] = useState<EnabledTypes>({
    TRUE_FALSE: false,
    MULTIPLE_CHOICE: true,
    FILL_10: false,
    WRITTEN: false,
  });

  const [questionCount, setQuestionCount] = useState(() => Math.min(30, Math.max(1, maxQuestions)));
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

  const [cards, setCards] = useState<TestCard[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<string, TestCardAnswer>>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

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
  }, []);

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
    <div className="p-2 sm:p-4">
      <div className="flex items-center justify-between mb-4">
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

      {renderStage()}
    </div>
  );
}
