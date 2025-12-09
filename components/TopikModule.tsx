import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TopikExam, Language, TopikQuestion, ExamAttempt, Annotation } from '../types';
import {
  Clock, Trophy, ArrowLeft, Calendar, Check, X,
  MessageSquare, Trash2, Play, Pause, FastForward,
  RotateCcw, Eye, ChevronRight, ChevronLeft, Volume2
} from 'lucide-react';
import { getLabels } from '../utils/i18n';
import { useAnnotation } from '../hooks/useAnnotation';
import AnnotationMenu from './AnnotationMenu';

interface TopikModuleProps {
  exams: TopikExam[];
  language: Language;
  history: ExamAttempt[];
  onSaveHistory: (attempt: ExamAttempt) => void;
  annotations: Annotation[];
  onSaveAnnotation: (annotation: Annotation) => void;
}

// --- 样式常量 (PDF 仿真) ---
const PAPER_MAX_WIDTH = "max-w-[1000px]"; // 试卷最大宽度
const FONT_SERIF = "font-serif"; // 衬线字体 (用于文章)
const FONT_SANS = "font-sans"; // 无衬线字体 (用于题目)
const BORDER_BLACK = "border-slate-800"; // 深色边框

const TopikModule: React.FC<TopikModuleProps> = ({ exams, language, history, onSaveHistory, annotations, onSaveAnnotation }) => {
  const [view, setView] = useState<'LIST' | 'HISTORY_LIST' | 'COVER' | 'EXAM' | 'RESULT' | 'REVIEW'>('LIST');
  const [currentExam, setCurrentExam] = useState<TopikExam | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Review Mode
  const [currentReviewAttempt, setCurrentReviewAttempt] = useState<ExamAttempt | null>(null);

  // Annotation State
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editNoteInput, setEditNoteInput] = useState('');
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  const labels = getLabels(language);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const readingExams = exams.filter(e => e.type === 'READING');
  const listeningExams = exams.filter(e => e.type === 'LISTENING');
  const examContextPrefix = currentExam ? `TOPIK-${currentExam.id}` : '';

  // New Hook Usage
  // Note: internal contextKey handling needs to be dynamic based on what we select?
  // Actually, TOPIK module has many contexts potentially? 
  // No, the user implementation previously saved based on `selectionRange.contextKey`.
  // Wait, `useAnnotation` is bound to a SINGLE contextKey.
  // The TOPIK exam might need separation per question or just "Exam wide"?
  // Previous code: `contextKey` was dynamic in `handleTextSelection`.
  // Wait, previously `handleTextSelection` TOOK `contextKey` as arg.
  // The `useAnnotation` hook is designed for a single context.
  // HACK: Pass a generic 'TOPIK-EXAM-ID' prefix as context, but filters will handle specific items?
  // Or, since we render passing "contextKey" to `handleTextSelection`, maybe we need multiple hooks? No that's bad.
  // Modification: We can use the hook with a "Base" context, or we can manaully manage the context key in the selection flow.
  // The `useAnnotation` hook allows `handleTextSelection` to just grab selection.
  // The `contextKey` prop in hook is used for FILTERING and for SAVING new ones.
  // In `TopikModule`, we want to probably save per exam?
  // Let's check how `handleTextSelection` was called before: `handleTextSelection(\`TOPIK-${currentExam.id}-Q${q.id}\`)`
  // So it was saving per question!
  // `useAnnotation` takes `contextKey` as a fixed string. 
  // This is a mismatch. `useAnnotation` assumes the whole page is one context (like one Reading Unit).
  // Options:
  // 1. Change `useAnnotation` to allow dynamic keys.
  // 2. Instantiate `useAnnotation` with the "Exam ID" and just use ONE long context for the whole exam (simplest).
  //    But then `renderHighlightedText` needs to know which annotations apply to which text?
  //    Actually `renderHighlightedText` filters by global `currentAnnotations` in the previous modules? No, `currentAnnotations` is filtered by context in the render body.
  //    If we use ONE context key `TOPIK-${currentExam.id}`, then ALL highlightable text in the exam belongs to that context. 
  //    This is actually BETTER because user notes are per-exam attempt usually? Or per question.
  //    If questions are re-used in other lists, per-question ID is better.
  //    Let's assume we want to preserve per-question context...
  //    BUT the sidebar handles them all together?
  //    If I switch to just `TOPIK-${currentExam.id}`, then all notes are on the exam sheet. This mimics a real paper exam where you write anywhere.
  //    I will stick with `TOPIK-${currentExam.id}` as the unified context for this module. This simplifies things greatly.

  const contextKey = currentExam ? `TOPIK-${currentExam.id}-REVIEW` : '';
  // NOTE: Added -REVIEW suffix for now to validly track review session annotations, or just `TOPIK-${currentExam.id}` if we want persistent?
  // User probably wants persistent notes on the Exam itself. Let's use `TOPIK-${currentExam.id}`.

  const {
    contentRef, // We might not use this single ref for the whole page? 
    // Actually `useAnnotation` attaches listeners via `handleTextSelection`.
    // We can just pass `handleTextSelection` to the `onMouseUp` of our text blocks.
    handleTextSelection: originalHandleTextSelection,
    saveAnnotation,
    deleteAnnotation,
    cancelAnnotation,
    showAnnotationMenu,
    menuPosition,
    selectedColor,
    setSelectedColor,
    currentSelectionRange
  } = useAnnotation(contextKey, annotations, onSaveAnnotation);

  const handleTextSelection = (e: React.MouseEvent) => {
    if (view !== 'REVIEW') return; // Only in Review
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setActiveAnnotationId(null);
      setEditingAnnotationId(null);
    }
    originalHandleTextSelection(e);
  };

  // Filter annotations
  const currentAnnotations = annotations
    .filter(a => a.contextKey === contextKey && a.startOffset !== undefined)
    .sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));

  const sidebarAnnotations = currentAnnotations; // Alias

  const handleDeleteAnnotation = (id: string) => {
    const ann = currentAnnotations.find(a => a.id === id);
    if (ann) onSaveAnnotation({ ...ann, color: null, note: '' });
  };

  const handleUpdateNote = (id: string) => {
    const ann = currentAnnotations.find(a => a.id === id);
    if (ann) onSaveAnnotation({ ...ann, note: editNoteInput });
    setEditingAnnotationId(null);
    setActiveAnnotationId(null);
  };

  // --- 分组逻辑 (核心：实现 PDF 样式的关键) ---
  const questionGroups = useMemo(() => {
    if (!currentExam) return [];
    const groups: TopikQuestion[][] = [];
    let i = 0;
    const questions = [...currentExam.questions].sort((a, b) => (a.id || 0) - (b.id || 0));

    while (i < questions.length) {
      const q = questions[i];
      const count = q.groupCount && q.groupCount > 1 ? q.groupCount : 1;
      groups.push(questions.slice(i, i + count));
      i += count;
    }
    return groups;
  }, [currentExam]);

  // --- Timer ---
  useEffect(() => {
    let interval: number;
    if (timerActive && timeLeft > 0) {
      interval = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      submitExam();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // --- Actions ---
  const startExam = (exam: TopikExam) => {
    setCurrentExam(exam);
    setUserAnswers({});
    setTimeLeft(exam.timeLimit * 60);
    setView('COVER');
  };

  const beginTest = () => {
    setTimerActive(true);
    setView('EXAM');
  };

  const submitExam = () => {
    setTimerActive(false);
    if (!currentExam) return;
    let score = 0, total = 0;
    currentExam.questions.forEach(q => {
      total += q.score || 2;
      if (userAnswers[q.id] === q.correctAnswer) score += q.score || 2;
    });
    const attempt: ExamAttempt = {
      id: Date.now().toString(),
      examId: currentExam.id,
      examTitle: currentExam.title,
      score, maxScore: total, timestamp: Date.now(), userAnswers: { ...userAnswers }
    };
    onSaveHistory(attempt);
    setCurrentReviewAttempt(attempt);
    setView('RESULT');
  };

  const handleAnswer = (qId: number, optIdx: number) => {
    if (view === 'REVIEW') return;
    setUserAnswers(prev => ({ ...prev, [qId]: optIdx }));
  };
  const renderHighlightedText = (text: string, itemContextKey: string) => {
    if (!text) return null;
    // Filter Anns for this item
    const itemAnns = annotations.filter(a => a.contextKey === itemContextKey);

    const charMap: { annotation?: Annotation }[] = new Array(text.length).fill({});
    itemAnns.forEach(ann => {
      if (!ann.text) return;
      const searchStr = ann.text;
      let startIndex = 0;
      let index;
      // Simple string matching for all occurrences
      while ((index = text.indexOf(searchStr, startIndex)) > -1) {
        for (let i = index; i < index + searchStr.length; i++) {
          charMap[i] = { annotation: ann };
        }
        startIndex = index + 1;
      }
    });

    // ... Render logic (copied from ReadingModule but adapted classNames) ...
    // I will include this logic in the replacement content.

    const result = [];
    let i = 0;
    while (i < text.length) {
      const currentAnn = charMap[i].annotation;
      let j = i + 1;
      while (j < text.length) {
        const nextAnn = charMap[j].annotation;
        if (nextAnn !== currentAnn) break;
        j++;
      }

      const segment = text.slice(i, j);
      let className = 'relative rounded px-0 py-0.5 box-decoration-clone transition-all ';

      if (currentAnn) {
        const isActive = activeAnnotationId === currentAnn.id || editingAnnotationId === currentAnn.id;
        const colorMap: any = {
          'yellow': { border: 'border-yellow-400', bg: 'bg-yellow-200', hover: 'hover:bg-yellow-100' },
          'green': { border: 'border-green-400', bg: 'bg-green-200', hover: 'hover:bg-green-100' },
          'blue': { border: 'border-blue-400', bg: 'bg-blue-200', hover: 'hover:bg-blue-100' },
          'pink': { border: 'border-pink-400', bg: 'bg-pink-200', hover: 'hover:bg-pink-100' },
        };
        const colors = colorMap[currentAnn.color || 'yellow'] || colorMap['yellow'];
        className += `${colors.border} border-b-2 cursor-pointer `;
        if (isActive) className += `${colors.bg} `;
        else className += `${colors.hover} `;
      }

      if (currentAnn) {
        result.push(
          <span
            key={i}
            id={`annotation-${currentAnn.id}`}
            className={className}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (currentAnn.id) {
                setActiveAnnotationId(currentAnn.id);
                // Scroll sidebar
                const el = document.getElementById(`sidebar-card-${currentAnn.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          >
            {segment}
            {currentAnn.note && <span className="absolute -top-1.5 -right-1 w-2 h-2 bg-red-400 rounded-full border border-white"></span>}
          </span>
        );
      } else {
        result.push(<span key={i}>{segment}</span>);
      }
      i = j;
    }
    return result;
  };

  const getCircleNumber = (num: number) => ['①', '②', '③', '④'][num] || `${num + 1}`;

  // ... (Previous logic for PDF renderers will need this `renderHighlightedText`)

  // --- Renderers (PDF Style) ---

  // --- Renderers (PDF Style) ---

  // 1. 渲染文章/材料 (Reading Passage / Box / Images)
  const renderPassage = (q: TopikQuestion) => {
    // 图片 (Listening Q1-3, Charts)
    if (q.image || q.imageUrl) {
      return (
        <div className="mb-6 flex justify-center bg-white p-2 border border-slate-100 rounded">
          <img src={q.image || q.imageUrl} alt="Question Material" className="max-h-[350px] object-contain" />
        </div>
      );
    }

    // 新闻标题 (Reading Q25-27)
    if (q.layout === 'NEWS_HEADLINE' && q.passage) {
      return (
        <div
          className="mb-6 border-2 border-slate-900 p-6 bg-white shadow-[4px_4px_0px_#000]"
          onMouseUp={handleTextSelection}
        >
          <h3 className={`${FONT_SERIF} font-bold text-xl text-slate-900 leading-snug tracking-tight text-center select-text`}>
            {renderHighlightedText(q.passage, contextKey)}
          </h3>
        </div>
      );
    }

    // <보기> 框 (Reading Q39-41 or general box)
    if (q.contextBox || q.layout === 'INSERT_BOX') {
      return (
        <div className="space-y-6 mb-6">
          {/* Main Passage if exists */}
          {q.passage && (
            <div
              className={`${FONT_SERIF} text-[17px] leading-[1.8] text-justify whitespace-pre-wrap text-slate-800 select-text`}
              onMouseUp={handleTextSelection}
            >
              {renderHighlightedText(q.passage, contextKey)}
            </div>
          )}

          {/* The Box */}
          <div className="border border-slate-800 p-5 relative mt-4 mx-1">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-sm font-bold text-slate-900 border border-slate-200">
              &lt;보 기&gt;
            </span>
            <div
              className={`${FONT_SERIF} text-[16px] leading-[1.8] text-slate-800 whitespace-pre-wrap text-justify select-text`}
              onMouseUp={handleTextSelection}
            >
              {renderHighlightedText(q.contextBox || (q.layout === 'INSERT_BOX' ? q.passage : '') || '', contextKey)}
            </div>
          </div>
        </div>
      );
    }

    // 普通长文章 (Reading Q1-50 General)
    if (q.passage) {
      return (
        <div className="mb-6 border border-slate-300 p-5 bg-white shadow-sm h-full">
          <div
            className={`${FONT_SERIF} text-[17px] leading-[1.8] text-justify whitespace-pre-wrap text-slate-800 select-text`}
            onMouseUp={handleTextSelection}
          >
            {renderHighlightedText(q.passage, contextKey)}
          </div>
        </div>
      );
    }
    return null;
  };

  // 2. 渲染单个题目 (Question Block)
  const renderQuestion = (q: TopikQuestion, showPassage = false) => {
    const isReview = view === 'REVIEW';
    const myAnswer = isReview ? currentReviewAttempt?.userAnswers[q.id] : userAnswers[q.id];

    return (
      <div key={q.id} ref={el => { questionRefs.current[q.id] = el; }} className="mb-10 break-inside-avoid">
        {/* 题干 (Prompt) */}
        <div className="flex gap-2 mb-3">
          <span className={`text-[19px] font-bold text-slate-900 ${FONT_SERIF} min-w-[28px] pt-0.5`}>{q.id}.</span>
          <div className="flex-1">
            {showPassage && renderPassage(q)}
            {q.question && (
              <div
                className={`${FONT_SANS} text-[17px] font-bold text-slate-900 leading-snug mb-3 select-text`}
                onMouseUp={handleTextSelection}
              >
                {/* For question text, simpler render to avoid breaking split(regex) if html exists? 
                    Actually renderHighlightedText returns ReactNodes. 
                    If q.question has HTML like parens replacement... 
                    Original: dangerouslySetInnerHTML with replace.
                    If we highlight, we might break HTML.
                    Compromise: Text Matching might fail on HTML entities.
                    But TOPIK module questions are usually simple text with ( ).
                    I'll apply highlight.
                */}
                {renderHighlightedText(q.question.replace(/\(\s*\)/g, '(      )'), contextKey)}
              </div>
            )}
          </div>
        </div>

        {/* 选项 (Options) */}
        <div className="pl-9">
          {q.optionImages && q.optionImages.some(img => img) ? (
            // 图片选项 (Listening Q1-3)
            <div className="grid grid-cols-2 gap-4">
              {q.optionImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(q.id, idx)}
                  disabled={isReview}
                  className={`relative border-2 rounded-lg p-2 transition-all hover:bg-slate-50 ${myAnswer === idx
                    ? 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-400'
                    }`}
                >
                  <span className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${myAnswer === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {getCircleNumber(idx)}
                  </span>
                  {img ? <img src={img} className="w-full h-32 object-contain mx-auto" /> : <div className="h-32 flex items-center justify-center text-slate-300">No Image</div>}

                  {isReview && q.correctAnswer === idx && <div className="absolute inset-0 border-4 border-green-500 rounded-lg pointer-events-none" />}
                  {isReview && myAnswer === idx && myAnswer !== q.correctAnswer && <div className="absolute inset-0 bg-red-500/20 pointer-events-none" />}
                </button>
              ))}
            </div>
          ) : (
            // 文本选项 (Text Options) - 自动排版
            <div className={`grid ${q.options.some(o => o.length > 20) ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-x-8 gap-y-2'}`}>
              {q.options.map((opt, idx) => {
                let itemClass = "flex items-start gap-2 cursor-pointer p-1.5 rounded -ml-2 transition-colors border border-transparent";

                // 选中样式
                if (!isReview && myAnswer === idx) itemClass += " bg-indigo-50/80 border-indigo-200";
                else if (!isReview) itemClass += " hover:bg-slate-100";

                // 复习样式
                if (isReview) {
                  if (idx === q.correctAnswer) itemClass += " bg-green-50 border-green-200 text-green-800 font-medium";
                  else if (myAnswer === idx) itemClass += " bg-red-50 border-red-200 text-red-800 line-through opacity-80";
                  else itemClass += " opacity-60";
                }

                return (
                  <label key={idx} className={itemClass}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      className="mt-1.5 w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 hidden"
                      checked={myAnswer === idx}
                      onChange={() => handleAnswer(q.id, idx)}
                      disabled={isReview}
                    />
                    <span className={`text-[15px] font-sans ${myAnswer === idx ? 'font-bold text-slate-900' : 'text-slate-500'}`}>{getCircleNumber(idx)}</span>
                    <span
                      className={`text-[16px] leading-snug ${myAnswer === idx ? 'text-slate-900 font-medium' : 'text-slate-700'} select-text`}
                      onMouseUp={handleTextSelection}
                    >
                      {renderHighlightedText(opt, contextKey)}
                    </span>
                    {isReview && idx === q.correctAnswer && <Check className="w-4 h-4 text-green-600 ml-auto shrink-0" />}
                    {isReview && myAnswer === idx && myAnswer !== q.correctAnswer && <X className="w-4 h-4 text-red-600 ml-auto shrink-0" />}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 3. 渲染题目组 (核心：Group Layout)
  const renderGroup = (group: TopikQuestion[]) => {
    if (!group.length) return null;

    const leader = group[0];
    // 只有当有 passage 且组内有多个问题时，才视为“共用材料”布局
    const hasSharedPassage = group.length > 1 && !!leader.passage;

    // 指引文 (e.g. [1~2] ...)
    const rangeText = group.length > 1 ? `[${leader.id}~${group[group.length - 1].id}]` : `[${leader.id}]`;
    const instruction = `※ ${rangeText} ${leader.instruction || '다음을 읽고 물음에 답하십시오.'}`;

    return (
      <div key={`group-${leader.id}`} className="mb-12 break-inside-avoid">
        {/* Instruction Bar */}
        <div className="bg-slate-50 border-l-4 border-slate-800 px-3 py-2 mb-6 text-slate-800 font-bold text-[15px]">
          {instruction}
        </div>

        {/* Content Layout */}
        <div className={`flex flex-col ${hasSharedPassage ? 'lg:flex-row lg:gap-8' : ''}`}>

          {/* Left Column: Shared Passage */}
          {hasSharedPassage && (
            <div className="lg:w-1/2 shrink-0 mb-8 lg:mb-0">
              {renderPassage(leader)}
            </div>
          )}

          {/* Right Column: Questions */}
          <div className="flex-1">
            {group.map(q => renderQuestion(q, !hasSharedPassage))}
          </div>
        </div>
      </div>
    );
  };

  // --- Audio Player (Bottom Sticky) ---
  const AudioBar = ({ url }: { url: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const toggle = () => {
      if (audioRef.current?.paused) { audioRef.current.play(); setPlaying(true); }
      else { audioRef.current?.pause(); setPlaying(false); }
    };

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur text-white p-3 shadow-lg flex items-center gap-4 z-50 border-t border-slate-700">
        <audio
          ref={audioRef}
          src={url}
          onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
          onEnded={() => setPlaying(false)}
        />
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-mono font-bold tracking-widest uppercase">Listening Test</span>
        </div>
        <button onClick={toggle} className="w-10 h-10 bg-white text-slate-900 rounded-full flex items-center justify-center hover:bg-indigo-100 transition-colors shadow-lg active:scale-95">
          {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
        </button>
        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden cursor-pointer group">
          <div className="bg-indigo-400 h-full transition-all duration-100 relative group-hover:bg-indigo-300" style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-sm" />
          </div>
        </div>
      </div>
    );
  };

  // --- VIEW: EXAM PAPER ---
  if ((view === 'EXAM' || view === 'REVIEW') && currentExam) {
    return (
      <div className="flex flex-col h-screen bg-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 text-white h-14 flex items-center justify-between px-6 shadow-md z-20 shrink-0">
          <div className="flex items-center gap-4">
            {view === 'REVIEW' && <button onClick={() => setView('HISTORY_LIST')}><ArrowLeft className="w-5 h-5" /></button>}
            <span className="font-bold text-lg tracking-wide">{currentExam.title}</span>
          </div>
          {view === 'EXAM' ? (
            <div className={`text-xl font-mono font-bold flex items-center ${timeLeft < 300 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
              <Clock className="w-5 h-5 mr-2" />
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          ) : (
            <div className="text-emerald-400 font-bold text-lg">
              Score: {currentReviewAttempt?.score} / {currentReviewAttempt?.maxScore}
            </div>
          )}
          <div className="w-32 flex justify-end">
            {view === 'EXAM' && (
              <button onClick={submitExam} className="bg-white text-slate-900 px-4 py-1.5 rounded font-bold text-sm hover:bg-indigo-50">
                제출 (Submit)
              </button>
            )}
          </div>
        </div>

        {/* Highlight Wrapper */}
        <div className="flex-1 flex min-h-0 relative">

          {/* Main Paper Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center p-4 md:p-8 relative bg-slate-200"
          // Add ref here if we wanted to scope global selection, but we rely on rendering logic now
          >

            {/* The Paper Sheet */}
            <div className={`bg-white w-full ${PAPER_MAX_WIDTH} shadow-2xl min-h-screen relative flex flex-col mb-20`}>

              {/* Paper Header (Logo area) */}
              <div className="h-20 border-b-2 border-black flex justify-between items-end px-8 pb-3 mb-8 mx-8 mt-8">
                <span className="font-bold text-2xl text-slate-900 font-serif">TOPIK Ⅱ {currentExam.type === 'READING' ? '읽기 (Reading)' : '듣기 (Listening)'}</span>
                <span className="font-mono text-slate-500 font-medium">제 {currentExam.round} 회</span>
              </div>

              {/* Content */}
              <div className={`flex-1 px-8 md:px-12 pb-12 ${view === 'EXAM' ? 'select-none' : ''}`}>
                {questionGroups.map((group, idx) => (
                  <React.Fragment key={idx}>
                    {renderGroup(group)}
                  </React.Fragment>
                ))}
              </div>

              {/* Footer */}
              <div className="h-16 border-t border-slate-200 flex flex-col items-center justify-center text-slate-400 font-mono text-xs mt-auto bg-slate-50">
                <div className="mb-1">한국어능력시험 (TOPIK)</div>
                <div>- End of Page -</div>
              </div>

            </div>
          </div>

          {/* Sidebar - Review Mode Only */}
          {view === 'REVIEW' && (
            <div className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col min-h-0 z-10 shrink-0">
              <div className="p-4 border-b border-slate-200 bg-white">
                <h4 className="font-bold text-slate-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  {labels.annotate}
                </h4>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sidebarAnnotations.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm italic">
                    Select text on the paper to add notes.
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
                          <div className="text-xs font-bold mb-2 text-slate-500">Editing note</div>
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
                            <button onClick={() => setEditingAnnotationId(null)} className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                            <button onClick={() => handleUpdateNote(ann.id)} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"><Check className="w-3 h-3" /> Save</button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={ann.id}
                        id={`sidebar-card-${ann.id}`}
                        className={`group p-3 rounded-lg border transition-all cursor-pointer relative scroll-mt-20
                                        ${isActive ? 'bg-indigo-50 border-indigo-300 shadow-md' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'}`}
                        onClick={() => {
                          setActiveAnnotationId(ann.id);
                          setEditingAnnotationId(ann.id);
                          setEditNoteInput(ann.note || '');
                          // Scroll to text? Not easily possible without id map.
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
                        {ann.note ? <p className="text-sm text-slate-700">{ann.note}</p> : <p className="text-xs text-slate-400 italic">Click to add note...</p>}
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteAnnotation(ann.id); }} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>

        {/* Audio Bar */}
        {view === 'EXAM' && currentExam.type === 'LISTENING' && currentExam.audioUrl && (
          <AudioBar url={currentExam.audioUrl} />
        )}

        <AnnotationMenu
          visible={showAnnotationMenu}
          position={menuPosition}
          selectionText={currentSelectionRange?.text}
          onAddNote={() => {
            const id = saveAnnotation(undefined, undefined, true);
            if (id) {
              setEditingAnnotationId(id);
              setEditNoteInput('');
              setTimeout(() => {
                const el = document.getElementById(`sidebar-card-${id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
            }
          }}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          onClose={cancelAnnotation}
          onDelete={deleteAnnotation}
          labels={labels}
        />
      </div>
    );
  }

  // --- VIEW: COVER PAGE ---
  if (view === 'COVER' && currentExam) {
    return (
      <div className="min-h-screen bg-slate-100 py-10 flex justify-center overflow-y-auto">
        <div className="bg-white w-full max-w-[800px] shadow-2xl p-16 border border-slate-300 flex flex-col relative h-fit min-h-[1000px]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-50 text-[120px] font-black opacity-50 pointer-events-none select-none">TOPIK</div>
          <div className="text-center border-b-4 border-double border-black pb-8">
            <div className="text-lg font-serif mb-2">한국어능력시험 II</div>
            <h1 className="text-6xl font-black font-serif tracking-widest mb-6">TOPIK Ⅱ</h1>
            <div className="text-3xl font-bold font-serif bg-slate-900 text-white inline-block px-6 py-2 rounded-full">B형</div>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-12 px-8 mt-12">
            <div className="grid grid-cols-2 gap-x-12 gap-y-8 text-xl font-serif">
              <div className="flex justify-between border-b-2 border-black pb-2 items-end"><span className="font-bold">수험 번호</span><span className="font-mono text-slate-500 text-2xl">12345678</span></div>
              <div className="flex justify-between border-b-2 border-black pb-2 items-end"><span className="font-bold">이 름</span><span className="font-mono text-slate-500 text-xl">Hong Gil Dong</span></div>
            </div>
            <div className="bg-slate-50 border-2 border-slate-200 p-8 text-center">
              <h3 className="font-bold text-lg mb-6 border-b border-slate-300 pb-4 inline-block px-8">유 의 사 항 (Information)</h3>
              <ul className="text-left text-sm space-y-4 list-disc pl-5 text-slate-700 font-medium">
                <li>시험 시작 지시가 있을 때까지 문제를 풀지 마십시오.<br /><span className="text-slate-400 text-xs">Do not open the booklet until you are allowed to start.</span></li>
                <li>수험번호와 이름을 정확하게 적어 주십시오.<br /><span className="text-slate-400 text-xs">Write your name and registration number on the answer sheet.</span></li>
              </ul>
            </div>
          </div>
          <button onClick={beginTest} className="w-full py-6 bg-black text-white text-2xl font-bold font-serif hover:bg-slate-800 transition-colors shadow-xl mt-12 tracking-widest">
            시험 시작 (START EXAM)
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: LIST / HISTORY (Unchanged logic, simple UI) ---
  if (view === 'LIST') {
    return (
      <div className="max-w-5xl mx-auto space-y-8 p-6">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center"><Trophy className="w-8 h-8 mr-3 text-indigo-600" />{labels.topikExam}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Reading */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-700 border-b pb-2">Reading</h3>
            {readingExams.map(exam => (
              <div key={exam.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between mb-2"><h4 className="font-bold text-lg">{exam.title}</h4><span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Round {exam.round}</span></div>
                <button onClick={() => startExam(exam)} className="w-full mt-2 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-700">Start Exam</button>
              </div>
            ))}
          </div>
          {/* Listening */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-700 border-b pb-2">Listening</h3>
            {listeningExams.map(exam => (
              <div key={exam.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between mb-2"><h4 className="font-bold text-lg">{exam.title}</h4><span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Round {exam.round}</span></div>
                <button onClick={() => startExam(exam)} className="w-full mt-2 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-700">Start Exam</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default Result/History View
  return (
    <div className="flex items-center justify-center h-screen bg-slate-100">
      <div className="bg-white p-12 rounded-2xl shadow-xl text-center">
        <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
        <h2 className="text-3xl font-bold mb-2">Exam Completed!</h2>
        {currentReviewAttempt && <div className="text-xl text-indigo-600 font-bold mb-8">Score: {currentReviewAttempt.score} / {currentReviewAttempt.maxScore}</div>}
        <div className="flex gap-4 justify-center">
          <button onClick={() => setView('REVIEW')} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold">Review Answers</button>
          <button onClick={() => setView('LIST')} className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-bold">Back to List</button>
        </div>
      </div>
    </div>
  );
};

export default TopikModule;