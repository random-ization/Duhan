import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { TopikExam, Language, Annotation, AnnotationColor } from '../../types';
import {
  Clock,
  RotateCcw,
  ArrowLeft,
  FileText,
  ArrowRight,
  Headphones,
  Pencil,
  Loader2,
  Eye,
  MessageSquare,
  Trash2,
  Check,
} from 'lucide-react';
import { getLabels } from '../../utils/i18n';
import { QuestionRenderer } from './QuestionRenderer';
import AnnotationMenu from '../AnnotationMenu';
import type { ToolType } from '../../features/annotation/components/CanvasLayer';
import { useCanvasAnnotation } from '../../features/annotation/hooks/useCanvasAnnotation';
import { useMutation, useAction } from 'convex/react';
import toast from 'react-hot-toast';
import { DICTIONARY, VOCAB } from '../../utils/convexRefs';
import { Button } from '../ui';
import { Textarea } from '../ui';

const PAPER_MAX_WIDTH = 'max-w-[900px]';

const TOPIK_READING_STRUCTURE = [
  { range: [1, 2], instruction: '※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)' },
  {
    range: [3, 4],
    instruction: '※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)',
  },
  { range: [5, 8], instruction: '※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)' },
  {
    range: [9, 12],
    instruction: '※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)',
  },
  {
    range: [13, 15],
    instruction: '※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)',
  },
  {
    range: [16, 18],
    instruction:
      '※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)',
  },
  { range: [19, 24], instruction: '※ [19～24] 다음을 읽고 물음에 답하십시오. (각 2점)' },
  {
    range: [25, 27],
    instruction:
      '※ [25～27] 다음은 신문 기사의 제목입니다. 가장 잘 설명한 것을 고르십시오. (각 2점)',
  },
  {
    range: [28, 31],
    instruction:
      '※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)',
  },
  { range: [32, 34], instruction: '※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)' },
  {
    range: [35, 38],
    instruction: '※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)',
  },
  {
    range: [39, 41],
    instruction:
      '※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)',
  },
  { range: [42, 50], instruction: '※ [42～50] 다음을 읽고 물음에 답하십시오. (각 2점)' },
];

const TOPIK_LISTENING_STRUCTURE = [
  { range: [1, 3], instruction: '※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)' },
  {
    range: [4, 8],
    instruction: '※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)',
  },
  {
    range: [9, 12],
    instruction:
      '※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)',
  },
  {
    range: [13, 16],
    instruction: '※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)',
  },
  {
    range: [17, 20],
    instruction: '※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)',
  },
  { range: [21, 50], instruction: '※ [21～50] 다음을 듣고 물음에 답하십시오. (각 2점)' },
];

type SectionStructureItem = { range: number[]; instruction: string };

const findSectionByQuestionNumber = (
  structure: SectionStructureItem[],
  qNum: number
): SectionStructureItem | null => {
  for (const section of structure) {
    if (qNum >= section.range[0] && qNum <= section.range[1]) return section;
  }
  return null;
};

const getInstructionForIndex = (
  structure: SectionStructureItem[],
  qIndex: number
): string | null => {
  const qNum = qIndex + 1;
  return findSectionByQuestionNumber(structure, qNum)?.instruction || null;
};

const isSectionStartIndex = (structure: SectionStructureItem[], qIndex: number): boolean => {
  const qNum = qIndex + 1;
  return structure.some(section => qNum === section.range[0]);
};

const findMatchingAnnotation = (
  annotations: Annotation[],
  contextKey: string,
  selectedText: string
): Annotation | undefined =>
  annotations.find(
    annotation =>
      annotation.contextKey === contextKey &&
      (annotation.text === selectedText || annotation.selectedText === selectedText)
  );

const ANNOTATION_COLOR_BADGE_CLASS: Record<string, string> = {
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  pink: 'bg-pink-100 text-pink-800',
};

const resolveDictionaryMeaning = (bestMatch: any): { meaning: string; partOfSpeech: string } => {
  if (!bestMatch) {
    return { meaning: 'Manual Entry (Not found in dictionary)', partOfSpeech: 'noun' };
  }

  const sense = bestMatch.senses?.[0];
  const rawMeaning =
    sense?.translation?.definition || sense?.translation?.word || sense?.definition || '';
  return {
    meaning: rawMeaning.replaceAll(/<!\[CDATA\[|\]\]>/g, '').trim(),
    partOfSpeech: bestMatch.pos || 'noun',
  };
};

const resolveSelectionContext = (
  selectionContextKey: string,
  questions: TopikExam['questions']
): string => {
  const questionIndexStart = selectionContextKey.indexOf('-Q');
  if (questionIndexStart < 0) return '';

  const questionIndexStr = selectionContextKey.substring(questionIndexStart + 2);
  const questionIndex = questionIndexStr ? Number.parseInt(questionIndexStr, 10) : undefined;
  const question = questionIndex !== undefined ? questions[questionIndex] : null;
  return question?.question || question?.passage?.substring(0, 100) || '';
};

interface ExamCoverCopy {
  backText: string;
  roundMockText: string;
  timeLabel: string;
  timeValue: string;
  itemsLabel: string;
  scoreLabel: string;
  noticeTitle: string;
  simulationTitle: string;
  simulationDesc: string;
  submitTitle: string;
  submitDesc: string;
  listeningTitle: string;
  listeningTip: string;
  startButtonText: string;
  startConfirm: string;
  showListeningNotice: boolean;
}

const EXAM_COVER_DEFAULTS = {
  time: 'Time',
  items: 'Questions',
  score: 'Score',
  noticeTitle: 'Before You Start',
  simulationTitle: 'Full simulation mode',
  simulationDesc:
    'Do not leave the page during the exam. The paper will auto-submit when time runs out.',
  submitTitle: 'Answer submission',
  submitDesc:
    'All questions are single-choice. You can view your score and AI analysis after submission.',
  listeningTitle: 'Listening section',
  listeningTip: 'Listening section contains audio. Please turn on your sound or use headphones.',
  startExam: 'Start Exam',
  startConfirm: 'By starting, you confirm you are ready.',
  roundMock: 'Round {{round}} Past Exam',
};

const EXAM_RESULT_DEFAULTS = {
  passTitle: 'Congratulations! 🎉',
  keepTitle: 'Keep Practicing! 💪',
  passSubtitle: 'You have reached the passing standard.',
  keepSubtitle: 'You are getting closer to your target.',
  yourScore: 'Your Score',
  accuracy: 'Accuracy',
  correct: 'Correct',
  incorrect: 'Incorrect',
  reviewDetails: 'View Detailed Analysis',
  tryAgain: 'Try Again',
  backToList: 'Back to List',
};

const EXAM_REVIEW_DEFAULTS = {
  correct: 'Correct',
};

