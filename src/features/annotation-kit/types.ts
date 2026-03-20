export type AnnotationKitColor = 'yellow' | 'green' | 'blue' | 'pink' | null;
export type AnnotationSelectionKind = 'word' | 'phrase' | 'sentence';

export interface AnnotationAnchor {
  blockId: string;
  start: number;
  end: number;
  quote: string;
  contextBefore: string;
  contextAfter: string;
}

export interface AnnotationToolbarPosition {
  top: number;
  left: number;
}

export interface AnnotationToolbarState {
  visible: boolean;
  position: AnnotationToolbarPosition | null;
  selectionText: string;
  anchor: AnnotationAnchor | null;
  selectionKind?: AnnotationSelectionKind;
}
