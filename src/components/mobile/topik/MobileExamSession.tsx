import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { clsx } from 'clsx';
import { TopikExam, Language } from '../../../types';
import { MobileQuestionRenderer } from './MobileQuestionRenderer';
import { sanitizeStrictHtml } from '../../../utils/sanitize';
import { BottomSheet } from '../../common/BottomSheet';
import { Button } from '../../ui';
import { normalizePublicAssetUrl } from '../../../utils/imageSrc';

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
      'w-[calc(100%-2rem)] max-w-md p-4 rounded-[20px] shadow-[0_16px_32px_-12px_rgba(0,0,0,0.3),_inset_0_1px_1px_rgba(255,255,255,0.1)] mb-4 flex items-center gap-4 transition-transform duration-300 pointer-events-auto',
      audioPlayerOpen ? 'translate-y-0' : 'translate-y-[150%]',
      audioError 
        ? 'bg-rose-950 border border-rose-900/50' 
        : 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-slate-700/50'
    )}
  >
    <button
      onClick={onToggleAudio}
      disabled={audioError}
      className={clsx(
        'w-12 h-12 rounded-[14px] flex items-center justify-center text-white shrink-0 active:scale-[0.96] transition-transform touch-manipulation',
        audioError
          ? 'bg-rose-900 opacity-50 cursor-not-allowed shadow-inner'
          : 'bg-[#334155] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),_0_1px_0_rgba(255,255,255,0.05)] border border-slate-600/50'
      )}
    >
      {audioError ? (
        <X className="w-5 h-5 text-white" />
      ) : isPlaying ? (
        <Pause className="w-5 h-5 fill-white" />
      ) : (
        <Play className="w-5 h-5 fill-white ml-1" />
      )}
    </button>
    <div className="flex-1 min-w-0 flex flex-col justify-center">
      <div className={clsx(
        "text-[10px] font-black uppercase tracking-widest mb-1.5",
        audioError ? "text-rose-300" : "text-slate-400"
      )}>
        {audioError
          ? t('dashboard.topik.mobile.session.audioError', { defaultValue: 'AUDIO ERROR' })
          : t('dashboard.topik.mobile.session.listeningAudio', {
              defaultValue: 'LISTENING AUDIO',
            })}
      </div>
      {audioError ? (
        <div className="text-[13px] font-bold text-rose-200 truncate">
          {t('dashboard.topik.mobile.session.audioLoadFailed', {
            defaultValue: 'Failed to load audio file',
          })}
        </div>
      ) : (
        <div className="h-1.5 bg-[#0F172A] rounded-full overflow-hidden flex shadow-inner">
          {isPlaying ? (
             <div className="h-full bg-[#34D399] w-full animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          ) : (
             <div className="h-full bg-slate-700/50 w-full" />
          )}
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
    <div className="w-full p-3 pt-4 flex gap-3 pointer-events-auto" style={{ background: 'rgba(252,252,250,0.95)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 -4px 16px rgba(0,0,0,0.04)', paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
      <Button
        variant="ghost"
        size="auto"
        onClick={onPrev}
        disabled={currentQuestionIndex === 0}
        className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm active:bg-slate-50 transition-colors disabled:opacity-30"
      >
        <ChevronLeft className="w-6 h-6" />
      </Button>

      <div className="flex-1 flex flex-col justify-center px-2">
        <div className="bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-slate-800 h-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {isLastQuestion ? (
        <Button
          variant="ghost"
          size="auto"
          onClick={onSubmit}
          className="w-auto px-6 h-14 rounded-2xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span>{t('dashboard.topik.mobile.session.finish', { defaultValue: 'Finish' })}</span>
          <CheckCircle2 className="w-5 h-5" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="auto"
          onClick={onNext}
          className="w-auto px-6 h-14 rounded-2xl bg-slate-800 text-white font-bold shadow-lg shadow-slate-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span>{t('dashboard.topik.mobile.session.next', { defaultValue: 'Next' })}</span>
          <ChevronRight className="w-5 h-5" />
        </Button>
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
    <div className="flex flex-col h-[100dvh] bg-[#E6E7E9] overflow-hidden relative">
      <BottomSheet
        isOpen={gridOpen}
        onClose={() => setGridOpen(false)}
        height="full"
        title={t('dashboard.topik.mobile.session.questionMap', {
          defaultValue: 'Question Map',
        })}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-muted/50 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">
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
                <Button
                  variant="ghost"
                  size="auto"
                  type="button"
                  key={`${question.id}-${idx}`}
                  onClick={() => {
                    setCurrentQuestionIndex(idx);
                    setGridOpen(false);
                  }}
                  className={clsx(
                    'h-11 rounded-xl text-sm font-black border transition-colors',
                    active
                      ? 'bg-slate-800 text-white border-slate-800'
                      : answered
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-slate-500 border-slate-200'
                  )}
                >
                  {question.number || idx + 1}
                </Button>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Premium Tactile V3 Glass Header */}
      <header className="shrink-0 px-5 pt-12 pb-3 flex items-center justify-between z-50" style={{ background: 'rgba(230,231,233,0.95)', backdropFilter: 'blur(24px) saturate(150%)', WebkitBackdropFilter: 'blur(24px) saturate(150%)', borderBottom: '1px solid rgba(255,255,255,0.8)' }}>
        <button
          onClick={onExit}
          className="w-9 h-9 rounded-[10px] bg-white border border-slate-200 text-slate-500 shadow-sm flex items-center justify-center active:scale-95 transition-transform"
        >
          <LogOut className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase">
              {`TOPIK II ${examTypeLabel}`}
            </span>
          </div>
        </div>
        <button
          onClick={() => setGridOpen(true)}
          className={clsx(
            'px-3 py-1.5 rounded-lg shadow-sm flex items-center space-x-1.5',
            timeLeft < 300
              ? 'bg-red-50 border border-red-200/60 text-red-700'
              : 'bg-amber-50 border border-amber-200/60 text-amber-700'
          )}
        >
          <Clock className="w-3 h-3" />
          <span className="text-[12px] font-bold font-mono tracking-widest">{formatDuration(timeLeft)}</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Split View: Top Passage Pane */}
        {isPassageView && (
          <div className="h-[40%] bg-[#FCFCFA] flex flex-col relative z-20 rounded-b-[24px]" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
            <div className="px-5 pt-4 pb-2 flex justify-between items-center bg-[#FCFCFA]/90 backdrop-blur-sm sticky top-0 z-20 shrink-0">
              <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-200 tracking-widest uppercase">
                {t('dashboard.topik.mobile.session.passageFor', {
                  start: section?.range[0] ?? 1,
                  end: section?.range[1] ?? 1,
                  defaultValue: 'Passage for Q{{start}}-{{end}}',
                })}
              </span>
            </div>
            
            {/* Scrollable Passage Body */}
            <div
              className="p-5 overflow-y-auto overscroll-contain pb-8 whitespace-pre-line break-keep text-left flex-1 hide-scrollbar"
              style={{ fontFamily: '"KoPub Batang", "Apple Myungjo", "Batang", serif', lineHeight: '2', color: '#334155' }}
              dangerouslySetInnerHTML={{ __html: sanitize(sharedPassage || '') }}
            />
            
            {/* Decorative Grabber Pill */}
            <div className="h-4 w-full flex justify-center items-end pb-1.5 shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full"></div>
            </div>
          </div>
        )}

        {/* Question Pane */}
        <div
          className={clsx(
            'flex-1 bg-[#E6E7E9] overflow-y-auto w-full',
            isPassageView ? 'h-[60%]' : 'h-full'
          )}
        >
          <div className="p-4 pb-32 max-w-[440px] mx-auto w-full min-h-full">
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
