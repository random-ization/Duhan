import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { BarChart3, BookOpen, Database, Loader2, Search } from "lucide-react";

interface WordRow {
  _id: string;
  word: string;
  meaning: string;
  courseId?: string;
  courseName?: string;
  unitId?: number;
  partOfSpeech?: string;
}

const VocabDashboard: React.FC = () => {
  const institutes = useQuery(api.institutes.getAll, {});
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const resolvedCourse =
    selectedCourse === "ALL"
      ? institutes?.[0]?.id || institutes?.[0]?._id || ""
      : selectedCourse;

  const vocabArgs = useMemo(
    () =>
      selectedCourse === "ALL"
        ? { limit: 200 }
        : { limit: 200, courseId: selectedCourse },
    [selectedCourse]
  );

  const words = useQuery(api.vocab.getAll, vocabArgs);

  const stats = useQuery(api.vocab.getStats, {
    courseId: resolvedCourse || "",
  });

  const filteredWords = useMemo(() => {
    if (!words) return [];
    if (!search.trim()) return words as WordRow[];
    const term = search.toLowerCase();
    return (words as WordRow[]).filter(
      (w) =>
        w.word.toLowerCase().includes(term) ||
        w.meaning.toLowerCase().includes(term)
    );
  }, [words, search]);

  const totalWords = words?.length ?? 0;

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
            {(institutes || []).map((inst: any) => (
              <option key={inst.id || inst._id} value={inst.id || inst._id}>
                {inst.name}
              </option>
            ))}
          </select>
        </div>
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
                : institutes?.find((i: any) => (i.id || i._id) === selectedCourse)
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
          <span className="text-xs text-zinc-500">
            显示前 {Math.min(filteredWords.length, 200)} 条
          </span>
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
                  <th className="px-4 py-3 text-left">单词</th>
                  <th className="px-4 py-3 text-left">释义</th>
                  <th className="px-4 py-3 text-left">词性</th>
                  <th className="px-4 py-3 text-left">教材</th>
                  <th className="px-4 py-3 text-left">课次</th>
                </tr>
              </thead>
              <tbody>
                {filteredWords.map((word) => (
                  <tr
                    key={word._id}
                    className="border-t border-zinc-100 hover:bg-zinc-50 transition-colors"
                  >
                    <td className="px-4 py-2 font-bold text-zinc-900">
                      {word.word}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{word.meaning}</td>
                    <td className="px-4 py-2 text-zinc-600">
                      {word.partOfSpeech || "-"}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {word.courseName || word.courseId || "未分类"}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {word.unitId ?? "-"}
                    </td>
                  </tr>
                ))}
                {filteredWords.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-zinc-500"
                      colSpan={5}
                    >
                      未找到匹配的词条
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VocabDashboard;
