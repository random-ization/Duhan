import React, { useState, useEffect } from 'react';
import type { Annotation } from '../../types';
import { Highlighter, MessageSquare, Trash2, Check } from 'lucide-react';
import { MobileSheet } from '../mobile/MobileSheet';
import { Button } from '../ui/button';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hoveredAnnotationId,
  labels,
  onActivate,
  onHover,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  isOpen = false,
  onClose,
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

  const list =
    sidebarAnnotations.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-300">
          <MessageSquare className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-500 mb-1">暂无笔记</p>
        <p className="text-xs text-slate-400">{labels.clickToAddNote}</p>
      </div>
    ) : (
      sidebarAnnotations.map(ann => {
        const isEditing = editingAnnotationId === ann.id;
        const isActive = activeAnnotationId === ann.id;

        const handleCardClick = () => {
          if (!isEditing) {
            onActivate(ann.id);
            onEdit(ann.id);
          }
        };

        return (
          <Button
            type="button"
            key={ann.id}
            variant="ghost"
            size="auto"
            id={`sidebar-card-${ann.id}`}
            className={`group p-4 rounded-xl border transition-all cursor-pointer relative scroll-mt-24
                  ${
                    isActive || isEditing
                      ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}
            onClick={handleCardClick}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick();
              }
            }}
            onMouseEnter={() => onHover(ann.id)}
            onMouseLeave={() => onHover(null)}
          >
            <div className="flex items-start gap-2 mb-2">
              <div
                className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 ${(() => {
                  const colorClassMap = {
                    yellow: 'bg-yellow-400',
                    green: 'bg-green-400',
                    blue: 'bg-blue-400',
                    pink: 'bg-pink-400',
                  } as const;
                  const annColor = (ann as unknown as { color?: unknown }).color;
                  const key =
                    annColor === 'yellow' ||
                    annColor === 'green' ||
                    annColor === 'blue' ||
                    annColor === 'pink'
                      ? annColor
                      : 'yellow';
                  return colorClassMap[key];
                })()}`}
              ></div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider line-clamp-1 flex-1">
                {ann.text}
              </div>
            </div>

            {isEditing ? (
              <div className="mt-2 animate-in fade-in zoom-in-95 duration-200">
                <textarea
                  value={editNoteInput}
                  onChange={e => setEditNoteInput(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-3 bg-slate-50"
                  rows={3}
                  autoFocus
                  placeholder={labels.clickToAddNote}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSave(ann.id, editNoteInput);
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={e => {
                      e.stopPropagation();
                      onCancelEdit(ann.id);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {labels.cancel}
                  </Button>
                  <Button
                    type="button"
                    size="auto"
                    onClick={e => {
                      e.stopPropagation();
                      onSave(ann.id, editNoteInput);
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Check className="w-3 h-3" /> {labels.save}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {ann.note ? (
                  <p className="text-sm text-slate-800 leading-relaxed pl-3.5 border-l-2 border-slate-100">
                    {ann.note}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic pl-3.5">{labels.clickToAddNote}</p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(ann.id);
                  }}
                  className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </Button>
        );
      })
    );

  return (
    <>
      <div className="hidden md:flex bg-white flex-col shrink-0 md:w-80 md:border-l md:border-slate-200 md:h-full md:relative md:rounded-none md:shadow-none">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h4 className="font-bold text-slate-700 flex items-center gap-2">
            <Highlighter className="w-4 h-4 text-indigo-500" />
            {labels.annotate}
          </h4>
          <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
            {sidebarAnnotations.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">{list}</div>
      </div>

      <MobileSheet
        isOpen={isOpen}
        onClose={onClose || (() => {})}
        title={labels.annotate}
        height="half"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-extrabold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
            {sidebarAnnotations.length}
          </span>
        </div>
        <div className="space-y-4">{list}</div>
      </MobileSheet>
    </>
  );
};

export default AnnotationSidebar;
