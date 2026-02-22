import React, { lazy, Suspense } from 'react';
import type { CanvasData, ToolType } from '../../annotation/components/CanvasLayer';

const CanvasLayer = lazy(() => import('../../annotation/components/CanvasLayer'));

// \u5b57\u4f53\u5927\u5c0f\u7c7b\u578b
type FontSize = 'sm' | 'base' | 'lg';

// \u6807\u6ce8\u6570\u636e\u7ed3\u6784
interface AnnotationData {
  id: string;
  startOffset?: number;
  endOffset?: number;
  text: string;
  color?: string;
  note?: string;
}

interface TextbookViewerProps {
  // \u5185\u5bb9\u6570\u636e
  content: string; // \u97e9\u8bed\u6587\u672c\u5185\u5bb9
  translation?: string; // \u7ffb\u8bd1\u5185\u5bb9（\u53ef\u9009）
  title?: string; // \u6807\u9898

  // \u663e\u793a\u63a7\u5236
  pageIndex: number; // \u5f53\u524d\u9875\u7801
  fontSize: FontSize; // \u5b57\u4f53\u5927\u5c0f
  showTranslation?: boolean; // \u662f\u5426\u663e\u793a\u7ffb\u8bd1

  // \u6587\u672c\u6807\u6ce8\u76f8\u5173
  annotations?: AnnotationData[]; // \u5f53\u524d\u9875\u7684\u6587\u672c\u6807\u6ce8
  activeAnnotationId?: string | null; // \u5f53\u524d\u6fc0\u6d3b\u7684\u6807\u6ce8
  hoveredAnnotationId?: string | null; // \u5f53\u524d\u60ac\u505c\u7684\u6807\u6ce8

  // Canvas \u753b\u677f\u76f8\u5173（\u65b0\u589e）
  canvasData?: CanvasData | null; // \u753b\u677f\u7b14\u8ff9\u6570\u636e
  onCanvasChange?: (data: CanvasData) => void; // \u753b\u677f\u6570\u636e\u53d8\u5316\u56de\u8c03
  onCanvasSave?: (data: CanvasData) => void; // \u753b\u677f\u4fdd\u5b58\u56de\u8c03
  canvasEnabled?: boolean; // \u662f\u5426\u542f\u7528\u753b\u677f
  canvasTool?: ToolType; // \u753b\u677f\u5de5\u5177
  canvasColor?: string; // \u753b\u677f\u989c\u8272
  canvasReadOnly?: boolean; // \u753b\u677f\u53ea\u8bfb\u6a21\u5f0f

  // \u53e5\u5b50\u60ac\u505c（\u7528\u4e8e\u7ffb\u8bd1\u5bf9\u7167）
  hoveredSentenceIndex?: number | null;
  sentenceRanges?: { start: number; end: number }[];
  translationSentences?: string[];

  // \u4e8b\u4ef6\u56de\u8c03 - \u7eaf\u5c55\u793a\u7ec4\u4ef6\u53ea\u66b4\u9732\u4e8b\u4ef6，\u4e0d\u5904\u7406\u903b\u8f91
  onAnnotationClick?: (annotationId: string) => void;
  onSentenceHover?: (index: number | null) => void;

  // \u5bb9\u5668 ref（\u7528\u4e8e\u6587\u672c\u9009\u62e9）
  contentRef?: React.RefObject<HTMLDivElement>;
  onTextSelection?: (e: React.MouseEvent) => void;

  // \u9009\u4e2d\u989c\u8272（\u7528\u4e8e CSS \u6837\u5f0f）
  selectedColor?: string;
}

/**
 * TextbookViewer - \u7eaf\u5c55\u793a\u7ec4\u4ef6
 *
 * \u804c\u8d23：
 * - \u6e32\u67d3\u6559\u79d1\u4e66\u5185\u5bb9（\u97e9\u8bed\u6587\u672c + \u53ef\u9009\u7ffb\u8bd1）
 * - \u663e\u793a\u6587\u672c\u6807\u6ce8\u9ad8\u4eae
 * - \u652f\u6301\u53e5\u5b50\u60ac\u505c\u5bf9\u7167
 * - \u96c6\u6210 Canvas \u753b\u677f\u5c42
 *
 * \u4e0d\u5305\u542b：
 * - API \u8bf7\u6c42
 * - \u72b6\u6001\u7ba1\u7406\u903b\u8f91
 * - \u526f\u4f5c\u7528
 */
