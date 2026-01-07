import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import * as XLSX from "xlsx";
import {
  BarChart3,
  BookOpen,
  Database,
  Loader2,
  Search,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  Download,
} from "lucide-react";

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
  const institutes = useQuery(api.institutes.getAll, {}) as
    | InstituteRow[]
    | undefined;
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingWord, setEditingWord] = useState<WordRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<WordRow>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Field filters
  const [meaningFilter, setMeaningFilter] = useState<"all" | "filled" | "empty">("all");
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [unitFrom, setUnitFrom] = useState<string>("");
  const [unitTo, setUnitTo] = useState<string>("");

  const updateVocab = useMutation(api.vocab.updateVocab);

  const resolvedCourse =
    selectedCourse === "ALL"
      ? institutes?.[0]?.id || institutes?.[0]?._id || ""
      : selectedCourse;

  const vocabArgs = useMemo(
    () =>
      selectedCourse === "ALL"
        ? { limit: 2000 }
        : { limit: 2000, courseId: selectedCourse },
    [selectedCourse]
  );

  const words = useQuery(api.vocab.getAll, vocabArgs);

  const stats = useQuery(api.vocab.getStats, {
    courseId: resolvedCourse || "",
  });

  // Get unique POS values for filter dropdown
  const posOptions = useMemo(() => {
    if (!words) return [];
    const posSet = new Set((words as WordRow[]).map(w => w.partOfSpeech || "").filter(Boolean));
    return Array.from(posSet).sort();
  }, [words]);

  const filteredWords = useMemo(() => {
    if (!words) return [];
    let result = words as WordRow[];

    // Search filter
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.word.toLowerCase().includes(term) ||
          w.meaning.toLowerCase().includes(term) ||
          (w.meaningEn && w.meaningEn.toLowerCase().includes(term))
      );
    }

    // Meaning status filter
    if (meaningFilter === "filled") {
      result = result.filter(w => w.meaning && w.meaning.trim() !== "");
    } else if (meaningFilter === "empty") {
      result = result.filter(w => !w.meaning || w.meaning.trim() === "");
    }

    // POS filter
    if (posFilter !== "ALL") {
      result = result.filter(w => w.partOfSpeech === posFilter);
    }

    // Unit range filter
    const fromUnit = unitFrom ? parseInt(unitFrom) : null;
    const toUnit = unitTo ? parseInt(unitTo) : null;
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

  // Pagination
  const totalPages = Math.ceil(filteredWords.length / ITEMS_PER_PAGE);
  const paginatedWords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredWords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWords, currentPage]);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCourse, meaningFilter, posFilter, unitFrom, unitTo]);

  const totalWords = words?.length ?? 0;

  const openEditModal = (word: WordRow) => {
    setEditingWord(word);
    setEditForm({
      word: word.word,
      meaning: word.meaning,
      meaningEn: word.meaningEn || "",
      meaningVi: word.meaningVi || "",
      meaningMn: word.meaningMn || "",
      partOfSpeech: word.partOfSpeech || "",
      unitId: word.unitId,
      exampleSentence: word.exampleSentence || "",
      exampleMeaning: word.exampleMeaning || "",
      exampleMeaningEn: word.exampleMeaningEn || "",
      exampleMeaningVi: word.exampleMeaningVi || "",
      exampleMeaningMn: word.exampleMeaningMn || "",
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
      const token = localStorage.getItem("token") || undefined;
      await updateVocab({
        token,
        wordId: editingWord._id as Id<"words">,
        appearanceId: editingWord.appearanceId as Id<"vocabulary_appearances"> | undefined,
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
      console.error("Failed to update:", error);
      alert("保存失败: " + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (!filteredWords.length) {
      alert("没有可导出的数据");
      return;
    }

    // Prepare data with headers
    const exportData = filteredWords.map((w) => ({
      "单元": w.unitId || "",
      "韩语": w.word,
      "词性": w.partOfSpeech || "",
      "释义(中)": w.meaning || "",
      "释义(英)": w.meaningEn || "",
      "释义(蒙)": w.meaningMn || "",
      "释义(越)": w.meaningVi || "",
      "例句": w.exampleSentence || "",
      "例句翻译(中)": w.exampleMeaning || "",
      "例句翻译(英)": w.exampleMeaningEn || "",
      "例句翻译(蒙)": w.exampleMeaningMn || "",
      "例句翻译(越)": w.exampleMeaningVi || "",
      "教材": w.courseName || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "词汇");

    // Generate filename with date
    const date = new Date().toISOString().slice(0, 10);
    const courseName = selectedCourse === "ALL" ? "全部" : (institutes?.find(i => (i.id || i._id) === selectedCourse)?.name || selectedCourse);
    XLSX.writeFile(wb, `词汇导出_${courseName}_${date}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">词汇资产大盘</h2>
          <p className="text-sm text-zinc-500">
            来自 Convex 的实时词汇数据概览
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索单词或释义"
              className="pl-9 pr-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium"
          >
            <option value="ALL">全部教材</option>
            {(institutes || []).map((inst) => {
              // Build display name with level and volume
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
          >
            <Download className="w-4 h-4" />
            导出 Excel
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
        <span className="text-xs font-bold text-zinc-500 uppercase">筛选：</span>

        {/* Meaning Status */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-zinc-200 p-0.5">
          <button
            onClick={() => setMeaningFilter("all")}
            className={`px-2 py-1 text-xs font-medium rounded ${meaningFilter === "all" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            全部
          </button>
          <button
            onClick={() => setMeaningFilter("filled")}
            className={`px-2 py-1 text-xs font-medium rounded ${meaningFilter === "filled" ? "bg-emerald-600 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            已填充
          </button>
          <button
            onClick={() => setMeaningFilter("empty")}
            className={`px-2 py-1 text-xs font-medium rounded ${meaningFilter === "empty" ? "bg-amber-500 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            未填充
          </button>
        </div>

        {/* POS Filter */}
        <select
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value)}
          className="px-2 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium"
        >
          <option value="ALL">全部词性</option>
          {posOptions.map(pos => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>

        {/* Unit Range */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-zinc-500">课数：</span>
          <input
            type="number"
            value={unitFrom}
            onChange={(e) => setUnitFrom(e.target.value)}
            placeholder="从"
            className="w-14 px-2 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
          />
          <span className="text-zinc-400">-</span>
          <input
            type="number"
            value={unitTo}
            onChange={(e) => setUnitTo(e.target.value)}
            placeholder="到"
            className="w-14 px-2 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
          />
        </div>

        {/* Result count */}
        <span className="ml-auto text-xs text-zinc-500">
          筛选结果：<span className="font-bold text-zinc-900">{filteredWords.length}</span> 条
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border-2 border-zinc-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(24,24,27,0.25)] flex items-center gap-3">
          <div className="p-3 bg-zinc-900 text-white rounded-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              词条总数
            </p>
            <p className="text-2xl font-black text-zinc-900">{totalWords}</p>
          </div>
        </div>
        <div className="p-4 bg-white border-2 border-zinc-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(24,24,27,0.25)] flex items-center gap-3">
          <div className="p-3 bg-emerald-600 text-white rounded-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              精通词汇
            </p>
            <p className="text-2xl font-black text-zinc-900">
              {stats?.mastered ?? 0}
            </p>
          </div>
        </div>
        <div className="p-4 bg-white border-2 border-zinc-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(24,24,27,0.25)] flex items-center gap-3">
          <div className="p-3 bg-indigo-600 text-white rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              当前教材
            </p>
            <p className="text-sm font-black text-zinc-900">
              {selectedCourse === "ALL"
                ? "全部"
                : institutes?.find((i) => (i.id || i._id) === selectedCourse)
                  ?.name || "未选择"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-zinc-900 rounded-2xl shadow-[6px_6px_0px_0px_#18181B] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2 font-bold text-zinc-800">
            <Database className="w-4 h-4" />
            词汇列表
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>
              第 {currentPage} / {totalPages || 1} 页 · 共 {filteredWords.length} 条
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-zinc-200 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 rounded hover:bg-zinc-200 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {!words ? (
          <div className="flex items-center justify-center py-10 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            正在从 Convex 读取数据...
          </div>
        ) : (
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
                {paginatedWords.map((word) => (
                  <tr
                    key={word._id}
                    className="border-t border-zinc-100 hover:bg-zinc-50 transition-colors"
                  >
                    <td className="px-3 py-2 text-zinc-600">
                      {word.unitId ?? "-"}
                    </td>
                    <td className="px-3 py-2 font-bold text-zinc-900">
                      {word.word}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 text-xs">
                      {word.partOfSpeech || "-"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 max-w-[120px] truncate" title={word.meaningMn}>
                      {word.meaningMn || "-"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 max-w-[120px] truncate" title={word.meaningVi}>
                      {word.meaningVi || "-"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 max-w-[120px] truncate" title={word.meaningEn}>
                      {word.meaningEn || "-"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 max-w-[120px] truncate" title={word.meaning}>
                      {word.meaning}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 text-xs max-w-[150px] truncate" title={word.exampleSentence}>
                      {word.exampleSentence || "-"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => openEditModal(word)}
                        className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {paginatedWords.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-zinc-500"
                      colSpan={9}
                    >
                      未找到匹配的词条
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-3 border-t border-zinc-200 bg-zinc-50">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm rounded hover:bg-zinc-200 disabled:opacity-30"
            >
              首页
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm rounded hover:bg-zinc-200 disabled:opacity-30"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-sm font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm rounded hover:bg-zinc-200 disabled:opacity-30"
            >
              下一页
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm rounded hover:bg-zinc-200 disabled:opacity-30"
            >
              末页
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingWord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h3 className="text-lg font-bold text-zinc-900">
                编辑词汇: {editingWord.word}
              </h3>
              <button
                onClick={closeEditModal}
                className="p-2 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    韩语
                  </label>
                  <input
                    value={editForm.word || ""}
                    onChange={(e) => setEditForm({ ...editForm, word: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    词性
                  </label>
                  <input
                    value={editForm.partOfSpeech || ""}
                    onChange={(e) => setEditForm({ ...editForm, partOfSpeech: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    单元
                  </label>
                  <input
                    type="number"
                    value={editForm.unitId ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, unitId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>
              <div className="border-t border-zinc-200 pt-4">
                <h4 className="text-sm font-bold text-zinc-800 mb-3">多语言释义</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      释义(CH) 中文
                    </label>
                    <input
                      value={editForm.meaning || ""}
                      onChange={(e) => setEditForm({ ...editForm, meaning: e.target.value })}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      释义(EN) English
                    </label>
                    <input
                      value={editForm.meaningEn || ""}
                      onChange={(e) => setEditForm({ ...editForm, meaningEn: e.target.value })}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      释义(VN) Tiếng Việt
                    </label>
                    <input
                      value={editForm.meaningVi || ""}
                      onChange={(e) => setEditForm({ ...editForm, meaningVi: e.target.value })}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      释义(MN) Монгол
                    </label>
                    <input
                      value={editForm.meaningMn || ""}
                      onChange={(e) => setEditForm({ ...editForm, meaningMn: e.target.value })}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-zinc-200 pt-4">
                <h4 className="text-sm font-bold text-zinc-800 mb-3">例句</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      韩语例句
                    </label>
                    <textarea
                      value={editForm.exampleSentence || ""}
                      onChange={(e) => setEditForm({ ...editForm, exampleSentence: e.target.value })}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        例句翻译(CH)
                      </label>
                      <input
                        value={editForm.exampleMeaning || ""}
                        onChange={(e) => setEditForm({ ...editForm, exampleMeaning: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        例句翻译(EN)
                      </label>
                      <input
                        value={editForm.exampleMeaningEn || ""}
                        onChange={(e) => setEditForm({ ...editForm, exampleMeaningEn: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        例句翻译(VN)
                      </label>
                      <input
                        value={editForm.exampleMeaningVi || ""}
                        onChange={(e) => setEditForm({ ...editForm, exampleMeaningVi: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        例句翻译(MN)
                      </label>
                      <input
                        value={editForm.exampleMeaningMn || ""}
                        onChange={(e) => setEditForm({ ...editForm, exampleMeaningMn: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VocabDashboard;
