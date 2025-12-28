import React, { useState, useEffect } from 'react';
import { Annotation } from '../../../types';
import { Highlighter, MessageSquare, Trash2, Check } from 'lucide-react';

interface AnnotationSidebarProps {
    sidebarAnnotations: Annotation[];
    activeAnnotationId: string | null;
    editingAnnotationId: string | null;
    hoveredAnnotationId: string | null;
    // Labels needed
    labels: {
        annotate: string;
        cancel: string;
        save: string;
        clickToAddNote: string;
    };
    onActivate: (id: string) => void;
    onHover: (id: string | null) => void;
    onEdit: (id: string) => void;
    onCancelEdit: (id: string) => void;
    onSave: (id: string, text: string) => void;
    onDelete: (id: string) => void;
    // Mobile responsive props
    isOpen?: boolean;
    onClose?: () => void;
}

const AnnotationSidebar: React.FC<AnnotationSidebarProps> = ({
    sidebarAnnotations,
    activeAnnotationId,
    editingAnnotationId,
    hoveredAnnotationId,
    labels,
    onActivate,
    onHover,
    onEdit,
    onCancelEdit,
    onSave,
    onDelete,
    isOpen = false,
    onClose
}) => {
    const [editNoteInput, setEditNoteInput] = useState('');

    // Sync input when editing starts
    useEffect(() => {
        if (editingAnnotationId) {
            const ann = sidebarAnnotations.find(a => a.id === editingAnnotationId);
            if (ann) {
                setEditNoteInput(ann.note || '');
            }
        } else {
            setEditNoteInput('');
        }
        // Disable ESLint warning because we only want to sync on ID change, not on data change while editing
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingAnnotationId]);

    return (
        <>
            {/* Mobile Backdrop */}
            <div
                className={`fixed inset-0 bg-black/20 z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Sidebar / Bottom Sheet */}
            <div className={`
                bg-white flex flex-col shrink-0 z-50 shadow-lg transition-transform duration-300 ease-in-out
                
                /* Desktop Styles */
                md:w-80 md:border-l md:border-slate-200 md:h-full md:relative md:translate-y-0 md:translate-x-0 md:rounded-none md:shadow-none
                
                /* Mobile Styles */
                fixed inset-x-0 bottom-0 h-[60vh] rounded-t-2xl w-full
                ${isOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
            `}>
                {/* Mobile Handle / Close */}
                <div className="md:hidden flex items-center justify-center pt-3 pb-1" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                </div>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        <Highlighter className="w-4 h-4 text-indigo-500" />
                        {labels.annotate}
                    </h4>
                    <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                        {sidebarAnnotations.length}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                    {sidebarAnnotations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-300">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-1">暂无笔记</p>
                            <p className="text-xs text-slate-400">在文中选中文字即可添加高亮或笔记。</p>
                        </div>
                    ) : (
                        sidebarAnnotations.map(ann => {
                            const isEditing = editingAnnotationId === ann.id;
                            const isActive = activeAnnotationId === ann.id;

                            return (
                                <div
                                    key={ann.id}
                                    id={`sidebar-card-${ann.id}`}
                                    className={`group p-4 rounded-xl border transition-all cursor-pointer relative scroll-mt-24
                  ${isActive || isEditing
                                            ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                                        }`}
                                    onClick={() => {
                                        if (!isEditing) {
                                            onActivate(ann.id);
                                            onEdit(ann.id);
                                        }
                                    }}
                                    onMouseEnter={() => onHover(ann.id)}
                                    onMouseLeave={() => onHover(null)}
                                >
                                    <div className="flex items-start gap-2 mb-2">
                                        <div className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 ${{
                                            'yellow': 'bg-yellow-400', 'green': 'bg-green-400', 'blue': 'bg-blue-400', 'pink': 'bg-pink-400'
                                        }[ann.color || 'yellow'] || 'bg-yellow-400'}`}></div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider line-clamp-1 flex-1">
                                            {ann.text}
                                        </div>
                                    </div>

                                    {isEditing ? (
                                        <div className="mt-2 animate-in fade-in zoom-in-95 duration-200">
                                            <textarea
                                                value={editNoteInput}
                                                onChange={(e) => setEditNoteInput(e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-3 bg-slate-50"
                                                rows={3}
                                                autoFocus
                                                placeholder="输入笔记内容..."
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        onSave(ann.id, editNoteInput);
                                                    }
                                                }}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onCancelEdit(ann.id);
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                >
                                                    {labels.cancel}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSave(ann.id, editNoteInput);
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 transition-colors shadow-sm"
                                                >
                                                    <Check className="w-3 h-3" /> {labels.save}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {ann.note ? (
                                                <p className="text-sm text-slate-800 leading-relaxed pl-3.5 border-l-2 border-slate-100">{ann.note}</p>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic pl-3.5">{labels.clickToAddNote}</p>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Direct delete without confirm, as requested to fix crash
                                                    onDelete(ann.id);
                                                }}
                                                className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
};

export default AnnotationSidebar;