interface ExamReviewUiCopy {
  mode: string;
  roundLabelTemplate: string;
  mark: string;
  wrongQuestionsTemplate: string;
  allCorrect: string;
  canvasLoading: string;
  canvasSaving: string;
  canvasSynced: string;
  titleKor: string;
  titleEn: string;
  scrollDownReview: string;
  periodReading: string;
  periodListening: string;
  sectionReading: string;
  sectionListening: string;
  pageHeader: string;
  range: string;
  endOfSection: string;
}

const EXAM_REVIEW_UI_DEFAULTS = {
  mode: 'Review Mode',
  roundLabel: 'Round {{round}}',
  mark: 'Mark',
  wrongQuestions: 'Mistakes ({{count}}):',
  allCorrect: '🎉 All correct!',
  canvasLoading: 'Loading...',
  canvasSaving: 'Saving...',
  canvasSynced: 'Synced',
  titleKor: '한 국 어 능 력 시 험',
  titleEn: 'The {{round}}th Test of Proficiency in Korean',
  scrollDownReview: '[Scroll down to review]',
  periodReading: '2nd Session',
  periodListening: '1st Session',
  sectionReading: 'Reading',
  sectionListening: 'Listening',
  pageHeader: 'Round {{round}} TOPIK II {{paperType}} · {{period}} ({{section}})',
  range: 'TOPIK II {{section}} (Q1 ~ Q{{count}})',
  endOfSection: 'End of Section',
};

const getExamReviewUiCopy = (labels: ReturnType<typeof getLabels>): ExamReviewUiCopy => {
  const review = { ...EXAM_REVIEW_UI_DEFAULTS, ...(labels.dashboard?.topik?.review ?? {}) };
  const mobileReview = {
    mode: EXAM_REVIEW_UI_DEFAULTS.mode,
    ...(labels.dashboard?.topik?.mobile?.review ?? {}),
  };
  return {
    mode: mobileReview.mode,
    roundLabelTemplate: review.roundLabel,
    mark: review.mark,
    wrongQuestionsTemplate: review.wrongQuestions,
    allCorrect: review.allCorrect,
    canvasLoading: review.canvasLoading,
    canvasSaving: review.canvasSaving,
    canvasSynced: review.canvasSynced,
    titleKor: mobileReview.titleKor || EXAM_REVIEW_UI_DEFAULTS.titleKor,
    titleEn: mobileReview.titleEn || EXAM_REVIEW_UI_DEFAULTS.titleEn,
    scrollDownReview: mobileReview.scrollDownReview || EXAM_REVIEW_UI_DEFAULTS.scrollDownReview,
    periodReading: mobileReview.periodReading || EXAM_REVIEW_UI_DEFAULTS.periodReading,
    periodListening: mobileReview.periodListening || EXAM_REVIEW_UI_DEFAULTS.periodListening,
    sectionReading:
      mobileReview.sectionReading || labels.reading || EXAM_REVIEW_UI_DEFAULTS.sectionReading,
    sectionListening:
      mobileReview.sectionListening || labels.listening || EXAM_REVIEW_UI_DEFAULTS.sectionListening,
    pageHeader: mobileReview.pageHeader || EXAM_REVIEW_UI_DEFAULTS.pageHeader,
    range: mobileReview.range || EXAM_REVIEW_UI_DEFAULTS.range,
    endOfSection: review.endOfSection,
  };
};

const getExamCoverCopy = (
  labels: ReturnType<typeof getLabels>,
  exam: TopikExam,
  hasAttempted?: boolean
): ExamCoverCopy => {
  const cover = { ...EXAM_COVER_DEFAULTS, ...(labels.dashboard?.topik?.mobile?.cover ?? {}) };
  const result = { ...EXAM_RESULT_DEFAULTS, ...(labels.dashboard?.topik?.result ?? {}) };
  const timeLimitTemplate = labels.topikLobby?.timeLimit ?? '{{count}} min';

  return {
    backText: labels.back || 'Back',
    roundMockText: cover.roundMock.replace('{{round}}', String(exam.round)),
    timeLabel: cover.time,
    timeValue: timeLimitTemplate.replace('{{count}}', String(exam.timeLimit)),
    itemsLabel: cover.items,
    scoreLabel: cover.score,
    noticeTitle: cover.noticeTitle,
    simulationTitle: cover.simulationTitle,
    simulationDesc: cover.simulationDesc,
    submitTitle: cover.submitTitle,
    submitDesc: cover.submitDesc,
    listeningTitle: cover.listeningTitle,
    listeningTip: cover.listeningTip,
    startButtonText: hasAttempted ? result.tryAgain : cover.startExam,
    startConfirm: cover.startConfirm,
    showListeningNotice: exam.type === 'LISTENING',
  };
};

const ExamCoverLeftPanel = ({
  exam,
  copy,
  onBack,
}: {
  exam: TopikExam;
  copy: ExamCoverCopy;
  onBack: () => void;
}) => {
  const ExamTypeIcon = exam.type === 'READING' ? FileText : Headphones;
  return (
    <div className="md:w-2/5 bg-primary text-primary-foreground p-10 flex flex-col justify-between relative overflow-hidden">
      <div className="relative z-10">
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={onBack}
          className="flex items-center text-primary-foreground/80 hover:text-primary-foreground transition-colors mb-8 text-sm font-bold uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> {copy.backText}
        </Button>

        <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
          <ExamTypeIcon className="w-8 h-8" />
        </div>

        <h1 className="text-3xl font-bold mb-2 leading-tight">
          TOPIK II
          <br />
          {exam.type}
        </h1>
        <p className="text-primary-foreground/80 font-medium">{copy.roundMockText}</p>
      </div>

      <div className="relative z-10 space-y-6">
        <div>
          <div className="text-xs text-primary-foreground/70 uppercase tracking-widest font-bold mb-1">
            {copy.timeLabel}
          </div>
          <div className="text-2xl font-mono">{copy.timeValue}</div>
        </div>
        <div>
          <div className="text-xs text-primary-foreground/70 uppercase tracking-widest font-bold mb-1">
            {copy.itemsLabel}
          </div>
          <div className="text-2xl font-mono">{exam.questions.length}</div>
        </div>
        <div>
          <div className="text-xs text-primary-foreground/70 uppercase tracking-widest font-bold mb-1">
            {copy.scoreLabel}
          </div>
          <div className="text-2xl font-mono">100</div>
        </div>
      </div>

      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600 dark:bg-indigo-500 rounded-full blur-2xl opacity-50"></div>
    </div>
  );
};

