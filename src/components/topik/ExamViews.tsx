import React, { useMemo, useRef, useState, useCallback } from 'react';
import { TopikExam, Language, Annotation } from '../../types';
import {
  Clock, Trophy, RotateCcw, ArrowLeft, CheckCircle,
  PlayCircle, FileText, BarChart3, ArrowRight, Headphones, Pencil, Loader2,
  Eye, MessageSquare, Trash2, Check
} from 'lucide-react';
import { getLabels } from '../../utils/i18n';
import { QuestionRenderer } from './QuestionRenderer';
import AnnotationMenu from '../AnnotationMenu';
import CanvasLayer, { CanvasData, ToolType, CanvasToolbar } from '../../features/annotation/components/CanvasLayer';
import { useCanvasAnnotation } from '../../features/annotation/hooks/useCanvasAnnotation';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import toast from 'react-hot-toast';

const PAPER_MAX_WIDTH = "max-w-[900px]";


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

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">

        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-96 bg-indigo-600 skew-y-3 origin-top-left -translate-y-20 z-0"></div>
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl z-0"></div>

        <div className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">

          {/* Left Panel: Info */}
          <div className="md:w-2/5 bg-slate-900 text-white p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white transition-colors mb-8 text-sm font-bold uppercase tracking-wider">
                <ArrowLeft className="w-4 h-4 mr-2" /> {labels.back || 'Back'}
              </button>

              <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
                {exam.type === 'READING' ? <FileText className="w-8 h-8" /> : <Headphones className="w-8 h-8" />}
              </div>

              <h1 className="text-3xl font-bold mb-2 leading-tight">TOPIK II<br />{exam.type}</h1>
              <p className="text-indigo-200 font-medium">第 {exam.round} 届真题模拟</p>
            </div>

            <div className="relative z-10 space-y-6">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Total Time</div>
                <div className="text-2xl font-mono">{exam.timeLimit} Min</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Questions</div>
                <div className="text-2xl font-mono">{exam.questions.length}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Full Score</div>
                <div className="text-2xl font-mono">100</div>
              </div>
            </div>

            {/* Deco circles */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600 rounded-full blur-2xl opacity-50"></div>
          </div>

          {/* Right Panel: Instructions */}
          <div className="md:w-3/5 p-10 md:p-12 flex flex-col">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">考前须知</h2>

            <div className="space-y-4 flex-1">
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 text-slate-500 font-bold border border-slate-200">1</div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">全真模拟环境</h4>
                  <p className="text-xs text-slate-500 mt-1">考试期间请勿离开页面，计时器结束后将自动提交试卷。</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 text-slate-500 font-bold border border-slate-200">2</div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">答案提交</h4>
                  <p className="text-xs text-slate-500 mt-1">所有选择题均为单选。提交后即可查看分数和解析。</p>
                </div>
              </div>
              {exam.type === 'LISTENING' && (
                <div className="flex gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 text-amber-500 font-bold border border-amber-200">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">听力注意事项</h4>
                    <p className="text-xs text-slate-500 mt-1">音频将自动播放且无法暂停。请检查您的扬声器设备。</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <button
                onClick={onStart}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 hover:-translate-y-1 flex items-center justify-center gap-2 group"
              >
                {hasAttempted ? '重新挑战' : '开始考试'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-center text-xs text-slate-400 mt-4">
                点击开始即代表您已做好准备
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
ExamCoverView.displayName = "ExamCoverView";

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

export const ExamResultView: React.FC<ExamResultViewProps> = React.memo(
  ({ exam, result, language, onReview, onTryAgain, onBackToList }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const percentage = Math.round((result.score / result.totalScore) * 100);
    const passed = percentage >= 60;

    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center items-center font-sans">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">

          {/* Header / Score Banner */}
          <div className={`p-8 text-center relative overflow-hidden ${passed ? 'bg-emerald-600' : 'bg-slate-800'}`}>
            <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl opacity-20"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 text-white text-xs font-bold mb-4 backdrop-blur-sm border border-white/20">
                {exam.title}
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {passed ? 'Congratulations! 🎉' : 'Keep Practicing! 💪'}
              </h1>
              <p className="text-white/80 text-sm">
                {passed ? '您已达到通过标准' : '距离目标还有一段距离，加油！'}
              </p>
            </div>
          </div>

          {/* Score Stats */}
          <div className="p-8 -mt-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 flex flex-col items-center">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Your Score</div>
              <div className="flex items-baseline gap-2 mb-6">
                <span className={`text-6xl font-black ${passed ? 'text-emerald-600' : 'text-slate-800'}`}>{result.score}</span>
                <span className="text-xl text-slate-400 font-bold">/ {result.totalScore}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 w-full">
                <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                  <div className="text-2xl font-bold text-slate-800 mb-1">{percentage}%</div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Accuracy</div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl text-center border border-emerald-100">
                  <div className="text-2xl font-bold text-emerald-600 mb-1">{result.correctCount}</div>
                  <div className="text-xs font-bold text-emerald-700/60 uppercase">Correct</div>
                </div>
                <div className="bg-red-50 p-3 rounded-xl text-center border border-red-100">
                  <div className="text-2xl font-bold text-red-500 mb-1">{result.totalQuestions - result.correctCount}</div>
                  <div className="text-xs font-bold text-red-700/60 uppercase">Incorrect</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 pb-8 space-y-3">
            <button
              onClick={onReview}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" />
              查看详细解析
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onTryAgain}
                className="py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> 再次挑战
              </button>
              <button
                onClick={onBackToList}
                className="py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors"
              >
                返回列表
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }
);
ExamResultView.displayName = "ExamResultView";

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
  ({ exam, userAnswers, language, annotations, onSaveAnnotation, onDeleteAnnotation, onBack }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

    // Convex Mutation
    const saveNotebook = useMutation(api.notebooks.save);

    const structure = exam.type === 'LISTENING' ? TOPIK_LISTENING_STRUCTURE : TOPIK_READING_STRUCTURE;

    // Calculate stats
    const stats = useMemo(() => {
      let correct = 0;
      let wrong = 0;
      // Safety check: ensure questions array exists
      const questions = exam.questions || [];
      questions.forEach((q, idx) => {
        const userAnswer = userAnswers[idx];
        // 只有当用户作答且答对时才算正确
        if (userAnswer !== undefined && userAnswer === q.correctAnswer) {
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
    const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
    const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
    const [editNoteInput, setEditNoteInput] = useState('');

    // --- Canvas Drawing State ---
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [canvasTool, setCanvasTool] = useState<ToolType>('pen');
    const [canvasColor, setCanvasColor] = useState('#1e293b');
    const paperContainerRef = useRef<HTMLDivElement>(null);

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
      () => currentAnnotations.filter(a =>
        (a.note && a.note.trim().length > 0) || a.id === editingAnnotationId
      ),
      [currentAnnotations, editingAnnotationId]
    );

    // Handle text selection for annotation
    const handleTextSelect = (questionIndex: number, e?: React.MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim() === '') return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const selectedText = selection.toString().trim();
      const contextKey = `${examContextPrefix}-Q${questionIndex}`;

      if ((rect.top === 0 && rect.bottom === 0) || (rect.width === 0 && rect.height === 0)) {
        if (e) {
          setMenuPosition({ top: e.clientY + 10, left: e.clientX });
        } else {
          setMenuPosition({ top: window.innerHeight / 2, left: window.innerWidth / 2 });
        }
      } else {
        setMenuPosition({ top: rect.bottom + 10, left: rect.left });
      }

      setSelectionText(selectedText);
      setSelectionContextKey(contextKey);
      setShowAnnotationMenu(true);

      const existing = annotations.find(a =>
        a.contextKey === contextKey &&
        (a.text === selectedText || a.selectedText === selectedText)
      );

      if (existing) {
        setNoteInput(existing.note || '');
        if (existing.color) setSelectedColor(existing.color as 'yellow' | 'green' | 'blue' | 'pink');
        setActiveAnnotationId(existing.id);
      } else {
        setNoteInput('');
        setActiveAnnotationId(null);
      }
    };

    // Save annotation
    const saveAnnotationQuick = (colorOverride?: string) => {
      if (!selectionText || !selectionContextKey) return null;

      const existing = annotations.find(a =>
        a.contextKey === selectionContextKey &&
        (a.text === selectionText || a.selectedText === selectionText)
      );

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
      window.getSelection()?.removeAllRanges();

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

    // Save selection to Vocab Notebook
    const handleSaveToVocab = useCallback(async (text: string) => {
      if (!text) return;

      // Get question context from selection
      const questionIndex = selectionContextKey.split('-Q')[1];
      const question = questionIndex ? exam.questions[parseInt(questionIndex)] : null;
      const context = question?.question || question?.passage?.substring(0, 100) || '';

      // Save to notebook
      try {
        await saveNotebook({
          type: 'VOCAB',
          title: text,
          content: {
            text: text, // Normalized field for notebook content
            word: text,
            context: context,
            examId: exam.id,
            examTitle: exam.title,
            questionIndex: questionIndex ? parseInt(questionIndex) : undefined,
            savedAt: new Date().toISOString(),
          },
          tags: ['exam-vocab', `topik-${exam.round}`],
        });
        toast.success("Saved to Notebook");
      } catch (_e: any) {
        console.error("Failed to save to notebook", _e);
        toast.error("Failed to save");
      }
    }, [exam, selectionContextKey, saveNotebook]);

    const tempAnnotation: Annotation | null = showAnnotationMenu && selectionText && selectionContextKey ? {
      id: 'temp',
      contextKey: selectionContextKey,
      text: selectionText,
      note: '',
      color: selectedColor,
      timestamp: Date.now()
    } : null;

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {/* Review Header - Modernized */}
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm shrink-0">
          <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-bold text-slate-800 text-lg">{exam.title}</h1>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">Review Mode</span>
                  <span>•</span>
                  <span>第 {exam.round} 届</span>
                </div>
              </div>
            </div>

            {/* Drawing Mode Toggle - Single Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDrawingMode(!isDrawingMode)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${isDrawingMode
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <Pencil className="w-4 h-4" />
                标记
              </button>

              {/* Canvas Status Indicator */}
              {isDrawingMode && (
                <div className="flex items-center gap-2 text-xs">
                  {canvasLoading && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      加载中...
                    </span>
                  )}
                  {canvasSaving && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      保存中...
                    </span>
                  )}
                  {!canvasLoading && !canvasSaving && (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      已同步
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Question Navigator - Only show wrong answers in review mode */}
          <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2">
            <div className="max-w-[1400px] mx-auto flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <span className="text-xs font-medium text-slate-400 shrink-0">
                错题 ({stats.wrong}):
              </span>
              <div className="flex gap-1">
                {exam.questions.map((q, idx) => {
                  const isCorrect = userAnswers[idx] === q.correctAnswer;
                  // Only show wrong answers in review mode
                  if (isCorrect) return null;
                  return (
                    <button
                      key={idx}
                      onClick={() => scrollToQuestion(idx)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 shrink-0 bg-red-500 text-white"
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              {stats.wrong === 0 && (
                <span className="text-xs text-emerald-600 font-medium">🎉 全部正确！</span>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-200/50">
          {/* PDF Paper with Canvas Overlay */}
          <div ref={paperContainerRef} className={`bg-white w-full ${PAPER_MAX_WIDTH} shadow-xl min-h-screen pb-16 relative border border-slate-200`}>

            {/* Canvas Layer - Drawing Mode */}
            {isDrawingMode && (
              <div className="absolute inset-0 z-10" style={{ pointerEvents: 'auto' }}>
                <CanvasLayer
                  data={canvasData}
                  onChange={handleCanvasChange}
                  readOnly={false}
                  tool={canvasTool}
                  color={canvasColor}
                />
              </div>
            )}

            {/* Canvas Toolbar - Bottom Fixed when Drawing */}
            {isDrawingMode && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <CanvasToolbar
                  tool={canvasTool}
                  onToolChange={setCanvasTool}
                  color={canvasColor}
                  onColorChange={setCanvasColor}
                  onUndo={handleCanvasUndo}
                  onClear={handleCanvasClear}
                />
              </div>
            )}

            {/* Paper Header (copied from ExamSession) */}
            <div className="p-8 md:p-12 pb-4 font-serif">
              {/* Title Box */}
              <div className="bg-black text-white py-6 px-8 rounded-2xl mb-16 shadow-lg">
                <div className="flex items-baseline justify-center gap-4 mb-2">
                  <span className="text-xl md:text-2xl font-bold">제{exam.round}회</span>
                  <span className="text-3xl md:text-5xl font-bold tracking-wider">한 국 어 능 력 시 험</span>
                </div>
                <div className="text-center text-sm md:text-lg italic opacity-80">
                  The {exam.round}th Test of Proficiency in Korean
                </div>
              </div>

              {/* TOPIK II Section */}
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
                [Scroll down to review]
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

            {/* Questions (copied from ExamSession) */}
            <div className="px-8 md:px-12">
              {exam.questions.map((question, idx) => (
                <div key={idx} ref={el => { questionRefs.current[idx] = el; }}>

                  {/* Instruction Bar */}
                  {shouldShowInstruction(idx) && (
                    <div className="mb-4 font-bold text-lg leading-relaxed text-black font-['Batang','KoPubBatang','Times_New_Roman',serif]">
                      {getInstructionForQuestion(idx)}
                    </div>
                  )}

                  {/* Question */}
                  <div className="mb-12" onMouseUp={(e) => handleTextSelect(idx, e)}>
                    <QuestionRenderer
                      question={question}
                      questionIndex={idx}
                      userAnswer={userAnswers[idx]}
                      correctAnswer={question.correctAnswer}
                      language={language}
                      showCorrect={true}
                      annotations={
                        tempAnnotation && tempAnnotation.contextKey === `TOPIK-${exam.id}-Q${idx}`
                          ? [...annotations, tempAnnotation]
                          : annotations
                      }
                      contextPrefix={`TOPIK-${exam.id}`}
                      onTextSelect={(e) => handleTextSelect(idx, e)}
                      activeAnnotationId={activeAnnotationId}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Paper Footer */}
            <div className="flex justify-center py-12">
              <div className="bg-gray-300 rounded-full px-4 py-1 font-bold text-gray-700">
                End of Section
              </div>
            </div>
          </div>

          {/* Sidebar - Annotations */}
          <div className="w-80 shrink-0 hidden lg:block ml-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 sticky top-24 flex flex-col max-h-[calc(100vh-120px)] overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h4 className="font-bold text-slate-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  {labels.annotate || '笔记'}
                </h4>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sidebarAnnotations.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm italic">
                    {labels.noNotes || '暂无笔记'}
                  </div>
                ) : (
                  sidebarAnnotations.map(ann => {
                    const isEditing = editingAnnotationId === ann.id;
                    const isActive = activeAnnotationId === ann.id;

                    if (isEditing) {
                      return (
                        <div
                          key={ann.id}
                          id={`sidebar-card-${ann.id}`}
                          className="bg-white p-3 rounded-lg border-2 border-indigo-500 shadow-md scroll-mt-20"
                        >
                          <div className="text-xs font-bold mb-2 text-slate-500">
                            {labels.editingNote || '编辑笔记'}: &quot;{ann.text.substring(0, 15)}...&quot;
                          </div>
                          <textarea
                            value={editNoteInput}
                            onChange={(e) => setEditNoteInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleUpdateNote(ann.id);
                              }
                            }}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-indigo-200 outline-none mb-2"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingAnnotationId(null)}
                              className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
                            >
                              {labels.cancel || '取消'}
                            </button>
                            <button
                              onClick={() => handleUpdateNote(ann.id)}
                              className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> {labels.save || '保存'}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={ann.id}
                        id={`sidebar-card-${ann.id}`}
                        className={`group p-3 rounded-lg border transition-all cursor-pointer relative scroll-mt-20
                              ${isActive
                            ? 'bg-indigo-50 border-indigo-300 shadow-md'
                            : 'bg-slate-50 border-slate-100 hover:border-indigo-200 hover:shadow-sm'
                          }`}
                        onClick={() => {
                          setActiveAnnotationId(ann.id);
                          setEditingAnnotationId(ann.id);
                          setEditNoteInput(ann.note || '');
                        }}
                      >
                        <div className={`text-xs font-bold mb-1 px-1.5 py-0.5 rounded w-fit ${{
                          'yellow': 'bg-yellow-100 text-yellow-800',
                          'green': 'bg-green-100 text-green-800',
                          'blue': 'bg-blue-100 text-blue-800',
                          'pink': 'bg-pink-100 text-pink-800',
                        }[ann.color || 'yellow'] || 'bg-yellow-100 text-yellow-800'}`}>
                          {ann.text.substring(0, 20)}...
                        </div>
                        {ann.note ? (
                          <p className="text-sm text-slate-700">{ann.note}</p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">{labels.clickToAddNote || '点击添加笔记...'}</p>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAnnotation(ann.id);
                          }}
                          className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>



        {/* Annotation Menu */}
        <AnnotationMenu
          visible={showAnnotationMenu}
          position={menuPosition}
          selectionText={selectionText}
          onAddNote={() => {
            const id = saveAnnotationQuick();
            if (id) {
              setEditingAnnotationId(id);
              setEditNoteInput('');
              setTimeout(() => {
                const el = document.getElementById(`sidebar-card-${id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
            }
          }}
          onHighlight={(color: 'yellow' | 'green' | 'blue' | 'pink' | null) => {
            saveAnnotationQuick(color || undefined);
          }}
          selectedColor={selectedColor}
          setSelectedColor={(val: 'yellow' | 'green' | 'blue' | 'pink' | null) => val && setSelectedColor(val)}
          onClose={() => {
            setShowAnnotationMenu(false);
            window.getSelection()?.removeAllRanges();
          }}
          onSaveToVocab={handleSaveToVocab}
          labels={labels}
        />
      </div>
    );
  }
);
ExamReviewView.displayName = "ExamReviewView";
