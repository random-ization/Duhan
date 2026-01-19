import React, { useState } from 'react';
import {
  X,
  Trash2,
  BookOpen,
  GraduationCap,
  XCircle,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from 'convex/react';
import { mRef, qRef } from '../../utils/convexRefs';

// Type display config
const TYPE_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  VOCAB: { icon: BookOpen, label: '生词', color: 'text-indigo-600' },
  GRAMMAR: { icon: GraduationCap, label: '语法', color: 'text-emerald-600' },
  MISTAKE: { icon: XCircle, label: '错题', color: 'text-red-500' },
  GENERAL: { icon: FileText, label: '笔记', color: 'text-slate-600' },
};

interface NoteDetailModalProps {
  noteId: string | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const NoteDetailModal: React.FC<NoteDetailModalProps> = ({ noteId, onClose, onDelete }) => {
  const [deleting, setDeleting] = useState(false);

  // Convex Integration
  type NoteDetailResponse = {
    success: boolean;
    data?: { title?: string; type: string; content: unknown; tags?: string[]; createdAt: number };
  };
  const noteDetail = useQuery(
    qRef<{ notebookId: string }, NoteDetailResponse>('notebooks:getDetail'),
    noteId ? { notebookId: noteId } : 'skip'
  );

  const loading = noteDetail === undefined && !!noteId;
  const note = noteDetail?.data;
  const error = noteDetail && !noteDetail.success ? '无法加载笔记详情' : null;

  const deleteNotebook = useMutation(mRef<{ notebookId: string }, unknown>('notebooks:remove'));

  const handleDelete = async () => {
    if (!noteId || deleting) return;
    setDeleting(true);
    try {
      await deleteNotebook({ notebookId: noteId });
      onDelete(noteId);
      onClose();
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setDeleting(false);
    }
  };

  if (!noteId) return null;

  const config = note ? TYPE_CONFIG[note.type] || TYPE_CONFIG.GENERAL : TYPE_CONFIG.GENERAL;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              {loading ? (
                <div className="w-10 h-10 rounded-lg bg-slate-100 animate-pulse" />
              ) : (
                <div
                  className={`w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
              )}
              <div>
                {loading ? (
                  <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
                ) : (
                  <h2 className="text-xl font-bold text-slate-800">{note?.title}</h2>
                )}
                <span className={`text-xs font-medium ${config.color} uppercase`}>
                  {loading ? '' : config.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting || loading}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="space-y-4">
                <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-slate-100 rounded w-full animate-pulse" />
                <div className="h-4 bg-slate-100 rounded w-5/6 animate-pulse" />
                <div className="h-20 bg-slate-100 rounded animate-pulse mt-6" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <AlertTriangle className="w-12 h-12 mb-3" />
                <p>{error}</p>
              </div>
            ) : !note ? (
              <p className="text-slate-400">暂无内容</p>
            ) : (
              <NoteContent type={note.type} content={note.content} />
            )}
          </div>

          {/* Footer */}
          {!loading && note && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex gap-2">
                {note.tags?.map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-white border border-slate-200 text-xs text-slate-500 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <span className="text-xs text-slate-400">
                {new Date(note.createdAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Content renderer based on type
const NoteContent: React.FC<{ type: string; content: unknown }> = ({ type, content }) => {
  if (!content) return <p className="text-slate-400">暂无内容</p>;
  const record = content as Record<string, unknown>;

  if (type === 'VOCAB') {
    return (
      <div className="space-y-5">
        {/* Word */}
        {typeof record.word === 'string' && (
          <div className="bg-indigo-50 rounded-xl p-5">
            <span className="text-3xl font-bold text-indigo-700">{record.word}</span>
            {typeof record.pronunciation === 'string' && (
              <span className="ml-3 text-indigo-500 text-lg">[{record.pronunciation}]</span>
            )}
          </div>
        )}

        {/* Meaning */}
        {typeof record.meaning === 'string' && record.meaning.trim() !== '' && (
          <Section title="释义">
            <p className="text-slate-700">{record.meaning}</p>
          </Section>
        )}

        {/* Context / Original Sentence */}
        {typeof record.context === 'string' && record.context.trim() !== '' && (
          <Section title="原句">
            <p className="text-slate-600 italic bg-slate-50 p-3 rounded-lg border-l-4 border-indigo-200">
              {record.context}
            </p>
          </Section>
        )}

        {/* Analysis */}
        {typeof record.analysis === 'string' && record.analysis.trim() !== '' && (
          <Section title="语法分析">
            <p className="text-slate-700">{record.analysis}</p>
          </Section>
        )}

        {/* Extra info */}
        {typeof record.examTitle === 'string' && record.examTitle.trim() !== '' && (
          <div className="text-xs text-slate-400 pt-4 border-t border-slate-100">
            来源：{record.examTitle}
          </div>
        )}
      </div>
    );
  }

  if (type === 'MISTAKE') {
    const questionText = typeof record.questionText === 'string' ? record.questionText : undefined;
    const question = typeof record.question === 'string' ? record.question : undefined;
    const imageUrl = typeof record.imageUrl === 'string' ? record.imageUrl : undefined;
    const options = Array.isArray(record.options) ? record.options : undefined;
    const correctAnswer =
      typeof record.correctAnswer === 'number' ? record.correctAnswer : undefined;
    const aiAnalysis = record.aiAnalysis;
    const analysis = typeof record.analysis === 'string' ? record.analysis : undefined;

    return (
      <div className="space-y-6">
        {/* Question */}
        <div className="space-y-4">
          {(questionText || question) && (
            <div>
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                题目
              </h4>
              <div className="text-lg font-medium text-slate-800 leading-relaxed mb-4">
                {questionText || question}
              </div>
            </div>
          )}

          {/* Image */}
          {imageUrl && (
            <div className="mb-4">
              <img
                src={imageUrl}
                alt="Question"
                className="rounded-lg border border-slate-200 shadow-sm max-h-60 object-contain"
              />
            </div>
          )}

          {/* Options */}
          {options && (
            <div className="grid gap-2">
              {options.map((option, idx: number) => {
                // Determine status
                const isCorrect = correctAnswer !== undefined && idx + 1 === correctAnswer;
                const optionText = safeString(option) || '';

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border flex items-center gap-3 ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                        isCorrect
                          ? 'bg-emerald-200 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-sm">{optionText}</span>
                    {isCorrect && (
                      <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                        正确答案
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Analysis Section */}
        {aiAnalysis ? (
          <SanitizedAIAnalysisContent analysis={aiAnalysis} />
        ) : analysis ? (
          /* Legacy analysis support */
          <Section title="AI 解析">
            <p className="text-slate-700">{analysis}</p>
          </Section>
        ) : null}
      </div>
    );
  }

  // Default: GENERAL or GRAMMAR
  const text = safeString(record.text);
  const notes = safeString(record.notes);
  return (
    <div className="space-y-5">
      {text && (
        <Section title="内容">
          <p className="text-slate-700 whitespace-pre-wrap">{text}</p>
        </Section>
      )}
      {notes && (
        <Section title="笔记">
          <p className="text-slate-600 whitespace-pre-wrap">{notes}</p>
        </Section>
      )}
      {/* Fallback: render raw JSON for unknown structure */}
      {!text && !notes && (
        <pre className="bg-slate-50 p-4 rounded-lg text-xs text-slate-600 overflow-x-auto">
          {JSON.stringify(content, null, 2)}
        </pre>
      )}
    </div>
  );
};

// Section component
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</h4>
    {children}
  </div>
);

// Helper to safely convert anything to string or return null
const safeString = (val: unknown): string | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    try {
      const record = val as Record<string, unknown>;
      if (typeof record.text === 'string') return record.text;
      return JSON.stringify(val);
    } catch {
      return '[Complex Data]';
    }
  }
  return String(val);
};

// Helper to safely extract wrong options
const safeWrongOptions = (opts: unknown): [string, string][] => {
  if (!opts || typeof opts !== 'object') return [];
  try {
    return Object.entries(opts as Record<string, unknown>).map(([k, v]) => [
      String(k),
      safeString(v) || '',
    ]);
  } catch {
    return [];
  }
};

/**
 * Robust component to display AI Analysis content safely
 */
const SanitizedAIAnalysisContent = ({ analysis }: { analysis: unknown }) => {
  const record = analysis as Record<string, unknown>;
  const translation = safeString(record.translation);
  const keyPoint = safeString(record.keyPoint);
  const analysisText = safeString(record.analysis);
  const wrongOptions = safeWrongOptions(record.wrongOptions);

  return (
    <div className="mt-6 pt-6 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-indigo-100 rounded text-indigo-600">
          <GraduationCap className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold text-indigo-900">AI 老师解析</h3>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100 space-y-5">
        {/* Translation */}
        {translation && (
          <div>
            <div className="text-xs font-bold text-indigo-700 uppercase mb-1.5">题干翻译</div>
            <p className="text-slate-700 bg-white/60 p-3 rounded-lg text-sm leading-relaxed">
              {translation}
            </p>
          </div>
        )}

        {/* Key Point */}
        {keyPoint && (
          <div>
            <div className="text-xs font-bold text-indigo-700 uppercase mb-1.5">核心考点</div>
            <div className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
              {keyPoint}
            </div>
          </div>
        )}

        {/* Detailed Analysis */}
        {analysisText && (
          <div>
            <div className="text-xs font-bold text-indigo-700 uppercase mb-1.5">正解分析</div>
            <p className="text-slate-700 bg-white/60 p-3 rounded-lg text-sm leading-relaxed">
              {analysisText}
            </p>
          </div>
        )}

        {/* Wrong Options Analysis */}
        {wrongOptions.length > 0 && (
          <div>
            <div className="text-xs font-bold text-indigo-700 uppercase mb-1.5">干扰项分析</div>
            <div className="space-y-2">
              {wrongOptions.map(([key, value]) => (
                <div
                  key={key}
                  className="text-sm bg-white/40 p-2 rounded border border-indigo-50/50"
                >
                  <span className="font-bold text-indigo-600 mr-2">{key}:</span>
                  <span className="text-slate-600">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteDetailModal;