const ExamCoverRightPanel = ({ copy, onStart }: { copy: ExamCoverCopy; onStart: () => void }) => (
  <div className="md:w-3/5 p-10 md:p-12 flex flex-col">
    <h2 className="text-2xl font-bold text-foreground mb-6">{copy.noticeTitle}</h2>

    <div className="space-y-4 flex-1">
      <div className="flex gap-4 p-4 rounded-xl bg-muted border border-border">
        <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center shadow-sm shrink-0 text-muted-foreground font-bold border border-border">
          1
        </div>
        <div>
          <h4 className="font-bold text-muted-foreground text-sm">{copy.simulationTitle}</h4>
          <p className="text-xs text-muted-foreground mt-1">{copy.simulationDesc}</p>
        </div>
      </div>
      <div className="flex gap-4 p-4 rounded-xl bg-muted border border-border">
        <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center shadow-sm shrink-0 text-muted-foreground font-bold border border-border">
          2
        </div>
        <div>
          <h4 className="font-bold text-muted-foreground text-sm">{copy.submitTitle}</h4>
          <p className="text-xs text-muted-foreground mt-1">{copy.submitDesc}</p>
        </div>
      </div>
      {copy.showListeningNotice && (
        <div className="flex gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-400/30">
          <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center shadow-sm shrink-0 text-amber-500 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-400/40">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-muted-foreground text-sm">{copy.listeningTitle}</h4>
            <p className="text-xs text-muted-foreground mt-1">{copy.listeningTip}</p>
          </div>
        </div>
      )}
    </div>

    <div className="mt-8 pt-8 border-t border-border">
      <Button
        type="button"
        size="auto"
        onClick={onStart}
        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-pop hover:-translate-y-1 flex items-center justify-center gap-2 group"
      >
        {copy.startButtonText}
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </Button>
      <p className="text-center text-xs text-muted-foreground mt-4">{copy.startConfirm}</p>
    </div>
  </div>
);

// === 1. Modern Exam Cover View ===
interface ExamCoverViewProps {
  exam: TopikExam;
  language: Language;
  onStart: () => void;
  onBack: () => void;
  hasAttempted?: boolean;
}

export const ExamCoverView: React.FC<ExamCoverViewProps> = React.memo(
  ({ exam, language, onStart, onBack, hasAttempted }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const coverCopy = useMemo(
      () => getExamCoverCopy(labels, exam, hasAttempted),
      [labels, exam, hasAttempted]
    );

    return (
      <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-96 bg-indigo-600 dark:bg-indigo-500 skew-y-3 origin-top-left -translate-y-20 z-0"></div>
        <div className="absolute top-20 right-20 w-64 h-64 bg-card/10 rounded-full blur-3xl z-0"></div>

        <div className="relative z-10 w-full max-w-4xl bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          <ExamCoverLeftPanel exam={exam} copy={coverCopy} onBack={onBack} />
          <ExamCoverRightPanel copy={coverCopy} onStart={onStart} />
        </div>
      </div>
    );
  }
);
ExamCoverView.displayName = 'ExamCoverView';

// === 2. Modern Result View ===
interface ExamResultViewProps {
  exam: TopikExam;
  result: {
    score: number;
    totalScore: number;
    correctCount: number;
    totalQuestions: number;
  };
  language: Language;
  onReview: () => void;
  onTryAgain: () => void;
  onBackToList: () => void;
}

interface ExamResultCopy {
  headingTitle: string;
  headingSubtitle: string;
  yourScore: string;
  accuracy: string;
  correct: string;
  incorrect: string;
  reviewDetails: string;
  tryAgain: string;
  backToList: string;
}

const getExamResultCopy = (
  labels: ReturnType<typeof getLabels>,
  passed: boolean
): ExamResultCopy => {
  const result = { ...EXAM_RESULT_DEFAULTS, ...(labels.dashboard?.topik?.result ?? {}) };
  const review = { ...EXAM_REVIEW_DEFAULTS, ...(labels.dashboard?.topik?.mobile?.review ?? {}) };

  return {
    headingTitle: passed ? result.passTitle : result.keepTitle,
    headingSubtitle: passed ? result.passSubtitle : result.keepSubtitle,
    yourScore: result.yourScore,
    accuracy: result.accuracy,
    correct: result.correct || review.correct,
    incorrect: result.incorrect,
    reviewDetails: result.reviewDetails,
    tryAgain: result.tryAgain,
    backToList: result.backToList,
  };
};

