import React, { lazy, Suspense } from 'react';
import type { CanvasData, ToolType } from '../../annotation/components/CanvasLayer';

const CanvasLayer = lazy(() => import('../../annotation/components/CanvasLayer'));

// 字体大小类型
type FontSize = 'sm' | 'base' | 'lg';

// 标注数据结构
interface AnnotationData {
  id: string;
  startOffset?: number;
  endOffset?: number;
  text: string;
  color?: string;
  note?: string;
}

interface TextbookViewerProps {
  // 内容数据
  content: string; // 韩语文本内容
  translation?: string; // 翻译内容（可选）
  title?: string; // 标题

  // 显示控制
  pageIndex: number; // 当前页码
  fontSize: FontSize; // 字体大小
  showTranslation?: boolean; // 是否显示翻译

  // 文本标注相关
  annotations?: AnnotationData[]; // 当前页的文本标注
  activeAnnotationId?: string | null; // 当前激活的标注
  hoveredAnnotationId?: string | null; // 当前悬停的标注

  // Canvas 画板相关（新增）
  canvasData?: CanvasData | null; // 画板笔迹数据
  onCanvasChange?: (data: CanvasData) => void; // 画板数据变化回调
  onCanvasSave?: (data: CanvasData) => void; // 画板保存回调
  canvasEnabled?: boolean; // 是否启用画板
  canvasTool?: ToolType; // 画板工具
  canvasColor?: string; // 画板颜色
  canvasReadOnly?: boolean; // 画板只读模式

  // 句子悬停（用于翻译对照）
  hoveredSentenceIndex?: number | null;
  sentenceRanges?: { start: number; end: number }[];
  translationSentences?: string[];

  // 事件回调 - 纯展示组件只暴露事件，不处理逻辑
  onAnnotationClick?: (annotationId: string) => void;
  onSentenceHover?: (index: number | null) => void;

  // 容器 ref（用于文本选择）
  contentRef?: React.RefObject<HTMLDivElement>;
  onTextSelection?: (e: React.MouseEvent) => void;

  // 选中颜色（用于 CSS 样式）
  selectedColor?: string;
}

/**
 * TextbookViewer - 纯展示组件
 *
 * 职责：
 * - 渲染教科书内容（韩语文本 + 可选翻译）
 * - 显示文本标注高亮
 * - 支持句子悬停对照
 * - 集成 Canvas 画板层
 *
 * 不包含：
 * - API 请求
 * - 状态管理逻辑
 * - 副作用
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
  // Canvas 相关
  canvasData,
  onCanvasChange,
  onCanvasSave,
  canvasEnabled = false,
  canvasTool = 'pen',
  canvasColor,
  canvasReadOnly = false,
  // 其他
  hoveredSentenceIndex,
  sentenceRanges = [],
  translationSentences = [],
  onAnnotationClick,
  onSentenceHover,
  contentRef,
  onTextSelection,
  selectedColor,
}) => {
  // 字体大小样式类
  const textSizeClass = fontSize === 'sm' ? 'text-base' : fontSize === 'lg' ? 'text-xl' : 'text-lg';
  const lineHeightClass =
    fontSize === 'sm' ? 'leading-relaxed' : fontSize === 'lg' ? 'leading-loose' : 'leading-loose';

  /**
   * 渲染带标注高亮的文本
   */
  const renderHighlightedText = (fullText: string) => {
    if (!fullText) return null;

    // 构建字符到标注的映射
    const charMap: { annotation?: AnnotationData }[] = new Array(fullText.length).fill({});
    annotations.forEach(ann => {
      if (ann.startOffset === undefined || ann.endOffset === undefined) return;
      for (let i = ann.startOffset; i < ann.endOffset; i++) {
        if (i < fullText.length) {
          charMap[i] = { annotation: ann };
        }
      }
    });

    // 计算悬停句子范围
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

      // 找到相同属性的连续字符
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
      {/* 韩语文本区域 - 使用 relative 定位以支持 Canvas 覆盖层 */}
      <div
        className={`flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden`}
      >
        {/* 文本内容层 */}
        <div
          ref={contentRef}
          className={`p-8 md:p-12 ${selectedColor ? `selection-${selectedColor}` : ''}`}
          onMouseUp={canvasEnabled ? undefined : onTextSelection}
        >
          {title && (
            <div className="mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">{title}</h2>
              <span className="text-xs text-slate-400">Page {pageIndex + 1}</span>
            </div>
          )}
          <div
            className={`${textSizeClass} ${lineHeightClass} text-slate-800 font-serif whitespace-pre-line select-text`}
          >
            {renderHighlightedText(content)}
          </div>
        </div>

        {/* Canvas 画板覆盖层 - z-index 最高 */}
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

      {/* 翻译区域（可选） */}
      {showTranslation && translation && (
        <div className="flex-1 min-w-0 bg-slate-50 rounded-2xl border border-slate-200/60 p-8 md:p-12 overflow-y-auto">
          <div className="sticky top-0 bg-slate-50 pb-4 border-b border-slate-200 mb-6 z-10 flex items-center gap-2 text-slate-400 font-bold text-sm uppercase tracking-widest">
            Translation
          </div>
          {translationSentences.length > 0 ? (
            translationSentences.map((sentence, idx) => {
              const isHovered = hoveredSentenceIndex === idx;
              return (
                <p
                  key={idx}
                  className={`mb-6 text-slate-600 ${lineHeightClass} text-base transition-all duration-200 cursor-pointer p-3 rounded-xl border border-transparent ${
                    isHovered
                      ? 'bg-indigo-50 border-indigo-100 text-indigo-900 shadow-sm'
                      : 'hover:bg-slate-100'
                  }`}
                  onMouseEnter={() => onSentenceHover?.(idx)}
                  onMouseLeave={() => onSentenceHover?.(null)}
                >
                  {sentence}
                </p>
              );
            })
          ) : (
            <p className="text-slate-600 leading-relaxed">{translation}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TextbookViewer;
