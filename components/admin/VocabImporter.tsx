import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CheckCircle2, Loader2, Upload } from "lucide-react";

interface FormState {
  word: string;
  meaning: string;
  partOfSpeech: string;
  hanja?: string;
  pronunciation?: string;
  courseId: string;
  unitId: number;
  exampleSentence?: string;
  exampleMeaning?: string;
}

const DEFAULT_FORM: FormState = {
  word: "",
  meaning: "",
  partOfSpeech: "NOUN",
  courseId: "",
  unitId: 1,
  hanja: "",
  pronunciation: "",
  exampleMeaning: "",
  exampleSentence: "",
};

type BulkImportItem = Pick<
  FormState,
  "word" | "meaning" | "partOfSpeech" | "hanja" | "courseId" | "unitId"
> & {
  exampleSentence?: string;
  exampleMeaning?: string;
  tips?: unknown;
};

type BulkImportResult = {
  success: boolean;
  results?: {
    success: number;
    failed: number;
    errors: string[];
  };
};

const VocabImporter: React.FC = () => {
  const institutes = useQuery(api.institutes.getAll, {});
  const saveWord = useMutation(api.vocab.saveWord);
  const bulkImportMutation = useMutation(api.vocab.bulkImport);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [bulkText, setBulkText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!form.courseId && institutes && institutes.length > 0) {
      const first = institutes[0];
      setForm((prev) => ({ ...prev, courseId: first.id || first._id }));
    }
  }, [institutes, form.courseId]);

  const partOfSpeechOptions = useMemo(
    () => [
      { value: "NOUN", label: "名词" },
      { value: "VERB_T", label: "他动词" },
      { value: "VERB_I", label: "自动词" },
      { value: "ADJ", label: "形容词" },
      { value: "ADV", label: "副词" },
      { value: "PARTICLE", label: "助词" },
    ],
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.word.trim() || !form.meaning.trim() || !form.courseId) {
      setStatus("请完整填写必要字段");
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      await saveWord({
        word: form.word.trim(),
        meaning: form.meaning.trim(),
        partOfSpeech: form.partOfSpeech,
        hanja: form.hanja?.trim() || undefined,
        pronunciation: form.pronunciation?.trim() || undefined,
        courseId: form.courseId,
        unitId: form.unitId || 1,
        exampleSentence: form.exampleSentence?.trim() || undefined,
        exampleMeaning: form.exampleMeaning?.trim() || undefined,
      });
      setStatus("已保存单词并同步到 Convex");
      setForm((prev) => ({ ...DEFAULT_FORM, courseId: prev.courseId }));
    } catch (error: any) {
      console.error(error);
      setStatus(error?.message || "保存失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    if (!form.courseId) {
      setStatus("请选择教材后再导入");
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      const lines = bulkText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const items: BulkImportItem[] = lines
        .map((line) => {
          const [word, meaning, partOfSpeech, unit] = line.split(",");
          if (!word || !meaning) return null;
          return {
            word: word.trim(),
            meaning: meaning.trim(),
            partOfSpeech: (partOfSpeech || "NOUN").trim(),
            hanja: undefined,
            courseId: form.courseId,
            unitId: Number(unit) || form.unitId || 1,
          };
        })
        .filter((item): item is BulkImportItem => Boolean(item));

      if (items.length === 0) {
        setStatus("未解析到有效的词条");
        setSubmitting(false);
        return;
      }

      const result: BulkImportResult = await bulkImportMutation({ items });
      if (result?.results?.errors?.length) {
        setStatus(`部分导入失败：${result.results.errors.join("; ")}`);
      } else {
        setStatus(`成功导入 ${items.length} 条词汇`);
      }
      setBulkText("");
    } catch (error: any) {
      console.error(error);
      setStatus(error?.message || "批量导入失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">智能导入</h2>
          <p className="text-sm text-zinc-500">支持单条录入与快速批量导入</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 mb-1">
            选择教材
          </label>
          <select
            value={form.courseId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, courseId: e.target.value }))
            }
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium"
          >
            {(institutes || []).map((inst: any) => (
              <option key={inst.id || inst._id} value={inst.id || inst._id}>
                {inst.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSubmit}
          className="bg-white border-2 border-zinc-900 rounded-2xl shadow-[6px_6px_0px_0px_#18181B] p-5 space-y-4"
        >
          <div className="flex items-center gap-2 font-bold text-zinc-800">
            <CheckCircle2 className="w-4 h-4" />
            单条录入
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1 text-sm font-medium text-zinc-700">
              单词 *
              <input
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900"
                value={form.word}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, word: e.target.value }))
                }
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-zinc-700">
              释义 *
              <input
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900"
                value={form.meaning}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, meaning: e.target.value }))
                }
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-zinc-700">
              词性
              <select
                className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                value={form.partOfSpeech}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    partOfSpeech: e.target.value,
                  }))
                }
              >
                {partOfSpeechOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-zinc-700">
              课次
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900"
                value={form.unitId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    unitId: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-zinc-700">
              读音
              <input
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900"
                value={form.pronunciation}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pronunciation: e.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-zinc-700">
              汉字
              <input
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900"
                value={form.hanja}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, hanja: e.target.value }))
                }
              />
            </label>
          </div>

          <label className="space-y-1 text-sm font-medium text-zinc-700 block">
            例句
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900"
              rows={2}
              value={form.exampleSentence}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  exampleSentence: e.target.value,
                }))
              }
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-zinc-700 block">
            译文
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900"
              rows={2}
              value={form.exampleMeaning}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  exampleMeaning: e.target.value,
                }))
              }
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            保存并同步
          </button>
        </form>

        <div className="bg-white border-2 border-zinc-900 rounded-2xl shadow-[6px_6px_0px_0px_#18181B] p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-zinc-800">
            <Upload className="w-4 h-4" />
            批量导入（CSV 每行：word,meaning,partOfSpeech,unit）
          </div>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 font-mono text-sm"
            placeholder="示例：학교,学校,NOUN,1"
          />
          <button
            type="button"
            onClick={handleBulkImport}
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            提交批量导入
          </button>
        </div>
      </div>

      {status && (
        <div className="px-4 py-3 rounded-xl border-2 border-zinc-900 bg-amber-50 text-sm text-zinc-800">
          {status}
        </div>
      )}
    </div>
  );
};

export default VocabImporter;
