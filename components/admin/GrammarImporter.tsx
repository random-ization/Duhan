import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CheckCircle2, Loader2, Upload, FileSpreadsheet, BookOpen } from "lucide-react";
import * as XLSX from "xlsx";

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
    title: "",
    level: "Beginner",
    type: "GRAMMAR",
    summary: "",
    explanation: "",
    courseId: "",
    unitId: 1,
};

type BulkImportItem = {
    title: string;
    // Chinese (default)
    summary?: string;
    explanation?: string;
    // Multi-language
    summaryEn?: string;
    summaryVi?: string;
    summaryMn?: string;
    explanationEn?: string;
    explanationVi?: string;
    explanationMn?: string;
    // Examples and course context
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

const GrammarImporter: React.FC = () => {
    const institutes = useQuery(api.institutes.getAll, {});
    const bulkImportMutation = useMutation(api.grammars.bulkImport);

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

    const levelOptions = useMemo(
        () => [
            { value: "Beginner", label: "初级" },
            { value: "Intermediate", label: "中级" },
            { value: "Advanced", label: "高级" },
        ],
        []
    );

    const typeOptions = useMemo(
        () => [
            { value: "GRAMMAR", label: "语法" },
            { value: "ENDING", label: "词尾" },
            { value: "PARTICLE", label: "助词" },
            { value: "EXPRESSION", label: "惯用表达" },
        ],
        []
    );

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

            // Parse headers from first row
            const headerLine = lines[0];
            const headers = headerLine.includes("\t")
                ? headerLine.split("\t").map(h => h.trim().toLowerCase())
                : parseCSVLine(headerLine).map(h => h.toLowerCase());

            // Map header keywords to column indices
            const findColumn = (keywords: string[]): number => {
                return headers.findIndex(h => keywords.some(k => h.includes(k)));
            };

            const colMap = {
                title: findColumn(['标题', 'title', '语法', 'grammar']),
                // Chinese (default)
                summary: findColumn(['简介', 'summary', '概述', '说明', '简介 (ch)', '简介(ch)']),
                explanation: findColumn(['详细', 'explanation', '解释', '详解', '解释 (ch)', '解释(ch)']),
                // Multi-language summaries
                summaryEn: findColumn(['简介 (en)', '简介(en)', 'summary (en)', 'summary_en']),
                summaryVi: findColumn(['简介 (vn)', '简介(vn)', '简介 (vi)', 'summary (vn)', 'summary_vn']),
                summaryMn: findColumn(['简介 (mn)', '简介(mn)', 'summary (mn)', 'summary_mn']),
                // Multi-language explanations
                explanationEn: findColumn(['解释 (en)', '解释(en)', 'explanation (en)', 'explanation_en']),
                explanationVi: findColumn(['解释 (vn)', '解释(vn)', '解释 (vi)', 'explanation (vn)', 'explanation_vn']),
                explanationMn: findColumn(['解释 (mn)', '解释(mn)', 'explanation (mn)', 'explanation_mn']),
                // Examples (multi-language columns)
                exampleKr: findColumn(['例句 (kr)', '例句(kr)', '例句', 'example (kr)', 'example']),
                exampleCn: findColumn(['例句 (ch)', '例句(ch)', '例句翻译', 'example (ch)']),
                exampleEn: findColumn(['例句 (en)', '例句(en)', 'example (en)']),
                exampleVi: findColumn(['例句 (vn)', '例句(vn)', '例句 (vi)', 'example (vn)']),
                exampleMn: findColumn(['例句 (mn)', '例句(mn)', 'example (mn)']),
                // Unit
                unit: findColumn(['单元', 'unit', '课']),
            };

            // Validate required columns
            if (colMap.title === -1) {
                setStatus(`错误：未找到"标题"或"Title"列，请检查表头`);
                setSubmitting(false);
                return;
            }

            // Parse data rows (skip header)
            const items: BulkImportItem[] = lines
                .slice(1)
                .map((line) => {
                    const parts = line.includes("\t")
                        ? line.split("\t").map(p => p.trim())
                        : parseCSVLine(line);

                    const getValue = (idx: number) => (idx >= 0 && idx < parts.length) ? parts[idx] : undefined;

                    const title = getValue(colMap.title);
                    if (!title) return null;

                    // Build example object from separate columns
                    const exampleKr = getValue(colMap.exampleKr);
                    const exampleCn = getValue(colMap.exampleCn);
                    const exampleEn = getValue(colMap.exampleEn);
                    const exampleVi = getValue(colMap.exampleVi);
                    const exampleMn = getValue(colMap.exampleMn);

                    // Only create example if at least Korean example exists
                    const examples = exampleKr ? [{
                        kr: exampleKr,
                        cn: exampleCn || '',
                        en: exampleEn || undefined,
                        vi: exampleVi || undefined,
                        mn: exampleMn || undefined,
                    }] : undefined;

                    return {
                        title,
                        // Chinese (default)
                        summary: getValue(colMap.summary),
                        explanation: getValue(colMap.explanation),
                        // Multi-language
                        summaryEn: getValue(colMap.summaryEn),
                        summaryVi: getValue(colMap.summaryVi),
                        summaryMn: getValue(colMap.summaryMn),
                        explanationEn: getValue(colMap.explanationEn),
                        explanationVi: getValue(colMap.explanationVi),
                        explanationMn: getValue(colMap.explanationMn),
                        // Examples
                        examples,
                        courseId: form.courseId,
                        unitId: Number(getValue(colMap.unit)) || form.unitId || 1,
                    };
                })
                .filter((item): item is NonNullable<typeof item> => Boolean(item));

            if (items.length === 0) {
                setStatus("未解析到有效的语法条目");
                setSubmitting(false);
                return;
            }

            const result: BulkImportResult = await bulkImportMutation({
                items,
                token: localStorage.getItem("token") || undefined
            });

            const r = result?.results;
            if (r?.errors?.length) {
                setStatus(`部分导入失败：${r.errors.join("; ")}`);
            } else if (r) {
                const parts: string[] = [`成功导入 ${r.success} 条语法`];
                if (r.newGrammars > 0) {
                    parts.push(`新增 ${r.newGrammars} 条`);
                }
                setStatus(parts.join('，'));
            } else {
                setStatus(`成功导入 ${items.length} 条语法`);
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
                    <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-2">
                        <BookOpen className="w-6 h-6" />
                        语法导入
                    </h2>
                    <p className="text-sm text-zinc-500">批量导入语法点到指定教材</p>
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

                    {/* Default Unit Selection */}
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-zinc-700">
                            默认单元（表格中未指定时使用）:
                            <input
                                type="number"
                                min={1}
                                value={form.unitId}
                                onChange={(e) => setForm(prev => ({ ...prev, unitId: Number(e.target.value) }))}
                                className="ml-2 w-20 px-2 py-1 rounded border border-zinc-200"
                            />
                        </label>
                    </div>

                    {/* File Upload Area */}
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv,.txt,.xlsx,.xls"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

                                if (isExcel) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        const data = new Uint8Array(event.target?.result as ArrayBuffer);
                                        const workbook = XLSX.read(data, { type: 'array' });
                                        const firstSheetName = workbook.SheetNames[0];
                                        const worksheet = workbook.Sheets[firstSheetName];

                                        // Use sheet_to_json to properly handle cells with line breaks
                                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                                        // Convert JSON to TSV format for the textarea preview
                                        // Get headers from first row keys
                                        if (jsonData.length > 0) {
                                            const headers = Object.keys(jsonData[0] as Record<string, unknown>);
                                            const headerLine = headers.join('\t');
                                            const dataLines = jsonData.map((row: any) =>
                                                headers.map(h => {
                                                    // Replace newlines with space for display, but keep original in data
                                                    const val = String(row[h] || '');
                                                    return val.replace(/\n/g, ' ');
                                                }).join('\t')
                                            );
                                            const text = [headerLine, ...dataLines].join('\n');
                                            setBulkText(text);
                                            setStatus(`已加载 Excel 文件: ${file.name} (${jsonData.length} 条数据)`);
                                        } else {
                                            setStatus(`Excel 文件为空: ${file.name}`);
                                        }
                                    };
                                    reader.readAsArrayBuffer(file);
                                } else {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        const text = event.target?.result as string;
                                        setBulkText(text);
                                        setStatus(`已加载文本文件: ${file.name} (${text.split('\n').filter(Boolean).length} 行)`);
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
                        </div>
                    </div>

                    <div className="text-xs text-zinc-500 text-center">— 或手动从表格中复制并粘贴 —</div>

                    {/* Format Guide */}
                    <div className="bg-zinc-50 rounded-lg p-3 text-xs space-y-2 border border-zinc-100">
                        <div className="flex items-center justify-between">
                            <div className="font-bold text-zinc-700">列格式说明（支持多语言）：</div>
                            <span className="bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded text-[10px]">最多 15 列</span>
                        </div>
                        <div className="text-zinc-500 font-mono leading-relaxed break-all text-[10px]">
                            标题, 简介, 简介(EN), 简介(VN), 简介(MN), 解释, 解释(EN), 解释(VN), 解释(MN), 例句(KR), 例句(CH), 例句(EN), 例句(VN), 例句(MN), 单元
                        </div>
                        <div className="text-zinc-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <span>最少只需：标题, 简介, 解释, 单元</span>
                        </div>
                    </div>

                    <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
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
                <div className="px-4 py-3 rounded-xl border-2 border-zinc-900 bg-amber-50 text-sm text-zinc-800">
                    {status}
                </div>
            )}
        </div>
    );
};

export default GrammarImporter;
