import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, usePaginatedQuery } from 'convex/react';
import { Id } from '../../../convex/_generated/dataModel';
import * as XLSX from 'xlsx';
import { INSTITUTES, VOCAB } from '../../utils/convexRefs';
import { notify } from '../../utils/notify';
import { logger } from '../../utils/logger';
import {
  Database,
  Loader2,
  Search,
  Download,
} from 'lucide-react';
import VocabWordRow from './VocabWordRow';
import VocabEditModal from './VocabEditModal';
import VocabStats from './VocabStats';
import VocabFilters from './VocabFilters';

interface WordRow {
  _id: string;
  word: string;
  meaning: string;
  meaningEn?: string;
  meaningVi?: string;
  meaningMn?: string;
  courseId?: string;
  courseName?: string;
  unitId?: number;
  partOfSpeech?: string;
  exampleSentence?: string;
  exampleMeaning?: string;
  exampleMeaningEn?: string;
  exampleMeaningVi?: string;
  exampleMeaningMn?: string;
  appearanceId?: string;
}

interface InstituteRow {
  id?: string;
  _id?: string;
  name?: string;
  displayLevel?: string;
  volume?: string;
}

const ITEMS_PER_PAGE = 20;

const VocabDashboard: React.FC = () => {
  const institutes = useQuery(INSTITUTES.getAll, {}) as unknown as InstituteRow[] | undefined;
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [editingWord, setEditingWord] = useState<WordRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<WordRow>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [meaningFilter, setMeaningFilter] = useState<'all' | 'filled' | 'empty'>('all');
  const [posFilter, setPosFilter] = useState<string>('ALL');
  const [unitFrom, setUnitFrom] = useState<string>('');
  const [unitTo, setUnitTo] = useState<string>('');

  const updateVocab = useMutation(VOCAB.updateVocab);

  const resolvedCourse =
    selectedCourse === 'ALL' ? institutes?.[0]?.id || institutes?.[0]?._id || '' : selectedCourse;

  const {
    results: words,
    status,
    loadMore,
  } = (usePaginatedQuery as unknown as (...args: any[]) => any)(
    VOCAB.getAllPaginated,
    selectedCourse === 'ALL' ? {} : { courseId: selectedCourse },
    { initialNumItems: ITEMS_PER_PAGE }
  );

  const stats = useQuery(VOCAB.getStats, { courseId: resolvedCourse || '' }) as any;

  const posOptions = useMemo(() => {
    if (!words) return [];
    const posSet = new Set((words as WordRow[]).map(w => w.partOfSpeech || '').filter(Boolean));
    return Array.from(posSet).sort((a, b) => a.localeCompare(b));
  }, [words]);

  const filteredWords = useMemo(() => {
    if (!words) return [];
    let result = words as WordRow[];

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        w =>
          w.word.toLowerCase().includes(term) ||
          w.meaning.toLowerCase().includes(term) ||
          w.meaningEn?.toLowerCase().includes(term)
      );
    }

    if (meaningFilter === 'filled') {
      result = result.filter(w => w.meaning && w.meaning.trim() !== '');
    } else if (meaningFilter === 'empty') {
      result = result.filter(w => !w.meaning || w.meaning.trim() === '');
    }

    if (posFilter !== 'ALL') {
      result = result.filter(w => w.partOfSpeech === posFilter);
    }

    const fromUnit = unitFrom ? Number.parseInt(unitFrom, 10) : null;
    const toUnit = unitTo ? Number.parseInt(unitTo, 10) : null;
    if (fromUnit !== null || toUnit !== null) {
      result = result.filter(w => {
        const unit = w.unitId || 0;
        if (fromUnit !== null && unit < fromUnit) return false;
        if (toUnit !== null && unit > toUnit) return false;
        return true;
      });
    }

    return result;
  }, [words, search, meaningFilter, posFilter, unitFrom, unitTo]);

  const paginatedWords = filteredWords;
  const totalWords = words?.length ?? 0;

  const openEditModal = (word: WordRow) => {
    setEditingWord(word);
    setEditForm({
      word: word.word,
      meaning: word.meaning,
      meaningEn: word.meaningEn || '',
      meaningVi: word.meaningVi || '',
      meaningMn: word.meaningMn || '',
      partOfSpeech: word.partOfSpeech || '',
      unitId: word.unitId,
      exampleSentence: word.exampleSentence || '',
      exampleMeaning: word.exampleMeaning || '',
      exampleMeaningEn: word.exampleMeaningEn || '',
      exampleMeaningVi: word.exampleMeaningVi || '',
      exampleMeaningMn: word.exampleMeaningMn || '',
    });
  };

  const closeEditModal = () => {
    setEditingWord(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editingWord) return;
    setIsSaving(true);
    try {
      await updateVocab({
        wordId: editingWord._id as Id<'words'>,
        appearanceId: editingWord.appearanceId as Id<'vocabulary_appearances'> | undefined,
        word: editForm.word,
        meaning: editForm.meaning,
        meaningEn: editForm.meaningEn,
        meaningVi: editForm.meaningVi,
        meaningMn: editForm.meaningMn,
        partOfSpeech: editForm.partOfSpeech,
        unitId: editForm.unitId,
        exampleSentence: editForm.exampleSentence,
        exampleMeaning: editForm.exampleMeaning,
        exampleMeaningEn: editForm.exampleMeaningEn,
        exampleMeaningVi: editForm.exampleMeaningVi,
        exampleMeaningMn: editForm.exampleMeaningMn,
      });
      closeEditModal();
    } catch (error) {
      logger.error('Failed to update:', error);
      notify.error('保存失败: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (!filteredWords.length) {
      notify.error('没有可导出的数据');
      return;
    }

    const exportData = filteredWords.map(w => ({
      单元: w.unitId || '',
      韩语: w.word,
      词性: w.partOfSpeech || '',
      '释义(中)': w.meaning || '',
      '释义(英)': w.meaningEn || '',
      '释义(蒙)': w.meaningMn || '',
      '释义(越)': w.meaningVi || '',
      例句: w.exampleSentence || '',
      '例句翻译(中)': w.exampleMeaning || '',
      '例句翻译(英)': w.exampleMeaningEn || '',
      '例句翻译(蒙)': w.exampleMeaningMn || '',
      '例句翻译(越)': w.exampleMeaningVi || '',
      教材: w.courseName || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '词汇');

    const date = new Date().toISOString().slice(0, 10);
    const courseName =
      selectedCourse === 'ALL'
        ? '全部'
        : institutes?.find(i => (i.id || i._id) === selectedCourse)?.name || selectedCourse;
    XLSX.writeFile(wb, `词汇导出_${courseName}_${date}.xlsx`);
  };

  const currentCourseName = useMemo(() => {
    if (selectedCourse === 'ALL') return '全部';
    return institutes?.find(i => (i.id || i._id) === selectedCourse)?.name || '未选择';
  }, [selectedCourse, institutes]);

  const paginationStatus = useMemo(() => {
    if (status === 'CanLoadMore') {
      return (
        <button
          onClick={() => loadMore(ITEMS_PER_PAGE)}
          className="px-6 py-2 bg-white border border-zinc-300 rounded-lg shadow-sm text-sm font-medium hover:bg-zinc-50 text-zinc-700 transition-colors flex items-center gap-2"
          aria-label="加载更多词条"
        >
          <Download className="w-4 h-4" />
          加载更多
        </button>
      );
    }
    if (status === 'LoadingMore') {
      return (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          加载中...
        </div>
      );
    }
    return <div className="text-sm text-zinc-400 font-medium">没有更多数据了</div>;
  }, [status, loadMore]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">词汇资产大盘</h2>
          <p className="text-sm text-zinc-500">来自 Convex 的实时词汇数据概览</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索单词或释义"
              className="pl-9 pr-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
              aria-label="搜索单词或释义"
            />
          </div>
          <select
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium"
            aria-label="选择教材"
          >
            <option value="ALL">全部教材</option>
            {(institutes || []).map(inst => {
              let displayName = inst.name || '';
              if (inst.displayLevel) displayName += ` ${inst.displayLevel}`;
              if (inst.volume) displayName += ` ${inst.volume}`;
              return (
                <option key={inst.id || inst._id} value={inst.id || inst._id}>
                  {displayName}
                </option>
              );
            })}
          </select>
          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-lg bg-zinc-900 text-white text-sm font-bold flex items-center gap-2 hover:bg-zinc-800 transition-colors"
            aria-label="导出 Excel"
          >
            <Download className="w-4 h-4" />
            导出 Excel
          </button>
        </div>
      </div>

      <VocabFilters
        meaningFilter={meaningFilter}
        setMeaningFilter={setMeaningFilter}
        posFilter={posFilter}
        setPosFilter={setPosFilter}
        posOptions={posOptions}
        unitFrom={unitFrom}
        setUnitFrom={setUnitFrom}
        unitTo={unitTo}
        setUnitTo={setUnitTo}
        filteredCount={filteredWords.length}
      />

      <VocabStats
        totalWords={totalWords}
        mastered={stats?.mastered ?? 0}
        currentCourseName={currentCourseName}
      />

      <div className="bg-white border-2 border-zinc-900 rounded-2xl shadow-[6px_6px_0px_0px_#18181B] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2 font-bold text-zinc-800">
            <Database className="w-4 h-4" />
            词汇列表
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>
              已加载 {words?.length || 0} 条 · 当前显示 {filteredWords.length} 条
            </span>
          </div>
        </div>

        {words ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-100 text-zinc-600 uppercase text-xs">
                <tr>
                  <th className="px-3 py-3 text-left">单元</th>
                  <th className="px-3 py-3 text-left">韩语</th>
                  <th className="px-3 py-3 text-left">词性</th>
                  <th className="px-3 py-3 text-left">释义(MN)</th>
                  <th className="px-3 py-3 text-left">释义(VN)</th>
                  <th className="px-3 py-3 text-left">释义(EN)</th>
                  <th className="px-3 py-3 text-left">释义(CH)</th>
                  <th className="px-3 py-3 text-left">例句</th>
                  <th className="px-3 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedWords.map(word => (
                  <VocabWordRow
                    key={(word as { appearanceId?: string }).appearanceId ?? word._id}
                    word={word}
                    onEdit={openEditModal}
                  />
                ))}
                {paginatedWords.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-zinc-500" colSpan={9}>
                      未找到匹配的词条
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center py-10 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            正在从 Convex 读取数据...
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-2 py-4 border-t border-zinc-200 bg-zinc-50">
          <div className="text-xs text-zinc-500 mb-2">
            已加载 {words?.length || 0} 个词条 ({filteredWords.length} 显示)
          </div>
          {paginationStatus}
        </div>
      </div>

      <VocabEditModal
        editingWord={editingWord}
        editForm={editForm}
        setEditForm={setEditForm}
        isSaving={isSaving}
        onClose={closeEditModal}
        onSave={handleSave}
      />
    </div>
  );
};

export default VocabDashboard;
