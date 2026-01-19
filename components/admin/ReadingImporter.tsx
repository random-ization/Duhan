import React, { useEffect, useMemo, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import {
  CheckCircle2,
  Loader2,
  Upload,
  FileSpreadsheet,
  BookOpen,
  Music,
  X,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { makeFunctionReference } from 'convex/server';

interface FormState {
  courseId: string;
}

type BulkImportItem = {
  unitIndex: number;
  articleIndex: number;
  title: string;
  readingText: string;
  translation?: string;
  translationEn?: string;
  translationVi?: string;
  translationMn?: string;
  audioUrl?: string;
};

type BulkImportResult = {
  success: boolean;
  results?: {
    success: number;
    failed: number;
    created: number;
    updated: number;
    errors: string[];
  };
};

/**
 * Parse a CSV line correctly, handling quoted fields that may contain commas.
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
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

const ReadingImporter: React.FC = () => {
  const institutes = (useQuery as unknown as (q: unknown, args: unknown) => unknown)(
    makeFunctionReference('institutes:getAll'),
    {}
  ) as any[] | undefined;
  const bulkImportMutation = (
    useMutation as unknown as (m: unknown) => (args: unknown) => Promise<unknown>
  )(makeFunctionReference('units:bulkImport'));

  const [form, setForm] = useState<FormState>({ courseId: '' });
  const [bulkText, setBulkText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [parsedItems, setParsedItems] = useState<BulkImportItem[]>([]);

  // Audio upload state
  const [audioFiles, setAudioFiles] = useState<
    {
      file: File;
      unitIndex: number;
      articleIndex: number;
      status: 'pending' | 'uploading' | 'done' | 'error';
      url?: string;
    }[]
  >([]);
  const [audioUploading, setAudioUploading] = useState(false);
  const getUploadUrl = (
    useAction as unknown as (a: unknown) => (args: unknown) => Promise<unknown>
  )(makeFunctionReference('storage:getUploadUrl'));

  useEffect(() => {
    if (!form.courseId && institutes && institutes.length > 0) {
      const first = institutes[0];
      setForm(prev => ({ ...prev, courseId: first.id || first._id }));
    }
  }, [institutes, form.courseId]);

  // Parse bulk text into items when it changes
  useEffect(() => {
    if (!bulkText.trim()) {
      setParsedItems([]);
      return;
    }

    const lines = bulkText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setParsedItems([]);
      return;
    }

    // Parse headers from first row
    const headerLine = lines[0];
    const headers = headerLine.includes('\t')
      ? headerLine.split('\t').map(h => h.trim().toLowerCase())
      : parseCSVLine(headerLine).map(h => h.toLowerCase());

    // Map header keywords to column indices
    const findColumn = (keywords: string[]): number => {
      return headers.findIndex(h => keywords.some(k => h.includes(k)));
    };

    const colMap = {
      unit: findColumn(['单元', 'unit', '课']),
      article: findColumn(['文章', 'article', '序号', 'index']),
      title: findColumn(['标题', 'title']),
      text: findColumn(['正文', 'text', 'reading', '阅读']),
      translation: findColumn(['翻译(中)', '翻译(ch)', 'translation(ch)', '中文翻译']),
      translationEn: findColumn(['翻译(英)', '翻译(en)', 'translation(en)', '英文翻译']),
      translationVi: findColumn([
        '翻译(越)',
        '翻译(vn)',
        '翻译(vi)',
        'translation(vn)',
        '越南语翻译',
      ]),
      translationMn: findColumn(['翻译(蒙)', '翻译(mn)', 'translation(mn)', '蒙古语翻译']),
      audioUrl: findColumn(['音频', 'audio', 'url']),
    };

    // Parse data rows (skip header)
    const items: BulkImportItem[] = lines
      .slice(1)
      .map(line => {
        const parts = line.includes('\t')
          ? line.split('\t').map(p => p.trim())
          : parseCSVLine(line);

        const getValue = (idx: number) => (idx >= 0 && idx < parts.length ? parts[idx] : undefined);
        // Convert placeholder back to real newlines
        const restoreNewlines = (val?: string) => val?.replace(/⏎/g, '\n');

        const unitIndex = Number(getValue(colMap.unit));
        const articleIndex = Number(getValue(colMap.article)) || 1;
        const title = getValue(colMap.title);
        const readingText = restoreNewlines(getValue(colMap.text));

        if (!title || !readingText || isNaN(unitIndex)) return null;

        return {
          unitIndex,
          articleIndex,
          title,
          readingText,
          translation: restoreNewlines(getValue(colMap.translation)),
          translationEn: restoreNewlines(getValue(colMap.translationEn)),
          translationVi: restoreNewlines(getValue(colMap.translationVi)),
          translationMn: restoreNewlines(getValue(colMap.translationMn)),
          audioUrl: getValue(colMap.audioUrl),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    setParsedItems(items);
  }, [bulkText]);

  const handleExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = event => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonData.length > 0) {
        const headers = Object.keys(jsonData[0] as Record<string, unknown>);
        const headerLine = headers.join('\t');
        // Use placeholder ⏎ for newlines to preserve them in TSV format
        const dataLines = jsonData.map((row: any) =>
          headers
            .map(h => {
              const val = String(row[h] || '');
              // Replace newlines with placeholder to preserve them
              return val.replace(/[\r\n]+/g, '⏎');
            })
            .join('\t')
        );
        setBulkText([headerLine, ...dataLines].join('\n'));
        setStatus(`已加载 Excel 文件: ${file.name} (${jsonData.length} 条数据)`);
      } else {
        setStatus(`Excel 文件为空: ${file.name}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkImport = async () => {
    if (parsedItems.length === 0) {
      setStatus('未解析到有效的阅读文章');
      return;
    }
    if (!form.courseId) {
      setStatus('请选择教材后再导入');
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const result = (await bulkImportMutation({
        items: parsedItems,
        courseId: form.courseId,
      })) as BulkImportResult;

      const r = result?.results;
      if (r?.errors?.length) {
        setStatus(`部分导入失败：${r.errors.join('; ')}`);
      } else if (r) {
        const parts: string[] = [`成功导入 ${r.success} 篇阅读文章`];
        if (r.created > 0) parts.push(`新增 ${r.created} 篇`);
        if (r.updated > 0) parts.push(`更新 ${r.updated} 篇`);
        setStatus(parts.join('，'));
      } else {
        setStatus(`成功导入 ${parsedItems.length} 篇阅读文章`);
      }
      setBulkText('');
      setParsedItems([]);
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message || '批量导入失败');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle audio files selection
  const handleAudioFiles = (files: FileList) => {
    const newAudioFiles: typeof audioFiles = [];

    for (const file of Array.from(files)) {
      // Parse filename for unit-article pattern: "1-1.mp3", "1.mp3", "unit1-article1.mp3", etc.
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');

      // Try patterns: "1-1", "1_1", "unit1-1", "1"
      let unitIndex = 0,
        articleIndex = 1;

      const dashMatch = nameWithoutExt.match(/(\d+)[-_](\d+)/);
      if (dashMatch) {
        unitIndex = parseInt(dashMatch[1], 10);
        articleIndex = parseInt(dashMatch[2], 10);
      } else {
        const singleMatch = nameWithoutExt.match(/(\d+)/);
        if (singleMatch) {
          unitIndex = parseInt(singleMatch[1], 10);
          articleIndex = 1;
        }
      }

      if (unitIndex > 0) {
        newAudioFiles.push({
          file,
          unitIndex,
          articleIndex,
          status: 'pending',
        });
      }
    }

    setAudioFiles(prev => [...prev, ...newAudioFiles]);
  };

  // Upload all audio files
  const uploadAllAudio = async () => {
    if (audioFiles.length === 0) return;

    setAudioUploading(true);
    const updatedFiles = [...audioFiles];

    for (let i = 0; i < updatedFiles.length; i++) {
      const af = updatedFiles[i];
      if (af.status !== 'pending') continue;

      try {
        updatedFiles[i] = { ...af, status: 'uploading' };
        setAudioFiles([...updatedFiles]);

        // Get presigned URL
        const { uploadUrl, publicUrl } = (await getUploadUrl({
          filename: af.file.name,
          contentType: af.file.type || 'audio/mpeg',
          folder: `reading-audio/${form.courseId}`,
        })) as { uploadUrl: string; publicUrl: string };

        // Upload to storage
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: af.file,
          headers: {
            'Content-Type': af.file.type || 'audio/mpeg',
            'x-amz-acl': 'public-read',
          },
        });

        if (!uploadRes.ok) throw new Error('Upload failed');

        updatedFiles[i] = { ...af, status: 'done', url: publicUrl };
        setAudioFiles([...updatedFiles]);

        // Update parsed items with audio URL
        setParsedItems(prev =>
          prev.map(item => {
            if (item.unitIndex === af.unitIndex && item.articleIndex === af.articleIndex) {
              return { ...item, audioUrl: publicUrl };
            }
            return item;
          })
        );
      } catch (e) {
        console.error('Audio upload error:', e);
        updatedFiles[i] = { ...af, status: 'error' };
        setAudioFiles([...updatedFiles]);
      }
    }

    setAudioUploading(false);
    const doneCount = updatedFiles.filter(f => f.status === 'done').length;
    setStatus(`音频上传完成：${doneCount}/${updatedFiles.length} 个文件`);
  };

  // Get selected course name for display
  const selectedCourse = useMemo(() => {
    if (!form.courseId || !institutes) return null;
    return institutes.find((inst: any) => (inst.id || inst._id) === form.courseId);
  }, [form.courseId, institutes]);

  const getCourseDisplayName = (inst: any) => {
    let displayName = inst.name || '';
    if (inst.displayLevel) displayName += ` ${inst.displayLevel}`;
    if (inst.volume) displayName += ` ${inst.volume}`;
    return displayName;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            阅读导入
          </h2>
          <p className="text-sm text-zinc-500">批量导入阅读文章到指定教材</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 mb-1">选择教材</label>
          <select
            value={form.courseId}
            onChange={e => setForm(prev => ({ ...prev, courseId: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium"
          >
            {(institutes || []).map((inst: any) => (
              <option key={inst.id || inst._id} value={inst.id || inst._id}>
                {getCourseDisplayName(inst)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white border-2 border-zinc-900 rounded-2xl shadow-[6px_6px_0px_0px_#18181B] p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-zinc-800">
            <Upload className="w-4 h-4" />
            批量导入阅读文章
          </div>

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
                  handleExcelFile(file);
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
                e.target.value = '';
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="border-2 border-dashed border-zinc-300 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all group">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-zinc-400 mb-2 group-hover:text-blue-500 transition-colors" />
              <p className="text-sm font-bold text-zinc-700">点击上传表格文件</p>
              <p className="text-xs text-zinc-400 mt-1">支持 Excel (.xlsx, .xls) 或 CSV (.csv)</p>
            </div>
          </div>

          <div className="text-xs text-zinc-500 text-center">— 或手动从表格中复制并粘贴 —</div>

          {/* Format Guide */}
          <div className="bg-zinc-50 rounded-lg p-3 text-xs space-y-2 border border-zinc-100">
            <div className="flex items-center justify-between">
              <div className="font-bold text-zinc-700">列格式说明（支持多语言翻译）：</div>
              <span className="bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded text-[10px]">
                9 列
              </span>
            </div>
            <div className="text-zinc-500 font-mono leading-relaxed break-all text-[10px]">
              单元, 文章序号, 标题, 正文, 翻译(中), 翻译(英), 翻译(越), 翻译(蒙), 音频URL
            </div>
            <div className="text-zinc-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span>最少只需：单元, 标题, 正文</span>
            </div>
            <div className="text-zinc-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-blue-500" />
              <span>文章序号默认为 1，每单元可有 1-2 篇文章</span>
            </div>
          </div>

          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 font-mono text-xs bg-zinc-50/50"
            placeholder="粘贴区域：&#10;单元&#9;文章序号&#9;标题&#9;正文&#9;翻译(中)&#9;翻译(英)&#10;1&#9;1&#9;제목&#9;본문 내용...&#9;中文翻译...&#9;English...&#10;..."
          />

          {/* Preview */}
          {parsedItems.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="text-sm font-bold text-blue-800 mb-2">
                解析预览：{parsedItems.length} 篇文章
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {parsedItems.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="text-xs text-blue-700 flex items-center gap-2">
                    <span className="bg-blue-200 px-1.5 py-0.5 rounded">
                      第{item.unitIndex}课-{item.articleIndex}
                    </span>
                    <span className="font-medium truncate">{item.title}</span>
                    <span className="text-blue-500 truncate flex-shrink">
                      {item.readingText?.substring(0, 30)}...
                    </span>
                  </div>
                ))}
                {parsedItems.length > 10 && (
                  <div className="text-xs text-blue-500">... 还有 {parsedItems.length - 10} 篇</div>
                )}
              </div>
            </div>
          )}

          {/* Audio Upload Section */}
          <div className="border-t-2 border-zinc-200 pt-4 mt-4">
            <div className="flex items-center gap-2 font-bold text-zinc-800 mb-3">
              <Music className="w-4 h-4" />
              批量上传音频文件（可选）
            </div>

            <div className="relative mb-3">
              <input
                type="file"
                accept=".mp3,.wav,.m4a,.ogg"
                multiple
                onChange={e => {
                  if (e.target.files) handleAudioFiles(e.target.files);
                  e.target.value = '';
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-zinc-300 rounded-xl p-4 text-center hover:border-green-500 hover:bg-green-50 transition-all group">
                <Music className="w-8 h-8 mx-auto text-zinc-400 mb-1 group-hover:text-green-500 transition-colors" />
                <p className="text-sm font-bold text-zinc-700">点击上传音频文件</p>
                <p className="text-xs text-zinc-400">文件名格式：1-1.mp3（单元-文章序号）</p>
              </div>
            </div>

            {/* Audio files list */}
            {audioFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {audioFiles.map((af, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-zinc-50 rounded-lg text-xs"
                  >
                    <span className="bg-green-200 px-1.5 py-0.5 rounded">
                      第{af.unitIndex}课-{af.articleIndex}
                    </span>
                    <span className="flex-1 truncate text-zinc-600">{af.file.name}</span>
                    {af.status === 'pending' && <span className="text-zinc-400">待上传</span>}
                    {af.status === 'uploading' && (
                      <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    )}
                    {af.status === 'done' && <Check className="w-3 h-3 text-green-500" />}
                    {af.status === 'error' && <X className="w-3 h-3 text-red-500" />}
                    <button
                      onClick={() => setAudioFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={uploadAllAudio}
                  disabled={audioUploading || audioFiles.every(f => f.status !== 'pending')}
                  className="w-full py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {audioUploading && <Loader2 className="w-3 h-3 animate-spin" />}
                  上传音频到存储
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleBulkImport}
            disabled={submitting || parsedItems.length === 0}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            导入到 {selectedCourse ? getCourseDisplayName(selectedCourse) : '教材'}
          </button>
        </div>
      </div>

      {status && (
        <div className="px-4 py-3 rounded-xl border-2 border-zinc-900 bg-amber-50 text-sm text-zinc-800 whitespace-pre-wrap">
          {status}
        </div>
      )}
    </div>
  );
};

export default ReadingImporter;
