import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  List,
  CheckSquare,
  Keyboard,
  Grip,
  Volume2,
  Check,
} from 'lucide-react';
import type { Language } from '../../../types';
import { getLabels, Labels } from '../../../utils/i18n';
import { getLocalizedContent } from '../../../utils/languageUtils';
import TestCardTrueFalse from './test/TestCardTrueFalse';
import TestCardMultipleChoice from './test/TestCardMultipleChoice';
import TestCardFill10 from './test/TestCardFill10';
import TestCardWritten from './test/TestCardWritten';
import { Button, Select } from '../../../components/ui';
import { KT } from '../../../components/mobile/ksoft/ksoft';

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
  answers: Partial<Record<string, TestCardAnswer>>;
  isCardComplete: (card: TestCard, answer: TestCardAnswer | undefined) => boolean;
  submitAttempted: boolean;
  language: Language;
  upsertAnswer: (cardId: string, answer: TestCardAnswer) => void;
  isAllAnswered: boolean;
  submitTest: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  startedAt: number | null;
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
    <div
      className="h-full min-h-0"
      style={{
        background: `radial-gradient(ellipse at 20% 0%, ${KT.bg2} 0%, ${KT.bg} 60%)`,
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-[800px] min-h-0 flex-col px-4 pb-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div
          style={{
            borderRadius: 24,
            background: KT.card,
            border: `1px solid ${KT.line}`,
            boxShadow: KT.sh,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: KT.ink }}>
            {labels.vocabTest?.resultsTitle || 'Results'}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatTile
              label={labels.vocabTest?.correct || 'Correct'}
              value={`${stats.correctQuestions}/${Math.max(stats.totalQuestions, 1)}`}
            />
            <StatTile
              label={labels.vocabTest?.accuracy || 'Accuracy'}
              value={`${Math.round((stats.correctQuestions / Math.max(stats.totalQuestions, 1)) * 100)}%`}
            />
            <StatTile
              label={labels.vocabTest?.time || 'Time'}
              value={stats.seconds === null ? '--' : `${stats.seconds}s`}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setStage('SETTINGS')}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 14,
                border: `1px solid ${KT.line2}`,
                background: KT.card,
                color: KT.ink,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {labels.vocabTest?.newTest || 'New test'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 14,
                border: 'none',
                background: KT.ink,
                color: KT.card,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {labels.common?.close || 'Close'}
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <div style={{ fontSize: 15, fontWeight: 800, color: KT.ink, marginBottom: 8 }}>
            {labels.vocabTest?.review || 'Review'}
          </div>
          <div className="space-y-3 pb-2">
            {cards.map((card, idx) => {
              const a = answers[card.id];
              const correctness = getCorrectness(card, a);
              return (
                <div
                  key={card.id}
                  style={{
                    borderRadius: 20,
                    border: `1px solid ${KT.line}`,
                    background: KT.card,
                    padding: 14,
                  }}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div style={{ fontSize: 11, fontWeight: 800, color: KT.sub }}>
                      {labels.vocabTest?.cardLabel || 'Card'} {idx + 1}
                    </div>
                    {correctness ? (
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          borderRadius: 999,
                          padding: '3px 9px',
                          background: correctness.allCorrect ? `${KT.mint}75` : `${KT.pink}75`,
                          color: correctness.allCorrect ? KT.mintDeep : KT.pinkDeep,
                        }}
                      >
                        {getCorrectnessLabel(card.type, correctness)}
                      </div>
                    ) : null}
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

function StatTile({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${KT.line}`,
        background: KT.bg2,
        padding: 10,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 800, color: KT.ink }}>{value}</div>
      <div style={{ fontSize: 10, color: KT.sub, fontWeight: 700 }}>{label}</div>
    </div>
  );
}

const formatElapsedTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const speakKorean = (text: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const trimmed = text.trim();
  if (!trimmed) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = 'ko-KR';
  window.speechSynthesis.speak(utterance);
};

type MobileRunningCardProps = Readonly<{
  card: TestCard;
  answered: TestCardAnswer | undefined;
  language: Language;
  upsertAnswer: (cardId: string, answer: TestCardAnswer) => void;
  isMissing: boolean;
}>;

function MobileRunningCard({
  card,
  answered,
  language,
  upsertAnswer,
  isMissing,
}: MobileRunningCardProps) {
  const labels = getLabels(language);
  const koreanPrompt = card.type === 'FILL_10' ? card.items[0]?.pair.korean || '' : card.correctPair.korean;

  if (card.type === 'MULTIPLE_CHOICE') {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const selectedIndex = answered?.type === 'MULTIPLE_CHOICE' ? answered.selectedIndex : null;
    const promptIsKorean = card.direction === 'KR_TO_NATIVE';
    const optionsAreKorean = card.direction === 'NATIVE_TO_KR';
    const instruction = promptIsKorean
      ? labels.vocabTest?.promptMeaning || 'WHAT DOES THIS WORD MEAN?'
      : labels.vocabTest?.promptChooseKorean || 'CHOOSE THE KOREAN WORD';
    const chooseAnswerLabel = labels.vocabTest?.chooseAnswer || 'Choose an answer';

    return (
      <div className="flex flex-col">
        <div
          style={{
            background: KT.card,
            borderRadius: 24,
            border: `1px solid ${KT.line}`,
            boxShadow: KT.sh,
            padding: '20px 20px 18px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.4,
              color: KT.sub,
              textTransform: 'uppercase',
            }}
          >
            {instruction}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <h4
              className="min-w-0 flex-1"
              style={{
                fontSize: promptIsKorean ? 46 : 40,
                fontWeight: 900,
                color: KT.ink,
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                fontFamily: promptIsKorean ? KT.serif : 'inherit',
                wordBreak: 'break-word',
              }}
            >
              {card.prompt}
            </h4>
            <button
              type="button"
              onClick={() => speakKorean(koreanPrompt)}
              aria-label={labels.vocab?.playAudio || 'Play audio'}
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                background: KT.ink,
                color: KT.card,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                boxShadow: KT.shSm,
                border: 'none',
              }}
            >
              <Volume2 size={20} />
            </button>
          </div>
          <div
            className="mt-4 flex items-center gap-2"
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.2,
              color: KT.sub,
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: 18,
                height: 1.5,
                background: KT.line2,
                borderRadius: 1,
              }}
            />
            {chooseAnswerLabel}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          {card.options.map((option, idx) => {
            const selected = selectedIndex === idx;
            const border = selected
              ? `1.5px solid ${KT.mintDeep}`
              : `1px solid ${KT.line}`;
            const background = selected ? `${KT.mint}5C` : KT.card;
            const letterBg = selected ? KT.mintDeep : KT.bg2;
            const letterColor = selected ? KT.card : KT.ink;
            const optionShadow = selected
              ? '0 1px 2px rgba(91,132,114,0.18), 0 8px 22px rgba(91,132,114,0.14)'
              : KT.shSm;
            return (
              <button
                key={`${option}-${idx}`}
                type="button"
                onClick={() =>
                  upsertAnswer(card.id, { type: 'MULTIPLE_CHOICE', selectedIndex: idx })
                }
                style={{
                  width: '100%',
                  minHeight: 68,
                  borderRadius: 20,
                  border,
                  background,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  textAlign: 'left',
                  boxShadow: optionShadow,
                  transition: 'background 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
                }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 13,
                    background: letterBg,
                    color: letterColor,
                    fontFamily: KT.serif,
                    fontSize: 22,
                    fontWeight: 600,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    lineHeight: 1,
                    transition: 'background 140ms ease, color 140ms ease',
                  }}
                >
                  {letters[idx] || '?'}
                </span>
                <span
                  className="min-w-0 flex-1"
                  style={{
                    fontSize: optionsAreKorean ? 20 : 17,
                    fontWeight: 800,
                    color: KT.ink,
                    lineHeight: 1.25,
                    letterSpacing: '-0.005em',
                    fontFamily: optionsAreKorean ? KT.serif : 'inherit',
                    wordBreak: 'break-word',
                  }}
                >
                  {option}
                </span>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    background: selected ? KT.mintDeep : 'transparent',
                    border: selected ? 'none' : `1.5px solid ${KT.line2}`,
                    color: KT.card,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    transition: 'background 140ms ease, border-color 140ms ease',
                  }}
                  aria-hidden="true"
                >
                  {selected ? <Check size={14} strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>

        {isMissing ? (
          <div
            className="mt-4 rounded-2xl px-4 py-3"
            style={{
              background: `${KT.pink}40`,
              border: `1px solid ${KT.pink}`,
              color: KT.pinkDeep,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {labels.vocabTest?.notAnswered || 'Please answer this question.'}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div
        className="rounded-[26px] px-5 py-5"
        style={{ background: KT.card, border: `1px solid ${KT.line}`, boxShadow: KT.sh }}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="text-[14px] font-black tracking-[0.08em] text-[#8C8377]">
            {language === 'zh' ? '考试模式 · 试' : 'TEST MODE'}
          </div>
          <Button
            variant="ghost"
            size="auto"
            type="button"
            onClick={() => speakKorean(koreanPrompt)}
            className="h-12 w-12 shrink-0 rounded-full bg-[#1F1B17] text-[#FBF8F3] hover:bg-[#1F1B17] hover:text-[#FBF8F3]"
            aria-label={labels.vocab?.playAudio || 'Play audio'}
          >
            <Volume2 className="h-5 w-5" />
          </Button>
        </div>
        {card.type === 'TRUE_FALSE' ? (
          <TestCardTrueFalse
            language={language}
            prompt={card.prompt}
            statement={card.statement}
            answered={answered?.type === 'TRUE_FALSE' ? { isTrue: answered.isTrue } : undefined}
            onSubmit={isTrue => upsertAnswer(card.id, { type: 'TRUE_FALSE', isTrue })}
          />
        ) : card.type === 'FILL_10' ? (
          <TestCardFill10
            language={language}
            items={card.items.map(it => ({ wordId: it.wordId, pair: it.pair }))}
            initialDirection={card.direction}
            answered={
              answered?.type === 'FILL_10'
                ? { filled: answered.filled, directionUsed: answered.directionUsed }
                : undefined
            }
            onSubmit={(filled, directionUsed) =>
              upsertAnswer(card.id, { type: 'FILL_10', filled, directionUsed })
            }
          />
        ) : (
          <TestCardWritten
            language={language}
            prompt={card.prompt}
            answered={answered?.type === 'WRITTEN' ? { input: answered.input } : undefined}
            onSubmit={input => upsertAnswer(card.id, { type: 'WRITTEN', input })}
          />
        )}
      </div>
    </div>
  );
}

function RunningScreen({
  cards,
  activeCardIndex,
  goToCard,
  answers,
  isCardComplete,
  submitAttempted,
  language,
  upsertAnswer,
  isAllAnswered,
  submitTest,
  scrollContainerRef,
  onClose,
  startedAt,
}: RunningScreenProps) {
  const labels = getLabels(language);
  const active = cards[activeCardIndex];
  const [now, setNow] = useState(() => Date.now());
  const modeLabel =
    language === 'zh'
      ? '考试模式 · 试'
      : language === 'vi'
        ? 'Chế độ thi'
        : language === 'mn'
          ? 'Шалгалтын горим'
          : 'Test mode';
  const skipLabel =
    language === 'zh' ? '跳过' : language === 'vi' ? 'Bỏ qua' : language === 'mn' ? 'Алгасах' : 'Skip';
  const nextLabel =
    language === 'zh'
      ? '下一题'
      : language === 'vi'
        ? 'Câu tiếp'
        : language === 'mn'
          ? 'Дараах'
          : 'Next';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsedSeconds = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const timerText = formatElapsedTime(elapsedSeconds);

  const goToNextCard = () => {
    if (activeCardIndex < cards.length - 1) {
      goToCard(activeCardIndex + 1);
      return;
    }
    submitTest();
  };

  const progressPellets = cards.map((card, idx) => {
    const answered = isCardComplete(card, answers[card.id]);
    const isCurrent = idx === activeCardIndex;
    return { answered, isCurrent };
  });

  return (
    <div
      className="flex h-full w-full min-h-0 flex-col"
      style={{
        background: `radial-gradient(ellipse at 20% 0%, ${KT.bg2} 0%, ${KT.bg} 60%)`,
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          borderBottom: `1px solid ${KT.line}`,
          background: 'rgba(251,248,243,0.9)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          padding: 'calc(env(safe-area-inset-top) + 10px) 16px 10px',
        }}
      >
        <div className="mx-auto flex w-full max-w-[800px] items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              display: 'grid',
              placeItems: 'center',
              color: KT.ink,
            }}
            aria-label={labels.common?.close || 'Close'}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div style={{ fontSize: 11, fontWeight: 700, color: KT.sub }}>{modeLabel}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: KT.ink }}>
              第 {activeCardIndex + 1} 题 / {Math.max(cards.length, 1)}
            </div>
          </div>
          <div
            style={{
              minWidth: 68,
              height: 38,
              borderRadius: 19,
              background: KT.ink,
              color: KT.card,
              display: 'grid',
              placeItems: 'center',
              fontSize: 14,
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              padding: '0 10px',
            }}
          >
            {timerText}
          </div>
        </div>
        <div
          className="mx-auto mt-2 grid w-full max-w-[800px] gap-[4px]"
          style={{ gridTemplateColumns: `repeat(${Math.max(progressPellets.length, 1)}, minmax(0,1fr))` }}
        >
          {progressPellets.map((item, idx) => (
            <span
              key={`pellet-${idx}`}
              style={{
                height: 5,
                borderRadius: 999,
                background: item.isCurrent ? KT.ink : item.answered ? KT.mintDeep : 'rgba(31,27,23,0.1)',
              }}
            />
          ))}
        </div>
      </header>

      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-3">
        <div className="mx-auto w-full max-w-[800px]">
          {active ? (
            <MobileRunningCard
              card={active}
              answered={answers[active.id]}
              language={language}
              upsertAnswer={upsertAnswer}
              isMissing={submitAttempted && !isCardComplete(active, answers[active.id])}
            />
          ) : null}
        </div>
      </div>

      <footer
        style={{
          borderTop: `1px solid ${KT.line}`,
          background: 'rgba(255,255,255,0.96)',
          padding: '10px 16px calc(env(safe-area-inset-bottom) + 10px)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div className="mx-auto flex w-full max-w-[800px] gap-2">
          <button
            type="button"
            onClick={goToNextCard}
            style={{
              flex: 0.38,
              minHeight: 46,
              borderRadius: 14,
              border: `1px solid ${KT.line2}`,
              background: KT.card,
              color: KT.ink,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {activeCardIndex < cards.length - 1 ? skipLabel : labels.vocabTest?.submitTest || 'Submit'}
          </button>
          <button
            type="button"
            onClick={goToNextCard}
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: 14,
              border: 'none',
              background: KT.ink,
              color: KT.card,
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            {activeCardIndex < cards.length - 1 ? nextLabel : labels.vocabTest?.submitTest || 'Submit test'}
          </button>
        </div>
        {submitAttempted && !isAllAnswered ? (
          <div className="mx-auto mt-2 w-full max-w-[800px]" style={{ fontSize: 12, fontWeight: 700, color: KT.pinkDeep }}>
            {labels.vocabTest?.unansweredWarning || 'Some questions are unanswered.'}
          </div>
        ) : null}
      </footer>
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

  const toggleType = (key: QuestionType) => {
    if (key === 'MULTIPLE_CHOICE' && !canUseMultipleChoice) return;
    setEnabledTypes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const modeMeta: ReadonlyArray<{
    key: QuestionType;
    icon: React.ReactNode;
    title: string;
    desc: string;
    disabled?: boolean;
  }> = [
    {
      key: 'MULTIPLE_CHOICE',
      icon: <List className="h-4 w-4" />,
      title: labels.vocabTest?.questionTypeMultipleChoice || 'Multiple choice',
      desc: !canUseMultipleChoice ? '(not enough words)' : 'Multiple Choice',
      disabled: !canUseMultipleChoice,
    },
    {
      key: 'TRUE_FALSE',
      icon: <CheckSquare className="h-4 w-4" />,
      title: labels.vocabTest?.questionTypeTrueFalse || 'True / False',
      desc: 'True / False',
    },
    {
      key: 'WRITTEN',
      icon: <Keyboard className="h-4 w-4" />,
      title: labels.vocabTest?.questionTypeWritten || 'Written',
      desc: 'Written',
    },
    {
      key: 'FILL_10',
      icon: <Grip className="h-4 w-4" />,
      title: labels.vocabTest?.questionTypeFill || 'Fill in 10',
      desc: 'Fill in 10',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[800px] px-4 pb-5 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div
        style={{
          background: KT.card,
          borderRadius: 24,
          border: `1px solid ${KT.line}`,
          boxShadow: KT.sh,
          padding: 16,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: KT.sub, letterSpacing: 0.9 }}>{scopeTitle}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: KT.ink, marginTop: 4 }}>
            {labels.vocabTest?.setupTitle || 'Set up your test'}
          </div>
          <div style={{ fontSize: 11, color: KT.sub, marginTop: 2 }}>{maxQuestions} Words in queue</div>
        </div>

        <div
          style={{
            borderRadius: 16,
            background: KT.bg2,
            border: `1px solid ${KT.line}`,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span style={{ fontSize: 12, fontWeight: 800, color: KT.ink }}>
              {labels.vocabTest?.questions || 'Questions'}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: KT.ink,
                background: KT.card,
                borderRadius: 10,
                border: `1px solid ${KT.line}`,
                padding: '4px 10px',
              }}
            >
              {effectiveQuestionCount}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={Math.max(1, maxQuestions)}
            value={effectiveQuestionCount}
            onChange={e => setQuestionCount(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="mb-2 flex items-center justify-between">
            <span style={{ fontSize: 12, fontWeight: 800, color: KT.ink }}>
              {labels.vocabTest?.questionTypes || 'Modes'}
            </span>
            {enabledTypeList.length === 0 ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: KT.pinkDeep }}>
                {labels.vocabTest?.pickAtLeastOneType || 'pick 1'}
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {modeMeta.map(item => {
              const selected = enabledTypes[item.key];
              const disabled = item.disabled === true;
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) toggleType(item.key);
                  }}
                  style={{
                    textAlign: 'left',
                    borderRadius: 14,
                    border: selected ? `1px solid ${KT.mintDeep}` : `1px solid ${KT.line}`,
                    background: selected ? `${KT.mint}70` : KT.card,
                    padding: 10,
                    opacity: disabled ? 0.55 : 1,
                  }}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        display: 'grid',
                        placeItems: 'center',
                        border: `1px solid ${KT.line}`,
                        background: selected ? KT.mintDeep : KT.bg2,
                        color: selected ? KT.card : KT.sub,
                      }}
                    >
                      {item.icon}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: selected ? KT.mintDeep : KT.ink }}>
                      {item.title}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: KT.sub }}>{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${KT.line}`,
            background: KT.bg2,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 12, fontWeight: 800, color: KT.ink }}>
              {labels.vocabTest?.answers || 'Answers'}
            </span>
            <Select
              value={answerLanguage}
              onChange={e => setAnswerLanguage(e.target.value as AnswerLanguage)}
              className="!h-8 !w-auto !rounded-lg !border !border-border !bg-white !py-0 !text-xs !font-bold"
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
          style={{
            width: '100%',
            minHeight: 48,
            borderRadius: 14,
            border: 'none',
            background: KT.ink,
            color: KT.card,
            fontSize: 14,
            fontWeight: 800,
            opacity: isStartDisabled ? 0.5 : 1,
            cursor: isStartDisabled ? 'default' : 'pointer',
          }}
        >
          {labels.vocabTest?.startTest || 'START TEST'}
        </button>
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

  const startTest = useCallback(() => {
    const nextCards = buildCards();
    setCards(nextCards);
    setAnswers({});
    setActiveCardIndex(0);
    setStartedAt(Date.now());
    setFinishedAt(null);
    setSubmitAttempted(false);
    setStage('RUNNING');
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
            answers={answers}
            isCardComplete={isCardComplete}
            submitAttempted={submitAttempted}
            language={language}
            upsertAnswer={upsertAnswer}
            isAllAnswered={isAllAnswered}
            submitTest={submitTest}
            scrollContainerRef={scrollContainerRef}
            onClose={onClose}
            startedAt={startedAt}
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
    <div className={`h-full min-h-0 sm:p-4 flex flex-col ${stage === 'RUNNING' ? 'p-0' : 'p-2'}`}>
      <div
        className={`items-center justify-between mb-4 shrink-0 px-2 pt-2 sm:px-0 sm:pt-0 ${
          stage === 'RUNNING' ? 'hidden sm:flex' : 'flex'
        }`}
      >
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
