import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Clock,
  Grid3x3,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  CheckCircle2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { TopikExam, Language } from '../../../types';
import { MobileQuestionRenderer } from './MobileQuestionRenderer';
import { sanitizeStrictHtml } from '../../../utils/sanitize';
import { BottomSheet } from '../../common/BottomSheet';
import { MobileImmersiveHeader } from '../MobileImmersiveHeader';
import { normalizePublicAssetUrl } from '../../../utils/imageSrc';
import { formatTopikLabel } from '../../../utils/topik';
import { Chip, KT } from '../ksoft/ksoft';

// --- Constants (Copied from ExamSession.tsx to ensure consistency) ---
const TOPIK_READING_STRUCTURE: {
  range: [number, number];
  instruction: string;
  grouped?: boolean;
}[] = [
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
  {
    range: [19, 20],
    instruction: '※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [21, 22],
    instruction: '※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [23, 24],
    instruction: '※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
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
  {
    range: [42, 43],
    instruction: '※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [44, 45],
    instruction: '※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [46, 47],
    instruction: '※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [48, 50],
    instruction: '※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
];

const TOPIK_LISTENING_STRUCTURE: {
  range: [number, number];
  instruction: string;
  grouped?: boolean;
}[] = [
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
  {
    range: [21, 22],
    instruction: '※ [21～22] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [23, 24],
    instruction: '※ [23～24] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [25, 26],
    instruction: '※ [25～26] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [27, 28],
    instruction: '※ [27～28] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [29, 30],
    instruction: '※ [29～30] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [31, 32],
    instruction: '※ [31～32] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [33, 34],
    instruction: '※ [33～34] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [35, 36],
    instruction: '※ [35～36] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [37, 38],
    instruction: '※ [37～38] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [39, 40],
    instruction: '※ [39～40] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [41, 42],
    instruction: '※ [41～42] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [43, 44],
    instruction: '※ [43～44] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [45, 46],
    instruction: '※ [45～46] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [47, 48],
    instruction: '※ [47～48] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
  {
    range: [49, 50],
    instruction: '※ [49～50] 다음을 듣고 물음에 답하십시오. (각 2점)',
    grouped: true,
  },
];

type ExamSection = {
  range: [number, number];
  instruction: string;
  grouped?: boolean;
};

const resolveExamStructure = (examType: TopikExam['type']): ExamSection[] =>
  examType === 'LISTENING' ? TOPIK_LISTENING_STRUCTURE : TOPIK_READING_STRUCTURE;

const findSectionForQuestion = (structure: ExamSection[], qIndex: number): ExamSection | null => {
  const qNum = qIndex + 1;
  for (const section of structure) {
    if (qNum >= section.range[0] && qNum <= section.range[1]) {
      return section;
    }
  }
  return null;
};

const getSharedPassage = (
  structure: ExamSection[],
  questions: TopikExam['questions'],
  qIndex: number
): string | null => {
  const section = findSectionForQuestion(structure, qIndex);
  if (!section?.grouped) return null;
  const firstQIndex = section.range[0] - 1;
  return questions[firstQIndex]?.passage ?? null;
};

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

type TranslateFn = ReturnType<typeof useTranslation>['t'];

type ListeningAudioPanelProps = {
  audioPlayerOpen: boolean;
  audioError: boolean;
  isPlaying: boolean;
  onToggleAudio: () => void;
  t: TranslateFn;
};

const ListeningAudioPanel: React.FC<ListeningAudioPanelProps> = ({
  audioPlayerOpen,
  audioError,
  isPlaying,
  onToggleAudio,
  t,
}) => (
  <div
    className={clsx(
      'w-[calc(100%-2rem)] max-w-md mb-3 flex items-center gap-3 transition-transform duration-300 pointer-events-auto',
      audioPlayerOpen ? 'translate-y-0' : 'translate-y-[150%]'
    )}
    style={{
      background: KT.ink,
      color: KT.card,
      padding: 12,
      borderRadius: 22,
      boxShadow: KT.shLg,
      border: '1px solid rgba(255,255,255,0.1)',
      fontFamily: KT.font,
    }}
  >
    <button
      type="button"
      onClick={onToggleAudio}
      disabled={audioError}
      className="shrink-0 active:scale-95 transition-transform"
      style={{
        width: 42,
        height: 42,
        borderRadius: 999,
        border: 'none',
        display: 'grid',
        placeItems: 'center',
        background: audioError ? KT.crimson : KT.butter,
        color: audioError ? KT.card : KT.ink,
        opacity: audioError ? 0.55 : 1,
        cursor: audioError ? 'not-allowed' : 'pointer',
      }}
    >
      {audioError ? (
        <X className="w-4 h-4" />
      ) : isPlaying ? (
        <Pause className="w-4 h-4 fill-current ml-0.5" />
      ) : (
        <Play className="w-4 h-4 fill-current ml-0.5" />
      )}
    </button>
    <div className="flex-1 min-w-0">
      <div
        className="text-[10px] font-bold uppercase mb-1"
        style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}
      >
        {audioError
          ? t('dashboard.topik.mobile.session.audioError', { defaultValue: 'Audio Error' })
          : t('dashboard.topik.mobile.session.listeningAudio', {
              defaultValue: 'Listening Audio',
            })}
      </div>
      {audioError ? (
        <div className="text-xs truncate" style={{ color: KT.pink }}>
          {t('dashboard.topik.mobile.session.audioLoadFailed', {
            defaultValue: 'Failed to load audio file',
          })}
        </div>
      ) : (
        <div
          className="h-1 rounded-full overflow-hidden flex gap-0.5"
          style={{ background: 'rgba(255,255,255,0.14)' }}
        >
          {isPlaying && (
            <div
              className="h-full w-full animate-[pulse_1s_ease-in-out_infinite]"
              style={{ background: KT.butter }}
            />
          )}
          {!isPlaying && <div className="h-full w-full" style={{ background: KT.line2 }} />}
        </div>
      )}
    </div>
  </div>
);

type SessionNavigationBarProps = {
  currentQuestionIndex: number;
  totalQuestions: number;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  t: TranslateFn;
};

const SessionNavigationBar: React.FC<SessionNavigationBarProps> = ({
  currentQuestionIndex,
  totalQuestions,
  onPrev,
  onNext,
  onSubmit,
  t,
}) => {
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  return (
    <div
      className="w-full backdrop-blur-md p-3 pb-mobile-safe flex gap-3 pointer-events-auto"
      style={{
        background: `${KT.card}ee`,
        borderTop: `1px solid ${KT.line}`,
        boxShadow: '0 -12px 34px rgba(31,27,23,0.08)',
        fontFamily: KT.font,
      }}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={currentQuestionIndex === 0}
        className="w-14 h-14 flex items-center justify-center transition-colors disabled:opacity-30"
        style={{
          border: `1px solid ${KT.line}`,
          borderRadius: 18,
          background: KT.bg2,
          color: KT.sub,
        }}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col justify-center px-2">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: KT.bg2 }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
              background: KT.crimson,
            }}
          />
        </div>
      </div>

      {isLastQuestion ? (
        <button
          type="button"
          onClick={onSubmit}
          className="w-auto px-6 h-14 font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          style={{
            border: 'none',
            borderRadius: 18,
            background: KT.jade,
            color: KT.card,
            boxShadow: KT.sh,
          }}
        >
          <span>{t('dashboard.topik.mobile.session.finish', { defaultValue: 'Finish' })}</span>
          <CheckCircle2 className="w-5 h-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="w-auto px-6 h-14 font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          style={{
            border: 'none',
            borderRadius: 18,
            background: KT.ink,
            color: KT.card,
            boxShadow: KT.sh,
          }}
        >
          <span>{t('dashboard.topik.mobile.session.next', { defaultValue: 'Next' })}</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

interface MobileExamSessionProps {
  exam: TopikExam;
  language: Language;
  userAnswers: Record<number, number>;
  timeLeft: number;
  timerActive: boolean;
  onAnswerChange: (questionIndex: number, optionIndex: number) => void;
  onSubmit: () => void;
  onExit: () => void; // Usually resetExam
}

export const MobileExamSession: React.FC<MobileExamSessionProps> = ({
  exam,
  language: _language,
  userAnswers,
  timeLeft,
  timerActive: _timerActive,
  onAnswerChange,
  onSubmit,
  onExit,
}) => {
  const { t } = useTranslation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gridOpen, setGridOpen] = useState(false);
  const [audioPlayerOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const normalizedExamAudioUrl = normalizePublicAssetUrl(exam.audioUrl) || exam.audioUrl;
  const sanitize = (html?: string) => sanitizeStrictHtml(String(html ?? ''));

  const structure = resolveExamStructure(exam.type);
  const examTypeLabel =
    exam.type === 'LISTENING'
      ? t('dashboard.topik.listening', { defaultValue: 'Listening' })
      : t('dashboard.topik.reading', { defaultValue: 'Reading' });

  const currentQuestion = exam.questions[currentQuestionIndex];
  const section = findSectionForQuestion(structure, currentQuestionIndex);
  const sharedPassage = getSharedPassage(structure, exam.questions, currentQuestionIndex);
  const isPassageView = !!sharedPassage;

  // Audio Logic
  useEffect(() => {
    if (exam.type === 'LISTENING' && normalizedExamAudioUrl && !audioRef.current) {
      audioRef.current = new Audio(normalizedExamAudioUrl);
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
      audioRef.current.addEventListener('error', () => {
        setAudioError(true);
        setIsPlaying(false);
      });
      audioRef.current.addEventListener('canplay', () => {
        setAudioError(false);
      });
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [exam.type, normalizedExamAudioUrl]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setAudioError(true);
          setIsPlaying(false);
        });
    }
  };

  // Navigation
  const handleNext = () =>
    setCurrentQuestionIndex(prev => Math.min(prev + 1, exam.questions.length - 1));

  const handlePrev = () => setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));

  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden relative"
      style={{
        background: `radial-gradient(ellipse at 20% 0%, ${KT.bg2} 0%, ${KT.bg} 62%)`,
        color: KT.ink,
        fontFamily: KT.font,
        width: '100%',
        maxWidth: '100vw',
      }}
    >
      <BottomSheet
        isOpen={gridOpen}
        onClose={() => setGridOpen(false)}
        height="full"
        title={t('dashboard.topik.mobile.session.questionMap', {
          defaultValue: 'Question Map',
        })}
      >
        <div className="space-y-4">
          <div
            className="rounded-2xl px-4 py-3"
            style={{ border: `1px solid ${KT.line}`, background: KT.bg2 }}
          >
            <p className="text-xs font-semibold" style={{ color: KT.sub }}>
              {t('dashboard.topik.mobile.session.answeredCount', {
                current: answeredCount,
                total: exam.questions.length,
                defaultValue: 'Answered {{current}}/{{total}}',
              })}
            </p>
          </div>

          <div className="grid grid-cols-5 gap-3 pb-2">
            {exam.questions.map((question, idx) => {
              const answered = userAnswers[idx] !== undefined;
              const active = idx === currentQuestionIndex;
              return (
                <button
                  type="button"
                  key={`${question.id}-${idx}`}
                  onClick={() => {
                    setCurrentQuestionIndex(idx);
                    setGridOpen(false);
                  }}
                  className="h-11 rounded-xl text-sm font-black border transition-colors"
                  style={{
                    background: active ? KT.ink : answered ? KT.mint : KT.card,
                    borderColor: active ? KT.ink : answered ? KT.mintDeep : KT.line,
                    color: active ? KT.card : answered ? KT.jade : KT.sub,
                    fontFamily: KT.font,
                  }}
                >
                  {question.number || idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      <MobileImmersiveHeader
        title={t('dashboard.topik.realExam', { defaultValue: 'TOPIK Exam' })}
        subtitle={t('dashboard.topik.mobile.session.questionProgress', {
          current: currentQuestionIndex + 1,
          total: exam.questions.length,
          defaultValue: 'Question {{current}} of {{total}}',
        })}
        eyebrow={`${formatTopikLabel(exam.level)} ${examTypeLabel}`}
        onBack={onExit}
        backLabel={t('common.close', { defaultValue: 'Close' })}
        backIcon={<X className="h-4 w-4 text-foreground" />}
        status={
          <div
            className="flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm font-black shadow-sm"
            style={{
              borderColor: timeLeft < 300 ? KT.pinkDeep : KT.line,
              background: timeLeft < 300 ? KT.pink : KT.card,
              color: timeLeft < 300 ? KT.crimson : KT.ink,
            }}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDuration(timeLeft)}</span>
          </div>
        }
        actions={
          <button
            type="button"
            onClick={() => setGridOpen(true)}
            className="rounded-2xl border px-3 py-2 text-xs font-bold shadow-sm"
            style={{
              borderColor: KT.line,
              background: KT.card,
              color: KT.ink,
              fontFamily: KT.font,
            }}
          >
            <span className="text-sm">
              {currentQuestionIndex + 1}/{exam.questions.length}
            </span>
            <Grid3x3 className="ml-2 h-4 w-4" />
          </button>
        }
      />

      {/* Main Content */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Split View: Top Passage Pane */}
        {isPassageView && (
          <div
            className="h-[40%] flex flex-col shadow-sm relative z-20"
            style={{ background: KT.card, borderBottom: `1px solid ${KT.line}` }}
          >
            <div
              className="px-4 py-2 flex justify-between items-center backdrop-blur-sm sticky top-0 z-20"
              style={{ borderBottom: `1px solid ${KT.line}`, background: `${KT.card}ee` }}
            >
              <Chip tone="butter">
                {t('dashboard.topik.mobile.session.passageFor', {
                  start: section?.range[0] ?? 1,
                  end: section?.range[1] ?? 1,
                  defaultValue: 'Passage for Q{{start}}-{{end}}',
                })}
              </Chip>
            </div>
            <div
              className="p-5 font-serif leading-8 overflow-y-auto overscroll-contain pb-8 text-base whitespace-pre-line break-keep text-justify"
              style={{ color: KT.ink2 }}
              dangerouslySetInnerHTML={{ __html: sanitize(sharedPassage || '') }}
            />
          </div>
        )}

        {/* Question Pane */}
        <div
          className={clsx('flex-1 overflow-y-auto w-full', isPassageView ? 'h-[60%]' : 'h-full')}
          style={{ background: KT.bg }}
        >
          <div className="p-4 md:p-6 pb-32 max-w-2xl mx-auto w-full min-h-full">
            {currentQuestion && (
              <MobileQuestionRenderer
                question={currentQuestion}
                userAnswer={userAnswers[currentQuestionIndex]}
                onAnswerChange={optIndex => onAnswerChange(currentQuestionIndex, optIndex)}
                showPassage={!isPassageView}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer Stack */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none">
        {/* Audio Player (Floating above Nav) */}
        {exam.type === 'LISTENING' && exam.audioUrl && (
          <ListeningAudioPanel
            audioPlayerOpen={audioPlayerOpen}
            audioError={audioError}
            isPlaying={isPlaying}
            onToggleAudio={toggleAudio}
            t={t}
          />
        )}

        {/* Navigation Bar */}
        <SessionNavigationBar
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={exam.questions.length}
          onPrev={handlePrev}
          onNext={handleNext}
          onSubmit={onSubmit}
          t={t}
        />
      </div>
    </div>
  );
};
