import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';
import { Button } from '../../../components/ui';

// \u5de5\u5177\u7c7b\u578b
export type ToolType = 'pen' | 'highlighter' | 'eraser';

// \u5355\u6761\u7ebf\u7684\u6570\u636e\u7ed3\u6784
export interface LineData {
  id: string;
  tool: ToolType;
  points: number[];
  color: string;
  strokeWidth: number;
  opacity: number;
}

// \u753b\u677f\u6570\u636e\u7ed3\u6784
export interface CanvasData {
  lines: LineData[];
  version: number;
}

interface CanvasLayerProps {
  // \u6570\u636e
  data?: CanvasData | null;

  // \u56de\u8c03
  onSave?: (data: CanvasData) => void;
  onChange?: (data: CanvasData) => void;

  // \u6a21\u5f0f
  readOnly?: boolean;

  // \u5de5\u5177\u8bbe\u7f6e（\u5916\u90e8\u63a7\u5236）
  tool?: ToolType;
  color?: string;
  strokeWidth?: number;

  // \u6837\u5f0f
  className?: string;
}

// \u9ed8\u8ba4\u989c\u8272
const DEFAULT_COLORS = {
  pen: '#1e293b', // \u6df1\u7070\u8272
  highlighter: '#fde047', // \u9ec4\u8272Highlight
  eraser: '#ffffff',
};

// \u9ed8\u8ba4\u7ebf\u5bbd
const DEFAULT_STROKE_WIDTH = {
  pen: 2,
  highlighter: 20,
  eraser: 20,
};

// \u9ed8\u8ba4\u900f\u660e\u5ea6
const DEFAULT_OPACITY = {
  pen: 1,
  highlighter: 0.4,
  eraser: 1,
};

/**
 * CanvasLayer - \u901a\u7528\u753b\u677f\u7ec4\u4ef6 (\u6027\u80fd\u4f18\u5316\u7248)
 *
 * \u4f7f\u7528 react-konva \u5b9e\u73b0\u7684\u900f\u660e\u753b\u677f，\u652f\u6301：
 * - \u666e\u901aPen (Pen)
 * - Highlight\u7b14 (Highlighter, \u534a\u900f\u660e\u7c97\u7ebf)
 * - Eraser\u64e6 (Eraser)
 *
 * \u6027\u80fd\u4f18\u5316：
 * - \u4f7f\u7528 ref \u8ffd\u8e2a\u7ed8\u5236\u4e2d\u7684\u7ebf\u6761，\u907f\u514d\u9891\u7e41 setState
 * - \u4f7f\u7528 requestAnimationFrame \u8282\u6d41\u6e32\u67d3
 * - \u76f4\u63a5\u64cd\u4f5c Konva \u8282\u70b9，\u7ed5\u8fc7 React \u6e32\u67d3\u5468\u671f
 */
