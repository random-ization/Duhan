import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { BookOpen, Save, Plus, Loader2, FileText, Mic, RefreshCw, CheckCircle } from 'lucide-react';

interface Institute {
    id: string;
    name: string;
    displayLevel?: string;
    volume?: string;
}

interface UnitContent {
    id?: string;
    unitIndex: number;
    title: string;
    readingText: string;
    translation: string;
    audioUrl: string;
    hasAnalysis?: boolean;
    analysisData?: any;
    transcriptData?: any; // Listening karaoke data
}

export const ReadingContentManager: React.FC = () => {
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [units, setUnits] = useState<UnitContent[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    // 编辑状态
    const [editingUnit, setEditingUnit] = useState<UnitContent | null>(null);

    // 初始化：加载教材列表
    useEffect(() => {
        loadInstitutes();
    }, []);

    // 当选择教材改变时，加载该教材的单元
    useEffect(() => {
        if (selectedCourseId) {
            loadCourseUnits(selectedCourseId);
        } else {
            setUnits([]);
        }
    }, [selectedCourseId]);

    const loadInstitutes = async () => {
        try {
            const data = await api.getInstitutes();
            setInstitutes(data);
            if (data.length > 0) setSelectedCourseId(data[0].id);
        } catch (e) {
            console.error('Failed to load institutes', e);
        }
    };

    const loadCourseUnits = async (courseId: string) => {
        setLoading(true);
        try {
            // 使用新的 getUnitsForCourse API
            const response = await api.getUnitsForCourse(courseId);
            if (response.success && response.data) {
                // 转换到编辑器格式
                const formattedUnits = response.data.map((u: any) => ({
                    id: u.id,
                    unitIndex: u.unitIndex,
                    title: u.title,
                    readingText: '', // 列表不加载全文
                    translation: '',
                    audioUrl: '',
                    hasAnalysis: u.hasAnalysis,
                }));
                setUnits(formattedUnits);
            }
        } catch (e) {
            console.error('Failed to load units', e);
        } finally {
            setLoading(false);
        }
    };

    const loadUnitDetail = async (courseId: string, unitIndex: number) => {
        try {
            const response = await api.getUnitLearningData(courseId, unitIndex);
            if (response.success && response.data?.unit) {
                const unit = response.data.unit;
                setEditingUnit({
                    id: unit.id,
                    unitIndex: unitIndex,
                    title: unit.title,
                    readingText: unit.text || '',
                    translation: unit.translation || '',
                    audioUrl: unit.audioUrl || '',
                    analysisData: unit.analysisData,
                    hasAnalysis: !!unit.analysisData,
                    transcriptData: (unit as any).transcriptData || null,
                });
            }
        } catch (e) {
            console.error('Failed to load unit detail', e);
        }
    };

    const handleSave = async () => {
        if (!editingUnit || !selectedCourseId) return;

        setSaving(true);
        try {
            const response = await api.saveUnitContent({
                courseId: selectedCourseId,
                unitIndex: editingUnit.unitIndex,
                title: editingUnit.title,
                readingText: editingUnit.readingText,
                translation: editingUnit.translation,
                audioUrl: editingUnit.audioUrl,
                transcriptData: editingUnit.transcriptData,
            });

            if (response.success) {
                alert(`保存成功！AI 分析已生成 ${response.data.tokenCount} 个词形映射。`);
                setEditingUnit(null);
                loadCourseUnits(selectedCourseId); // 刷新列表
            } else {
                alert('保存失败，请重试');
            }
        } catch (e) {
            console.error(e);
            alert('保存失败，请重试');
        } finally {
            setSaving(false);
        }
    };

    const handleReanalyze = async () => {
        if (!editingUnit || !selectedCourseId) return;

        setAnalyzing(true);
        try {
            const response = await api.reanalyzeUnit(selectedCourseId, editingUnit.unitIndex);
            if (response.success) {
                alert(`AI 重新分析完成！生成 ${response.data.tokenCount} 个词形映射。`);
                // 更新本地状态
                setEditingUnit({
                    ...editingUnit,
                    analysisData: response.data.tokens,
                    hasAnalysis: true,
                });
            } else {
                alert('分析失败，请重试');
            }
        } catch (e) {
            console.error(e);
            alert('分析失败，请重试');
        } finally {
            setAnalyzing(false);
        }
    };

    const createNewUnit = () => {
        const nextIndex = units.length > 0 ? Math.max(...units.map(u => u.unitIndex)) + 1 : 1;
        setEditingUnit({
            unitIndex: nextIndex,
            title: '',
            readingText: '',
            translation: '',
            audioUrl: ''
        });
    };

    const handleSelectUnit = (unit: UnitContent) => {
        // 加载详细内容
        loadUnitDetail(selectedCourseId, unit.unitIndex);
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* 左侧：列表栏 */}
            <div className="w-1/3 bg-white border-2 border-zinc-900 rounded-xl p-4 flex flex-col shadow-[4px_4px_0px_0px_#18181B]">
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">选择教材</label>
                    <select
                        className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                    >
                        {institutes.map(i => (
                            <option key={i.id} value={i.id}>
                                {i.name}
                                {i.displayLevel ? ` ${i.displayLevel}` : ''}
                                {i.volume ? ` ${i.volume}` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {loading ? (
                        <div className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : units.length === 0 ? (
                        <div className="text-center text-zinc-400 py-10">暂无单元</div>
                    ) : (
                        units.map(unit => (
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

            {/* 右侧：编辑器 */}
            <div className="flex-1 bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B] overflow-y-auto">
                {editingUnit ? (
                    <div className="space-y-4 max-w-3xl mx-auto">
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
                                <FileText size={14} /> 韩语正文 (保存时将自动触发 AI 分析)
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
                                {editingUnit.id && (
                                    <button
                                        onClick={handleReanalyze}
                                        disabled={analyzing}
                                        className="px-4 py-2 bg-blue-100 border-2 border-blue-300 rounded-lg font-bold text-blue-700 flex items-center gap-2 hover:bg-blue-200 disabled:opacity-50"
                                    >
                                        {analyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw size={16} />}
                                        重新运行 AI 分析
                                    </button>
                                )}
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
                                    保存并触发 AI 分析
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
                                    阅读模块将使用此数据进行智能查词。
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
