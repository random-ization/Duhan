import React, { useEffect, useState, useCallback } from 'react';
import { X, Trash2, BookOpen, GraduationCap, XCircle, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

// Type display config
const TYPE_CONFIG: Record<string, { icon: React.ComponentType<any>; label: string; color: string }> = {
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [note, setNote] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchDetail = useCallback(async () => {
        if (!noteId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.getNotebookDetail(noteId);
            if (res.success) {
                setNote(res.data);
            } else {
                setError('无法加载笔记详情');
            }
        } catch (e) {
            setError('加载失败');
        } finally {
            setLoading(false);
        }
    }, [noteId]);

    useEffect(() => {
        if (noteId) {
            fetchDetail();
        }
    }, [noteId, fetchDetail]);

    const handleDelete = async () => {
        if (!noteId || deleting) return;
        setDeleting(true);
        try {
            await api.deleteNotebook(noteId);
            onDelete(noteId);
            onClose();
        } catch (e) {
            console.error('Delete failed:', e);
        } finally {
            setDeleting(false);
        }
    };

    if (!noteId) return null;

    const config = note ? (TYPE_CONFIG[note.type] || TYPE_CONFIG.GENERAL) : TYPE_CONFIG.GENERAL;
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
                                <div className={`w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center`}>
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
                                {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
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
                        ) : (
                            <NoteContent type={note.type} content={note.content} />
                        )}
                    </div>

                    {/* Footer */}
                    {!loading && note && (
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex gap-2">
                                {note.tags?.map((tag: string, idx: number) => (
                                    <span key={idx} className="px-2 py-1 bg-white border border-slate-200 text-xs text-slate-500 rounded-full">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <span className="text-xs text-slate-400">
                                {new Date(note.createdAt).toLocaleDateString('zh-CN', {
                                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
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
const NoteContent: React.FC<{ type: string; content: any }> = ({ type, content }) => {
    if (!content) return <p className="text-slate-400">暂无内容</p>;

    if (type === 'VOCAB') {
        return (
            <div className="space-y-5">
                {/* Word */}
                {content.word && (
                    <div className="bg-indigo-50 rounded-xl p-5">
                        <span className="text-3xl font-bold text-indigo-700">{content.word}</span>
                        {content.pronunciation && (
                            <span className="ml-3 text-indigo-500 text-lg">[{content.pronunciation}]</span>
                        )}
                    </div>
                )}

                {/* Meaning */}
                {content.meaning && (
                    <Section title="释义">
                        <p className="text-slate-700">{content.meaning}</p>
                    </Section>
                )}

                {/* Context / Original Sentence */}
                {content.context && (
                    <Section title="原句">
                        <p className="text-slate-600 italic bg-slate-50 p-3 rounded-lg border-l-4 border-indigo-200">
                            {content.context}
                        </p>
                    </Section>
                )}

                {/* Analysis */}
                {content.analysis && (
                    <Section title="语法分析">
                        <p className="text-slate-700">{content.analysis}</p>
                    </Section>
                )}

                {/* Extra info */}
                {content.examTitle && (
                    <div className="text-xs text-slate-400 pt-4 border-t border-slate-100">
                        来源：{content.examTitle}
                    </div>
                )}
            </div>
        );
    }

    if (type === 'MISTAKE') {
        return (
            <div className="space-y-6">
                {/* Question */}
                <div className="space-y-4">
                    {(content.questionText || content.question) && (
                        <div>
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">题目</h4>
                            <div className="text-lg font-medium text-slate-800 leading-relaxed mb-4">
                                {content.questionText || content.question}
                            </div>
                        </div>
                    )}

                    {/* Image */}
                    {content.imageUrl && (
                        <div className="mb-4">
                            <img
                                src={content.imageUrl}
                                alt="Question"
                                className="rounded-lg border border-slate-200 shadow-sm max-h-60 object-contain"
                            />
                        </div>
                    )}

                    {/* Options */}
                    {content.options && Array.isArray(content.options) && (
                        <div className="grid gap-2">
                            {content.options.map((option: string, idx: number) => {
                                // Determine status
                                const isCorrect = (idx + 1) === content.correctAnswer;

                                return (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg border flex items-center gap-3 ${isCorrect
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                                : 'bg-white border-slate-200 text-slate-600'
                                            }`}
                                    >
                                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${isCorrect ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {idx + 1}
                                        </span>
                                        <span className="text-sm">{option}</span>
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
                {content.aiAnalysis ? (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-indigo-100 rounded text-indigo-600">
                                <GraduationCap className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-indigo-900">AI 老师解析</h3>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100 space-y-5">
                            {/* Translation */}
                            {content.aiAnalysis.translation && (
                                <div>
                                    <div className="text-xs font-bold text-indigo-700 uppercase mb-1.5">题干翻译</div>
                                    <p className="text-slate-700 bg-white/60 p-3 rounded-lg text-sm leading-relaxed">
                                        {content.aiAnalysis.translation}
                                    </p>
                                </div>
                            )}

                            {/* Key Point */}
                            {content.aiAnalysis.keyPoint && (
                                <div>
                                    <div className="text-xs font-bold text-indigo-700 uppercase mb-1.5">核心考点</div>
                                    <div className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                                        {content.aiAnalysis.keyPoint}
                                    </div>
                                </div>
                            )}

                            {/* Detailed Analysis */}
                            {content.aiAnalysis.analysis && (
                                <div>
                                    <div className="text-xs font-bold text-indigo-700 uppercase mb-1.5">正解分析</div>
                                    <p className="text-slate-700 bg-white/60 p-3 rounded-lg text-sm leading-relaxed">
                                        {content.aiAnalysis.analysis}
                                    </p>
                                </div>
                            )}

                            {/* Wrong Options Analysis */}
                            {content.aiAnalysis.wrongOptions && Object.keys(content.aiAnalysis.wrongOptions).length > 0 && (
                                <div>
                                    <div className="text-xs font-bold text-indigo-700 uppercase mb-1.5">干扰项分析</div>
                                    <div className="space-y-2">
                                        {Object.entries(content.aiAnalysis.wrongOptions).map(([key, value]) => (
                                            <div key={key} className="text-sm bg-white/40 p-2 rounded border border-indigo-50/50">
                                                <span className="font-bold text-indigo-600 mr-2">{key}:</span>
                                                <span className="text-slate-600">{(value as string)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : content.analysis ? (
                    /* Legacy analysis support */
                    <Section title="AI 解析">
                        <p className="text-slate-700">{content.analysis}</p>
                    </Section>
                ) : null}
            </div>
        );
    }

    // Default: GENERAL or GRAMMAR
    return (
        <div className="space-y-5">
            {content.text && (
                <Section title="内容">
                    <p className="text-slate-700 whitespace-pre-wrap">{content.text}</p>
                </Section>
            )}
            {content.notes && (
                <Section title="笔记">
                    <p className="text-slate-600 whitespace-pre-wrap">{content.notes}</p>
                </Section>
            )}
            {/* Fallback: render raw JSON for unknown structure */}
            {!content.text && !content.notes && (
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

export default NoteDetailModal;
