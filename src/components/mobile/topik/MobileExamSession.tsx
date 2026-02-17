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
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../../ui';
import { Button } from '../../ui';

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
  const sanitize = (html?: string) => sanitizeStrictHtml(String(html ?? ''));

  const structure = exam.type === 'LISTENING' ? TOPIK_LISTENING_STRUCTURE : TOPIK_READING_STRUCTURE;
  const examTypeLabel =
    exam.type === 'LISTENING'
      ? t('dashboard.topik.listening', { defaultValue: 'Listening' })
      : t('dashboard.topik.reading', { defaultValue: 'Reading' });

  // --- Helper Functions ---
  const getSectionForQuestion = (qIndex: number) => {
    const qNum = qIndex + 1;
    for (const section of structure) {
      if (qNum >= section.range[0] && qNum <= section.range[1]) {
        return section;
      }
    }
    return null;
  };

  const getPassageContent = (qIndex: number) => {
    // If grouped, usually the FIRST question in the group has the passage in the data?
    // In TopikQuestion model, `passage` field might be populated on the first question of the group.
    // Or it might be populated on all?
    // Let's find the first question of the group.
    const section = getSectionForQuestion(qIndex);
    if (!section || !section.grouped) return null;

    // Find the question object corresponding to the start of the range
    // questions array is 0-indexed, range is 1-indexed.
    const firstQIndex = section.range[0] - 1;
    const firstQuestion = exam.questions[firstQIndex];
    return firstQuestion?.passage || null;
  };

  const currentQuestion = exam.questions[currentQuestionIndex];
  const section = getSectionForQuestion(currentQuestionIndex);
  const sharedPassage = getPassageContent(currentQuestionIndex);
  const isPassageView = !!sharedPassage;

  // Audio Logic
  useEffect(() => {
    if (exam.type === 'LISTENING' && exam.audioUrl && !audioRef.current) {
      audioRef.current = new Audio(exam.audioUrl);
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
  }, [exam.type, exam.audioUrl]);

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

  // Format Timer
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Navigation
  const handleNext = () => {
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="flex flex-col h-[100dvh] bg-muted overflow-hidden relative">
      <Dialog open={gridOpen} onOpenChange={setGridOpen}>
        <DialogPortal>
          <DialogOverlay
            unstyled
            forceMount
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[1px] transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
          />
          <DialogContent
            unstyled
            forceMount
            closeOnEscape={false}
            lockBodyScroll={false}
            className="fixed inset-0 z-[71] p-4 flex items-center justify-center pointer-events-none data-[state=closed]:pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-foreground">
                    {t('dashboard.topik.mobile.session.questionMap', {
                      defaultValue: 'Question Map',
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {t('dashboard.topik.mobile.session.answeredCount', {
                      current: answeredCount,
                      total: exam.questions.length,
                      defaultValue: 'Answered {{current}}/{{total}}',
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="auto"
                  type="button"
                  onClick={() => setGridOpen(false)}
                  className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center"
                  aria-label={t('common.close', { defaultValue: 'Close' })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 grid grid-cols-5 gap-2">
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
                        'h-10 rounded-lg text-sm font-black border-2 transition-colors',
                        active
                          ? 'bg-indigo-600 dark:bg-indigo-400/75 text-white border-indigo-600 dark:border-indigo-300/70'
                          : answered
                            ? 'bg-emerald-50 dark:bg-emerald-500/12 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-300/25'
                            : 'bg-card text-muted-foreground border-border'
                      )}
                    >
                      {question.number || idx + 1}
                    </Button>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="auto"
            onClick={onExit}
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </Button>
          <div>
            <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
              TOPIK II {examTypeLabel}
            </div>
            <div
              className={clsx(
                'flex items-center gap-1.5 font-black text-sm',
                timeLeft < 300 ? 'text-red-500 dark:text-red-300' : 'text-muted-foreground'
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="auto"
          onClick={() => setGridOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-400/14 text-indigo-600 dark:text-indigo-200 text-xs font-bold flex items-center gap-2"
        >
          <span className="text-sm">
            {currentQuestionIndex + 1}/{exam.questions.length}
          </span>
          <Grid3x3 className="w-4 h-4" />
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Split View: Top Passage Pane */}
        {isPassageView && (
          <div className="h-[40%] bg-amber-50 dark:bg-amber-400/10 border-b-2 border-amber-100 dark:border-amber-300/20 flex flex-col shadow-sm relative z-20">
            <div className="px-4 py-2 border-b border-amber-100/50 dark:border-amber-300/20 flex justify-between items-center bg-amber-50/90 dark:bg-amber-400/10 backdrop-blur-sm sticky top-0 z-20">
              <span className="bg-amber-100 dark:bg-amber-400/16 text-amber-800 dark:text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-300/25">
                {t('dashboard.topik.mobile.session.passageFor', {
                  start: section?.range[0] ?? 1,
                  end: section?.range[1] ?? 1,
                  defaultValue: 'Passage for Q{{start}}-{{end}}',
                })}
              </span>
            </div>
            <div
              className="p-5 font-serif text-muted-foreground leading-8 overflow-y-auto overscroll-contain pb-8 text-base whitespace-pre-line break-keep text-justify"
              dangerouslySetInnerHTML={{ __html: sanitize(sharedPassage || '') }}
            />
          </div>
        )}

        {/* Question Pane */}
        <div
          className={clsx(
            'flex-1 bg-muted overflow-y-auto w-full',
            isPassageView ? 'h-[60%]' : 'h-full'
          )}
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
          <div
            className={clsx(
              'w-[calc(100%-2rem)] max-w-md bg-primary dark:bg-primary/80 text-primary-foreground p-3 rounded-2xl shadow-xl mb-3 flex items-center gap-3 transition-transform duration-300 pointer-events-auto',
              audioPlayerOpen ? 'translate-y-0' : 'translate-y-[150%]',
              audioError
                ? 'shadow-red-900/20 dark:shadow-red-950/25'
                : 'shadow-primary/25 dark:shadow-primary/15'
            )}
          >
            <Button
              variant="ghost"
              size="auto"
              onClick={toggleAudio}
              disabled={audioError}
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 active:scale-95 transition-transform',
                audioError
                  ? 'bg-red-500 dark:bg-red-400/75 opacity-50 cursor-not-allowed'
                  : 'bg-indigo-500 dark:bg-indigo-400/75'
              )}
            >
              {audioError ? (
                <X className="w-4 h-4 text-white" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-white ml-0.5" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </Button>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1">
                {audioError
                  ? t('dashboard.topik.mobile.session.audioError', { defaultValue: 'Audio Error' })
                  : t('dashboard.topik.mobile.session.listeningAudio', {
                      defaultValue: 'Listening Audio',
                    })}
              </div>
              {audioError ? (
                <div className="text-xs text-red-300 dark:text-red-200 truncate">
                  {t('dashboard.topik.mobile.session.audioLoadFailed', {
                    defaultValue: 'Failed to load audio file',
                  })}
                </div>
              ) : (
                <div className="h-1 bg-muted rounded-full overflow-hidden flex gap-0.5">
                  {isPlaying && (
                    <div className="h-full bg-indigo-400 dark:bg-indigo-300/85 w-full animate-[pulse_1s_ease-in-out_infinite]" />
                  )}
                  {!isPlaying && <div className="h-full bg-muted w-full" />}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Bar */}
        <div className="w-full bg-card/90 backdrop-blur-md border-t border-border p-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pointer-events-auto">
          <Button
            variant="ghost"
            size="auto"
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
            className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground active:bg-muted transition-colors disabled:opacity-30 disabled:active:bg-muted"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          {/* Quick Nav Indicator / Progress Context */}
          <div className="flex-1 flex flex-col justify-center px-2">
            <div className="bg-muted h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 dark:bg-indigo-300/75 h-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / exam.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {currentQuestionIndex === exam.questions.length - 1 ? (
            <Button
              variant="ghost"
              size="auto"
              onClick={onSubmit}
              className="w-auto px-6 h-14 rounded-2xl bg-green-600 dark:bg-green-500/75 text-white font-bold shadow-lg shadow-green-200/80 dark:shadow-green-950/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <span>{t('dashboard.topik.mobile.session.finish', { defaultValue: 'Finish' })}</span>
              <CheckCircle2 className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="auto"
              onClick={handleNext}
              className="w-auto px-6 h-14 rounded-2xl bg-indigo-600 dark:bg-indigo-400/75 text-white font-bold shadow-lg shadow-indigo-200/80 dark:shadow-indigo-950/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <span>{t('dashboard.topik.mobile.session.next', { defaultValue: 'Next' })}</span>
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
