import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import {
  CheckCircle2,
  Loader2,
  Upload,
  FileSpreadsheet,
  BookOpen,
  AlertCircle,
  X,
  ChevronDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GRAMMARS, INSTITUTES } from '../../utils/convexRefs';

interface FormState {
  title: string;
  level: string;
  type: string;
  summary: string;
  explanation: string;
  courseId: string;
  unitId: number;
}

const DEFAULT_FORM: FormState = {
  title: '',
  level: 'Beginner',
  type: 'GRAMMAR',
  summary: '',
  explanation: '',
  courseId: '',
  unitId: 1,
};

type BulkImportItem = {
  title: string;
  summary?: string;
  explanation?: string;
  summaryEn?: string;
  summaryVi?: string;
  summaryMn?: string;
  explanationEn?: string;
  explanationVi?: string;
  explanationMn?: string;
  examples?: unknown;
  courseId: string;
  unitId: number;
};

type BulkImportResult = {
  success: boolean;
  results?: {
    success: number;
    failed: number;
    newGrammars: number;
    errors: string[];
  };
};

type SheetData = {
  sheetName: string;
  rows: Record<string, unknown>[];
  matchedCourseId: string | null;
  manualCourseId?: string;
  confidence: 'auto' | 'manual' | 'none';
  skip?: boolean;
};

type Institute = {
  _id: string;
  id: string;
  name: string;
  displayLevel?: string;
  volume?: string;
  publisher?: string;
};

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

function autoMatchCourse(sheetName: string, institutes: Institute[]): Institute | null {
  const normalized = sheetName.trim().toLowerCase();

  const skipPatterns = ['说明', 'readme', 'info', 'sheet', '目录', 'index', 'template'];
  if (skipPatterns.some(p => normalized.includes(p))) {
    return null;
  }

  for (const inst of institutes) {
    const displayName = `${inst.name || ''} ${inst.displayLevel || ''} ${inst.volume || ''}`
      .trim()
      .toLowerCase();
    if (normalized === displayName || normalized === inst.name?.toLowerCase()) {
      return inst;
    }
  }

  const numMatch = normalized.match(/(\d+)[^\d]*(\d+)?/);
  if (numMatch) {
    const level = numMatch[1];
    const volume = numMatch[2] || '1';

    for (const inst of institutes) {
      const isYonsei =
        inst.name?.includes('延世') ||
        inst.publisher?.includes('延世') ||
        inst.name?.toLowerCase().includes('yonsei');
      if (isYonsei) {
        const levelMatch =
          inst.displayLevel?.includes(level) || inst.displayLevel?.includes(`${level}급`);
        const volumeMatch =
          inst.volume?.includes(volume) ||
          inst.volume === `${volume}` ||
          (!inst.volume && volume === '1');
        if (levelMatch && volumeMatch) {
          return inst;
        }
      }
    }
  }

  for (const inst of institutes) {
    const instName = inst.name?.toLowerCase() || '';
    if (instName && (normalized.includes(instName) || instName.includes(normalized))) {
      return inst;
    }
  }

  return null;
}

function getInstituteDisplayName(inst: Institute): string {
  let displayName = inst.name || '';
  if (inst.displayLevel) displayName += ` ${inst.displayLevel}`;
  if (inst.volume) displayName += ` ${inst.volume}`;
  return displayName;
}

