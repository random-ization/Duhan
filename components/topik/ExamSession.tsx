import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { TopikExam, TopikQuestion, Language, Annotation } from '../../types';
import { Clock, MessageSquare, Trash2, Check, X, ArrowLeft } from 'lucide-react';
import { getLabels } from '../../utils/i18n';
import { QuestionRenderer } from './QuestionRenderer';
import { AudioPlayer } from './AudioPlayer';

interface ExamSessionProps {
  exam: TopikExam;
  language: Language;
  userAnswers: Record<number, number>;
  timeLeft: number;
  timerActive: boolean;
  annotations: Annotation[];
  onAnswerChange: (questionIndex: number, optionIndex: number) => void;
  onSubmit: () => void;
  onSaveAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (contextKey: string) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
}

// PDF 仿真样式常量
const PAPER_MAX_WIDTH = "max-w-[900px]";
const FONT_SERIF = "font-serif";

// TOPIK Reading 结构定义
const TOPIK_READING_STRUCTURE = [
  { range: [1, 2], instruction: "※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)" },
  { range: [3, 4], instruction: "※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)" },
  { range: [5, 8], instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)" },
  { range: [9, 12], instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)" },
  { range: [13, 15], instruction: "※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)" },
  { range: [16, 18], instruction: "※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)" },
  { range: [19, 24], instruction: "※ [19～24] 다음을 읽고 물음에 답하십시오. (각 2점)" },
  { range: [25, 27], instruction: "※ [25～27] 다음은 신문 기사의 제목입니다. 가장 잘 설명한 것을 고르십시오. (각 2점)" },
  { range: [28, 31], instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)" },
  { range: [32, 34], instruction: "※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)" },
  { range: [35, 38], instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)" },
  { range: [39, 41], instruction: "※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)" },
  { range: [42, 50], instruction: "※ [42～50] 다음을 읽고 물음에 답하십시오. (각 2점)" },
];

const TOPIK_LISTENING_STRUCTURE = [
  { range: [1, 3], instruction: "※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)" },
  { range: [4, 8], instruction: "※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)" },
  { range: [9, 12], instruction: "※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)" },
  { range: [13, 16], instruction: "※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)" },
  { range: [17, 20], instruction: "※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)" },
  { range: [21, 50], instruction: "※ [21～50] 다음을 듣고 물음에 답하십시오. (각 2점)" },
];

export const ExamSession: React.FC<ExamSessionProps> = React.memo(
  ({
    exam,
    language,
    userAnswers,
    timeLeft,
    timerActive,
    annotations,
    onAnswerChange,
    onSubmit,
    onSaveAnnotation,
    onDeleteAnnotation,
    onPauseTimer,
    onResumeTimer,
  }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

    // Annotation state
    const [selectionRange, setSelectionRange] = useState<{
      start: number;
      end: number;
      text: string;
      contextKey: string;
    } | null>(null);
    const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const [noteInput, setNoteInput] = useState('');

    const examContextPrefix = useMemo(() => `TOPIK-${exam.id}`, [exam.id]);

    // 选择结构定义
    const structure = exam.type === 'LISTENING' ? TOPIK_LISTENING_STRUCTURE : TOPIK_READING_STRUCTURE;

    // Format time
    const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Scroll to question
    const scrollToQuestion = (index: number) => {
      questionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // 获取当前题目所属的 instruction
    const getInstructionForQuestion = (qIndex: number) => {
      const qNum = qIndex + 1;
      for (const section of structure) {
        if (qNum >= section.range[0] && qNum <= section.range[1]) {
          return section.instruction;
        }
      }
      return null;
    };

    // 判断是否需要显示 instruction (仅在该 section 的第一道题时显示)
    const shouldShowInstruction = (qIndex: number) => {
      const qNum = qIndex + 1;
      for (const section of structure) {
        if (qNum === section.range[0]) {
          return true;
        }
      }
      return false;
    };

    // Progress calculation
    const answeredCount = Object.keys(userAnswers).length;

    return (
      <div className="min-h-screen bg-slate-200 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="sticky top-0 z-30 bg-slate-800 text-white shadow-lg shrink-0">
          <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg tracking-wide">{exam.title}</span>
              <span className="text-xs bg-slate-700 px-2 py-1 rounded">
                제 {exam.round || '?'} 회
              </span>
            </div>

            <div className={`text-xl font-mono font-bold flex items-center ${timeLeft < 300 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
              <Clock className="w-5 h-5 mr-2" />
              {formatTime(timeLeft)}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">
                {answeredCount} / {exam.questions.length}
              </span>
              <button
                onClick={onSubmit}
                className="px-5 py-2 bg-white text-slate-900 rounded font-bold text-sm hover:bg-indigo-50 transition-colors"
              >
                제출 (Submit)
              </button>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
          {/* PDF 试卷纸张 */}
          <div className={`bg-white w-full ${PAPER_MAX_WIDTH} shadow-2xl min-h-screen pb-16 relative border border-slate-300`}>

            {/* 试卷头部 */}
            <div className="border-b-2 border-black mx-8 mt-8 pb-4 mb-8">
              <div className="flex justify-between items-end">
                <h1 className={`text-3xl font-extrabold tracking-widest ${FONT_SERIF} text-slate-900`}>
                  TOPIK Ⅱ
                </h1>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-700">
                    {exam.type === 'READING' ? '읽기 (Reading)' : '듣기 (Listening)'}
                  </div>
                  <div className="text-sm text-slate-500 font-mono">
                    제 {exam.round || '?'} 회 한국어능력시험
                  </div>
                </div>
              </div>
            </div>

            {/* 题目区域 */}
            <div className="px-8 md:px-12 select-none">
              {exam.questions.map((question, idx) => (
                <div key={idx} ref={el => (questionRefs.current[idx] = el)}>

                  {/* Instruction Bar (每个 section 的第一题显示) */}
                  {shouldShowInstruction(idx) && (
                    <div className="bg-slate-50 border-l-4 border-slate-800 px-4 py-2 mb-6 mt-8 first:mt-0">
                      <span className={`text-[16px] font-bold text-slate-800 ${FONT_SERIF}`}>
                        {getInstructionForQuestion(idx)}
                      </span>
                    </div>
                  )}

                  {/* 题目 */}
                  <div className="mb-10">
                    <QuestionRenderer
                      question={question}
                      questionIndex={idx}
                      userAnswer={userAnswers[idx]}
                      language={language}
                      showCorrect={false}
                      onAnswerChange={optionIndex => onAnswerChange(idx, optionIndex)}
                      annotations={annotations}
                      contextPrefix={examContextPrefix}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 试卷页脚 */}
            <div className="border-t border-slate-200 mx-8 pt-6 mt-12 text-center text-slate-400 font-mono text-xs">
              <div>한국어능력시험 (TOPIK)</div>
              <div className="mt-1">- End of Paper -</div>
            </div>
          </div>
        </div>

        {/* 题目导航浮动栏 */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-xl border border-slate-200 px-4 py-2 flex items-center gap-1 overflow-x-auto max-w-[90vw]">
            <span className="text-xs text-slate-500 font-bold mr-2 shrink-0">题目</span>
            {exam.questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollToQuestion(idx)}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0
                  ${userAnswers[idx] !== undefined
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }
                `}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Player (if listening exam) */}
        {exam.type === 'LISTENING' && exam.audioUrl && (
          <AudioPlayer audioUrl={exam.audioUrl} language={language} />
        )}
      </div>
    );
  }
);
