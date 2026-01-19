import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { CheckCircle2, Loader2, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { makeFunctionReference } from 'convex/server';

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
  word: '',
  meaning: '',
  partOfSpeech: 'NOUN',
  courseId: '',
  unitId: 1,
  hanja: '',
  pronunciation: '',
  exampleMeaning: '',
  exampleSentence: '',
};

type BulkImportItem = Pick<
  FormState,
  'word' | 'meaning' | 'partOfSpeech' | 'hanja' | 'courseId' | 'unitId'
> & {
  exampleSentence?: string;
  exampleMeaning?: string;
  // Multi-language meanings
  meaningEn?: string;
  meaningVi?: string;
  meaningMn?: string;
  // Multi-language example translations
  exampleMeaningEn?: string;
  exampleMeaningVi?: string;
  exampleMeaningMn?: string;
  tips?: unknown;
};

type BulkImportResult = {
  success: boolean;
  results?: {
    success: number;
    failed: number;
    smartFilled: number;
    newWords: number;
    errors: string[];
  };
};

/**
 * Parse a CSV line correctly, handling quoted fields that may contain commas.
 * Supports both double quotes (") and handles escaped quotes ("").
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote ("")
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator - push current field and reset
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Push the last field
  result.push(current.trim());

  return result;
}

const VocabImporter: React.FC = () => {
  const institutes = (useQuery as unknown as (q: unknown, args: unknown) => unknown)(
    makeFunctionReference('institutes:getAll'),
    {}
  ) as any[] | undefined;
  const saveWord = (useMutation as unknown as (m: unknown) => (args: unknown) => Promise<unknown>)(
    makeFunctionReference('vocab:saveWord')
  );
  const bulkImportMutation = (
    useMutation as unknown as (m: unknown) => (args: unknown) => Promise<unknown>
  )(makeFunctionReference('vocab:bulkImport'));

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [bulkText, setBulkText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!form.courseId && institutes && institutes.length > 0) {
      const first = institutes[0];
      setForm(prev => ({ ...prev, courseId: first.id || first._id }));
    }
  }, [institutes, form.courseId]);

  const partOfSpeechOptions = useMemo(
    () => [
      { value: 'NOUN', label: '名词' },
      { value: 'VERB_T', label: '他动词' },
      { value: 'VERB_I', label: '自动词' },
      { value: 'ADJ', label: '形容词' },
      { value: 'ADV', label: '副词' },
      { value: 'PARTICLE', label: '助词' },
    ],
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.word.trim() || !form.meaning.trim() || !form.courseId) {
      setStatus('请完整填写必要字段');
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
      setStatus('已保存单词并同步到 Convex');
      setForm(prev => ({ ...DEFAULT_FORM, courseId: prev.courseId }));
    } catch (error: any) {
      console.error(error);
      setStatus(error?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    if (!form.courseId) {
      setStatus('请选择教材后再导入');
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      const lines = bulkText
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

      // === Dynamic Header Parsing ===
      // Step 1: Parse headers from first row
      const headerLine = lines[0];
      const headers = headerLine.includes('\t')
        ? headerLine.split('\t').map(h => h.trim().toLowerCase())
        : parseCSVLine(headerLine).map(h => h.toLowerCase());

      // Step 2: Map header keywords to column indices
      const findColumn = (keywords: string[]): number => {
        return headers.findIndex(h => keywords.some(k => h.includes(k)));
      };

      const colMap = {
        unit: findColumn(['单元', 'unit', 'lesson', '课']),
        word: findColumn(['韩语', 'word', '单词', 'korean']),
        pos: findColumn(['词性', 'pos', 'part']),
        // Support both "释义(CH)" and "释义 (CH)" formats
        meaningCh: findColumn(['释义 (ch)', '释义(中)', '释义(ch)', '中文', 'chinese', 'meaning']),
        meaningEn: findColumn(['释义 (en)', '释义(英)', '释义(en)', '英文', 'english']),
        meaningMn: findColumn(['释义 (mn)', '释义(蒙)', '释义(mn)', '蒙古', 'mongolian']),
        meaningVi: findColumn(['释义 (vn)', '释义(越)', '释义(vn)', '越南', 'vietnamese']),
        example: findColumn(['例句 (kr)', '例句(kr)', '例句', 'example', '韩语例句']),
        exampleCh: findColumn(['例句翻译 (c', '例句翻译(ch)', '例句中翻', '例句翻译']),
        exampleEn: findColumn(['例句翻译 (e', '例句翻译(en)', '例句英翻']),
        exampleMn: findColumn(['例句翻译 (n', '例句翻译 (m', '例句翻译(mn)', '例句蒙翻']),
        exampleVi: findColumn(['例句翻译 (v', '例句翻译(vn)', '例句越翻']),
      };

      // Validate required columns
      if (colMap.word === -1) {
        setStatus(`错误：未找到"韩语"或"Word"列，请检查表头`);
        setSubmitting(false);
        return;
      }

      // Step 3: Parse data rows (skip header)
      const items: BulkImportItem[] = lines
        .slice(1) // Skip header row
        .map(line => {
          const parts = line.includes('\t')
            ? line.split('\t').map(p => p.trim())
            : parseCSVLine(line);

          const getValue = (idx: number) =>
            idx >= 0 && idx < parts.length ? parts[idx] : undefined;

          const word = getValue(colMap.word);
          if (!word) return null;

          // Get meaning - use CH first, fallback to first available
          let meaning = getValue(colMap.meaningCh);
          if (!meaning) {
            meaning =
              getValue(colMap.meaningEn) ||
              getValue(colMap.meaningMn) ||
              getValue(colMap.meaningVi) ||
              '';
          }

          // Pass actual values - let backend handle empty strings vs undefined
          return {
            word,
            meaning,
            partOfSpeech: getValue(colMap.pos) || 'NOUN',
            meaningEn: getValue(colMap.meaningEn), // Keep value as-is (string or undefined)
            meaningVi: getValue(colMap.meaningVi),
            meaningMn: getValue(colMap.meaningMn),
            courseId: form.courseId,
            unitId: Number(getValue(colMap.unit)) || form.unitId || 1,
            exampleSentence: getValue(colMap.example),
            exampleMeaning: getValue(colMap.exampleCh),
            exampleMeaningEn: getValue(colMap.exampleEn),
            exampleMeaningVi: getValue(colMap.exampleVi),
            exampleMeaningMn: getValue(colMap.exampleMn),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      if (items.length === 0) {
        setStatus('未解析到有效的词条');
        setSubmitting(false);
        return;
      }

      // === Batch Processing ===
      const BATCH_SIZE = 50;
      const totalItems = items.length;
      const batches = [];
      for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        batches.push(items.slice(i, i + BATCH_SIZE));
      }

      let successCount = 0;
      let failedCount = 0;
      let newWordsCount = 0;
      let smartFilledCount = 0;
      const allErrors: string[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setStatus(`正在处理第 ${i + 1}/${batches.length} 批次 (${batch.length} 条)...`);

        try {
          // Pass token implicitly via Convex client, or if needed by schema (args doesn't ask for token, so removed)
          const result = (await bulkImportMutation({ items: batch })) as BulkImportResult;
          const r = result?.results;

          if (r) {
            successCount += r.success;
            failedCount += r.failed;
            newWordsCount += r.newWords;
            smartFilledCount += r.smartFilled;
            if (r.errors) allErrors.push(...r.errors);
          }
        } catch (err: any) {
          console.error(`Batch ${i + 1} failed:`, err);
          failedCount += batch.length;
          allErrors.push(`Batch ${i + 1} Error: ${err.message}`);
        }
      }

      // Final Summary
      if (allErrors.length > 0) {
        setStatus(
          `部分导入完成。成功: ${successCount}, 失败: ${failedCount}。错误: ${allErrors.slice(0, 3).join('; ')}...`
        );
      } else {
        const parts: string[] = [`全部完成！成功导入 ${successCount} 条`];
        if (smartFilledCount > 0) parts.push(`智能填充 ${smartFilledCount} 条`);
        if (newWordsCount > 0) parts.push(`新增词汇 ${newWordsCount} 条`);
        setStatus(parts.join('，'));
      }
      setBulkText('');
    } catch (error: any) {
      console.error(error);
      setStatus(error?.message || '批量导入失败');
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
          <label className="block text-xs font-bold text-zinc-500 mb-1">选择教材</label>
          <select
            value={form.courseId}
            onChange={e => setForm(prev => ({ ...prev, courseId: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium"
          >
            {(institutes || []).map((inst: any) => {
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
                onChange={e => setForm(prev => ({ ...prev, word: e.target.value }))}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-zinc-700">
              释义 *
              <input
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900"
                value={form.meaning}
                onChange={e => setForm(prev => ({ ...prev, meaning: e.target.value }))}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-zinc-700">
              词性
              <select
                className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                value={form.partOfSpeech}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    partOfSpeech: e.target.value,
                  }))
                }
              >
                {partOfSpeechOptions.map(opt => (
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
                onChange={e =>
                  setForm(prev => ({
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
                onChange={e =>
                  setForm(prev => ({
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
                onChange={e => setForm(prev => ({ ...prev, hanja: e.target.value }))}
              />
            </label>
          </div>

          <label className="space-y-1 text-sm font-medium text-zinc-700 block">
            例句
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900"
              rows={2}
              value={form.exampleSentence}
              onChange={e =>
                setForm(prev => ({
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
              onChange={e =>
                setForm(prev => ({
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
            批量导入
          </div>

          {/* File Upload Area */}
          {/* File Upload Area */}
          <div className="relative">
            <input
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;

                const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

                if (isExcel) {
                  const reader = new FileReader();
                  reader.onload = event => {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    // Convert to TSV (Tab Separated Values) - naturally avoids comma issues
                    const text = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
                    setBulkText(text);
                    setStatus(
                      `已加载 Excel 文件: ${file.name} (${text.split('\n').filter(Boolean).length} 行)`
                    );
                  };
                  reader.readAsArrayBuffer(file);
                } else {
                  const reader = new FileReader();
                  reader.onload = event => {
                    const text = event.target?.result as string;
                    setBulkText(text);
                    setStatus(
                      `已加载文本文件: ${file.name} (${text.split('\n').filter(Boolean).length} 行)`
                    );
                  };
                  reader.readAsText(file, 'UTF-8');
                }
                e.target.value = ''; // Reset for re-upload
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="border-2 border-dashed border-zinc-300 rounded-xl p-6 text-center hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-zinc-400 mb-2 group-hover:text-indigo-500 transition-colors" />
              <p className="text-sm font-bold text-zinc-700">点击上传表格文件</p>
              <p className="text-xs text-zinc-400 mt-1">支持 Excel (.xlsx, .xls) 或 CSV (.csv)</p>
            </div>
          </div>

          <div className="text-xs text-zinc-500 text-center">— 或手动从表格中复制并粘贴 —</div>

          {/* Format Guide */}
          <div className="bg-zinc-50 rounded-lg p-3 text-xs space-y-2 border border-zinc-100">
            <div className="flex items-center justify-between">
              <div className="font-bold text-zinc-700">列格式说明（按顺序）：</div>
              <span className="bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded text-[10px]">
                共 12 列
              </span>
            </div>
            <div className="text-zinc-500 font-mono leading-relaxed break-all">
              单元, 韩语, 词性, 释义(蒙), 释义(越), 释义(英), 释义(中), 例句, 例句中翻, 例句蒙翻,
              例句越翻, 例句英翻
            </div>
            <div className="text-zinc-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span>智能识别 CSV 或 Excel 粘贴格式，自动跳过表头</span>
            </div>
          </div>

          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 font-mono text-xs bg-zinc-50/50"
            placeholder="粘贴区域：&#10;1	가수	NOUN	Дуучин	Ca sĩ	Singer	歌手	저는 노래를 잘하는 가수가 되고 싶어요.	我想成为唱歌好的歌手...&#10;..."
          />

          {bulkText && (
            <div className="text-xs text-zinc-500">
              已解析 {bulkText.split('\n').filter(l => l.trim()).length} 行数据
            </div>
          )}

          <button
            type="button"
            onClick={handleBulkImport}
            disabled={submitting || !bulkText.trim()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
