import React, { useState, useRef, useEffect } from 'react';
import { TopikExam, TopikQuestion, Language, Annotation } from '../../types';
import { Clock, FastForward, MessageSquare, Trash2, Check } from 'lucide-react';
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

export const ExamSession: React.FC<ExamSessionProps> = ({
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
  onResumeTimer
}) => {
  const labels = getLabels(language);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  
  // Annotation state
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string; contextKey: string } | null>(null);
  const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const examContextPrefix = `TOPIK-${exam.id}`;
  
  // Sidebar annotations with notes
  const sidebarAnnotations = annotations
    .filter(a => a.contextKey.startsWith(examContextPrefix) && a.note && a.note.trim().length > 0);

  // Format time
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Text selection handler
  const handleTextSelect = (questionIndex: number) => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === '') return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const selectedText = selection.toString().trim();
    const contextKey = `${examContextPrefix}-Q${questionIndex}`;

    setSelectionRange({
      start: range.startOffset,
      end: range.endOffset,
      text: selectedText,
      contextKey
    });
    setMenuPosition({ top: rect.bottom + window.scrollY + 5, left: rect.left + window.scrollX });
    setShowAnnotationMenu(true);
  };

  const saveAnnotation = () => {
    if (!selectionRange) return;

    const annotation: Annotation = {
      contextKey: selectionRange.contextKey,
      selectedText: selectionRange.text,
      note: noteInput,
      createdAt: new Date().toISOString()
    };

    onSaveAnnotation(annotation);
    setShowAnnotationMenu(false);
    setNoteInput('');
    setSelectionRange(null);
    window.getSelection()?.removeAllRanges();
  };

  // Close annotation menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAnnotationMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.annotation-menu')) {
          setShowAnnotationMenu(false);
          setSelectionRange(null);
          window.getSelection()?.removeAllRanges();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAnnotationMenu]);

  // Scroll to question
  const scrollToQuestion = (index: number) => {
    questionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Progress calculation
  const answeredCount = Object.keys(userAnswers).length;
  const progressPercentage = (answeredCount / exam.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Timer Bar */}
      <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">{exam.title}</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span className={timeLeft < 300 ? 'text-red-600 font-bold' : ''}>{formatTime(timeLeft)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={timerActive ? onPauseTimer : onResumeTimer}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
              >
                {timerActive ? labels.pause || 'Pause' : labels.resume || 'Resume'}
              </button>
              <button
                onClick={onSubmit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2"
              >
                <FastForward className="w-4 h-4" />
                <span>{labels.submitExam || 'Submit'}</span>
              </button>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-600 text-center">
            {answeredCount} / {exam.questions.length} {labels.questionsAnswered || 'questions answered'}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex gap-6">
        {/* Main Content */}
        <div className="flex-1">
          <div className="space-y-6">
            {exam.questions.map((question, idx) => (
              <div
                key={idx}
                ref={(el) => (questionRefs.current[idx] = el)}
                className="bg-white p-6 rounded-lg shadow"
              >
                <QuestionRenderer
                  question={question}
                  questionIndex={idx}
                  userAnswer={userAnswers[idx]}
                  language={language}
                  showCorrect={false}
                  onAnswerChange={(optionIndex) => onAnswerChange(idx, optionIndex)}
                  onTextSelect={() => handleTextSelect(idx)}
                  annotations={annotations}
                  contextPrefix={examContextPrefix}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Question Navigator + Annotations */}
        <div className="w-64 space-y-4">
          {/* Question Navigator */}
          <div className="bg-white p-4 rounded-lg shadow sticky top-24">
            <h3 className="font-semibold mb-3 text-sm">{labels.questions || 'Questions'}</h3>
            <div className="grid grid-cols-5 gap-2">
              {exam.questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToQuestion(idx)}
                  className={`
                    w-10 h-10 rounded flex items-center justify-center text-sm font-medium transition-colors
                    ${userAnswers[idx] !== undefined
                      ? 'bg-green-100 text-green-700 border-2 border-green-600'
                      : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                    }
                  `}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Annotations Sidebar */}
          {sidebarAnnotations.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow sticky top-96 max-h-96 overflow-y-auto">
              <h3 className="font-semibold mb-3 text-sm flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>{labels.myNotes || 'My Notes'}</span>
              </h3>
              <div className="space-y-3">
                {sidebarAnnotations.map((annotation, idx) => (
                  <div key={idx} className="border-l-4 border-yellow-400 pl-3 py-2 bg-yellow-50 rounded">
                    <div className="text-xs text-gray-600 mb-1 italic">"{annotation.selectedText}"</div>
                    <div className="text-sm">{annotation.note}</div>
                    <button
                      onClick={() => onDeleteAnnotation(annotation.contextKey)}
                      className="mt-2 text-xs text-red-600 hover:text-red-700 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{labels.delete || 'Delete'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Annotation Menu */}
      {showAnnotationMenu && menuPosition && (
        <div
          className="annotation-menu fixed z-50 bg-white border border-gray-300 shadow-lg rounded-lg p-3 w-64"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <div className="text-xs text-gray-600 mb-2 italic">"{selectionRange?.text}"</div>
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder={labels.addNote || 'Add your note...'}
            className="w-full border border-gray-300 rounded p-2 text-sm mb-2 resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowAnnotationMenu(false);
                setNoteInput('');
                setSelectionRange(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
            >
              {labels.cancel || 'Cancel'}
            </button>
            <button
              onClick={saveAnnotation}
              disabled={!noteInput.trim()}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 flex items-center space-x-1"
            >
              <Check className="w-3 h-3" />
              <span>{labels.save || 'Save'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Audio Player (if listening exam) */}
      {exam.type === 'LISTENING' && exam.audioUrl && (
        <AudioPlayer audioUrl={exam.audioUrl} language={language} />
      )}
    </div>
  );
};