const CanvasLayerInner: React.FC<CanvasLayerProps> = ({
  data,
  onSave,
  onChange,
  readOnly = false,
  tool = 'pen',
  color,
  strokeWidth,
  className = '',
}) => {
  // \u5bb9\u5668\u5c3a\u5bf8
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // \u753b\u7ebf\u72b6\u6001 - \u4f7f\u7528 ref \u907f\u514d\u9891\u7e41\u6e32\u67d3
  const [lines, setLines] = useState<LineData[]>(() => data?.lines ?? []);
  const isDrawingRef = useRef(false);
  const currentLineRef = useRef<LineData | null>(null);
  const currentKonvaLineRef = useRef<Konva.Line | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);

  // \u7f13\u5b58\u6837\u5f0f\u8ba1\u7b97
  const currentStyle = useMemo(
    () => ({
      color: color || DEFAULT_COLORS[tool],
      strokeWidth: strokeWidth || DEFAULT_STROKE_WIDTH[tool],
      opacity: DEFAULT_OPACITY[tool],
    }),
    [tool, color, strokeWidth]
  );

  // \u76d1\u542c\u5bb9\u5668\u5c3a\u5bf8\u53d8\u5316
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setDimensions({ width: offsetWidth, height: offsetHeight });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // \u751f\u6210\u552f\u4e00 ID
  const generateId = useCallback(
    () => `line-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    []
  );

  // \u901a\u77e5\u6570\u636e\u53d8\u5316
  const notifyChange = useCallback(
    (newLines: LineData[]) => {
      const newData: CanvasData = {
        lines: newLines,
        version: Date.now(),
      };
      onChange?.(newData);
    },
    [onChange]
  );

  // \u652f\u6301 Ctrl+S Save
  useEffect(() => {
    if (readOnly || !onSave) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave({ lines, version: Date.now() });
      }
    };
    globalThis.window.addEventListener('keydown', handleKeyDown);
    return () => globalThis.window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, lines, readOnly]);

  const cursorStyle = useMemo(() => {
    if (readOnly) return 'default';
    return tool === 'eraser' ? 'cell' : 'crosshair';
  }, [readOnly, tool]);

  // \u9f20\u6807\u6309\u4e0b - \u5f00\u59cb\u753b\u7ebf
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (readOnly) return;

      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;

      isDrawingRef.current = true;

      // \u521b\u5efa\u65b0\u7ebf\u6761\u6570\u636e（\u4f7f\u7528\u666e\u901a\u6570\u7ec4，\u540e\u7eed\u76f4\u63a5 push）
      const newLine: LineData = {
        id: generateId(),
        tool,
        points: [pos.x, pos.y],
        color: currentStyle.color,
        strokeWidth: currentStyle.strokeWidth,
        opacity: currentStyle.opacity,
      };

      currentLineRef.current = newLine;

      // \u76f4\u63a5\u521b\u5efa Konva Line \u8282\u70b9\u5e76\u6dfb\u52a0\u5230 layer
      if (layerRef.current) {
        const konvaLine = new Konva.Line({
          points: newLine.points,
          stroke: newLine.color,
          strokeWidth: newLine.strokeWidth,
          opacity: newLine.opacity,
          tension: 0.5,
          lineCap: 'round',
          lineJoin: 'round',
          globalCompositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
        });
        currentKonvaLineRef.current = konvaLine;
        layerRef.current.add(konvaLine);
      }
    },
    [readOnly, tool, currentStyle, generateId]
  );

  // \u9f20\u6807\u79fb\u52a8 - \u7ee7\u7eed\u753b\u7ebf (\u76f4\u63a5\u64cd\u4f5c Konva \u8282\u70b9，\u7ed5\u8fc7 React)
  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isDrawingRef.current || readOnly) return;
      if (!currentLineRef.current || !currentKonvaLineRef.current) return;

      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;

      // \u76f4\u63a5 push \u5230\u6570\u7ec4，\u907f\u514d\u521b\u5efa\u65b0\u6570\u7ec4
      currentLineRef.current.points.push(pos.x, pos.y);

      // \u76f4\u63a5\u66f4\u65b0 Konva \u8282\u70b9\u7684 points，\u5e76\u7acb\u5373\u7ed8\u5236
      currentKonvaLineRef.current.points(currentLineRef.current.points);

      // \u4f7f\u7528 batchDraw \u8fdb\u884c\u9ad8\u6027\u80fd\u7ed8\u5236
      layerRef.current?.batchDraw();
    },
    [readOnly]
  );

  // \u9f20\u6807\u62ac\u8d77 - \u7ed3\u675f\u753b\u7ebf
  const handleMouseUp = useCallback(() => {
    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;

    if (currentLineRef.current && currentKonvaLineRef.current) {
      // \u521b\u5efa\u5b8c\u6210\u7ebf\u6761\u7684\u526f\u672c（\u56e0\u4e3a points \u6570\u7ec4\u4f1a\u88ab\u7ee7\u7eed\u4f7f\u7528）
      const completedLine: LineData = {
        ...currentLineRef.current,
        points: [...currentLineRef.current.points], // \u521b\u5efa\u526f\u672c
      };

      // \u9500\u6bc1\u4e34\u65f6\u521b\u5efa\u7684 Konva \u8282\u70b9（React \u4f1a\u91cd\u65b0\u6e32\u67d3）
      currentKonvaLineRef.current.destroy();
      layerRef.current?.batchDraw();

      // \u66f4\u65b0 React state，\u89e6\u53d1\u91cd\u65b0\u6e32\u67d3
      setLines(prev => {
        const newLines = [...prev, completedLine];
        // \u901a\u77e5\u53d8\u5316
        notifyChange(newLines);
        return newLines;
      });

      // \u6e05\u9664\u5f53\u524d\u7ed8\u5236\u72b6\u6001
      currentLineRef.current = null;
      currentKonvaLineRef.current = null;
    }
  }, [notifyChange]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${className}`}
      style={{
        pointerEvents: readOnly ? 'none' : 'auto',
        touchAction: 'none', // \u9632\u6b62\u89e6\u6478\u6eda\u52a8
      }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        style={{
          cursor: cursorStyle,
        }}
      >
        <Layer ref={layerRef}>
          {lines.map(line => (
            <Line
              key={line.id}
              id={line.id}
              points={line.points}
              stroke={line.color}
              strokeWidth={line.strokeWidth}
              opacity={line.opacity}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

// \u5bfc\u51fa\u5de5\u5177\u680f\u7ec4\u4ef6
export interface CanvasToolbarProps {
  tool: ToolType;
  onToolChange: (tool: ToolType) => void;
  color: string;
  onColorChange: (color: string) => void;
  onUndo: () => void;
  onClear: () => void;
  onSave?: () => void;
  disabled?: boolean;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  tool,
  onToolChange,
  color,
  onColorChange,
  onUndo,
  onClear,
  onSave,
  disabled = false,
}) => {
  const colors = ['#1e293b', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];
  const highlightColors = ['#fde047', '#86efac', '#93c5fd', '#fca5a5'];

  return (
    <div className="flex items-center gap-2 p-2 bg-card/90 backdrop-blur-sm rounded-lg shadow-lg border border-border">
      {/* \u5de5\u5177\u5207\u6362 */}
      <div className="flex bg-muted rounded-lg p-0.5">
        <Button
          variant="ghost"
          size="auto"
          onClick={() => onToolChange('pen')}
          disabled={disabled}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            tool === 'pen'
              ? 'bg-card shadow-sm text-indigo-600'
              : 'text-muted-foreground hover:text-muted-foreground'
          }`}
        >
          ✏️ Pen
        </Button>
        <Button
          variant="ghost"
          size="auto"
          onClick={() => onToolChange('highlighter')}
          disabled={disabled}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            tool === 'highlighter'
              ? 'bg-card shadow-sm text-yellow-600'
              : 'text-muted-foreground hover:text-muted-foreground'
          }`}
        >
          🖍️ Highlight
        </Button>
        <Button
          variant="ghost"
          size="auto"
          onClick={() => onToolChange('eraser')}
          disabled={disabled}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            tool === 'eraser'
              ? 'bg-card shadow-sm text-red-600'
              : 'text-muted-foreground hover:text-muted-foreground'
          }`}
        >
          🧹 Eraser
        </Button>
      </div>

      {/* \u5206\u9694\u7ebf */}
      <div className="w-px h-6 bg-muted" />

      {/* \u989c\u8272\u9009\u62e9 */}
      <div className="flex gap-1">
        {(tool === 'highlighter' ? highlightColors : colors).map(c => (
          <Button
            variant="ghost"
            size="auto"
            key={c}
            onClick={() => onColorChange(c)}
            disabled={disabled || tool === 'eraser'}
            className={`w-6 h-6 rounded-full border-2 transition-all ${
              color === c ? 'border-indigo-500 scale-110' : 'border-transparent hover:scale-105'
            } ${tool === 'eraser' ? 'opacity-30' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* \u5206\u9694\u7ebf */}
      <div className="w-px h-6 bg-muted" />

      {/* \u64cd\u4f5c\u6309\u94ae */}
      <Button
        variant="ghost"
        size="auto"
        onClick={onUndo}
        disabled={disabled}
        className="px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-md transition-all"
      >
        ↩️ Undo
      </Button>
      <Button
        variant="ghost"
        size="auto"
        onClick={onClear}
        disabled={disabled}
        className="px-2 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-all"
      >
        🗑️ Clear
      </Button>

      {onSave && (
        <Button
          variant="ghost"
          size="auto"
          onClick={onSave}
          disabled={disabled}
          className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all shadow-sm"
        >
          💾 Save
        </Button>
      )}
    </div>
  );
};

const CanvasLayer: React.FC<CanvasLayerProps> = props => (
  <CanvasLayerInner key={String(props.data?.version ?? 'empty')} {...props} />
);

export default CanvasLayer;
