import React, { useMemo, useRef, useState } from 'react';
import { TopikExam, Language, Annotation } from '../../types';
import { Clock, Trophy, RotateCcw, ArrowLeft, CheckCircle, Eye, MessageSquare, Trash2, X, Check } from 'lucide-react';
import { getLabels } from '../../utils/i18n';
import { QuestionRenderer } from './QuestionRenderer';

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

// Exam Cover View - PDF 风格封面
interface ExamCoverViewProps {
  exam: TopikExam;
  language: Language;
  onStart: () => void;
  onBack: () => void;
}

export const ExamCoverView: React.FC<ExamCoverViewProps> = React.memo(
  ({ exam, language, onStart, onBack }) => {
    const labels = useMemo(() => getLabels(language), [language]);

    return (
      <div className="min-h-screen bg-slate-200 py-10 flex justify-center overflow-y-auto px-4">
        <div className={`bg-white w-full ${PAPER_MAX_WIDTH} shadow-2xl p-12 border border-slate-300 flex flex-col relative min-h-[900px]`}>

          {/* 返回按钮 */}
          <button
            onClick={onBack}
            className="absolute top-6 left-6 text-slate-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {labels.back || 'Back'}
          </button>

          {/* 封面主体 */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">

            {/* TOPIK 大标题 */}
            <div className="border-b-4 border-double border-black pb-6 mb-8 w-full max-w-md">
              <div className="text-sm text-slate-500 mb-2">한국어능력시험 II</div>
              <h1 className={`text-6xl font-black ${FONT_SERIF} tracking-widest text-slate-900 mb-4`}>
                TOPIK Ⅱ
              </h1>
              <div className="inline-block bg-slate-900 text-white text-2xl font-bold px-6 py-2 rounded-full">
                {exam.type === 'READING' ? '읽기' : '듣기'}
              </div>
            </div>

            {/* 考试信息 */}
            <div className="grid grid-cols-2 gap-8 w-full max-w-sm text-left mb-8">
              <div className="border-b-2 border-slate-300 pb-2">
                <div className="text-sm text-slate-500 mb-1">회차</div>
                <div className={`text-xl font-bold ${FONT_SERIF}`}>제 {exam.round || '?'} 회</div>
              </div>
              <div className="border-b-2 border-slate-300 pb-2">
                <div className="text-sm text-slate-500 mb-1">시간</div>
                <div className={`text-xl font-bold ${FONT_SERIF}`}>{exam.timeLimit} 분</div>
              </div>
              <div className="border-b-2 border-slate-300 pb-2">
                <div className="text-sm text-slate-500 mb-1">문항수</div>
                <div className={`text-xl font-bold ${FONT_SERIF}`}>{exam.questions.length} 문항</div>
              </div>
              <div className="border-b-2 border-slate-300 pb-2">
                <div className="text-sm text-slate-500 mb-1">배점</div>
                <div className={`text-xl font-bold ${FONT_SERIF}`}>100 점</div>
              </div>
            </div>

            {/* 유의사항 */}
            <div className="bg-slate-50 border-2 border-slate-200 p-6 w-full max-w-md text-left mb-8">
              <h3 className="font-bold text-center mb-4 border-b border-slate-300 pb-2">
                유 의 사 항 (Information)
              </h3>
              <ul className="text-sm space-y-3 list-disc pl-5 text-slate-700">
                <li>
                  시험 시작 지시가 있을 때까지 문제를 풀지 마십시오.
                  <br />
                  <span className="text-slate-400 text-xs">Do not start until instructed.</span>
                </li>
                <li>
                  모든 문제의 정답은 하나입니다.
                  <br />
                  <span className="text-slate-400 text-xs">Each question has only one correct answer.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 시작 버튼 */}
          <button
            onClick={onStart}
            className={`w-full py-5 bg-slate-900 text-white text-xl font-bold ${FONT_SERIF} hover:bg-slate-800 transition-colors shadow-xl tracking-widest`}
          >
            시험 시작 (START EXAM)
          </button>
        </div>
      </div>
    );
  }
);

// Exam Result View
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