const TextbookViewer: React.FC<TextbookViewerProps> = ({
  content,
  translation,
  title,
  pageIndex,
  fontSize,
  showTranslation = false,
  annotations = [],
  activeAnnotationId,
  hoveredAnnotationId,
  // Canvas \u76f8\u5173
  canvasData,
  onCanvasChange,
  onCanvasSave,
  canvasEnabled = false,
  canvasTool = 'pen',
  canvasColor,
  canvasReadOnly = false,
  // \u5176\u4ed6
  hoveredSentenceIndex,
  sentenceRanges = [],
  translationSentences = [],
  onAnnotationClick,
  onSentenceHover,
  contentRef,
  onTextSelection,
  selectedColor,
}) => {
  // \u5b57\u4f53\u5927\u5c0f\u6837\u5f0f\u7c7b
  const textSizeClass = fontSize === 'sm' ? 'text-base' : fontSize === 'lg' ? 'text-xl' : 'text-lg';
  const lineHeightClass =
    fontSize === 'sm' ? 'leading-relaxed' : fontSize === 'lg' ? 'leading-loose' : 'leading-loose';

  /**
   * \u6e32\u67d3\u5e26\u6807\u6ce8\u9ad8\u4eae\u7684\u6587\u672c
   */
  const renderHighlightedText = (fullText: string) => {
    if (!fullText) return null;

    // \u6784\u5efa\u5b57\u7b26\u5230\u6807\u6ce8\u7684\u6620\u5c04
    const charMap: { annotation?: AnnotationData }[] = new Array(fullText.length).fill({});
    annotations.forEach(ann => {
      if (ann.startOffset === undefined || ann.endOffset === undefined) return;
      for (let i = ann.startOffset; i < ann.endOffset; i++) {
        if (i < fullText.length) {
          charMap[i] = { annotation: ann };
        }
      }
    });

    // \u8ba1\u7b97\u60ac\u505c\u53e5\u5b50\u8303\u56f4
    let hoverStart = -1;
    let hoverEnd = -1;
    if (
      hoveredSentenceIndex !== null &&
      hoveredSentenceIndex !== undefined &&
      sentenceRanges[hoveredSentenceIndex]
    ) {
      hoverStart = sentenceRanges[hoveredSentenceIndex].start;
      hoverEnd = sentenceRanges[hoveredSentenceIndex].end;
    }

    const result: React.ReactNode[] = [];
    let i = 0;

    while (i < fullText.length) {
      const currentAnn = charMap[i].annotation;
      const isHovered = i >= hoverStart && i < hoverEnd;

      // \u627e\u5230\u76f8\u540c\u5c5e\u6027\u7684\u8fde\u7eed\u5b57\u7b26
      let j = i + 1;
      while (j < fullText.length) {
        const nextAnn = charMap[j].annotation;
        const nextHover = j >= hoverStart && j < hoverEnd;
        if (nextAnn !== currentAnn || nextHover !== isHovered) break;
        j++;
      }

      const segmentText = fullText.slice(i, j);
      let className = 'relative rounded px-0 py-0.5 box-decoration-clone transition-all ';

      if (currentAnn) {
        const isActive =
          activeAnnotationId === currentAnn.id || hoveredAnnotationId === currentAnn.id;
        const hasNote = !!(currentAnn.note && currentAnn.note.trim());

        const colorMap: { [key: string]: { border: string; bg: string; activeBg: string } } = {
          yellow: { border: 'border-yellow-400', bg: 'bg-yellow-100', activeBg: 'bg-yellow-300' },
          green: { border: 'border-green-400', bg: 'bg-green-100', activeBg: 'bg-green-300' },
          blue: { border: 'border-blue-400', bg: 'bg-blue-100', activeBg: 'bg-blue-300' },
          pink: { border: 'border-pink-400', bg: 'bg-pink-100', activeBg: 'bg-pink-300' },
        };
        const colors = colorMap[currentAnn.color || 'yellow'] || colorMap['yellow'];

        className += 'cursor-pointer ';
        if (isActive) {
          className += `rounded-sm ${colors.activeBg} ring-2 ring-${currentAnn.color || 'yellow'}-500 transition-all `;
        } else if (hasNote) {
          // Note: Standard Underline
          className += `border-b-2 ${colors.border} hover:bg-opacity-50 hover:${colors.bg} `;
        } else {
          // Highlight: Color block
          className += `rounded-sm ${colors.activeBg}/60 hover:${colors.activeBg} `;
        }

        result.push(
          <span
            key={i}
            id={`annotation-${currentAnn.id}`}
            className={className}
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              onAnnotationClick?.(currentAnn.id);
            }}
          >
            {segmentText}
          </span>
        );
      } else {
        if (isHovered) {
          className += 'bg-indigo-50/50 ring-1 ring-indigo-100 ';
          result.push(
            <span key={i} className={className}>
              {segmentText}
            </span>
          );
        } else {
          result.push(<span key={i}>{segmentText}</span>);
        }
      }
      i = j;
    }

    return result;
  };

  return (
    <div
      className={`flex gap-10 h-full transition-all duration-500 ${showTranslation ? 'max-w-full' : 'max-w-4xl mx-auto'}`}
    >
      {/* \u97e9\u8bed\u6587\u672c\u533a\u57df - \u4f7f\u7528 relative \u5b9a\u4f4d\u4ee5\u652f\u6301 Canvas \u8986\u76d6\u5c42 */}
      <div
        className={`flex-1 min-w-0 bg-card rounded-2xl shadow-sm border border-border relative overflow-hidden`}
      >
        {/* \u6587\u672c\u5185\u5bb9\u5c42 */}
        <div
          ref={contentRef}
          className={`p-8 md:p-12 ${selectedColor ? `selection-${selectedColor}` : ''}`}
          onMouseUp={canvasEnabled ? undefined : onTextSelection}
        >
          {title && (
            <div className="mb-6 pb-4 border-b border-border">
              <h2 className="text-xl font-bold text-muted-foreground">{title}</h2>
              <span className="text-xs text-muted-foreground">Page {pageIndex + 1}</span>
            </div>
          )}
          <div
            className={`${textSizeClass} ${lineHeightClass} text-muted-foreground font-serif whitespace-pre-line select-text`}
          >
            {renderHighlightedText(content)}
          </div>
        </div>

        {/* Canvas \u753b\u677f\u8986\u76d6\u5c42 - z-index \u6700\u9ad8 */}
        {canvasEnabled && (
          <Suspense fallback={null}>
            <CanvasLayer
              data={canvasData}
              onChange={onCanvasChange}
              onSave={onCanvasSave}
              readOnly={canvasReadOnly}
              tool={canvasTool}
              color={canvasColor}
              className="z-50"
            />
          </Suspense>
        )}
      </div>

      {/* \u7ffb\u8bd1\u533a\u57df（\u53ef\u9009） */}
      {showTranslation && translation && (
        <div className="flex-1 min-w-0 bg-muted rounded-2xl border border-border/60 p-8 md:p-12 overflow-y-auto">
          <div className="sticky top-0 bg-muted pb-4 border-b border-border mb-6 z-10 flex items-center gap-2 text-muted-foreground font-bold text-sm uppercase tracking-widest">
            Translation
          </div>
          {translationSentences.length > 0 ? (
            translationSentences.map((sentence, idx) => {
              const isHovered = hoveredSentenceIndex === idx;
              return (
                <p
                  key={idx}
                  className={`mb-6 text-muted-foreground ${lineHeightClass} text-base transition-all duration-200 cursor-pointer p-3 rounded-xl border border-transparent ${
                    isHovered
                      ? 'bg-indigo-50 border-indigo-100 text-indigo-900 shadow-sm'
                      : 'hover:bg-muted'
                  }`}
                  onMouseEnter={() => onSentenceHover?.(idx)}
                  onMouseLeave={() => onSentenceHover?.(null)}
                >
                  {sentence}
                </p>
              );
            })
          ) : (
            <p className="text-muted-foreground leading-relaxed">{translation}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TextbookViewer;
