import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from '../../../convex/_generated/api';
import {
    Plus, Loader2, Search, Trash2, Check, X,
    Sparkles, GraduationCap, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Institute {
    id: string;
    name: string;
    displayLevel?: string;
    volume?: string;
    totalUnits?: number; // Added totalUnits
}

interface UnitInfo {
    unitIndex: number;
    title: string;
}





export const GrammarManager: React.FC = () => {
    // 1. Fetch Institutes (Convex)
    const institutes = useQuery(api.institutes.getAll) || [];
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');

    // Default select first institute
    useEffect(() => {
        if (institutes.length > 0 && !selectedCourseId) {
            setSelectedCourseId(institutes[0].id);
        }
    }, [institutes, selectedCourseId]);

    const [selectedUnit, setSelectedUnit] = useState<number>(1);

    // 2. Fetch Unit Titles (Convex)
    // Using api.units.getByCourse to get metadata including titles
    const unitList = useQuery(api.units.getByCourse, selectedCourseId ? { courseId: selectedCourseId } : "skip");

    // 3. Generate Full Unit List (combining totalUnits + fetched titles)
    const units = useMemo(() => {
        const institute = institutes.find((i: any) => i.id === selectedCourseId);
        const total = institute?.totalUnits || 20; // Default

        const allUnits: UnitInfo[] = Array.from({ length: total }, (_, i) => ({
            unitIndex: i + 1,
            title: ''
        }));

        if (unitList) {
            unitList.forEach((u: any) => {
                const target = allUnits.find(item => item.unitIndex === u.unitIndex);
                if (target) target.title = u.title;
            });
        }
        return allUnits;
    }, [institutes, selectedCourseId, unitList]);

    // 4. Fetch Grammars for Unit (Convex)
    const grammarsData = useQuery(
        api.grammars.getUnitGrammar,
        selectedCourseId ? { courseId: selectedCourseId, unitId: selectedUnit } : "skip"
    );
    const grammarsLoading = grammarsData === undefined;
    const grammars = grammarsData || [];

    // Search and add state
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // 5. Search Query (Convex)
    const searchData = useQuery(api.grammars.search, searchQuery ? { query: searchQuery } : "skip");
    const searchResults = searchData || [];
    const searching = searchQuery && searchData === undefined;

    const [showNewForm, setShowNewForm] = useState(false);

    // New grammar form
    const [newTitle, setNewTitle] = useState('');
    const [newSummary, setNewSummary] = useState('');
    const [newExplanation, setNewExplanation] = useState('');

    // Mutations
    const createGrammar = useMutation(api.grammars.create);
    const assignToUnit = useMutation(api.grammars.assignToUnit);
    const removeFromUnit = useMutation(api.grammars.removeFromUnit);

    const [creating, setCreating] = useState(false);

    const handleAssign = async (grammarId: string) => {
        try {
            await assignToUnit({
                courseId: selectedCourseId,
                unitId: selectedUnit,
                grammarId: grammarId as any
            });
            setShowAddPanel(false);
            setSearchQuery('');
            toast.success('已关联语法点');
        } catch (_e) {
            console.error('Assign failed', _e);
            toast.error('关联失败');
        }
    };

    const handleRemove = async (grammarId: string) => {
        if (!confirm('确定要从本单元移除这个语法点吗？')) return;
        try {
            await removeFromUnit({
                courseId: selectedCourseId,
                unitId: selectedUnit,
                grammarId: grammarId as any
            });
            toast.success('已移除');
        } catch (_e) {
            console.error('Remove failed', _e);
            toast.error('移除失败');
        }
    };

    const handleCreateAndAssign = async () => {
        if (!newTitle.trim()) {
            toast.error('请输入语法标题');
            return;
        }
        setCreating(true);
        try {
            const { id } = await createGrammar({
                title: newTitle.trim(),
                summary: newSummary.trim(),
                explanation: newExplanation.trim(),
                type: 'PATTERN',
                level: 'INTERMEDIATE'
            });

            // Auto-assign to current unit
            await assignToUnit({
                courseId: selectedCourseId,
                unitId: selectedUnit,
                grammarId: id
            });

            // Reset form
            setNewTitle('');
            setNewSummary('');
            setNewExplanation('');
            setShowNewForm(false);
            setShowAddPanel(false);
            toast.success('创建并关联成功');
        } catch (_e) {
            console.error('Create failed', _e);
            toast.error('创建失败');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* Left Panel: Course/Unit Selection */}
            <div className="w-1/3 bg-white border-2 border-zinc-900 rounded-xl p-4 flex flex-col shadow-[4px_4px_0px_0px_#18181B]">
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">选择教材</label>
                    <select
                        className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                    >
                        {institutes.map((i: any) => (
                            <option key={i.id} value={i.id}>
                                {i.name}
                                {i.displayLevel ? ` ${i.displayLevel}` : ''}
                                {i.volume ? ` ${i.volume}` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">选择单元</label>
                    <select
                        className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(parseInt(e.target.value))}
                    >
                        {units.length === 0 ? (
                            <option value={1}>第 1 课</option>
                        ) : (
                            units.map(u => (
                                <option key={u.unitIndex} value={u.unitIndex}>
                                    第 {u.unitIndex} 课: {u.title || '(未命名)'}
                                </option>
                            ))
                        )}
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 mt-4">
                    <h3 className="font-black text-sm text-zinc-500 mb-2">本单元语法 ({grammars?.length || 0})</h3>
                    {grammarsLoading ? (
                        <div className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : grammars.length === 0 ? (
                        <div className="text-center text-zinc-400 py-10">
                            <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">暂无语法点</p>
                        </div>
                    ) : (
                        grammars.map((g: any) => (
                            <div
                                key={g.id || g._id}
                                className="p-3 border-2 border-zinc-200 rounded-lg flex items-start justify-between hover:border-zinc-400 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="font-bold text-zinc-900">{g.title}</div>
                                    <div className="text-xs text-zinc-500 truncate">{g.summary}</div>
                                </div>
                                <button
                                    onClick={() => handleRemove(g.id || g._id)}
                                    className="ml-2 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="从单元移除"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <button
                    onClick={() => setShowAddPanel(true)}
                    className="mt-4 w-full py-3 bg-zinc-900 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-800"
                >
                    <Plus size={16} /> 添加语法点
                </button>
            </div>

            {/* Right Panel: Add/Search */}
            <div className="flex-1 bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B] overflow-y-auto">
                {showAddPanel ? (
                    <div className="max-w-2xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black">添加语法到第 {selectedUnit} 课</h2>
                            <button
                                onClick={() => { setShowAddPanel(false); setShowNewForm(false); }}
                                className="p-2 hover:bg-zinc-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search existing */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold mb-2">搜索已有语法</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="输入语法名称，如：-고 싶다"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 p-3 border-2 border-zinc-900 rounded-lg font-bold focus:shadow-[2px_2px_0px_0px_#18181B] outline-none"
                                />
                            </div>
                        </div>

                        {/* Search Results */}
                        {searching ? (
                            <div className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></div>
                        ) : searchResults.length > 0 ? (
                            <div className="space-y-2 mb-6">
                                <h3 className="text-sm font-bold text-zinc-500">搜索结果</h3>
                                {searchResults.map((r: any) => (
                                    <div
                                        key={r._id}
                                        className="flex items-center justify-between p-3 border-2 border-zinc-200 rounded-lg hover:border-lime-400 cursor-pointer transition-colors"
                                        onClick={() => handleAssign(r._id)}
                                    >
                                        <div>
                                            <div className="font-bold">{r.title}</div>
                                            <div className="text-xs text-zinc-500">{r.summary}</div>
                                        </div>
                                        <div className="flex items-center gap-2 text-lime-600">
                                            <span className="text-xs font-bold">点击添加</span>
                                            <Plus className="w-4 h-4" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : searchQuery.trim() ? (
                            <div className="text-center py-6 text-zinc-400 mb-6">
                                <p>未找到 &quot;{searchQuery}&quot; 相关的语法</p>
                            </div>
                        ) : null}

                        {/* Create New */}
                        <div className="border-t-2 border-zinc-100 pt-6">
                            {!showNewForm ? (
                                <button
                                    onClick={() => setShowNewForm(true)}
                                    className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-lg text-zinc-500 font-bold flex items-center justify-center gap-2 hover:border-zinc-500 hover:text-zinc-700 transition-colors"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    创建新语法点
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="font-black">新建语法</h3>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">语法标题 *</label>
                                        <input
                                            type="text"
                                            placeholder="如：-고 싶다"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">简要释义</label>
                                        <input
                                            type="text"
                                            placeholder="如：表示愿望，想做..."
                                            value={newSummary}
                                            onChange={(e) => setNewSummary(e.target.value)}
                                            className="w-full p-2 border-2 border-zinc-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1">详细解释</label>
                                        <textarea
                                            placeholder="Markdown 格式"
                                            value={newExplanation}
                                            onChange={(e) => setNewExplanation(e.target.value)}
                                            className="w-full h-32 p-3 border-2 border-zinc-300 rounded-lg resize-none"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowNewForm(false)}
                                            className="flex-1 py-2 border-2 border-zinc-300 rounded-lg font-bold hover:bg-zinc-50"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleCreateAndAssign}
                                            disabled={creating || !newTitle.trim()}
                                            className="flex-1 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-lime-400 disabled:opacity-50"
                                        >
                                            {creating ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                                            创建并添加
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                        <BookOpen size={48} className="mb-4 opacity-20" />
                        <p className="font-bold">选择单元后点击&quot;添加语法点&quot;</p>
                        <p className="text-sm mt-1">可搜索已有语法或创建新语法</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GrammarManager;