export const ExamResultView: React.FC<ExamResultViewProps> = React.memo(
  ({ exam, result, language, onReview, onTryAgain, onBackToList }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const percentage = useMemo(
      () => (result.score / result.totalScore) * 100,
      [result.score, result.totalScore]
    );
    const passed = percentage >= 60;

    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-2xl p-8 text-center border border-slate-200">

          {/* 图标 */}
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${passed ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <Trophy className={`w-12 h-12 ${passed ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>

          <h1 className={`text-3xl font-bold ${FONT_SERIF} text-slate-900 mb-2`}>
            {passed ? '축하합니다!' : '시험 완료'}
          </h1>
          <p className="text-slate-500 mb-8">{exam.title}</p>

          {/* 分数 */}
          <div className={`p-6 rounded-xl mb-6 ${passed ? 'bg-emerald-50' : 'bg-slate-50'}`}>
            <div className="text-sm text-slate-500 mb-2">Your Score</div>
            <div className={`text-5xl font-black ${passed ? 'text-emerald-600' : 'text-slate-700'}`}>
              {result.score}
              <span className="text-xl text-slate-400 font-normal"> / {result.totalScore}</span>
            </div>
            <div className="text-sm text-slate-500 mt-2">
              ({result.correctCount} / {result.totalQuestions} correct)
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <button
              onClick={onReview}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" />
              {labels.reviewAnswers || 'Review Answers'}
            </button>

            <button
              onClick={onTryAgain}
              className="w-full py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              {labels.tryAgain || 'Try Again'}
            </button>

            <button
              onClick={onBackToList}
              className="w-full py-3 text-slate-500 hover:text-indigo-600 font-medium flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              {labels.backToList || 'Back to List'}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

// Exam Review View - PDF 样式复习页
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
  ({ exam, userAnswers, language, annotations, onSaveAnnotation, onDeleteAnnotation, onBack }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const structure = exam.type === 'LISTENING' ? TOPIK_LISTENING_STRUCTURE : TOPIK_READING_STRUCTURE;

    // Calculate stats
    const stats = useMemo(() => {
      let correct = 0;
      let wrong = 0;
      exam.questions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correctAnswer) {
          correct++;
        } else {
          wrong++;
        }
      });
      return { correct, wrong };
    }, [exam.questions, userAnswers]);

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

    // 判断是否需要显示 instruction
    const shouldShowInstruction = (qIndex: number) => {
      const qNum = qIndex + 1;
      for (const section of structure) {
        if (qNum === section.range[0]) {
          return true;
        }
      }
      return false;
    };

    const scrollToQuestion = (index: number) => {
      questionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // --- Annotation State ---
    const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectionText, setSelectionText] = useState('');
    const [selectionContextKey, setSelectionContextKey] = useState('');
    const [noteInput, setNoteInput] = useState('');
    const [selectedColor, setSelectedColor] = useState<'yellow' | 'green' | 'blue' | 'pink'>('yellow');

    // Available highlight colors
    const COLORS = [
      { name: 'yellow', bgClass: 'bg-yellow-300', ringClass: 'ring-yellow-500' },
      { name: 'green', bgClass: 'bg-green-300', ringClass: 'ring-green-500' },
      { name: 'blue', bgClass: 'bg-blue-300', ringClass: 'ring-blue-500' },
      { name: 'pink', bgClass: 'bg-pink-300', ringClass: 'ring-pink-500' },
    ] as const;

    const examContextPrefix = `TOPIK-${exam.id}`;

    // Sidebar annotations with notes
    const sidebarAnnotations = useMemo(
      () => (annotations || []).filter(a => a.contextKey.startsWith(examContextPrefix) && a.note && a.note.trim().length > 0),
      [annotations, examContextPrefix]
    );

    // Handle text selection for annotation
    const handleTextSelect = (questionIndex: number) => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim() === '') return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const selectedText = selection.toString().trim();
      const contextKey = `${examContextPrefix}-Q${questionIndex}`;

      setSelectionText(selectedText);
      setSelectionContextKey(contextKey);
      setMenuPosition({ top: rect.bottom + window.scrollY + 10, left: rect.left + window.scrollX });
      setShowAnnotationMenu(true);
      setNoteInput('');
    };

    // Save annotation
    const saveAnnotation = async () => {
      if (!selectionText || !noteInput.trim()) return;

      const annotation: Annotation = {
        id: Date.now().toString(),
        contextKey: selectionContextKey,
        text: selectionText,
        note: noteInput,
        color: selectedColor,
        timestamp: Date.now(),
      };

      try {
        await onSaveAnnotation(annotation);
      } catch (error) {
        console.error('Failed to save annotation:', error);
      }

      setShowAnnotationMenu(false);
      setNoteInput('');
      setSelectionText('');
      window.getSelection()?.removeAllRanges();
    };

    // Delete annotation
    const deleteAnnotation = (contextKey: string) => {
      onDeleteAnnotation(contextKey);
    };

    return (
      <div className="min-h-screen bg-slate-200 flex flex-col">
        {/* 顶部栏 */}
        <div className="sticky top-0 z-30 bg-white border-b shadow-sm shrink-0">
          <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="text-slate-500 hover:text-indigo-600">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="font-bold text-slate-800">{exam.title}</div>
                <div className="text-xs text-slate-500">복습 (Review)</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-bold">
                  ✓ {stats.correct}
                </span>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold">
                  ✗ {stats.wrong}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 主内容 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
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
                  <div className="text-sm text-emerald-600 font-bold">
                    Score: {stats.correct * 2} / {exam.questions.length * 2}
                  </div>
                </div>
              </div>
            </div>

            {/* 题目区域 */}
            <div className="px-8 md:px-12">
              {exam.questions.map((question, idx) => (
                <div key={idx} ref={el => (questionRefs.current[idx] = el)}>

                  {/* Instruction Bar */}
                  {shouldShowInstruction(idx) && (
                    <div className="bg-slate-50 border-l-4 border-slate-800 px-4 py-2 mb-6 mt-8 first:mt-0">
                      <span className={`text-[16px] font-bold text-slate-800 ${FONT_SERIF}`}>
                        {getInstructionForQuestion(idx)}
                      </span>
                    </div>
                  )}

                  {/* 题目 */}
                  <div className="mb-10" onMouseUp={() => handleTextSelect(idx)}>
                    <QuestionRenderer
                      question={question}
                      questionIndex={idx}
                      userAnswer={userAnswers[idx]}
                      correctAnswer={question.correctAnswer}
                      language={language}
                      showCorrect={true}
                      annotations={annotations}
                      contextPrefix={`TOPIK-${exam.id}`}
                      onTextSelect={() => handleTextSelect(idx)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 页脚 */}
            <div className="border-t border-slate-200 mx-8 pt-6 mt-12 text-center text-slate-400 font-mono text-xs">
              <div>한국어능력시험 (TOPIK)</div>
              <div className="mt-1">- End of Review -</div>
            </div>
          </div>

          {/* 笔记侧边栏 */}
          {sidebarAnnotations.length > 0 && (
            <div className="w-72 shrink-0 space-y-4 hidden lg:block">
              <div className="bg-white rounded-xl shadow-lg p-4 sticky top-24">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  我的笔记 ({sidebarAnnotations.length})
                </h3>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {sidebarAnnotations.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-3 rounded-lg border border-slate-200 bg-yellow-50 hover:border-yellow-300 transition-colors group"
                    >
                      <div className="text-xs text-slate-500 mb-1 italic line-clamp-2">
                        "{ann.text}"
                      </div>
                      <div className="text-sm text-slate-700 font-medium">{ann.note}</div>
                      <button
                        onClick={() => deleteAnnotation(ann.contextKey)}
                        className="mt-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" /> 删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 题目导航 */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-xl border border-slate-200 px-4 py-2 flex items-center gap-1 overflow-x-auto max-w-[90vw]">
            <span className="text-xs text-slate-500 font-bold mr-2 shrink-0">题目</span>
            {exam.questions.map((q, idx) => {
              const isCorrect = userAnswers[idx] === q.correctAnswer;
              return (
                <button
                  key={idx}
                  onClick={() => scrollToQuestion(idx)}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0
                    ${isCorrect
                      ? 'bg-emerald-500 text-white'
                      : 'bg-red-500 text-white'
                    }
                  `}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Annotation Popup Menu */}
        {showAnnotationMenu && menuPosition && (
          <div
            className="fixed z-50 bg-white border border-slate-200 shadow-xl rounded-xl p-4 w-72 animate-in zoom-in-95"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-slate-700 text-sm">添加笔记</h4>
              <button
                onClick={() => {
                  setShowAnnotationMenu(false);
                  window.getSelection()?.removeAllRanges();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-500 mb-3 italic border-l-2 border-yellow-400 pl-2 line-clamp-2">
              "{selectionText}"
            </div>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none mb-3"
              rows={3}
              placeholder="写下你的笔记..."
              autoFocus
            />
            {/* Color Picker */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-500">高亮颜色:</span>
              <div className="flex gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`w-6 h-6 rounded-full ${color.bgClass} transition-all ${selectedColor === color.name ? `ring-2 ${color.ringClass} ring-offset-1` : 'hover:scale-110'
                      }`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAnnotationMenu(false);
                  window.getSelection()?.removeAllRanges();
                }}
                className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"
              >
                取消
              </button>
              <button
                onClick={saveAnnotation}
                disabled={!noteInput.trim()}
                className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
