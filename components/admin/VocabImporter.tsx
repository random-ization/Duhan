import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileUp, Check, X, AlertTriangle, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../contexts/AuthContext';
import { api, request } from '../../services/api';
import { Institute } from '../../types';
import toast from 'react-hot-toast';

interface ImportedVocab {
    unit: number;
    word: string;
    meaning: string;
    description: string; // example
    partOfSpeech?: string;
    hanja?: string;
    exampleSentence?: string;
    exampleMeaning?: string;
    // Preview only fields
    synonyms?: string[];
    antonyms?: string[];
    nuance?: string;
    tips?: any; // The final constructed JSON
    status: 'pending' | 'success' | 'error';
    errorMsg?: string;
}



export default function VocabImporter() {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<ImportedVocab[]>([]);
    const [courseId, setCourseId] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Textbooks from API
    const [textbooks, setTextbooks] = useState<Institute[]>([]);
    const [loadingTextbooks, setLoadingTextbooks] = useState(true);

    // Load textbooks on mount
    useEffect(() => {
        const loadTextbooks = async () => {
            try {
                const data = await api.getInstitutes();
                setTextbooks(data || []);
                // Set default to first textbook
                if (data && data.length > 0) {
                    setCourseId(data[0].id);
                }
            } catch (error) {
                console.error('Failed to load textbooks:', error);
                toast.error('加载教材列表失败');
            } finally {
                setLoadingTextbooks(false);
            }
        };
        loadTextbooks();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        parseExcel(uploadedFile);
    };

    const parseCommaList = (text: any): string[] => {
        if (!text || typeof text !== 'string') return [];
        return text.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    };

    const mapPOS = (pos: string): string => {
        if (!pos) return 'NOUN';
        const p = pos.trim();
        if (p === '名词' || p === '代词') return 'NOUN';
        if (p === '动词' || p === '自动词' || p === '他动词') return 'VERB';
        if (p === '形容词') return 'ADJ';
        if (p === '副词') return 'ADV';
        if (p === '助词') return 'PARTICLE';
        return 'NOUN'; // Default
    };

    const findCol = (row: any, candidates: string[]): string => {
        const keys = Object.keys(row);
        // Clean keys: remove BOM, trim whitespace, remove invisible chars
        const cleanKeys = keys.reduce((acc, k) => {
            const cleanKey = k.replace(/^[\uFEFF\s]+|[\s]+$/g, '').trim();
            acc[cleanKey.toLowerCase()] = k; // Map clean lower -> original key
            return acc;
        }, {} as Record<string, string>);

        for (const candidate of candidates) {
            const cleanCandidate = candidate.trim().toLowerCase();

            // 1. Check exact clean match
            if (cleanKeys[cleanCandidate]) {
                const realKey = cleanKeys[cleanCandidate];
                if (row[realKey] !== undefined) return String(row[realKey]).trim();
            }

            // 2. Fallback: Includes (fuzzy)
            // e.g. " 例句(韩) " matching "例句(韩)"
            const fuzzyKey = keys.find(k => k.toLowerCase().includes(candidate.toLowerCase()));
            if (fuzzyKey && row[fuzzyKey] !== undefined) return String(row[fuzzyKey]).trim();
        }
        return '';
    };

    const parseExcel = async (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

                const parsed: ImportedVocab[] = jsonData.map((row: any) => {
                    const synonyms = parseCommaList(findCol(row, ['Synonyms', '近义词', 'Synonym']));
                    const antonyms = parseCommaList(findCol(row, ['Antonyms', '反义词', 'Antonym']));
                    const nuance = findCol(row, ['Note', '备注', 'Nuance', 'Memo']);

                    const tipsObj = {
                        synonyms: synonyms.length ? synonyms : undefined,
                        antonyms: antonyms.length ? antonyms : undefined,
                        nuance: nuance || undefined
                    };

                    const unitVal = findCol(row, ['Unit', '单元', 'Lesson', '课']);
                    const unitNum = parseInt(unitVal) || 0;

                    return {
                        unit: unitNum,
                        word: findCol(row, ['Word', '单词', 'Vocab']),
                        meaning: findCol(row, ['Meaning', '释义', 'Definition', 'Translation']),
                        description: '',
                        partOfSpeech: mapPOS(findCol(row, ['POS', '词性', 'Part of Speech'])),
                        hanja: findCol(row, ['Hanja', '汉字', 'Chinese']),
                        exampleSentence: findCol(row, ['Example (Kr)', '例句(韩)', '例句 (韩)', 'Example', '例句', 'Sentence', 'Sentences', 'Korean']),
                        exampleMeaning: findCol(row, ['Example (Cn)', '例句(中)', '例句 (中)', 'Meaning (Ex)', '翻译', 'Translation']),
                        synonyms,
                        antonyms,
                        nuance,
                        tips: tipsObj,
                        status: 'pending' as const
                    };
                }).filter(item => item.word && item.meaning);

                setPreviewData(parsed);
                toast.success(`解析了 ${parsed.length} 个单词`);
            } catch (err) {
                console.error('Parse Error', err);
                toast.error('解析文件失败，请检查格式');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDownloadTemplate = () => {
        const headers = [
            '单元', '单词', '词性', '释义', '汉字',
            '例句(韩)', '例句(中)', '近义词', '反义词', '备注'
        ];
        const sample = [
            {
                '单元': 1, '单词': '학교', '词性': '名词', '释义': '学校', '汉字': '學校',
                '例句(韩)': '학교에 가요.', '例句(中)': '去学校。',
                '近义词': '', '反义词': '', '备注': ''
            }
        ];

        const ws = XLSX.utils.json_to_sheet(sample, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "vocab_template.xlsx");
    };

    const handleSubmit = async () => {
        if (!previewData.length) return;
        setIsUploading(true);

        // Prepare payload
        const payload = {
            items: previewData.map(item => ({
                courseId,
                unitId: item.unit,
                word: item.word,
                meaning: item.meaning,
                partOfSpeech: item.partOfSpeech,
                hanja: item.hanja,
                exampleSentence: item.exampleSentence,
                exampleMeaning: item.exampleMeaning,
                tips: item.tips
            }))
        };

        try {
            const data = await request<{ success: boolean; results?: any; error?: string }>('/admin/vocab/bulk', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (data.success) {
                toast.success(`成功导入 ${data.results.success} 个单词`);
                if (data.results.failed > 0) {
                    toast.error(`${data.results.failed} 个导入失败，查看控制台`);
                    console.error('Import Errors:', data.results.errors);
                }
                setPreviewData([]);
                setFile(null);
            } else {
                toast.error(data.error || '导入失败');
            }
        } catch (err) {
            console.error('Submit Error', err);
            toast.error('网络请求失败');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header Controls */}
            <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex gap-4 items-center">
                    <select
                        value={courseId}
                        onChange={(e) => setCourseId(e.target.value)}
                        className="px-4 py-2 rounded-xl border-2 border-slate-200 font-bold bg-white min-w-[200px]"
                        disabled={loadingTextbooks}
                    >
                        {loadingTextbooks ? (
                            <option value="">加载中...</option>
                        ) : textbooks.length === 0 ? (
                            <option value="">暂无教材</option>
                        ) : (
                            textbooks.map(tb => (
                                <option key={tb.id} value={tb.id}>
                                    {tb.name}
                                    {tb.displayLevel ? ` ${tb.displayLevel}` : ''}
                                    {tb.volume ? ` ${tb.volume}` : ''}
                                </option>
                            ))
                        )}
                    </select>

                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl font-bold transition-colors text-slate-500 text-sm"
                    >
                        <Download className="w-4 h-4" />
                        下载模版
                    </button>

                    <div className="h-6 w-px bg-slate-200 mx-2" />

                    <div className="text-sm text-slate-500 font-medium">
                        预览: {previewData.length} 个
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl font-bold transition-colors text-slate-700"
                    >
                        <Upload className="w-5 h-5" />
                        上传 Excel / CSV
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                    />

                    {previewData.length > 0 && (
                        <button
                            onClick={handleSubmit}
                            disabled={isUploading}
                            className={`flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-px hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {isUploading ? '导入中...' : '确认导入'}
                            <FileUp className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-auto p-6">
                {!previewData.length ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-3xl bg-slate-50/50">
                        <FileSpreadsheet className="w-16 h-16 mb-4 opacity-50" />
                        <p className="font-bold text-lg">请上传 Excel 文件</p>
                        <p className="text-sm mt-2 text-slate-500">支持中文表头: 单元, 单词, 词性, 释义, 汉字, 例句(韩), 例句(中), 近义词, 反义词, 备注</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                            <tr className="text-slate-500 text-xs uppercase border-b-2 border-slate-200 bg-slate-50/95 backdrop-blur">
                                <th className="p-3 font-bold w-12">Unit</th>
                                <th className="p-3 font-bold">Word</th>
                                <th className="p-3 font-bold">Hanja</th>
                                <th className="p-3 font-bold w-16">POS</th>
                                <th className="p-3 font-bold">Meaning</th>
                                <th className="p-3 font-bold text-blue-600">Example (Kr)</th>
                                <th className="p-3 font-bold text-blue-600">Example (Cn)</th>
                                <th className="p-3 font-bold text-xs">Synonyms</th>
                                <th className="p-3 font-bold text-xs">Antonyms</th>
                                <th className="p-3 font-bold text-xs">Note</th>
                                <th className="p-3 font-bold w-12 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {previewData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 group transition-colors text-sm">
                                    <td className="p-3 font-bold text-slate-400 text-center">{row.unit || '-'}</td>
                                    <td className="p-3 font-black text-slate-900">{row.word}</td>
                                    <td className="p-3 text-slate-500">{row.hanja || '-'}</td>
                                    <td className="p-3">
                                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                                            {row.partOfSpeech}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-700 font-medium max-w-[150px] truncate" title={row.meaning}>{row.meaning}</td>

                                    {/* Debugging Columns */}
                                    <td className={`p-3 max-w-[200px] truncate ${!row.exampleSentence ? 'bg-red-50' : ''}`} title={row.exampleSentence}>
                                        {row.exampleSentence || <span className="text-red-300 italic">Empty</span>}
                                    </td>
                                    <td className={`p-3 max-w-[200px] truncate ${!row.exampleMeaning ? 'bg-red-50' : ''}`} title={row.exampleMeaning}>
                                        {row.exampleMeaning || <span className="text-red-300 italic">Empty</span>}
                                    </td>

                                    <td className="p-3 text-xs text-slate-500 max-w-[100px] truncate">{row.synonyms?.join(', ')}</td>
                                    <td className="p-3 text-xs text-slate-500 max-w-[100px] truncate">{row.antonyms?.join(', ')}</td>
                                    <td className="p-3 text-xs text-slate-500 max-w-[100px] truncate" title={row.nuance}>{row.nuance}</td>
                                    <td className="p-3 text-center">
                                        <Check className="w-5 h-5 text-slate-200 group-hover:text-green-500 mx-auto" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
