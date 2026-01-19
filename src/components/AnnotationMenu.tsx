import React, { useState } from 'react';
import { FileText, Type, ChevronDown, BookOpen, Loader2, Check } from 'lucide-react';

interface AnnotationMenuProps {
  visible: boolean;
  position: { top: number; left: number } | null;
  onAddNote: () => void;
  onHighlight?: (color: 'yellow' | 'green' | 'blue' | 'pink' | null) => void;
  selectedColor: 'yellow' | 'green' | 'blue' | 'pink' | null;
  setSelectedColor: (val: 'yellow' | 'green' | 'blue' | 'pink' | null) => void;
  onSaveWord?: (text: string) => void;
  selectionText?: string;
  onClose: () => void;
  onDelete?: () => void;
  labels: { [key: string]: string };
  // New: For saving to vocab notebook
  onSaveToVocab?: (text: string) => Promise<void>;
}

const COLORS = [
  {
    name: 'yellow',
    bgClass: 'bg-yellow-300',
    ringClass: 'ring-yellow-500',
    indicator: 'bg-yellow-400',
  },
  {
    name: 'green',
    bgClass: 'bg-green-300',
    ringClass: 'ring-green-500',
    indicator: 'bg-green-400',
  },
  { name: 'blue', bgClass: 'bg-blue-300', ringClass: 'ring-blue-500', indicator: 'bg-blue-400' },
  { name: 'pink', bgClass: 'bg-pink-300', ringClass: 'ring-pink-500', indicator: 'bg-pink-400' },
] as const;

const AnnotationMenu: React.FC<AnnotationMenuProps> = ({
  visible,
  position,
  onAddNote,
  onHighlight,
  selectedColor,
  setSelectedColor,
  selectionText,
  onClose,
  labels,
  onSaveToVocab,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [vocabSaving, setVocabSaving] = useState(false);
  const [vocabSaved, setVocabSaved] = useState(false);

  if (!visible || !position) return null;

  const handleSaveToVocab = async () => {
    if (!selectionText || !onSaveToVocab || vocabSaving || vocabSaved) return;

    setVocabSaving(true);
    try {
      await onSaveToVocab(selectionText);
      setVocabSaved(true);
      // Reset after 2s
      setTimeout(() => {
        setVocabSaved(false);
        onClose();
      }, 1500);
    } catch (e) {
      console.error('[Vocab] Save failed:', e);
      setVocabSaving(false);
    }
  };

  return (
    <div
      className="fixed z-50 flex flex-col items-center animate-in zoom-in-95 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      {/* Color Picker Dropdown (Above) */}
      {showColorPicker && (
        <div className="mb-2 bg-white shadow-lg rounded-lg border border-slate-200 p-2 flex gap-1 animate-in slide-in-from-bottom-2">
          <button
            onClick={() => {
              setSelectedColor(null);
              if (onHighlight) onHighlight(null);
              setShowColorPicker(false);
            }}
            className={`w-6 h-6 rounded-full border border-slate-200 bg-white transition-all ${
              selectedColor === null ? 'ring-2 ring-slate-400 ring-offset-1' : 'hover:scale-110'
            }`}
            title="None"
          />
          {COLORS.map(color => (
            <button
              key={color.name}
              onClick={() => {
                setSelectedColor(color.name);
                if (onHighlight) onHighlight(color.name);
                setShowColorPicker(false);
              }}
              className={`w-6 h-6 rounded-full ${color.bgClass} transition-all ${
                selectedColor === color.name
                  ? `ring-2 ${color.ringClass} ring-offset-1`
                  : 'hover:scale-110'
              }`}
              title={color.name}
            />
          ))}
        </div>
      )}

      {/* Main Toolbar */}
      <div className="bg-white shadow-xl border border-slate-200 rounded-lg flex items-center p-1 gap-1">
        {/* Add Note Button */}
        <button
          onClick={() => {
            onAddNote();
            onClose();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors"
        >
          <FileText className="w-4 h-4 text-slate-500" />
          {labels.addNote || '添加笔记'}
        </button>

        <div className="w-px h-4 bg-slate-200"></div>

        {/* Color/Highlight Button */}
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
        >
          <div className="relative">
            <Type className="w-4 h-4 text-slate-700" />
            <div
              className={`absolute -bottom-1 left-0 right-0 h-1 rounded-sm ${COLORS.find(c => c.name === selectedColor)?.indicator || (selectedColor ? '' : 'bg-slate-200')}`}
            ></div>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {/* Save to Vocab Button - Only show if callback provided */}
        {onSaveToVocab && selectionText && (
          <>
            <div className="w-px h-4 bg-slate-200"></div>
            <button
              onClick={handleSaveToVocab}
              disabled={vocabSaving || vocabSaved}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                vocabSaved
                  ? 'bg-emerald-50 text-emerald-600'
                  : vocabSaving
                    ? 'bg-slate-50 text-slate-400 cursor-wait'
                    : 'hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700'
              }`}
            >
              {vocabSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  已保存
                </>
              ) : vocabSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  {labels.saveToVocab || '存入生词本'}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AnnotationMenu;
