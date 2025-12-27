import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import {
    BookOpen, Plus, Loader2, Search, Trash2, Check, X,
    ChevronDown, Sparkles, GraduationCap
} from 'lucide-react';

interface Institute {
    id: string;
    name: string;
    displayLevel?: string;
    volume?: string;
}

interface UnitInfo {
    unitIndex: number;
    title: string;
}

interface GrammarItem {
    id: string;
    title: string;
    type: string;
    summary: string;
    explanation?: string;
    examples?: any;
    displayOrder?: number;
}

interface SearchResult {
    id: string;
    title: string;
    searchKey?: string;
    level: string;
    type: string;
    summary: string;
}

export const GrammarManager: React.FC = () => {
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedUnit, setSelectedUnit] = useState<number>(1);
    const [units, setUnits] = useState<UnitInfo[]>([]);
    const [grammars, setGrammars] = useState<GrammarItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Search and add state
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showNewForm, setShowNewForm] = useState(false);

    // New grammar form
    const [newTitle, setNewTitle] = useState('');
    const [newSummary, setNewSummary] = useState('');
    const [newExplanation, setNewExplanation] = useState('');
    const [creating, setCreating] = useState(false);

    // Load institutes
    useEffect(() => {
        loadInstitutes();
    }, []);

    // Load units when course changes
    useEffect(() => {
        if (selectedCourseId) {
            loadUnits(selectedCourseId);
        }
    }, [selectedCourseId]);

    // Load grammars when course/unit changes
    useEffect(() => {
        if (selectedCourseId && selectedUnit) {
            loadGrammars();
        }
    }, [selectedCourseId, selectedUnit]);

    const loadInstitutes = async () => {
        try {
            const data = await api.getInstitutes();
            setInstitutes(data);
            if (data.length > 0) setSelectedCourseId(data[0].id);
        } catch (e) {
            console.error('Failed to load institutes', e);
        }
    };

    const loadUnits = async (courseId: string) => {
        try {
            const response = await api.getUnitsForCourse(courseId);
            if (response.success && response.data) {
                setUnits(response.data.map((u: any) => ({
                    unitIndex: u.unitIndex,
                    title: u.title
                })));
            }
        } catch (e) {
            console.error('Failed to load units', e);
        }
    };

    const loadGrammars = async () => {
        setLoading(true);
        try {
            const response = await api.getUnitGrammars(selectedCourseId, selectedUnit);
            if (response.data) {
                setGrammars(response.data);
            }
        } catch (e) {
            console.error('Failed to load grammars', e);
            setGrammars([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const response = await api.searchGrammar(searchQuery);
            if (response.success && response.data) {
                setSearchResults(response.data);
            }
        } catch (e) {
            console.error('Search failed', e);
        } finally {
            setSearching(false);
        }
    }, [searchQuery]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch();
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    const handleAssign = async (grammarId: string) => {
        try {
            await api.assignGrammarToUnit(selectedCourseId, selectedUnit, grammarId);
            setShowAddPanel(false);
            setSearchQuery('');
            setSearchResults([]);
            loadGrammars();
        } catch (e) {
            console.error('Assign failed', e);
            alert('关联失败');
        }
    };

    const handleRemove = async (grammarId: string) => {
        if (!confirm('确定要从本单元移除这个语法点吗？')) return;
        try {
            await api.removeGrammarFromUnit(selectedCourseId, selectedUnit, grammarId);
            loadGrammars();
        } catch (e) {
            console.error('Remove failed', e);
            alert('移除失败');
        }
    };

    const handleCreateAndAssign = async () => {
        if (!newTitle.trim()) {
            alert('请输入语法标题');
            return;
        }
        setCreating(true);
        try {
            const response = await api.createGrammar({
                title: newTitle.trim(),
                summary: newSummary.trim(),
                explanation: newExplanation.trim(),
                type: 'PATTERN',
                level: 'INTERMEDIATE'
            });
            if (response.success && response.data) {
                // Auto-assign to current unit
                await api.assignGrammarToUnit(selectedCourseId, selectedUnit, response.data.id);
                // Reset form
                setNewTitle('');
                setNewSummary('');
                setNewExplanation('');
                setShowNewForm(false);
                setShowAddPanel(false);
                loadGrammars();
            }
        } catch (e) {
            console.error('Create failed', e);
            alert('创建失败');
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
                        {institutes.map(i => (
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
                    <h3 className="font-black text-sm text-zinc-500 mb-2">本单元语法 ({grammars.length})</h3>
                    {loading ? (
                        <div className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : grammars.length === 0 ? (
                        <div className="text-center text-zinc-400 py-10">
                            <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">暂无语法点</p>
                        </div>
                    ) : (
                        grammars.map(g => (
                            <div
                                key={g.id}
                                className="p-3 border-2 border-zinc-200 rounded-lg flex items-start justify-between hover:border-zinc-400 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="font-bold text-zinc-900">{g.title}</div>
                                    <div className="text-xs text-zinc-500 truncate">{g.summary}</div>
                                </div>
                                <button
                                    onClick={() => handleRemove(g.id)}
                                    className="ml-2 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
                                {searchResults.map(r => (
                                    <div
                                        key={r.id}
                                        className="flex items-center justify-between p-3 border-2 border-zinc-200 rounded-lg hover:border-lime-400 cursor-pointer transition-colors"
                                        onClick={() => handleAssign(r.id)}
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
                                <p>未找到 "{searchQuery}" 相关的语法</p>
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
                        <p className="font-bold">选择单元后点击"添加语法点"</p>
                        <p className="text-sm mt-1">可搜索已有语法或创建新语法</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GrammarManager;
