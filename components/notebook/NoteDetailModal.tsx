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
            <div className="space-y-5">
                {/* Question */}
                {content.question && (
                    <Section title="题目">
                        <p className="text-slate-700">{content.question}</p>
                    </Section>
                )}

                {/* Your Answer vs Correct */}
                <div className="grid grid-cols-2 gap-4">
                    {content.userAnswer !== undefined && (
                        <div className="bg-red-50 rounded-xl p-4">
                            <div className="text-xs font-medium text-red-500 uppercase mb-2">你的答案</div>
                            <div className="text-red-700 font-bold text-lg">{content.userAnswer}</div>
                        </div>
                    )}
                    {content.correctAnswer !== undefined && (
                        <div className="bg-emerald-50 rounded-xl p-4">
                            <div className="text-xs font-medium text-emerald-500 uppercase mb-2">正确答案</div>
                            <div className="text-emerald-700 font-bold text-lg">{content.correctAnswer}</div>
                        </div>
                    )}
                </div>

                {/* AI Analysis */}
                {content.analysis && (
                    <Section title="AI 解析">
                        <p className="text-slate-700">{content.analysis}</p>
                    </Section>
                )}
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
