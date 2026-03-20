import React from 'react';
import AnnotationToolbar from '../features/annotation-kit/components/AnnotationToolbar';
import type { AnnotationSelectionKind } from '../features/annotation-kit/types';

type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | null;

interface AnnotationMenuProps {
  visible: boolean;
  position: { top: number; left: number } | null;
  onAddNote: () => void;
  onHighlight?: (color: HighlightColor) => void;
  selectedColor: HighlightColor;
  setSelectedColor: (val: HighlightColor) => void;
  selectionText?: string;
  selectionKind?: AnnotationSelectionKind;
  onClose: () => void;
  labels: { [key: string]: string };
  onSaveToVocab?: (text: string) => Promise<void>;
}

const AnnotationMenu: React.FC<AnnotationMenuProps> = ({
  visible,
  position,
  onAddNote,
  onHighlight,
  selectedColor,
  setSelectedColor,
  selectionText,
  selectionKind,
  onClose,
  labels,
  onSaveToVocab,
}) => {
  return (
    <AnnotationToolbar
      visible={visible}
      position={position}
      selectedColor={selectedColor}
      selectionText={selectionText}
      selectionKind={selectionKind}
      labels={{
        addNote: labels.addNote,
        sentenceNote: labels.sentenceNote,
        saveToVocab: labels.saveToVocab,
        saving: labels.saving,
        saved: labels.saved,
        close: labels.close,
      }}
      onAddNote={onAddNote}
      onHighlight={color => onHighlight?.(color)}
      onColorChange={setSelectedColor}
      onClose={onClose}
      onSaveToVocab={onSaveToVocab}
    />
  );
};

export default AnnotationMenu;
