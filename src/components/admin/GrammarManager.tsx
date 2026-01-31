import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import {
  Plus,
  Loader2,
  Search,
  Check,
  X,
  Sparkles,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { NoArgs, qRef, GRAMMARS } from '../../utils/convexRefs';
import { Institute } from '../../types';
import { GrammarListItem } from './GrammarListItem';

interface UnitInfo {
  unitIndex: number;
  title: string;
}

export const GrammarManager: React.FC = () => {
  // 1. Fetch Institutes (Convex)
  const institutesData = useQuery(qRef<NoArgs, Institute[]>('institutes:getAll'));
  const institutes = useMemo(() => institutesData ?? [], [institutesData]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Default select first institute
  useEffect(() => {
    if (institutes.length > 0 && !selectedCourseId) {
      setSelectedCourseId(institutes[0].id);
    }
  }, [institutes, selectedCourseId]);

  const [selectedUnit, setSelectedUnit] = useState<number>(1);

  // 2. Fetch Unit Titles (Convex)
  const unitList = useQuery(
    qRef<{ courseId: string }, { unitIndex: number; title: string }[]>('units:getByCourse'),
    selectedCourseId ? { courseId: selectedCourseId } : 'skip'
  );

  // 3. Generate Full Unit List
   const units = useMemo<UnitInfo[]>(() => {
     const institute = institutes.find(i => i.id === selectedCourseId);
     const total = institute?.totalUnits || 20;
 
     return Array.from({ length: total }, (_, i) => {
       const unitIndex = i + 1;
       const matchingUnit = unitList?.find(u => u.unitIndex === unitIndex);
       return {
         unitIndex,
         title: matchingUnit?.title || '',
       };
     });
   }, [institutes, selectedCourseId, unitList]);

  // 4. Fetch Grammars for Unit
  const grammarsData = useQuery(
    GRAMMARS.getUnitGrammar,
    selectedCourseId ? { courseId: selectedCourseId, unitId: selectedUnit } : 'skip'
  );
  const grammarsLoading = grammarsData === undefined;
  const grammars = grammarsData || [];

  // Search and add state
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 5. Search Query
  const searchData = useQuery(GRAMMARS.search, searchQuery ? { query: searchQuery } : 'skip');
  const searchResults = searchData || [];
  const searching = searchQuery && searchData === undefined;

  const [showNewForm, setShowNewForm] = useState(false);

  // New grammar form
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newExplanation, setNewExplanation] = useState('');

  // Mutations
  const createGrammar = useMutation(GRAMMARS.create);
  const assignToUnit = useMutation(GRAMMARS.assignToUnit);
  const removeFromUnit = useMutation(GRAMMARS.removeFromUnit);
  const updateSearchPatterns = useMutation(GRAMMARS.updateSearchPatterns);

  const [creating, setCreating] = useState(false);

  const [editingGrammarId, setEditingGrammarId] = useState<string | null>(null);
  const adminGrammar = useQuery(
    GRAMMARS.getAdminById,
    editingGrammarId ? { grammarId: editingGrammarId } : 'skip'
  );
  const [searchPatternsText, setSearchPatternsText] = useState('');
  const [savingPatterns, setSavingPatterns] = useState(false);

  useEffect(() => {
    if (!adminGrammar) return;
    setSearchPatternsText((adminGrammar.searchPatterns || []).join('\n'));
  }, [adminGrammar]);

  const handleAssign = async (grammarId: string) => {
    try {
      await assignToUnit({
        courseId: selectedCourseId,
        unitId: selectedUnit,
        grammarId,
      });
      setShowAddPanel(false);
      setSearchQuery('');
      toast.success('已关联语法点');
    } catch (e) {
      console.error('Assign failed', e);
      toast.error('关联失败');
    }
  };

  const handleRemove = async (grammarId: string) => {
    if (!confirm('确定要从本单元移除这个语法点吗？')) return;
    try {
      await removeFromUnit({
        courseId: selectedCourseId,
        unitId: selectedUnit,
        grammarId,
      });
      toast.success('已移除');
    } catch (e) {
      console.error('Remove failed', e);
      toast.error('移除失败');
    }
  };

  const handleSavePatterns = async () => {
    if (!editingGrammarId) return;
    setSavingPatterns(true);
    try {
      const patterns = searchPatternsText
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
      await updateSearchPatterns({
        grammarId: editingGrammarId,
        searchPatterns: patterns,
      });
      toast.success('已保存匹配模式');
      setEditingGrammarId(null);
    } catch (e) {
      console.error('Update patterns failed', e);
      toast.error('保存失败');
    } finally {
      setSavingPatterns(false);
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
        level: 'INTERMEDIATE',
      });

      // Auto-assign to current unit
      await assignToUnit({
        courseId: selectedCourseId,
        unitId: selectedUnit,
        grammarId: id,
      });

      // Reset form
      setNewTitle('');
      setNewSummary('');
      setNewExplanation('');
      setShowNewForm(false);
      setShowAddPanel(false);
      toast.success('创建并关联成功');
    } catch (e) {
      console.error('Create failed', e);
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
          <label htmlFor="course-select" className="block text-sm font-bold mb-2">
            选择教材
          </label>
          <select
            id="course-select"
            className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
            aria-label="选择教材"
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
          <label htmlFor="unit-select" className="block text-sm font-bold mb-2">
            选择单元
          </label>
          <select
            id="unit-select"
            className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
            value={selectedUnit}
            onChange={e => setSelectedUnit(Number.parseInt(e.target.value, 10))}
            aria-label="选择单元"
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
          <h3 className="font-black text-sm text-zinc-500 mb-2">
            本单元语法 ({grammars?.length || 0})
          </h3>
          {(() => {
            if (grammarsLoading) {
              return (
                <div className="text-center py-4">
                  <Loader2 className="animate-spin mx-auto" />
                </div>
              );
            }
            if (grammars.length === 0) {
              return (
                <div className="text-center text-zinc-400 py-10">
                  <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无语法点</p>
                </div>
              );
            }
            return grammars.map(g => (
              <GrammarListItem
                key={g.id}
                g={g}
                onEdit={setEditingGrammarId}
                onRemove={handleRemove}
              />
            ));
          })()}
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
                onClick={() => {
                  setShowAddPanel(false);
                  setShowNewForm(false);
                }}
                className="p-2 hover:bg-zinc-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search existing */}
            <div className="mb-6">
              <label htmlFor="grammar-search" className="block text-sm font-bold mb-2">
                搜索已有语法
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  id="grammar-search"
                  type="text"
                  placeholder="输入语法名称，如：-고 싶다"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 p-3 border-2 border-zinc-900 rounded-lg font-bold focus:shadow-[2px_2px_0px_0px_#18181B] outline-none"
                />
              </div>
            </div>

            {/* Search Results */}
            {(() => {
              if (searching) {
                return (
                  <div className="text-center py-4">
                    <Loader2 className="animate-spin mx-auto" />
                  </div>
                );
              }
              if (searchResults.length > 0) {
                return (
                  <div className="space-y-2 mb-6">
                    <h3 className="text-sm font-bold text-zinc-500">搜索结果</h3>
                    {searchResults.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        className="w-full flex items-center justify-between p-3 border-2 border-zinc-200 rounded-lg hover:border-lime-400 cursor-pointer transition-colors text-left"
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
                      </button>
                    ))}
                  </div>
                );
              }
              if (searchQuery.trim()) {
                return (
                  <div className="text-center py-6 text-zinc-400 mb-6">
                    <p>未找到 &quot;{searchQuery}&quot; 相关的语法</p>
                  </div>
                );
              }
              return null;
            })()}

            {/* Create New */}
            <div className="border-t-2 border-zinc-100 pt-6">
              {showNewForm ? (
                <div className="space-y-4">
                  <h3 className="font-black">新建语法</h3>
                  <div>
                    <label htmlFor="new-grammar-title" className="block text-xs font-bold mb-1">
                      语法标题 *
                    </label>
                    <input
                      id="new-grammar-title"
                      type="text"
                      placeholder="如：-고 싶다"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="w-full p-2 border-2 border-zinc-900 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-grammar-summary" className="block text-xs font-bold mb-1">
                      简要释义
                    </label>
                    <input
                      id="new-grammar-summary"
                      type="text"
                      placeholder="如：表示愿望，想做..."
                      value={newSummary}
                      onChange={e => setNewSummary(e.target.value)}
                      className="w-full p-2 border-2 border-zinc-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-grammar-explanation" className="block text-xs font-bold mb-1">
                      详细解释
                    </label>
                    <textarea
                      id="new-grammar-explanation"
                      placeholder="Markdown 格式"
                      value={newExplanation}
                      onChange={e => setNewExplanation(e.target.value)}
                      className="w-full h-32 p-3 border-2 border-zinc-300 rounded-lg resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowNewForm(false)}
                      className="flex-1 py-2 border-2 border-zinc-300 rounded-lg font-bold hover:bg-zinc-50"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateAndAssign}
                      disabled={creating || !newTitle.trim()}
                      className="flex-1 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-lime-400 disabled:opacity-50"
                    >
                      {creating ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      创建并添加
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewForm(true)}
                  className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-lg text-zinc-500 font-bold flex items-center justify-center gap-2 hover:border-zinc-500 hover:text-zinc-700 transition-colors"
                  aria-label="创建并添加新语法点"
                >
                  <Sparkles className="w-5 h-5" />
                  创建新语法点
                </button>
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

      {editingGrammarId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl bg-white border-2 border-zinc-900 rounded-xl shadow-[6px_6px_0px_0px_#18181B] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-black text-lg">匹配模式</div>
              <button
                onClick={() => setEditingGrammarId(null)}
                className="p-2 hover:bg-zinc-100 rounded-lg"
                aria-label="关闭编辑弹窗"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adminGrammar ? (
              <>
                <div className="text-sm font-bold text-zinc-900 mb-2">{adminGrammar.title}</div>
                <div className="text-xs text-zinc-500 mb-3">
                  每行一个 pattern（也支持逗号分隔）。示例：으시, 시, 었, 았
                </div>
                <label htmlFor="patterns-editor" className="sr-only">
                  编辑匹配模式
                </label>
                <textarea
                  id="patterns-editor"
                  value={searchPatternsText}
                  onChange={e => setSearchPatternsText(e.target.value)}
                  className="w-full h-40 p-3 border-2 border-zinc-900 rounded-lg resize-none"
                  placeholder="输入 searchPatterns"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setEditingGrammarId(null)}
                    className="flex-1 py-2 border-2 border-zinc-300 rounded-lg font-bold hover:bg-zinc-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePatterns}
                    disabled={savingPatterns}
                    className="flex-1 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-lime-400 disabled:opacity-50"
                  >
                    {savingPatterns ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    保存
                  </button>
                </div>
              </>
            ) : (
              <div className="py-10 text-center text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                <div className="text-sm">加载中...</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GrammarManager;