const GrammarImporter: React.FC = () => {
  const institutes = useQuery(INSTITUTES.getAll, {});
  const bulkImportMutation = useMutation(GRAMMARS.bulkImport);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [bulkText, setBulkText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [sheetDataList, setSheetDataList] = useState<SheetData[]>([]);
  const [showSheetMapping, setShowSheetMapping] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(
    null
  );

  useEffect(() => {
    if (!form.courseId && institutes && institutes.length > 0) {
      const first = institutes[0];
      setForm(prev => ({ ...prev, courseId: first.id || first._id }));
    }
  }, [institutes, form.courseId]);

  const parseSheetRows = (
    rows: Record<string, unknown>[],
    courseId: string,
    defaultUnitId: number
  ): BulkImportItem[] => {
    if (rows.length === 0) return [];

    const findColumn = (keywords: string[]): string | null => {
      const headerKey = Object.keys(rows[0]).find(h =>
        keywords.some(k => h.toLowerCase().includes(k))
      );
      return headerKey || null;
    };

    const colMap = {
      title: findColumn(['标题', 'title', '语法', 'grammar']),
      summary: findColumn(['简介', 'summary', '概述', '说明', '简介 (ch)', '简介(ch)']),
      explanation: findColumn(['详细', 'explanation', '解释', '详解', '解释 (ch)', '解释(ch)']),
      summaryEn: findColumn(['简介 (en)', '简介(en)', 'summary (en)', 'summary_en']),
      summaryVi: findColumn(['简介 (vn)', '简介(vn)', '简介 (vi)', 'summary (vn)', 'summary_vn']),
      summaryMn: findColumn(['简介 (mn)', '简介(mn)', 'summary (mn)', 'summary_mn']),
      explanationEn: findColumn(['解释 (en)', '解释(en)', 'explanation (en)', 'explanation_en']),
      explanationVi: findColumn([
        '解释 (vn)',
        '解释(vn)',
        '解释 (vi)',
        'explanation (vn)',
        'explanation_vn',
      ]),
      explanationMn: findColumn(['解释 (mn)', '解释(mn)', 'explanation (mn)', 'explanation_mn']),
      exampleKr: findColumn(['例句 (kr)', '例句(kr)', '例句', 'example (kr)', 'example']),
      exampleCn: findColumn(['例句 (ch)', '例句(ch)', '例句翻译', 'example (ch)']),
      exampleEn: findColumn(['例句 (en)', '例句(en)', 'example (en)']),
      exampleVi: findColumn(['例句 (vn)', '例句(vn)', '例句 (vi)', 'example (vn)']),
      exampleMn: findColumn(['例句 (mn)', '例句(mn)', 'example (mn)']),
      unit: findColumn(['单元', 'unit', '课']),
    };

    if (!colMap.title) return [];

    return rows
      .map(row => {
        const getValue = (key: string | null) => (key ? String(row[key] || '') : undefined);

        const title = getValue(colMap.title);
        if (!title) return null;

        const exampleKr = getValue(colMap.exampleKr);
        const examples = exampleKr
          ? [
              {
                kr: exampleKr,
                cn: getValue(colMap.exampleCn) || '',
                en: getValue(colMap.exampleEn) || undefined,
                vi: getValue(colMap.exampleVi) || undefined,
                mn: getValue(colMap.exampleMn) || undefined,
              },
            ]
          : undefined;

        const unitValue = getValue(colMap.unit);
        const unitId = unitValue ? Number(unitValue) : defaultUnitId;

        return {
          title,
          summary: getValue(colMap.summary),
          explanation: getValue(colMap.explanation),
          summaryEn: getValue(colMap.summaryEn),
          summaryVi: getValue(colMap.summaryVi),
          summaryMn: getValue(colMap.summaryMn),
          explanationEn: getValue(colMap.explanationEn),
          explanationVi: getValue(colMap.explanationVi),
          explanationMn: getValue(colMap.explanationMn),
          examples,
          courseId,
          unitId: isNaN(unitId) ? defaultUnitId : unitId,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  };

  const handleExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = event => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });

      if (workbook.SheetNames.length === 1) {
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length > 0) {
          const headers = Object.keys(jsonData[0] as Record<string, unknown>);
          const headerLine = headers.join('\t');
          const dataLines = jsonData.map((row: any) =>
            headers.map(h => String(row[h] || '').replace(/\n/g, ' ')).join('\t')
          );
          setBulkText([headerLine, ...dataLines].join('\n'));
          setStatus(`已加载 Excel 文件: ${file.name} (${jsonData.length} 条数据)`);
        }
        return;
      }

      const sheets: SheetData[] = workbook.SheetNames.map(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<
          string,
          unknown
        >[];

        const matchedCourse = institutes
          ? autoMatchCourse(sheetName, institutes as Institute[])
          : null;

        return {
          sheetName,
          rows: jsonData,
          matchedCourseId: matchedCourse?.id || matchedCourse?._id || null,
          confidence: matchedCourse ? 'auto' : 'none',
          skip: jsonData.length === 0,
        };
      });

      setSheetDataList(sheets);
      setShowSheetMapping(true);

      const autoMatched = sheets.filter(s => s.confidence === 'auto').length;
      const needsAction = sheets.filter(s => s.confidence === 'none' && !s.skip).length;
      setStatus(
        `检测到 ${sheets.length} 个工作表：${autoMatched} 个自动匹配，${needsAction} 个待选择`
      );
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMultiSheetImport = async () => {
    const validSheets = sheetDataList.filter(
      s => !s.skip && (s.matchedCourseId || s.manualCourseId)
    );

    if (validSheets.length === 0) {
      setStatus('请至少为一个工作表选择教材');
      return;
    }

    setSubmitting(true);
    setImportProgress({ current: 0, total: validSheets.length });

    let totalSuccess = 0;
    let totalFailed = 0;
    let totalNew = 0;
    const errors: string[] = [];

    for (let i = 0; i < validSheets.length; i++) {
      const sheet = validSheets[i];
      const courseId = sheet.manualCourseId || sheet.matchedCourseId!;
      const items = parseSheetRows(sheet.rows, courseId, form.unitId);

      setImportProgress({ current: i + 1, total: validSheets.length });

      if (items.length === 0) {
        errors.push(`${sheet.sheetName}: 未找到有效数据`);
        continue;
      }

      try {
        const result = (await bulkImportMutation({ items })) as BulkImportResult;

        totalSuccess += result.results?.success || 0;
        totalFailed += result.results?.failed || 0;
        totalNew += result.results?.newGrammars || 0;

        if (result.results?.errors?.length) {
          errors.push(`${sheet.sheetName}: ${result.results.errors.join('; ')}`);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push(`${sheet.sheetName}: ${message || '导入失败'}`);
      }
    }

    let statusMsg = `批量导入完成：成功 ${totalSuccess} 条`;
    if (totalNew > 0) statusMsg += `，新增 ${totalNew} 条`;
    if (totalFailed > 0) statusMsg += `，失败 ${totalFailed} 条`;
    if (errors.length > 0) statusMsg += `\n错误: ${errors.slice(0, 3).join('; ')}`;

    setStatus(statusMsg);
    setSubmitting(false);
    setImportProgress(null);
    setShowSheetMapping(false);
    setSheetDataList([]);
  };

  const updateSheetMapping = (index: number, updates: Partial<SheetData>) => {
    setSheetDataList(prev =>
      prev.map((sheet, i) => (i === index ? { ...sheet, ...updates } : sheet))
    );
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

      const headerLine = lines[0];
      const headers = headerLine.includes('\t')
        ? headerLine.split('\t').map(h => h.trim().toLowerCase())
        : parseCSVLine(headerLine).map(h => h.toLowerCase());

      const findColumn = (keywords: string[]): number => {
        return headers.findIndex(h => keywords.some(k => h.includes(k)));
      };

      const colMap = {
        title: findColumn(['标题', 'title', '语法', 'grammar']),
        summary: findColumn(['简介', 'summary', '概述', '说明', '简介 (ch)', '简介(ch)']),
        explanation: findColumn(['详细', 'explanation', '解释', '详解', '解释 (ch)', '解释(ch)']),
        summaryEn: findColumn(['简介 (en)', '简介(en)', 'summary (en)', 'summary_en']),
        summaryVi: findColumn(['简介 (vn)', '简介(vn)', '简介 (vi)', 'summary (vn)', 'summary_vn']),
        summaryMn: findColumn(['简介 (mn)', '简介(mn)', 'summary (mn)', 'summary_mn']),
        explanationEn: findColumn(['解释 (en)', '解释(en)', 'explanation (en)', 'explanation_en']),
        explanationVi: findColumn([
          '解释 (vn)',
          '解释(vn)',
          '解释 (vi)',
          'explanation (vn)',
          'explanation_vn',
        ]),
        explanationMn: findColumn(['解释 (mn)', '解释(mn)', 'explanation (mn)', 'explanation_mn']),
        exampleKr: findColumn(['例句 (kr)', '例句(kr)', '例句', 'example (kr)', 'example']),
        exampleCn: findColumn(['例句 (ch)', '例句(ch)', '例句翻译', 'example (ch)']),
        exampleEn: findColumn(['例句 (en)', '例句(en)', 'example (en)']),
        exampleVi: findColumn(['例句 (vn)', '例句(vn)', '例句 (vi)', 'example (vn)']),
        exampleMn: findColumn(['例句 (mn)', '例句(mn)', 'example (mn)']),
        unit: findColumn(['单元', 'unit', '课']),
      };

      if (colMap.title === -1) {
        setStatus('错误：未找到"标题"或"Title"列，请检查表头');
        setSubmitting(false);
        return;
      }

      const items: BulkImportItem[] = lines
        .slice(1)
        .map(line => {
          const parts = line.includes('\t')
            ? line.split('\t').map(p => p.trim())
            : parseCSVLine(line);

          const getValue = (idx: number) =>
            idx >= 0 && idx < parts.length ? parts[idx] : undefined;

          const title = getValue(colMap.title);
          if (!title) return null;

          const exampleKr = getValue(colMap.exampleKr);
          const exampleCn = getValue(colMap.exampleCn);
          const exampleEn = getValue(colMap.exampleEn);
          const exampleVi = getValue(colMap.exampleVi);
          const exampleMn = getValue(colMap.exampleMn);

          const examples = exampleKr
            ? [
                {
                  kr: exampleKr,
                  cn: exampleCn || '',
                  en: exampleEn || undefined,
                  vi: exampleVi || undefined,
                  mn: exampleMn || undefined,
                },
              ]
            : undefined;

          return {
            title,
            summary: getValue(colMap.summary),
            explanation: getValue(colMap.explanation),
            summaryEn: getValue(colMap.summaryEn),
            summaryVi: getValue(colMap.summaryVi),
            summaryMn: getValue(colMap.summaryMn),
            explanationEn: getValue(colMap.explanationEn),
            explanationVi: getValue(colMap.explanationVi),
            explanationMn: getValue(colMap.explanationMn),
            examples,
            courseId: form.courseId,
            unitId: Number(getValue(colMap.unit)) || form.unitId || 1,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      if (items.length === 0) {
        setStatus('未解析到有效的语法条目');
        setSubmitting(false);
        return;
      }

      const result = (await bulkImportMutation({ items })) as BulkImportResult;

      const r = result?.results;
      if (r?.errors?.length) {
        setStatus(`部分导入失败：${r.errors.join('; ')}`);
      } else if (r) {
        const parts: string[] = [`成功导入 ${r.success} 条语法`];
        if (r.newGrammars > 0) {
          parts.push(`新增 ${r.newGrammars} 条`);
        }
        setStatus(parts.join('，'));
      } else {
        setStatus(`成功导入 ${items.length} 条语法`);
      }
      setBulkText('');
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message || '批量导入失败');
    } finally {
      setSubmitting(false);
    }
  };

  const SheetMappingModal = () => {
    if (!showSheetMapping) return null;

    const autoMatched = sheetDataList.filter(s => s.confidence === 'auto' && !s.skip).length;
    const manualSet = sheetDataList.filter(s => s.confidence === 'manual' && !s.skip).length;
    const needsAction = sheetDataList.filter(s => s.confidence === 'none' && !s.skip).length;
    const skipped = sheetDataList.filter(s => s.skip).length;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-zinc-900">工作表映射</h3>
              <p className="text-sm text-zinc-500">
                检测到 {sheetDataList.length} 个工作表，请确认教材对应关系
              </p>
            </div>
            <button
              onClick={() => {
                setShowSheetMapping(false);
                setSheetDataList([]);
              }}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sheetDataList.map((sheet, index) => (
              <div
                key={sheet.sheetName}
                className={`p-3 rounded-xl border-2 transition-all ${
                  sheet.skip
                    ? 'border-zinc-200 bg-zinc-50 opacity-60'
                    : sheet.confidence === 'auto' || sheet.confidence === 'manual'
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      sheet.skip
                        ? 'bg-zinc-200 text-zinc-500'
                        : sheet.confidence === 'auto' || sheet.confidence === 'manual'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-500 text-white'
                    }`}
                  >
                    {sheet.skip ? (
                      <X className="w-4 h-4" />
                    ) : sheet.confidence === 'auto' || sheet.confidence === 'manual' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-zinc-900 truncate">{sheet.sheetName}</div>
                    <div className="text-xs text-zinc-500">
                      {sheet.rows.length} 条数据
                      {sheet.confidence === 'auto' && ' · 自动匹配'}
                      {sheet.confidence === 'manual' && ' · 手动选择'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!sheet.skip ? (
                      <div className="relative">
                        <select
                          value={sheet.manualCourseId || sheet.matchedCourseId || ''}
                          onChange={e => {
                            const value = e.target.value;
                            updateSheetMapping(index, {
                              manualCourseId: value || undefined,
                              confidence: value ? 'manual' : 'none',
                            });
                          }}
                          className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-zinc-300 bg-white text-sm font-medium min-w-[180px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">请选择教材</option>
                          {(institutes || []).map((inst: any) => (
                            <option key={inst.id || inst._id} value={inst.id || inst._id}>
                              {getInstituteDisplayName(inst)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-500">已跳过</span>
                    )}

                    <button
                      onClick={() => updateSheetMapping(index, { skip: !sheet.skip })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        sheet.skip
                          ? 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {sheet.skip ? '恢复' : '跳过'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-zinc-200 bg-zinc-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-600">
                <span className="inline-flex items-center gap-1 mr-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {autoMatched + manualSet} 已匹配
                </span>
                {needsAction > 0 && (
                  <span className="inline-flex items-center gap-1 mr-3">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    {needsAction} 待选择
                  </span>
                )}
                {skipped > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
                    {skipped} 跳过
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowSheetMapping(false);
                    setSheetDataList([]);
                  }}
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 font-medium hover:bg-zinc-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleMultiSheetImport}
                  disabled={submitting || autoMatched + manualSet === 0}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      导入中 {importProgress?.current}/{importProgress?.total}
                    </>
                  ) : (
                    <>确认导入 ({autoMatched + manualSet} 个工作表)</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            语法导入
          </h2>
          <p className="text-sm text-zinc-500">批量导入语法点到指定教材</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 mb-1">选择教材</label>
          <select
            value={form.courseId}
            onChange={e => setForm(prev => ({ ...prev, courseId: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium"
          >
            {(institutes || []).map((inst: any) => {
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

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white border-2 border-zinc-900 rounded-2xl shadow-[6px_6px_0px_0px_#18181B] p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-zinc-800">
            <Upload className="w-4 h-4" />
            批量导入
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-zinc-700">
              默认单元（表格中未指定时使用）:
              <input
                type="number"
                min={1}
                value={form.unitId}
                onChange={e => setForm(prev => ({ ...prev, unitId: Number(e.target.value) }))}
                className="ml-2 w-20 px-2 py-1 rounded border border-zinc-200"
              />
            </label>
          </div>

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
            <div className="border-2 border-dashed border-zinc-300 rounded-xl p-6 text-center hover:border-emerald-500 hover:bg-emerald-50 transition-all group">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-zinc-400 mb-2 group-hover:text-emerald-500 transition-colors" />
              <p className="text-sm font-bold text-zinc-700">点击上传表格文件</p>
              <p className="text-xs text-zinc-400 mt-1">支持 Excel (.xlsx, .xls) 或 CSV (.csv)</p>
              <p className="text-xs text-emerald-600 mt-1 font-medium">✨ 支持多工作表批量导入</p>
            </div>
          </div>

          <div className="text-xs text-zinc-500 text-center">— 或手动从表格中复制并粘贴 —</div>

          <div className="bg-zinc-50 rounded-lg p-3 text-xs space-y-2 border border-zinc-100">
            <div className="flex items-center justify-between">
              <div className="font-bold text-zinc-700">列格式说明（支持多语言）：</div>
              <span className="bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded text-[10px]">
                最多 15 列
              </span>
            </div>
            <div className="text-zinc-500 font-mono leading-relaxed break-all text-[10px]">
              标题, 简介, 简介(EN), 简介(VN), 简介(MN), 解释, 解释(EN), 解释(VN), 解释(MN),
              例句(KR), 例句(CH), 例句(EN), 例句(VN), 例句(MN), 单元
            </div>
            <div className="text-zinc-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span>最少只需：标题, 简介, 解释, 单元</span>
            </div>
          </div>

          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 font-mono text-xs bg-zinc-50/50"
            placeholder="粘贴区域：&#10;标题&#9;等级&#9;类型&#9;简介&#9;详细解释&#9;例句&#9;单元&#10;-아/어요&#9;Beginner&#9;ENDING&#9;非格式体终结词尾&#9;详细说明...&#9;가요&#9;1&#10;..."
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
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            提交语法导入
          </button>
        </div>
      </div>

      {status && (
        <div className="px-4 py-3 rounded-xl border-2 border-zinc-900 bg-amber-50 text-sm text-zinc-800 whitespace-pre-wrap">
          {status}
        </div>
      )}

      <SheetMappingModal />
    </div>
  );
};

export default GrammarImporter;
