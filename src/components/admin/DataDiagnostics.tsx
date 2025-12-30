import React, { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { RefreshCw, Database, AlertCircle } from 'lucide-react';

interface DiagnosticData {
    id: string;
    name: string;
    publisher: string | null;
    vocabCount: number;
    unitCount: number;
    totalUnitsSetting: number | null;
}

export default function DataDiagnostics() {
    const [data, setData] = useState<DiagnosticData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.getDiagnostics();
            if (res.success) {
                setData(res.data);
            } else {
                setError(res.error || 'Failed to load diagnostics');
            }
        } catch (err) {
            setError('Network error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <Database className="w-8 h-8 text-blue-600" />
                    <h1 className="text-2xl font-black text-slate-900">数据诊断 (Data Diagnostics)</h1>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    刷新数据
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border-2 border-red-500 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="bg-white border-2 border-slate-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b-2 border-slate-200">
                            <tr>
                                <th className="p-4 font-black text-slate-900">Institute ID (Course)</th>
                                <th className="p-4 font-black text-slate-900">Name</th>
                                <th className="p-4 font-black text-slate-900">Publisher</th>
                                <th className="p-4 font-black text-slate-900">Total Units (Setting)</th>
                                <th className="p-4 font-black text-slate-900">Unit Records (DB)</th>
                                <th className="p-4 font-black text-slate-900">Vocab Count (DB)</th>
                                <th className="p-4 font-black text-slate-900">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.map(item => {
                                const isHealthy = item.vocabCount > 0 && item.totalUnitsSetting;
                                return (
                                    <tr key={item.id} className={`hover:bg-slate-50 ${item.vocabCount === 0 ? 'bg-red-50' : ''}`}>
                                        <td className="p-4 font-mono text-xs text-slate-500">{item.id}</td>
                                        <td className="p-4 font-bold text-slate-900">{item.name}</td>
                                        <td className="p-4 text-slate-600">{item.publisher || '-'}</td>
                                        <td className="p-4 font-mono font-bold text-blue-600">{item.totalUnitsSetting || 'Unset'}</td>
                                        <td className="p-4 font-mono text-slate-600">{item.unitCount}</td>
                                        <td className={`p-4 font-mono font-black ${item.vocabCount === 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            {item.vocabCount}
                                        </td>
                                        <td className="p-4">
                                            {item.vocabCount === 0 ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">
                                                    NO DATA
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold">
                                                    HEALTHY
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {data.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-400">
                                        No courses found in database
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h3 className="font-bold text-blue-800 mb-2">Diagnostic Guide</h3>
                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                    <li><b>Vocab Count = 0</b>: Indicates no words are linked to this Course ID. Check Import script or Course ID matching.</li>
                    <li><b>Unit Records (DB)</b>: Number of `TextbookUnit` rows (Reading content). It is OK if this is 0 if you only want Vocab.</li>
                    <li><b>Total Units (Setting)</b>: Controls the dropdown menu range (1-20). If Unset, defaults to 20.</li>
                </ul>
            </div>
        </div>
    );
}