const ExamResultBanner = ({
  examTitle,
  passed,
  headingTitle,
  headingSubtitle,
}: {
  examTitle: string;
  passed: boolean;
  headingTitle: string;
  headingSubtitle: string;
}) => (
  <div
    className={`p-8 text-center relative overflow-hidden ${passed ? 'bg-emerald-600 text-white' : 'bg-card border-b border-border text-foreground'}`}
  >
    <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
    <div className="absolute -top-10 -right-10 w-40 h-40 bg-card rounded-full blur-3xl opacity-20"></div>

    <div className="relative z-10">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4 backdrop-blur-sm ${
          passed
            ? 'bg-black/20 text-white border border-white/20'
            : 'bg-muted text-muted-foreground border border-border'
        }`}
      >
        {examTitle}
      </div>
      <h1 className={`text-3xl font-bold mb-2 ${passed ? 'text-white' : 'text-foreground'}`}>
        {headingTitle}
      </h1>
      <p className={`text-sm ${passed ? 'text-white/80' : 'text-muted-foreground'}`}>
        {headingSubtitle}
      </p>
    </div>
  </div>
);

const ExamResultStats = ({
  result,
  passed,
  percentage,
  copy,
}: {
  result: ExamResultViewProps['result'];
  passed: boolean;
  percentage: number;
  copy: ExamResultCopy;
}) => (
  <div className="p-8 -mt-6">
    <div className="bg-card rounded-2xl shadow-lg border border-border p-6 flex flex-col items-center">
      <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">
        {copy.yourScore}
      </div>
      <div className="flex items-baseline gap-2 mb-6">
        <span
          className={`text-6xl font-black ${passed ? 'text-emerald-600' : 'text-muted-foreground'}`}
        >
          {result.score}
        </span>
        <span className="text-xl text-muted-foreground font-bold">/ {result.totalScore}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full">
        <div className="bg-muted p-3 rounded-xl text-center border border-border">
          <div className="text-2xl font-bold text-muted-foreground mb-1">{percentage}%</div>
          <div className="text-xs font-bold text-muted-foreground uppercase">{copy.accuracy}</div>
        </div>
        <div className="bg-emerald-50 p-3 rounded-xl text-center border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-400/30">
          <div className="text-2xl font-bold text-emerald-600 mb-1">{result.correctCount}</div>
          <div className="text-xs font-bold text-emerald-700/60 dark:text-emerald-200/80 uppercase">
            {copy.correct}
          </div>
        </div>
        <div className="bg-red-50 p-3 rounded-xl text-center border border-red-100 dark:bg-red-500/10 dark:border-red-400/30">
          <div className="text-2xl font-bold text-red-500 mb-1">
            {result.totalQuestions - result.correctCount}
          </div>
          <div className="text-xs font-bold text-red-700/60 dark:text-red-200/80 uppercase">
            {copy.incorrect}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ExamResultActions = ({
  onReview,
  onTryAgain,
  onBackToList,
  copy,
}: {
  onReview: () => void;
  onTryAgain: () => void;
  onBackToList: () => void;
  copy: ExamResultCopy;
}) => (
  <div className="px-8 pb-8 space-y-3">
    <Button
      type="button"
      size="auto"
      onClick={onReview}
      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-all shadow-pop flex items-center justify-center gap-2"
    >
      <Eye className="w-5 h-5" />
      {copy.reviewDetails}
    </Button>

    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={onTryAgain}
        className="py-3 bg-card border border-border text-muted-foreground hover:bg-muted rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-4 h-4" /> {copy.tryAgain}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={onBackToList}
        className="py-3 bg-card border border-border text-muted-foreground hover:bg-muted rounded-xl font-bold transition-colors"
      >
        {copy.backToList}
      </Button>
    </div>
  </div>
);

export const ExamResultView: React.FC<ExamResultViewProps> = React.memo(
  ({ exam, result, language, onReview, onTryAgain, onBackToList }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const percentage = Math.round((result.score / result.totalScore) * 100);
    const passed = percentage >= 60;
    const copy = useMemo(() => getExamResultCopy(labels, passed), [labels, passed]);

    return (
      <div className="min-h-screen bg-muted py-12 px-4 flex justify-center items-center font-sans">
        <div className="w-full max-w-2xl bg-card rounded-3xl shadow-xl overflow-hidden border border-border">
          <ExamResultBanner
            examTitle={exam.title}
            passed={passed}
            headingTitle={copy.headingTitle}
            headingSubtitle={copy.headingSubtitle}
          />
          <ExamResultStats result={result} passed={passed} percentage={percentage} copy={copy} />
          <ExamResultActions
            onReview={onReview}
            onTryAgain={onTryAgain}
            onBackToList={onBackToList}
            copy={copy}
          />
        </div>
      </div>
    );
  }
);
ExamResultView.displayName = 'ExamResultView';

const AnnotationSidebar = ({
  labels,
  sidebarAnnotations,
  editingAnnotationId,
  activeAnnotationId,
  editNoteInput,
  setEditNoteInput,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onBeginEdit,
}: {
  labels: ReturnType<typeof getLabels>;
  sidebarAnnotations: Annotation[];
  editingAnnotationId: string | null;
  activeAnnotationId: string | null;
  editNoteInput: string;
  setEditNoteInput: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onBeginEdit: (annotation: Annotation) => void;
}) => (
  <div className="w-80 shrink-0 hidden lg:block ml-6">
    <div className="bg-card rounded-2xl shadow-sm border border-border sticky top-24 flex flex-col max-h-[calc(100vh-120px)] max-h-[calc(100dvh-120px)] overflow-hidden">
      <div className="p-4 border-b border-border bg-muted">
        <h4 className="font-bold text-muted-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          {labels.annotate || 'Notes'}
        </h4>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sidebarAnnotations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm italic">
            {labels.noNotes || 'No notes yet'}
          </div>
        ) : (
          sidebarAnnotations.map(annotation => {
            const isEditing = editingAnnotationId === annotation.id;
            const isActive = activeAnnotationId === annotation.id;

            if (isEditing) {
              return (
                <div
                  key={annotation.id}
                  id={`sidebar-card-${annotation.id}`}
                  className="bg-card p-3 rounded-lg border-2 border-indigo-500 shadow-md scroll-mt-20"
                >
                  <div className="text-xs font-bold mb-2 text-muted-foreground">
                    {labels.editingNote || 'Editing note'}: &quot;
                    {annotation.text.substring(0, 15)}
                    ...&quot;
                  </div>
                  <Textarea
                    value={editNoteInput}
                    onChange={e => setEditNoteInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSaveEdit(annotation.id);
                      }
                    }}
                    className="w-full border border-border rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-indigo-200 outline-none mb-2"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={onCancelEdit}
                      className="px-3 py-1 text-xs text-muted-foreground hover:bg-muted rounded"
                    >
                      {labels.cancel || 'Cancel'}
                    </Button>
                    <Button
                      type="button"
                      size="auto"
                      onClick={() => onSaveEdit(annotation.id)}
                      className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> {labels.save || 'Save'}
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={annotation.id}
                id={`sidebar-card-${annotation.id}`}
                className="group relative scroll-mt-20"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  className={`p-3 rounded-lg border transition-all cursor-pointer w-full text-left outline-none focus:ring-2 focus:ring-indigo-500/50
                        ${
                          isActive
                            ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-400/40 shadow-md'
                            : 'bg-muted border-border hover:border-indigo-200 dark:hover:border-indigo-400/40 hover:shadow-sm'
                        }`}
                  onClick={() => onBeginEdit(annotation)}
                >
                  <div
                    className={`text-xs font-bold mb-1 px-1.5 py-0.5 rounded w-fit ${
                      ANNOTATION_COLOR_BADGE_CLASS[annotation.color || 'yellow'] ||
                      ANNOTATION_COLOR_BADGE_CLASS.yellow
                    }`}
                  >
                    {annotation.text.substring(0, 20)}...
                  </div>
                  {annotation.note ? (
                    <p className="text-sm text-muted-foreground">{annotation.note}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {labels.clickToAddNote || 'Click to add note...'}
                    </p>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(annotation.id);
                  }}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  </div>
);

const ReviewDrawingStatus = ({
  isDrawingMode,
  canvasLoading,
  canvasSaving,
  copy,
}: {
  isDrawingMode: boolean;
  canvasLoading: boolean;
  canvasSaving: boolean;
  copy: ExamReviewUiCopy;
}) => {
  if (!isDrawingMode) return null;
  if (canvasLoading) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        {copy.canvasLoading}
      </span>
    );
  }
  if (canvasSaving) {
    return (
      <span className="flex items-center gap-1 text-amber-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        {copy.canvasSaving}
      </span>
    );
  }
  return (
    <span className="text-emerald-500 flex items-center gap-1">
      <Check className="w-3 h-3" />
      {copy.canvasSynced}
    </span>
  );
};

const ReviewWrongQuestionNavigator = ({
  exam,
  userAnswers,
  wrongCount,
  onJump,
  copy,
}: {
  exam: TopikExam;
  userAnswers: Record<number, number>;
  wrongCount: number;
  onJump: (index: number) => void;
  copy: ExamReviewUiCopy;
}) => (
  <div className="border-t border-border bg-muted/80 px-4 py-2">
    <div className="max-w-[1400px] mx-auto flex items-center gap-2 overflow-x-auto scrollbar-hide">
      <span className="text-xs font-medium text-muted-foreground shrink-0">
        {copy.wrongQuestionsTemplate.replace('{{count}}', String(wrongCount))}
      </span>
      <div className="flex gap-1">
        {exam.questions.map((q, idx) => {
          const isCorrect = userAnswers[idx] === q.correctAnswer;
          if (isCorrect) return null;
          return (
            <Button
              key={q.id}
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => onJump(idx)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 shrink-0 bg-red-500 text-white"
            >
              {idx + 1}
            </Button>
          );
        })}
      </div>
      {wrongCount === 0 && (
        <span className="text-xs text-emerald-600 font-medium">{copy.allCorrect}</span>
      )}
    </div>
  </div>
);

const ReviewTopBar = ({
  exam,
  onBack,
  isDrawingMode,
  onToggleDrawingMode,
  canvasLoading,
  canvasSaving,
  userAnswers,
  wrongCount,
  onJumpToQuestion,
  reviewCopy,
}: {
  exam: TopikExam;
  onBack: () => void;
  isDrawingMode: boolean;
  onToggleDrawingMode: () => void;
  canvasLoading: boolean;
  canvasSaving: boolean;
  userAnswers: Record<number, number>;
  wrongCount: number;
  onJumpToQuestion: (index: number) => void;
  reviewCopy: ExamReviewUiCopy;
}) => (
  <div className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border shadow-sm shrink-0">
    <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-bold text-muted-foreground text-lg">{exam.title}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <span className="bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded">
              {reviewCopy.mode}
            </span>
            <span>•</span>
            <span>{reviewCopy.roundLabelTemplate.replace('{{round}}', String(exam.round))}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={onToggleDrawingMode}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            isDrawingMode
              ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-500/15 dark:border-amber-400/30 dark:text-amber-200'
              : 'bg-muted border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          <Pencil className="w-4 h-4" />
          {reviewCopy.mark}
        </Button>

        <div className="flex items-center gap-2 text-xs">
          <ReviewDrawingStatus
            isDrawingMode={isDrawingMode}
            canvasLoading={canvasLoading}
            canvasSaving={canvasSaving}
            copy={reviewCopy}
          />
        </div>
      </div>
    </div>
    <ReviewWrongQuestionNavigator
      exam={exam}
      userAnswers={userAnswers}
      wrongCount={wrongCount}
      onJump={onJumpToQuestion}
      copy={reviewCopy}
    />
  </div>
);

const ReviewCanvasOverlays = ({
  isDrawingMode,
  CanvasLayerComponent,
  CanvasToolbarComponent,
  canvasData,
  handleCanvasChange,
  canvasTool,
  setCanvasTool,
  canvasColor,
  setCanvasColor,
  handleCanvasUndo,
  handleCanvasClear,
}: {
  isDrawingMode: boolean;
  CanvasLayerComponent?: React.ComponentType<any>;
  CanvasToolbarComponent?: React.ComponentType<any>;
  canvasData: any;
  handleCanvasChange: (data: any) => void;
  canvasTool: ToolType;
  setCanvasTool: (tool: ToolType) => void;
  canvasColor: string;
  setCanvasColor: (color: string) => void;
  handleCanvasUndo: () => void;
  handleCanvasClear: () => void;
}) => {
  if (!isDrawingMode) return null;
  return (
    <>
      <div className="absolute inset-0 z-10" style={{ pointerEvents: 'auto' }}>
        {CanvasLayerComponent ? (
          <CanvasLayerComponent
            data={canvasData}
            onChange={handleCanvasChange}
            readOnly={false}
            tool={canvasTool}
            color={canvasColor}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ pointerEvents: 'none' }}
          >
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        {CanvasToolbarComponent ? (
          <CanvasToolbarComponent
            tool={canvasTool}
            onToolChange={setCanvasTool}
            color={canvasColor}
            onColorChange={setCanvasColor}
            onUndo={handleCanvasUndo}
            onClear={handleCanvasClear}
          />
        ) : null}
      </div>
    </>
  );
};

const ReviewQuestionList = ({
  exam,
  questionRefs,
  shouldShowInstruction,
  getInstructionForQuestion,
  userAnswers,
  language,
  annotations,
  tempAnnotation,
  onTextSelect,
  activeAnnotationId,
}: {
  exam: TopikExam;
  questionRefs: React.MutableRefObject<Record<number, HTMLElement | null>>;
  shouldShowInstruction: (qIndex: number) => boolean;
  getInstructionForQuestion: (qIndex: number) => string | null;
  userAnswers: Record<number, number>;
  language: Language;
  annotations: Annotation[];
  tempAnnotation: Annotation | null;
  onTextSelect: (questionIndex: number, e?: React.MouseEvent) => void;
  activeAnnotationId: string | null;
}) => (
  <div className="px-8 md:px-12">
    {exam.questions.map((question, idx) => (
      <article
        key={question.id}
        ref={el => {
          questionRefs.current[idx] = el;
        }}
        aria-label={`Question ${idx + 1}`}
      >
        {shouldShowInstruction(idx) && (
          <div className="mb-4 font-bold text-lg leading-relaxed text-foreground font-['Batang','KoPubBatang','Times_New_Roman',serif]">
            {getInstructionForQuestion(idx)}
          </div>
        )}

        <div className="mb-12">
          <QuestionRenderer
            question={question}
            questionIndex={idx}
            userAnswer={userAnswers[idx]}
            correctAnswer={question.correctAnswer}
            language={language}
            showCorrect={true}
            annotations={
              tempAnnotation?.contextKey === `TOPIK-${exam.id}-Q${idx}`
                ? [...annotations, tempAnnotation]
                : annotations
            }
            contextPrefix={`TOPIK-${exam.id}`}
            onTextSelect={e => onTextSelect(idx, e)}
            activeAnnotationId={activeAnnotationId}
          />
        </div>
      </article>
    ))}
  </div>
);

const ReviewPaper = ({
  exam,
  paperContainerRef,
  isDrawingMode,
  CanvasLayerComponent,
  CanvasToolbarComponent,
  canvasData,
  handleCanvasChange,
  canvasTool,
  setCanvasTool,
  canvasColor,
  setCanvasColor,
  handleCanvasUndo,
  handleCanvasClear,
  questionRefs,
  shouldShowInstruction,
  getInstructionForQuestion,
  userAnswers,
  language,
  annotations,
  tempAnnotation,
  onTextSelect,
  activeAnnotationId,
  reviewCopy,
}: {
  exam: TopikExam;
  paperContainerRef: React.RefObject<HTMLDivElement | null>;
  isDrawingMode: boolean;
  CanvasLayerComponent?: React.ComponentType<any>;
  CanvasToolbarComponent?: React.ComponentType<any>;
  canvasData: any;
  handleCanvasChange: (data: any) => void;
  canvasTool: ToolType;
  setCanvasTool: (tool: ToolType) => void;
  canvasColor: string;
  setCanvasColor: (color: string) => void;
  handleCanvasUndo: () => void;
  handleCanvasClear: () => void;
  questionRefs: React.MutableRefObject<Record<number, HTMLElement | null>>;
  shouldShowInstruction: (qIndex: number) => boolean;
  getInstructionForQuestion: (qIndex: number) => string | null;
  userAnswers: Record<number, number>;
  language: Language;
  annotations: Annotation[];
  tempAnnotation: Annotation | null;
  onTextSelect: (questionIndex: number, e?: React.MouseEvent) => void;
  activeAnnotationId: string | null;
  reviewCopy: ExamReviewUiCopy;
}) => (
  <div
    ref={paperContainerRef}
    className={`bg-card w-full ${PAPER_MAX_WIDTH} shadow-xl min-h-screen pb-16 relative border border-border`}
  >
    <ReviewCanvasOverlays
      isDrawingMode={isDrawingMode}
      CanvasLayerComponent={CanvasLayerComponent}
      CanvasToolbarComponent={CanvasToolbarComponent}
      canvasData={canvasData}
      handleCanvasChange={handleCanvasChange}
      canvasTool={canvasTool}
      setCanvasTool={setCanvasTool}
      canvasColor={canvasColor}
      setCanvasColor={setCanvasColor}
      handleCanvasUndo={handleCanvasUndo}
      handleCanvasClear={handleCanvasClear}
    />

    <div className="p-8 md:p-12 pb-4 font-serif">
      <div className="bg-primary text-primary-foreground py-6 px-8 rounded-2xl mb-16 shadow-pop">
        <div className="flex items-baseline justify-center gap-4 mb-2">
          <span className="text-xl md:text-2xl font-bold">제{exam.round}회</span>
          <span className="text-3xl md:text-5xl font-bold tracking-wider">
            {reviewCopy.titleKor}
          </span>
        </div>
        <div className="text-center text-sm md:text-lg italic opacity-80">
          {reviewCopy.titleEn.replace('{{round}}', String(exam.round))}
        </div>
      </div>

      <div className="flex justify-center mb-16">
        <div className="text-center">
          <div className="border-t-2 border-b-2 border-foreground py-4 px-16">
            <div className="flex items-center justify-center gap-4">
              <span className="text-3xl md:text-5xl font-bold tracking-widest">TOPIK</span>
              <span className="text-3xl md:text-5xl font-light">Ⅱ</span>
              <span className="border-2 border-foreground rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-xl md:text-2xl font-bold">
                {exam.paperType || 'B'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center mb-16">
        <div className="border-2 border-foreground w-80 md:w-96">
          <div className="flex">
            <div className="w-1/3 bg-muted py-4 text-center font-bold text-2xl md:text-3xl border-r-2 border-foreground">
              {exam.type === 'READING' ? reviewCopy.periodReading : reviewCopy.periodListening}
            </div>
            <div className="w-2/3 bg-muted py-4 text-center font-bold text-2xl md:text-3xl">
              {exam.type === 'READING' ? reviewCopy.sectionReading : reviewCopy.sectionListening}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground mb-8 font-sans">
        {reviewCopy.scrollDownReview}
      </div>
    </div>

    <div className="bg-card border-b border-foreground mx-8 md:mx-12 mb-8 pb-1">
      <div className="flex justify-between items-end">
        <div className="font-bold text-sm text-muted-foreground">
          {reviewCopy.pageHeader
            .replace('{{round}}', String(exam.round))
            .replace('{{paperType}}', exam.paperType || 'B')
            .replace(
              '{{period}}',
              exam.type === 'READING' ? reviewCopy.periodReading : reviewCopy.periodListening
            )
            .replace(
              '{{section}}',
              exam.type === 'READING' ? reviewCopy.sectionReading : reviewCopy.sectionListening
            )}
        </div>
        <div className="font-bold bg-muted px-4 py-1 rounded-full text-sm">
          {reviewCopy.range
            .replace(
              '{{section}}',
              exam.type === 'READING' ? reviewCopy.sectionReading : reviewCopy.sectionListening
            )
            .replace('{{count}}', String(exam.questions.length))}
        </div>
      </div>
    </div>

    <ReviewQuestionList
      exam={exam}
      questionRefs={questionRefs}
      shouldShowInstruction={shouldShowInstruction}
      getInstructionForQuestion={getInstructionForQuestion}
      userAnswers={userAnswers}
      language={language}
      annotations={annotations}
      tempAnnotation={tempAnnotation}
      onTextSelect={onTextSelect}
      activeAnnotationId={activeAnnotationId}
    />

    <div className="flex justify-center py-12">
      <div className="bg-muted rounded-full px-4 py-1 font-bold text-muted-foreground">
        {reviewCopy.endOfSection}
      </div>
    </div>
  </div>
);

const ExamReviewLayout = ({
  labels,
  reviewCopy,
  exam,
  onBack,
  isDrawingMode,
  onToggleDrawingMode,
  canvasLoading,
  canvasSaving,
  userAnswers,
  wrongCount,
  onJumpToQuestion,
  paperContainerRef,
  CanvasLayerComponent,
  CanvasToolbarComponent,
  canvasData,
  handleCanvasChange,
  canvasTool,
  setCanvasTool,
  canvasColor,
  setCanvasColor,
  handleCanvasUndo,
  handleCanvasClear,
  questionRefs,
  shouldShowInstruction,
  getInstructionForQuestion,
  language,
  annotations,
  tempAnnotation,
  onTextSelect,
  activeAnnotationId,
  sidebarAnnotations,
  editingAnnotationId,
  editNoteInput,
  setEditNoteInput,
  onCancelEdit,
  onSaveEdit,
  onDeleteAnnotation,
  onBeginEditAnnotation,
  showAnnotationMenu,
  menuPosition,
  selectionText,
  onAddNote,
  onHighlight,
  selectedColor,
  setSelectedColor,
  onCloseAnnotationMenu,
  onSaveToVocab,
}: {
  labels: ReturnType<typeof getLabels>;
  reviewCopy: ExamReviewUiCopy;
  exam: TopikExam;
  onBack: () => void;
  isDrawingMode: boolean;
  onToggleDrawingMode: () => void;
  canvasLoading: boolean;
  canvasSaving: boolean;
  userAnswers: Record<number, number>;
  wrongCount: number;
  onJumpToQuestion: (index: number) => void;
  paperContainerRef: React.RefObject<HTMLDivElement | null>;
  CanvasLayerComponent?: React.ComponentType<any>;
  CanvasToolbarComponent?: React.ComponentType<any>;
  canvasData: any;
  handleCanvasChange: (data: any) => void;
  canvasTool: ToolType;
  setCanvasTool: (tool: ToolType) => void;
  canvasColor: string;
  setCanvasColor: (color: string) => void;
  handleCanvasUndo: () => void;
  handleCanvasClear: () => void;
  questionRefs: React.MutableRefObject<Record<number, HTMLElement | null>>;
  shouldShowInstruction: (qIndex: number) => boolean;
  getInstructionForQuestion: (qIndex: number) => string | null;
  language: Language;
  annotations: Annotation[];
  tempAnnotation: Annotation | null;
  onTextSelect: (questionIndex: number, e?: React.MouseEvent) => void;
  activeAnnotationId: string | null;
  sidebarAnnotations: Annotation[];
  editingAnnotationId: string | null;
  editNoteInput: string;
  setEditNoteInput: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onBeginEditAnnotation: (annotation: Annotation) => void;
  showAnnotationMenu: boolean;
  menuPosition: { top: number; left: number } | null;
  selectionText: string;
  onAddNote: () => void;
  onHighlight: (color: AnnotationColor | null) => void;
  selectedColor: AnnotationColor;
  setSelectedColor: (val: AnnotationColor | null) => void;
  onCloseAnnotationMenu: () => void;
  onSaveToVocab: (text: string) => Promise<void>;
}) => (
  <div className="min-h-screen bg-muted flex flex-col font-sans">
    <ReviewTopBar
      exam={exam}
      onBack={onBack}
      isDrawingMode={isDrawingMode}
      onToggleDrawingMode={onToggleDrawingMode}
      canvasLoading={canvasLoading}
      canvasSaving={canvasSaving}
      userAnswers={userAnswers}
      wrongCount={wrongCount}
      onJumpToQuestion={onJumpToQuestion}
      reviewCopy={reviewCopy}
    />

    <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-muted/50">
      <ReviewPaper
        exam={exam}
        paperContainerRef={paperContainerRef}
        isDrawingMode={isDrawingMode}
        CanvasLayerComponent={CanvasLayerComponent}
        CanvasToolbarComponent={CanvasToolbarComponent}
        canvasData={canvasData}
        handleCanvasChange={handleCanvasChange}
        canvasTool={canvasTool}
        setCanvasTool={setCanvasTool}
        canvasColor={canvasColor}
        setCanvasColor={setCanvasColor}
        handleCanvasUndo={handleCanvasUndo}
        handleCanvasClear={handleCanvasClear}
        questionRefs={questionRefs}
        shouldShowInstruction={shouldShowInstruction}
        getInstructionForQuestion={getInstructionForQuestion}
        userAnswers={userAnswers}
        language={language}
        annotations={annotations}
        tempAnnotation={tempAnnotation}
        onTextSelect={onTextSelect}
        activeAnnotationId={activeAnnotationId}
        reviewCopy={reviewCopy}
      />

      <AnnotationSidebar
        labels={labels}
        sidebarAnnotations={sidebarAnnotations}
        editingAnnotationId={editingAnnotationId}
        activeAnnotationId={activeAnnotationId}
        editNoteInput={editNoteInput}
        setEditNoteInput={setEditNoteInput}
        onCancelEdit={onCancelEdit}
        onSaveEdit={onSaveEdit}
        onDelete={onDeleteAnnotation}
        onBeginEdit={onBeginEditAnnotation}
      />
    </div>

    <AnnotationMenu
      visible={showAnnotationMenu}
      position={menuPosition}
      selectionText={selectionText}
      onAddNote={onAddNote}
      onHighlight={onHighlight}
      selectedColor={selectedColor}
      setSelectedColor={setSelectedColor}
      onClose={onCloseAnnotationMenu}
      onSaveToVocab={onSaveToVocab}
      labels={labels}
    />
  </div>
);

// === 3. Exam Review View - Full Paper Rendering ===
interface ExamReviewViewProps {
  exam: TopikExam;
  userAnswers: Record<number, number>;
  language: Language;
  annotations: Annotation[];
  onSaveAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (contextKey: string) => void;
  onBack: () => void;
}

export const ExamReviewView: React.FC<ExamReviewViewProps> = React.memo(
  ({
    exam,
    userAnswers,
    language,
    annotations,
    onSaveAnnotation,
    onDeleteAnnotation: _onDeleteAnnotation,
    onBack,
  }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const reviewCopy = useMemo(() => getExamReviewUiCopy(labels), [labels]);
    const questionRefs = useRef<Record<number, HTMLElement | null>>({});

    const searchDictionary = useAction(DICTIONARY.searchDictionary);
    const addToReview = useMutation(VOCAB.addToReview);

    const structure =
      exam.type === 'LISTENING' ? TOPIK_LISTENING_STRUCTURE : TOPIK_READING_STRUCTURE;

    // Calculate stats
    const stats = useMemo(() => {
      let correct = 0;
      let wrong = 0;
      // Safety check: ensure questions array exists
      const questions = exam.questions || [];
      questions.forEach((q, idx) => {
        const userAnswer = userAnswers[idx];
        // Count as correct only when the user answered and matched the correct answer.
        if (userAnswer !== undefined && userAnswer === q.correctAnswer) {
          correct++;
        } else {
          wrong++;
        }
      });
      return { correct, wrong };
    }, [exam.questions, userAnswers]);

    const getInstructionForQuestion = (qIndex: number) => getInstructionForIndex(structure, qIndex);
    const shouldShowInstruction = (qIndex: number) => isSectionStartIndex(structure, qIndex);

    const scrollToQuestion = (index: number) => {
      questionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // --- Annotation State ---
    const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectionText, setSelectionText] = useState('');
    const [selectionContextKey, setSelectionContextKey] = useState('');
    const [selectedColor, setSelectedColor] = useState<AnnotationColor>('yellow');
    const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
    const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
    const [editNoteInput, setEditNoteInput] = useState('');

    // --- Canvas Drawing State ---
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [canvasTool, setCanvasTool] = useState<ToolType>('pen');
    const [canvasColor, setCanvasColor] = useState('#1e293b');
    const [canvasUi, setCanvasUi] = useState<null | {
      Layer: React.ComponentType<any>;
      Toolbar: React.ComponentType<any>;
    }>(null);
    const paperContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!isDrawingMode) return;
      let cancelled = false;
      void import('../../features/annotation/components/CanvasLayer').then(mod => {
        if (cancelled) return;
        setCanvasUi({ Layer: mod.default, Toolbar: mod.CanvasToolbar });
      });
      return () => {
        cancelled = true;
      };
    }, [isDrawingMode]);

    const CanvasLayerComponent = canvasUi?.Layer;
    const CanvasToolbarComponent = canvasUi?.Toolbar;

    // Use persistent canvas annotation hook
    const {
      canvasData,
      loading: canvasLoading,
      saving: canvasSaving,
      handleCanvasChange,
    } = useCanvasAnnotation({
      targetId: exam.id,
      targetType: 'EXAM',
      pageIndex: 0, // Whole exam review uses page 0
      debounceMs: 1500,
      autoSave: true,
    });

    // Canvas undo handler (modifies local then triggers change)
    const handleCanvasUndo = useCallback(() => {
      if (!canvasData || canvasData.lines.length === 0) return;
      const newData = { lines: canvasData.lines.slice(0, -1), version: Date.now() };
      handleCanvasChange(newData);
    }, [canvasData, handleCanvasChange]);

    // Canvas clear handler
    const handleCanvasClear = useCallback(() => {
      handleCanvasChange({ lines: [], version: Date.now() });
    }, [handleCanvasChange]);

    const examContextPrefix = `TOPIK-${exam.id}`;

    // All annotations for this exam
    const currentAnnotations = useMemo(
      () => (annotations || []).filter(a => a.contextKey.startsWith(examContextPrefix)),
      [annotations, examContextPrefix]
    );

    // Sidebar annotations: show those with notes OR the one being edited
    const sidebarAnnotations = useMemo(
      () =>
        currentAnnotations.filter(
          a => (a.note && a.note.trim().length > 0) || a.id === editingAnnotationId
        ),
      [currentAnnotations, editingAnnotationId]
    );

    // Handle text selection for annotation
    const handleTextSelect = (questionIndex: number, e?: React.MouseEvent) => {
      const selection = globalThis.window.getSelection();
      if (!selection || selection.toString().trim() === '') return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const selectedText = selection.toString().trim();
      const contextKey = `${examContextPrefix}-Q${questionIndex}`;

      if ((rect.top === 0 && rect.bottom === 0) || (rect.width === 0 && rect.height === 0)) {
        if (e) {
          setMenuPosition({ top: e.clientY + 10, left: e.clientX });
        } else {
          setMenuPosition({
            top: globalThis.window.innerHeight / 2,
            left: globalThis.window.innerWidth / 2,
          });
        }
      } else {
        setMenuPosition({ top: rect.bottom + 10, left: rect.left });
      }

      setSelectionText(selectedText);
      setSelectionContextKey(contextKey);
      setShowAnnotationMenu(true);

      const existing = findMatchingAnnotation(annotations, contextKey, selectedText);

      if (existing) {
        if (existing.color) setSelectedColor(existing.color);
        setActiveAnnotationId(existing.id);
      } else {
        setActiveAnnotationId(null);
      }
    };

    // Save annotation
    const saveAnnotationQuick = (colorOverride?: string) => {
      if (!selectionText || !selectionContextKey) return null;

      const existing = findMatchingAnnotation(annotations, selectionContextKey, selectionText);

      const annotation: Annotation = {
        id: existing ? existing.id : Date.now().toString(),
        contextKey: selectionContextKey,
        text: selectionText,
        note: existing?.note || '',
        color: (colorOverride || selectedColor) as 'yellow' | 'green' | 'blue' | 'pink',
        timestamp: existing ? existing.timestamp : Date.now(),
      };

      onSaveAnnotation(annotation);
      setShowAnnotationMenu(false);
      globalThis.window.getSelection()?.removeAllRanges();

      return annotation.id;
    };

    // Update note from sidebar edit
    const handleUpdateNote = (id: string) => {
      const ann = currentAnnotations.find(a => a.id === id);
      if (ann) {
        onSaveAnnotation({ ...ann, note: editNoteInput });
      }
      setEditingAnnotationId(null);
      setActiveAnnotationId(null);
    };

    // Delete annotation
    const handleDeleteAnnotation = (id: string) => {
      const ann = currentAnnotations.find(a => a.id === id);
      if (ann) {
        onSaveAnnotation({ ...ann, color: null, note: '' });
      }
    };

    const handleBeginEditAnnotation = (annotation: Annotation) => {
      setActiveAnnotationId(annotation.id);
      setEditingAnnotationId(annotation.id);
      setEditNoteInput(annotation.note || '');
    };

    const handleCancelEditAnnotation = () => {
      setEditingAnnotationId(null);
    };

    // Save selection to Vocab Notebook
    const handleSaveToVocab = useCallback(
      async (text: string) => {
        if (!text) return;

        const loadingToast = toast.loading(labels.savingToVocab || 'Saving to Vocabulary...');

        try {
          const searchResult = await searchDictionary({ query: text });
          const bestMatch = searchResult?.entries?.[0];
          const { meaning, partOfSpeech } = resolveDictionaryMeaning(bestMatch);
          const context = resolveSelectionContext(selectionContextKey, exam.questions);

          // 2. Save using addToReview
          await addToReview({
            word: text,
            meaning,
            partOfSpeech,
            context,
            source: `TOPIK-${exam.round}-${exam.type}`,
          });

          toast.success(labels.savedToVocab || 'Saved to Vocabulary!', { id: loadingToast });
        } catch (error_: unknown) {
          console.error('Failed to save to vocab:', error_);
          toast.error(labels.saveFailed || 'Failed to save', { id: loadingToast });
        }
      },
      [addToReview, searchDictionary, exam, selectionContextKey, labels]
    );

    const tempAnnotation: Annotation | null =
      showAnnotationMenu && selectionText && selectionContextKey
        ? {
            id: 'temp',
            contextKey: selectionContextKey,
            text: selectionText,
            note: '',
            color: selectedColor,
            timestamp: Date.now(),
          }
        : null;

    const handleToggleDrawingMode = () => {
      setIsDrawingMode(prev => !prev);
    };

    const handleAddNote = () => {
      const id = saveAnnotationQuick();
      if (id) {
        setEditingAnnotationId(id);
        setEditNoteInput('');
        setTimeout(() => {
          const el = document.getElementById(`sidebar-card-${id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };

    const handleHighlight = (color: AnnotationColor | null) => {
      saveAnnotationQuick(color || undefined);
    };

    const handleSelectedColor = (val: AnnotationColor | null) => {
      if (val) setSelectedColor(val);
    };

    const handleCloseAnnotationMenu = () => {
      setShowAnnotationMenu(false);
      globalThis.window.getSelection()?.removeAllRanges();
    };

    return (
      <ExamReviewLayout
        labels={labels}
        reviewCopy={reviewCopy}
        exam={exam}
        onBack={onBack}
        isDrawingMode={isDrawingMode}
        onToggleDrawingMode={handleToggleDrawingMode}
        canvasLoading={canvasLoading}
        canvasSaving={canvasSaving}
        userAnswers={userAnswers}
        wrongCount={stats.wrong}
        onJumpToQuestion={scrollToQuestion}
        paperContainerRef={paperContainerRef}
        CanvasLayerComponent={CanvasLayerComponent}
        CanvasToolbarComponent={CanvasToolbarComponent}
        canvasData={canvasData}
        handleCanvasChange={handleCanvasChange}
        canvasTool={canvasTool}
        setCanvasTool={setCanvasTool}
        canvasColor={canvasColor}
        setCanvasColor={setCanvasColor}
        handleCanvasUndo={handleCanvasUndo}
        handleCanvasClear={handleCanvasClear}
        questionRefs={questionRefs}
        shouldShowInstruction={shouldShowInstruction}
        getInstructionForQuestion={getInstructionForQuestion}
        language={language}
        annotations={annotations}
        tempAnnotation={tempAnnotation}
        onTextSelect={handleTextSelect}
        activeAnnotationId={activeAnnotationId}
        sidebarAnnotations={sidebarAnnotations}
        editingAnnotationId={editingAnnotationId}
        editNoteInput={editNoteInput}
        setEditNoteInput={setEditNoteInput}
        onCancelEdit={handleCancelEditAnnotation}
        onSaveEdit={handleUpdateNote}
        onDeleteAnnotation={handleDeleteAnnotation}
        onBeginEditAnnotation={handleBeginEditAnnotation}
        showAnnotationMenu={showAnnotationMenu}
        menuPosition={menuPosition}
        selectionText={selectionText}
        onAddNote={handleAddNote}
        onHighlight={handleHighlight}
        selectedColor={selectedColor}
        setSelectedColor={handleSelectedColor}
        onCloseAnnotationMenu={handleCloseAnnotationMenu}
        onSaveToVocab={handleSaveToVocab}
      />
    );
  }
);
ExamReviewView.displayName = 'ExamReviewView';
