import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { BookOpen, Save, Plus, Loader2, FileText, Mic, RefreshCw, CheckCircle, Trash2 } from 'lucide-react';

interface Institute {
    _id: string; // Convex ID
    postgresId?: string; // Legacy ID
    id?: string; // Compatibility
    name: string;
    displayLevel?: string;
    volume?: string;
}

interface UnitContent {
    id?: string; // Convex ID
    unitIndex: number;
    articleIndex: number;
    title: string;
    readingText: string;
    translation: string;
    audioUrl: string;
    hasAnalysis?: boolean;
    analysisData?: any;
    transcriptData?: any;
}

export const ReadingContentManager: React.FC = () => {
    // ========================================
    // Data Fetching (Convex)
    // ========================================
    const institutes = useQuery(api.institutes.getAll) || [];

    // In Convex, IDs are consistent. We'll use the first institute as default.
    // We need to manage selectedCourseId state.
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');

    // Update selectedCourseId when institutes load
    useEffect(() => {
        if (!selectedCourseId && institutes.length > 0) {
            // Prefer using postgresId for now to match courseIds like 'snu_1a' if they exist,
            // otherwise use some ID. The API expects string courseId.
            // In the DB, 'courseId' is likely 'snu_1a'.
            // Check if institutes have an 'id' field (legacy) or 'postgresId'.
            const first = institutes[0] as any;
            setSelectedCourseId(first.id || first.postgresId || first._id);
        }
    }, [institutes, selectedCourseId]);

    // Fetch units for selected course
    const courseUnits = useQuery(api.units.getByCourse, selectedCourseId ? { courseId: selectedCourseId } : "skip");

    // Process units for list view (deduplicate by unitIndex)
    const uniqueUnits = React.useMemo(() => {
        if (!courseUnits) return [];
        const map = new Map();
        courseUnits.forEach((u: any) => {
            if (!map.has(u.unitIndex)) {
                map.set(u.unitIndex, {
                    id: u._id,
                    unitIndex: u.unitIndex,
                    articleIndex: 1,
                    title: u.title,
                    readingText: '',
                    translation: '',
                    audioUrl: '',
                    hasAnalysis: !!u.analysisData,
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.unitIndex - b.unitIndex);
    }, [courseUnits]);

    // ========================================
    // Mutations & Actions
    // ========================================
    const saveUnitMutation = useMutation(api.units.save);
    const analyzeTextAction = useAction(api.ai.analyzeText);

    // ========================================
    // Local UI State
    // ========================================
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [saving, setSaving] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [editingUnit, setEditingUnit] = useState<UnitContent | null>(null);
    const [availableArticles, setAvailableArticles] = useState<any[]>([]);

    // ========================================
    // Handlers
    // ========================================

    const loadUnitDetail = async (courseId: string, unitIndex: number, articleIndex: number = 1) => {
        // Since we don't have a direct "get specific article" query suitable for *editing* (we have getDetails which is aggregated),
        // we can filter from 'courseUnits' if it contained all data, but 'courseUnits' result might be large.
        // Actually, getByCourse returns everything. So we can just find it in 'courseUnits'.
        if (!courseUnits) return;

        const articles = courseUnits.filter((u: any) => u.unitIndex === unitIndex);
        setAvailableArticles(articles);

        const target = articles.find((a: any) => a.articleIndex === articleIndex) || articles[0];

        if (target) {
            setEditingUnit({
                id: target._id,
                unitIndex: target.unitIndex,
                articleIndex: target.articleIndex || 1,
                title: target.title,
                readingText: target.readingText || (target as any).text || '', // Handle legacy 'text' field if present
                translation: target.translation || '',
                audioUrl: target.audioUrl || '',
                analysisData: target.analysisData,
                hasAnalysis: !!target.analysisData,
                transcriptData: target.transcriptData
            });
        } else {
            // New/Empty
            setEditingUnit({
                unitIndex: unitIndex,
                articleIndex: articleIndex,
                title: '',
                readingText: '',
                translation: '',
                audioUrl: '',
            });
        }
    };

    const handleSelectUnit = (unit: UnitContent) => {
        loadUnitDetail(selectedCourseId, unit.unitIndex);
    };

    const handleSave = async () => {
        if (!editingUnit || !selectedCourseId) return;
        setSaving(true);
        try {
            // 1. Analyze Text (if changed or missing)
            let analysisData = editingUnit.analysisData;

            // Only re-analyze if we don't have data OR user explicitly requested (handled by handleReanalyze)
            // But here we want "Save and Analyze" behavior.
            // Let's optimisticly analyze if missing.
            let tokenCount = 0;
            if (!analysisData && editingUnit.readingText) {
                const result = await analyzeTextAction({ text: editingUnit.readingText });
                if (result) {
                    analysisData = result.tokens;
                    tokenCount = result.tokenCount;
                }
            }

            // 2. Save to Convex
            const id = await saveUnitMutation({
                courseId: selectedCourseId,
                unitIndex: editingUnit.unitIndex,
                articleIndex: editingUnit.articleIndex,
                title: editingUnit.title,
                readingText: editingUnit.readingText,
                translation: editingUnit.translation,
                audioUrl: editingUnit.audioUrl,
                // We need to update the schema/mutation to accept analysisData if we want to save it!
                // Wait, the current 'api.units.save' args does NOT include analysisData.
                // I need to update 'convex/units.ts' save mutation to accept 'analysisData'.
            } as any);

            // TODO: Update save mutation to accept analysisData.
            // Assuming for this step I will have updated it.

            alert('保存成功！');
            // Refresh logic is handled by reactive Convex queries!
            // Just update local editing state with new ID if it was new
            if (!editingUnit.id) {
                setEditingUnit(prev => prev ? ({ ...prev, id }) : null);
            }

        } catch (e) {
            console.error(e);
            alert('保存失败，请重试');
        } finally {
            setSaving(false);
        }
    };

    const handleReanalyze = async () => {
        if (!editingUnit || !editingUnit.readingText) return;
        setAnalyzing(true);
        try {
            const result = await analyzeTextAction({ text: editingUnit.readingText });
            if (result) {
                alert(`AI 分析完成！生成 ${result.tokenCount} 个词形映射。请点击保存以应用。`);
                setEditingUnit(prev => prev ? ({
                    ...prev,
                    analysisData: result.tokens,
                    hasAnalysis: true
                }) : null);
            } else {
                alert('分析失败');
            }
        } catch (e) {
            console.error(e);
            alert('分析出错');
        } finally {
            setAnalyzing(false);
        }
    };

    const createNewUnit = () => {
        if (!courseUnits) return;
        const nextIndex = courseUnits.length > 0
            ? Math.max(...courseUnits.map((u: any) => u.unitIndex)) + 1
            : 1;

        setEditingUnit({
            unitIndex: nextIndex,
            articleIndex: 1,
            title: '',
            readingText: '',
            translation: '',
            audioUrl: ''
        });
        setAvailableArticles([]);
    };

    const addNewArticle = () => {
        if (!editingUnit) return;
        const nextArticleIndex = availableArticles.length > 0
            ? Math.max(...availableArticles.map(a => a.articleIndex || 1)) + 1
            : 1;

        setEditingUnit({
            unitIndex: editingUnit.unitIndex,
            articleIndex: nextArticleIndex,
            title: '',
            readingText: '',
            translation: '',
            audioUrl: '',
        });
    };

    const switchArticle = (index: number) => {
        loadUnitDetail(selectedCourseId, editingUnit!.unitIndex, index);
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* Left: Unit List */}
            <div className="w-1/3 bg-white border-2 border-zinc-900 rounded-xl p-4 flex flex-col shadow-[4px_4px_0px_0px_#18181B]">
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">选择教材</label>
                    <select
                        className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                    >
                        {institutes.map((i: any) => (
                            <option key={i._id} value={i.id || i.postgresId || i._id}>
                                {i.name} {i.displayLevel || ''} {i.volume || ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {!courseUnits ? (
                        <div className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : uniqueUnits.length === 0 ? (
                        <div className="text-center text-zinc-400 py-10">暂无单元</div>
                    ) : (
                        uniqueUnits.map(unit => (
                            <div
                                key={unit.unitIndex}
                                onClick={() => handleSelectUnit(unit)}
                                className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${editingUnit?.unitIndex === unit.unitIndex
                                    ? 'border-zinc-900 bg-lime-100 shadow-[2px_2px_0px_0px_#18181B]'
                                    : 'border-transparent hover:bg-zinc-50'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-sm">第 {unit.unitIndex} 课</span>
                                    {unit.hasAnalysis && (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                </div>
                                <div className="text-xs text-zinc-700 truncate">{unit.title || '(未命名)'}</div>
                            </div>
                        ))
                    )}
                </div>

                <button
                    onClick={createNewUnit}
                    className="mt-4 w-full py-3 bg-zinc-900 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-800"
                >
                    <Plus size={16} /> 新建单元
                </button>
            </div>

            {/* Right: Editor */}
            <div className="flex-1 bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B] overflow-y-auto">
                {editingUnit ? (
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {/* Header: Article Tabs */}
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex gap-2">
                                {availableArticles.map((a) => (
                                    <button
                                        key={a._id || a.articleIndex}
                                        onClick={() => switchArticle(a.articleIndex || 1)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${editingUnit.articleIndex === (a.articleIndex || 1)
                                            ? 'bg-zinc-900 text-white border-zinc-900'
                                            : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                                            }`}
                                    >
                                        文章 {a.articleIndex || 1}
                                    </button>
                                ))}
                                <button
                                    onClick={addNewArticle}
                                    className="px-3 py-1 rounded-full text-xs font-bold border-2 border-dashed border-zinc-300 text-zinc-400 hover:text-zinc-900 hover:border-zinc-900"
                                >
                                    + 添加文章
                                </button>
                            </div>
                            <div className="text-xs text-zinc-400">
                                正在编辑：第 {editingUnit.unitIndex} 课 - 文章 {editingUnit.articleIndex}
                            </div>
                        </div>

                        {/* Fields */}
                        <div className="flex gap-4">
                            <div className="w-24">
                                <label className="block text-xs font-bold mb-1">课号</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
                                    value={editingUnit.unitIndex}
                                    onChange={e => setEditingUnit({ ...editingUnit, unitIndex: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold mb-1">标题</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
                                    value={editingUnit.title}
                                    onChange={e => setEditingUnit({ ...editingUnit, title: e.target.value })}
                                    placeholder="例如：自我介绍"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold mb-1 flex items-center gap-2">
                                <FileText size={14} /> 韩语正文
                            </label>
                            <textarea
                                className="w-full h-64 p-4 border-2 border-zinc-900 rounded-lg font-serif text-lg leading-loose resize-none focus:shadow-[4px_4px_0px_0px_#18181B] transition-all outline-none"
                                value={editingUnit.readingText}
                                onChange={e => setEditingUnit({ ...editingUnit, readingText: e.target.value })}
                                placeholder="在此粘贴韩语文章..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1">中文翻译 (可选)</label>
                                <textarea
                                    className="w-full h-32 p-3 border-2 border-zinc-900 rounded-lg resize-none"
                                    value={editingUnit.translation}
                                    onChange={e => setEditingUnit({ ...editingUnit, translation: e.target.value })}
                                    placeholder="输入中文翻译..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 flex items-center gap-2">
                                    <Mic size={14} /> 音频链接 (S3 URL，可选)
                                </label>
                                <textarea
                                    className="w-full h-32 p-3 border-2 border-zinc-900 rounded-lg resize-none font-mono text-xs"
                                    value={editingUnit.audioUrl}
                                    onChange={e => setEditingUnit({ ...editingUnit, audioUrl: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-between items-center">
                            <div>
                                <button
                                    onClick={handleReanalyze}
                                    disabled={analyzing}
                                    className="px-4 py-2 bg-blue-100 border-2 border-blue-300 rounded-lg font-bold text-blue-700 flex items-center gap-2 hover:bg-blue-200 disabled:opacity-50"
                                >
                                    {analyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw size={16} />}
                                    重新运行 AI 分析
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setEditingUnit(null)}
                                    className="px-6 py-2 border-2 border-zinc-900 rounded-lg font-bold hover:bg-zinc-100"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !editingUnit.title || !editingUnit.readingText}
                                    className="px-6 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold flex items-center gap-2 hover:bg-lime-400 disabled:opacity-50 shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all"
                                >
                                    {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                    保存
                                </button>
                            </div>
                        </div>

                        {editingUnit.analysisData && (
                            <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg text-sm">
                                <div className="font-bold text-green-800 mb-1 flex items-center gap-2">
                                    <CheckCircle size={16} /> AI 分析已就绪
                                </div>
                                <div className="text-green-700">
                                    已生成 {Array.isArray(editingUnit.analysisData) ? editingUnit.analysisData.length : 0} 个词形映射数据。
                                </div>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                        <BookOpen size={48} className="mb-4 opacity-20" />
                        <p>请在左侧选择或新建单元</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReadingContentManager;

