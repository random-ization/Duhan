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
const TOPIK_READING_STRUCTURE: { range: [number, number]; instruction: string; grouped?: boolean }[] = [
  { range: [1, 2], instruction: "※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)" },
  { range: [3, 4], instruction: "※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)" },
  { range: [5, 8], instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)" },
  { range: [9, 12], instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)" },
  { range: [13, 15], instruction: "※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)" },
  { range: [16, 18], instruction: "※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)" },
  { range: [19, 20], instruction: "※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [21, 22], instruction: "※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [23, 24], instruction: "※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [25, 27], instruction: "※ [25～27] 다음은 신문 기사의 제목입니다. 가장 잘 설명한 것을 고르십시오. (각 2점)" },
  { range: [28, 31], instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)" },
  { range: [32, 34], instruction: "※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)" },
  { range: [35, 38], instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)" },
  { range: [39, 41], instruction: "※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)" },
  { range: [42, 43], instruction: "※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [44, 45], instruction: "※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [46, 47], instruction: "※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [48, 50], instruction: "※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
];

const TOPIK_LISTENING_STRUCTURE: { range: [number, number]; instruction: string; grouped?: boolean }[] = [
  { range: [1, 3], instruction: "※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)" },
  { range: [4, 8], instruction: "※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)" },
  { range: [9, 12], instruction: "※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)" },
  { range: [13, 16], instruction: "※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)" },
  { range: [17, 20], instruction: "※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)" },
  { range: [21, 22], instruction: "※ [21～22] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [23, 24], instruction: "※ [23～24] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [25, 26], instruction: "※ [25～26] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [27, 28], instruction: "※ [27～28] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [29, 30], instruction: "※ [29～30] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [31, 32], instruction: "※ [31～32] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [33, 34], instruction: "※ [33～34] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [35, 36], instruction: "※ [35～36] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [37, 38], instruction: "※ [37～38] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [39, 40], instruction: "※ [39～40] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [41, 42], instruction: "※ [41～42] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [43, 44], instruction: "※ [43～44] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [45, 46], instruction: "※ [45～46] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [47, 48], instruction: "※ [47～48] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
  { range: [49, 50], instruction: "※ [49～50] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
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

    // 获取当前题目所属的 section
    const getSectionForQuestion = (qIndex: number) => {
      const qNum = qIndex + 1;
      for (const section of structure) {
        if (qNum >= section.range[0] && qNum <= section.range[1]) {
          return section;
        }
      }
      return null;
    };

    // 获取当前题目所属的 instruction
    const getInstructionForQuestion = (qIndex: number) => {
      const section = getSectionForQuestion(qIndex);
      return section?.instruction || null;
    };

    // 判断是否需要显示 instruction (仅在该 section 的第一道题时显示)
    const shouldShowInstruction = (qIndex: number) => {
      const qNum = qIndex + 1;
      const section = getSectionForQuestion(qIndex);
      return section ? qNum === section.range[0] : false;
    };

    // 判断是否是分组题
    const isGroupedQuestion = (qIndex: number) => {
      const section = getSectionForQuestion(qIndex);
      return section?.grouped || false;
    };

    // 判断是否是分组中的第一题（需要显示正文）
    const isFirstInGroup = (qIndex: number) => {
      const qNum = qIndex + 1;
      const section = getSectionForQuestion(qIndex);
      return section?.grouped && qNum === section.range[0];
    };

    // Progress calculation
    const answeredCount = Object.keys(userAnswers).length;

    return (
      <div className="min-h-screen bg-slate-200 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="sticky top-0 z-30 bg-slate-800 text-white shadow-lg shrink-0">
          <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-center">
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg tracking-wide">{exam.title}</span>
              <span className="text-xs bg-slate-700 px-2 py-1 rounded">
                제 {exam.round || '?'} 회
              </span>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
          {/* PDF 试卷纸张 */}
          <div className={`bg-white w-full ${PAPER_MAX_WIDTH} shadow-2xl min-h-screen pb-16 relative border border-slate-300`}>

            {/* 试卷头部 (Header) */}
            <div className="p-8 md:p-12 pb-4 font-serif">

              {/* Title Box - Black rounded rectangle */}
              <div className="bg-black text-white py-6 px-8 rounded-2xl mb-16 shadow-lg">
                <div className="flex items-baseline justify-center gap-4 mb-2">
                  <span className="text-xl md:text-2xl font-bold">제{exam.round}회</span>
                  <span className="text-3xl md:text-5xl font-bold tracking-wider">한 국 어 능 력 시 험</span>
                </div>
                <div className="text-center text-sm md:text-lg italic opacity-80">
                  The {exam.round}th Test of Proficiency in Korean
                </div>
              </div>

              {/* TOPIK II (B) Section - with double lines */}
              <div className="flex justify-center mb-16">
                <div className="text-center">
                  <div className="border-t-2 border-b-2 border-black py-4 px-16">
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-3xl md:text-5xl font-bold tracking-widest">TOPIK</span>
                      <span className="text-3xl md:text-5xl font-light">Ⅱ</span>
                      <span className="border-2 border-black rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-xl md:text-2xl font-bold">
                        {exam.paperType || 'B'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Period Box */}
              <div className="flex justify-center mb-16">
                <div className="border-2 border-black w-80 md:w-96">
                  <div className="flex">
                    <div className="w-1/3 bg-gray-100 py-4 text-center font-bold text-2xl md:text-3xl border-r-2 border-black">
                      {exam.type === 'READING' ? '2교시' : '1교시'}
                    </div>
                    <div className="w-2/3 bg-gray-100 py-4 text-center font-bold text-2xl md:text-3xl">
                      {exam.type === 'READING' ? '읽기' : '듣기'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-8 font-sans">
                [Scroll down to start]
              </div>
            </div>

            {/* Page Header */}
            <div className="bg-white border-b border-black mx-8 md:mx-12 mb-8 pb-1">
              <div className="flex justify-between items-end">
                <div className="font-bold text-sm text-gray-500">
                  제{exam.round}회 한국어능력시험 II {exam.paperType || 'B'}형 {exam.type === 'READING' ? '2교시 (읽기)' : '1교시 (듣기)'}
                </div>
                <div className="font-bold bg-gray-200 px-4 py-1 rounded-full text-sm">
                  TOPIK Ⅱ {exam.type === 'READING' ? '읽기' : '듣기'} (1번 ~ {exam.questions.length}번)
                </div>
              </div>
            </div>

            {/* 题目区域 */}
            <div className="px-8 md:px-12 select-none">
              {exam.questions.map((question, idx) => (
                <div key={idx} ref={el => { questionRefs.current[idx] = el; }}>

                  {/* Instruction Bar (每个 section 的第一题显示) */}
                  {shouldShowInstruction(idx) && (
                    <div className="mb-4 font-bold text-lg leading-relaxed text-black font-['Batang','KoPubBatang','Times_New_Roman',serif]">
                      {getInstructionForQuestion(idx)}
                    </div>
                  )}

                  {/* 题目 */}
                  <div className="mb-12">
                    <QuestionRenderer
                      question={question}
                      questionIndex={idx}
                      userAnswer={userAnswers[idx]}
                      language={language}
                      showCorrect={false}
                      onAnswerChange={optionIndex => onAnswerChange(idx, optionIndex)}
                      annotations={[]} // Don't show annotation highlights in exam-taking mode
                      contextPrefix={examContextPrefix}
                      hidePassage={isGroupedQuestion(idx) && !isFirstInGroup(idx)}
                      showInlineNumber={isGroupedQuestion(idx)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 试卷页脚 */}
            <div className="flex justify-center py-12">
              <div className="bg-gray-300 rounded-full px-4 py-1 font-bold text-gray-700">
                End of Section
              </div>
            </div>
          </div>
        </div>


        {/* 右侧导航栏 - 移到右侧避免被侧边栏遮挡 */}
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden lg:block">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-3 flex flex-col items-center gap-3 max-h-[85vh] overflow-y-auto">
            {/* 计时器 */}
            <div className={`text-xl font-mono font-bold flex items-center ${timeLeft < 300 ? 'text-red-500' : 'text-emerald-600'}`}>
              <Clock className="w-4 h-4 mr-1" />
              {formatTime(timeLeft)}
            </div>

            {/* 提交按钮 */}
            <button
              onClick={onSubmit}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
            >
              제출
            </button>

            <div className="border-t border-slate-200 w-full pt-2"></div>

            {/* 题目导航 */}
            <div className="grid grid-cols-5 gap-1">
              {exam.questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToQuestion(idx)}
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
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
        </div>

        {/* Audio Player (if listening exam) */}
        {exam.type === 'LISTENING' && exam.audioUrl && (
          <AudioPlayer audioUrl={exam.audioUrl} language={language} />
        )}
      </div>
    );
  }
);

