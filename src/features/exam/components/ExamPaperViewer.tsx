import React, { useState, useCallback } from 'react';
import { TopikQuestion, Language, Annotation } from '../../../../types';
import { QuestionRenderer } from '../../../../components/topik/QuestionRenderer';
import CanvasLayer, { CanvasData, ToolType, CanvasToolbar } from '../../annotation/components/CanvasLayer';

interface ExamPaperViewerProps {
    // 题目数据
    questions: TopikQuestion[];
    currentQuestionIndex: number;

    // 答题状态
    userAnswers: Record<number, number>;
    onAnswerChange?: (questionIndex: number, optionIndex: number) => void;

    // 显示控制
    language: Language;
    showCorrect?: boolean;

    // 画板模式
    isDrawing: boolean;
    onDrawingChange?: (isDrawing: boolean) => void;

    // 画板数据
    canvasData?: CanvasData | null;
    onCanvasChange?: (data: CanvasData) => void;
    onCanvasSave?: (data: CanvasData) => void;

    // 标注（用于文本高亮）
    annotations?: Annotation[];
    onTextSelect?: (e: React.MouseEvent) => void;
    activeAnnotationId?: string | null;
    contextPrefix?: string;
}

/**
 * ExamPaperViewer - 可以画画的试卷组件
 * 
 * 结构：
 * - 底层 (z-0): QuestionRenderer 显示题目
 * - 顶层 (z-10): CanvasLayer 画板
 * 
 * 交互：
 * - isDrawing=true: 画板可交互，题目不可点击
 * - isDrawing=false: 画板透明穿透，题目可点击
 */
const ExamPaperViewer: React.FC<ExamPaperViewerProps> = ({
    questions,
    currentQuestionIndex,
    userAnswers,
    onAnswerChange,
    language,
    showCorrect = false,
    isDrawing,
    onDrawingChange,
    canvasData,
    onCanvasChange,
    onCanvasSave,
    annotations = [],
    onTextSelect,
    activeAnnotationId,
    contextPrefix = 'exam',
}) => {
    // 画板工具状态
    const [canvasTool, setCanvasTool] = useState<ToolType>('pen');
    const [canvasColor, setCanvasColor] = useState('#1e293b');

    // 本地画板数据（用于未保存的临时状态）
    const [localCanvasData, setLocalCanvasData] = useState<CanvasData | null>(null);

    // 当前显示的题目
    const currentQuestion = questions[currentQuestionIndex];

    // 处理答案选择
    const handleAnswerChange = useCallback((optionIndex: number) => {
        onAnswerChange?.(currentQuestionIndex, optionIndex);
    }, [currentQuestionIndex, onAnswerChange]);

    // 处理画板数据变化
    const handleCanvasChange = useCallback((data: CanvasData) => {
        setLocalCanvasData(data);
        onCanvasChange?.(data);
    }, [onCanvasChange]);

    // 撤销
    const handleUndo = useCallback(() => {
        setLocalCanvasData(prev => {
            if (!prev || prev.lines.length === 0) return prev;
            const newData = {
                lines: prev.lines.slice(0, -1),
                version: Date.now(),
            };
            onCanvasChange?.(newData);
            return newData;
        });
    }, [onCanvasChange]);

    // 清空
    const handleClear = useCallback(() => {
        const newData = { lines: [], version: Date.now() };
        setLocalCanvasData(newData);
        onCanvasChange?.(newData);
    }, [onCanvasChange]);

    // 保存
    const handleSave = useCallback(() => {
        const data = localCanvasData || canvasData;
        if (data) {
            onCanvasSave?.(data);
        }
    }, [localCanvasData, canvasData, onCanvasSave]);

    // 同步外部数据
    React.useEffect(() => {
        if (canvasData) {
            setLocalCanvasData(canvasData);
        }
    }, [canvasData]);

    if (!currentQuestion) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                没有题目可显示
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            {/* 底层：题目渲染 (z-0) */}
            <div className="relative z-0 p-6">
                <QuestionRenderer
                    question={currentQuestion}
                    questionIndex={currentQuestionIndex}
                    userAnswer={userAnswers[currentQuestionIndex]}
                    correctAnswer={showCorrect ? currentQuestion.correctAnswer : undefined}
                    language={language}
                    showCorrect={showCorrect}
                    onAnswerChange={isDrawing ? undefined : handleAnswerChange}
                    onTextSelect={isDrawing ? undefined : onTextSelect}
                    annotations={annotations}
                    activeAnnotationId={activeAnnotationId}
                    contextPrefix={contextPrefix}
                />
            </div>

            {/* 顶层：画板 (z-10) */}
            <div
                className="absolute inset-0 z-10"
                style={{
                    pointerEvents: isDrawing ? 'auto' : 'none',
                }}
            >
                <CanvasLayer
                    data={localCanvasData || canvasData}
                    onChange={handleCanvasChange}
                    onSave={onCanvasSave}
                    readOnly={!isDrawing}
                    tool={canvasTool}
                    color={canvasColor}
                />
            </div>

            {/* 画板工具栏（绘图模式下显示） */}
            {isDrawing && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                    <CanvasToolbar
                        tool={canvasTool}
                        onToolChange={setCanvasTool}
                        color={canvasColor}
                        onColorChange={setCanvasColor}
                        onUndo={handleUndo}
                        onClear={handleClear}
                        onSave={onCanvasSave ? handleSave : undefined}
                    />
                </div>
            )}

            {/* 画板模式切换按钮（右上角） */}
            <button
                onClick={() => onDrawingChange?.(!isDrawing)}
                className={`absolute top-4 right-4 z-20 px-4 py-2 rounded-lg font-medium transition-all shadow-lg ${isDrawing
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
            >
                {isDrawing ? '✏️ 退出画板' : '📝 进入画板'}
            </button>
        </div>
    );
};

export default ExamPaperViewer;
