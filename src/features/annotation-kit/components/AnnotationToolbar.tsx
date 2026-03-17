import React, { useState } from 'react';
import { BookOpen, Check, ChevronDown, FileText, Type, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../../components/ui';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../../../components/ui';
import type { AnnotationKitColor, AnnotationToolbarPosition } from '../types';

interface AnnotationToolbarLabels {
  addNote?: string;
  saveToVocab?: string;
  lookup?: string;
  close?: string;
  saving?: string;
  saved?: string;
}

interface AnnotationToolbarProps {
  visible: boolean;
  position: AnnotationToolbarPosition | null;
  selectedColor: AnnotationKitColor;
  selectionText?: string;
  labels?: AnnotationToolbarLabels;
  onAddNote: () => void;
  onHighlight: (color: AnnotationKitColor) => void;
  onColorChange?: (color: AnnotationKitColor) => void;
  onLookup?: () => void;
  onClose: () => void;
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

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  visible,
  position,
  selectedColor,
  selectionText,
  labels,
  onAddNote,
  onHighlight,
  onColorChange,
  onLookup,
  onClose,
  onSaveToVocab,
}) => {
  const { t } = useTranslation();
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
      setTimeout(() => {
        setVocabSaved(false);
        onClose();
      }, 1500);
    } finally {
      setVocabSaving(false);
    }
  };

  const getSaveBtnClass = () => {
    const base =
      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all h-auto ';
    if (vocabSaved) return base + 'bg-emerald-50 text-emerald-600';
    if (vocabSaving) return base + 'bg-muted text-muted-foreground cursor-wait';
    return base + 'hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700';
  };

  return (
    <div
      data-annotation-toolbar
      className="fixed z-50 flex flex-col items-center animate-in zoom-in-95 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="bg-card shadow-xl border border-border rounded-lg flex items-center p-1 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={onAddNote}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground text-sm font-medium transition-colors"
        >
          <FileText className="w-4 h-4 text-muted-foreground" />
          {labels?.addNote || t('addNote', { defaultValue: 'Add note' })}
        </Button>

        <div className="w-px h-4 bg-muted" />

        <div className="relative">
          <DropdownMenu open={showColorPicker} onOpenChange={setShowColorPicker}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              >
                <div className="relative">
                  <Type className="w-4 h-4 text-muted-foreground" />
                  <div
                    className={`absolute -bottom-1 left-0 right-0 h-1 rounded-sm ${COLORS.find(c => c.name === selectedColor)?.indicator || (selectedColor ? '' : 'bg-muted')}`}
                  />
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              unstyled
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card shadow-lg rounded-lg border border-border p-2 flex gap-1 z-[60]"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() => {
                      onColorChange?.(null);
                      onHighlight(null);
                      setShowColorPicker(false);
                    }}
                    aria-label={t('annotationMenu.none', { defaultValue: 'None' })}
                    className={`w-6 h-6 rounded-full border border-border bg-card transition-all ${
                      selectedColor === null ? 'ring-2 ring-slate-400 ring-offset-1' : 'hover:scale-110'
                    }`}
                  />
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent side="top">
                    {t('annotationMenu.none', { defaultValue: 'None' })}
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
              {COLORS.map(color => (
                <Tooltip key={color.name}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={() => {
                        onColorChange?.(color.name);
                        onHighlight(color.name);
                        setShowColorPicker(false);
                      }}
                      aria-label={color.name}
                      className={`w-6 h-6 rounded-full ${color.bgClass} transition-all ${
                        selectedColor === color.name
                          ? `ring-2 ${color.ringClass} ring-offset-1`
                          : 'hover:scale-110'
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent side="top">{color.name}</TooltipContent>
                  </TooltipPortal>
                </Tooltip>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {onLookup && (
          <>
            <div className="w-px h-4 bg-muted" />
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={onLookup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground text-sm font-medium transition-colors"
            >
              {labels?.lookup || t('readingArticle.toolbar.lookup', { defaultValue: 'Lookup' })}
            </Button>
          </>
        )}

        {onSaveToVocab && selectionText && (
          <>
            <div className="w-px h-4 bg-muted" />
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={handleSaveToVocab}
              disabled={vocabSaving || vocabSaved}
              loading={vocabSaving}
              loadingText={labels?.saving || t('annotationMenu.saving', { defaultValue: 'Saving...' })}
              className={getSaveBtnClass()}
            >
              {vocabSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  {labels?.saved || t('saved', { defaultValue: 'Saved' })}
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  {labels?.saveToVocab ||
                    t('annotationMenu.saveToVocab', { defaultValue: 'Save to Vocab' })}
                </>
              )}
            </Button>
          </>
        )}

        <div className="w-px h-4 bg-muted" />
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={onClose}
          aria-label={labels?.close || t('dashboard.common.close', { defaultValue: 'Close' })}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default AnnotationToolbar;
