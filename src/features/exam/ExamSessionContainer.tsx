import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import { useApi } from '../../../hooks/useApi';
import { TopikExam, Language } from '../../../types';
import ExamPaperViewer from './components/ExamPaperViewer';
import { CanvasData } from '../annotation/components/CanvasLayer';
import { ChevronLeft, ChevronRight, Hand, Pencil, ArrowLeft, Clock } from 'lucide-react';

interface ExamSessionContainerProps {
    language?: Language;
}

/**
 * ExamSessionContainer - 考试会话页面级组件
 * 
 * 功能：
 * - 获取试卷数据
 * - 管理当前题号和用户答案
 * - 切换答题/草稿模式
 * - 自动加载/保存画板笔记
 */
const ExamSessionContainer: React.FC<ExamSessionContainerProps> = ({
    language = 'ko' as Language,
}) => {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();

    // 试卷数据
    const { data: exam, loading: examLoading, execute: fetchExam } = useApi<TopikExam>(
        async (id: string) => {
            const exams = await api.getTopikExams();
            return exams.find((e: TopikExam) => e.id === id) || null;
        }
    );

    // 当前题号
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // 用户答案
    const [answers, setAnswers] = useState<Record<number, number>>({});

    // 绘图模式
    const [isDrawing, setIsDrawing] = useState(false);

    // 画板数据
    const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
    const [canvasLoading, setCanvasLoading] = useState(false);
    const [canvasSaving, setCanvasSaving] = useState(false);

    // 考试计时（可选）
    const [elapsedTime, setElapsedTime] = useState(0);

    // 获取试卷数据
    useEffect(() => {
        if (examId) {
            fetchExam(examId);
        }
    }, [examId, fetchExam]);

    // 获取当前题目的画板笔记
    const fetchCanvasAnnotation = useCallback(async () => {
        if (!examId) return;

        setCanvasLoading(true);
        try {
            const annotations = await api.getCanvasAnnotations({
                targetId: examId,
                targetType: 'EXAM',
                pageIndex: currentQuestionIndex,
            });

            if (annotations && annotations.length > 0) {
                setCanvasData(annotations[0].data as CanvasData);
            } else {
                setCanvasData(null);
            }
        } catch (error) {
            console.error('Failed to fetch canvas annotation:', error);
            setCanvasData(null);
        } finally {
            setCanvasLoading(false);
        }
    }, [examId, currentQuestionIndex]);

    // 切题时加载画板数据
    useEffect(() => {
        fetchCanvasAnnotation();
    }, [fetchCanvasAnnotation]);

    // 保存画板笔记
    const handleCanvasSave = useCallback(async (data: CanvasData) => {
        if (!examId) return;

        setCanvasSaving(true);
        try {
            await api.saveCanvasAnnotation({
                targetId: examId,
                targetType: 'EXAM',
                pageIndex: currentQuestionIndex,
                data,
            });
            console.log('[ExamSession] Canvas saved');
        } catch (error) {
            console.error('Failed to save canvas annotation:', error);
        } finally {
            setCanvasSaving(false);
        }
    }, [examId, currentQuestionIndex]);

    // 处理画板数据变化（带防抖保存）
    const canvasSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const handleCanvasChange = useCallback((data: CanvasData) => {
        setCanvasData(data);

        // 防抖保存（2秒）
        if (canvasSaveTimeoutRef.current) {
            clearTimeout(canvasSaveTimeoutRef.current);
        }
        canvasSaveTimeoutRef.current = setTimeout(() => {
            handleCanvasSave(data);
        }, 2000);
    }, [handleCanvasSave]);

    // 处理答案选择
    const handleAnswerChange = useCallback((questionIndex: number, optionIndex: number) => {
        setAnswers(prev => ({
            ...prev,
            [questionIndex]: optionIndex,
        }));
    }, []);

    // 翻页
    const totalQuestions = exam?.questions?.length || 0;
    const canGoPrev = currentQuestionIndex > 0;
    const canGoNext = currentQuestionIndex < totalQuestions - 1;

    const goToPrevQuestion = useCallback(() => {
        if (canGoPrev) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    }, [canGoPrev]);

    const goToNextQuestion = useCallback(() => {
        if (canGoNext) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }, [canGoNext]);

    // 计时器
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // 组件卸载时保存未保存的数据
    useEffect(() => {
        return () => {
            if (canvasSaveTimeoutRef.current) {
                clearTimeout(canvasSaveTimeoutRef.current);
            }
        };
    }, []);

    // 加载中
    if (examLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4 mx-auto" />
                    <p className="text-slate-500">加载试卷中...</p>
                </div>
            </div>
        );
    }

    // 试卷不存在
    if (!exam) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <p className="text-slate-500 mb-4">试卷不存在</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        返回
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* 顶部工具栏 */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        返回
                    </button>
                    <div className="h-6 w-px bg-slate-200" />
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 truncate max-w-md">
                            {exam.title}
                        </h1>
                        <p className="text-xs text-slate-400">
                            第 {currentQuestionIndex + 1} / {totalQuestions} 题
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* 计时器 */}
                    <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono text-sm">{formatTime(elapsedTime)}</span>
                    </div>

                    {/* 答题/草稿模式切换 */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setIsDrawing(false)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${!isDrawing
                                ? 'bg-white shadow-sm text-indigo-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Hand className="w-4 h-4" />
                            🖐️ 答题
                        </button>
                        <button
                            onClick={() => setIsDrawing(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${isDrawing
                                ? 'bg-white shadow-sm text-amber-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Pencil className="w-4 h-4" />
                            ✏️ 草稿
                        </button>
                    </div>

                    {/* 保存状态 */}
                    {canvasSaving && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            保存中...
                        </span>
                    )}
                </div>
            </header>

            {/* 主内容区域 */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto py-6">
                    <ExamPaperViewer
                        questions={exam.questions || []}
                        currentQuestionIndex={currentQuestionIndex}
                        userAnswers={answers}
                        onAnswerChange={handleAnswerChange}
                        language={language}
                        showCorrect={false}
                        isDrawing={isDrawing}
                        onDrawingChange={setIsDrawing}
                        canvasData={canvasData}
                        onCanvasChange={handleCanvasChange}
                        onCanvasSave={handleCanvasSave}
                        contextPrefix={`exam-${examId}`}
                    />
                </div>
            </main>

            {/* 底部导航 */}
            <footer className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between sticky bottom-0 z-30 shadow-lg">
                <button
                    onClick={goToPrevQuestion}
                    disabled={!canGoPrev}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${canGoPrev
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                        }`}
                >
                    <ChevronLeft className="w-5 h-5" />
                    上一题
                </button>

                {/* 题号快速跳转 */}
                <div className="flex items-center gap-2 overflow-x-auto max-w-md">
                    {Array.from({ length: totalQuestions }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentQuestionIndex(i)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${i === currentQuestionIndex
                                ? 'bg-indigo-600 text-white'
                                : answers[i] !== undefined
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>

                <button
                    onClick={goToNextQuestion}
                    disabled={!canGoNext}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${canGoNext
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                        : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                        }`}
                >
                    下一题
                    <ChevronRight className="w-5 h-5" />
                </button>
            </footer>
        </div>
    );
};

export default ExamSessionContainer;
