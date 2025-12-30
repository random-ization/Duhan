import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, Filter, Play, Volume2, Trash2, Edit2, Check, X,
    ChevronLeft, ChevronRight, Mic, Sparkles, Loader2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api, request } from '../../services/api';
import { Institute } from '../../types';
import toast from 'react-hot-toast';



interface VocabItem {
    id: string;
    unitId: number;
    word: string;
    meaning: string;
    partOfSpeech: string;
    hanja?: string;
    pronunciation?: string;
    audioUrl?: string;
    exampleSentence?: string;
    exampleMeaning?: string;
}

export default function VocabDashboard() {
    const { user } = useAuth();
    const [words, setWords] = useState<VocabItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    // Filters
    const [courseId, setCourseId] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [missingAudioOnly, setMissingAudioOnly] = useState(false);

    // Textbooks from API
    const [textbooks, setTextbooks] = useState<Institute[]>([]);
    const [loadingTextbooks, setLoadingTextbooks] = useState(true);

    // Load textbooks on mount
    useEffect(() => {
        const loadTextbooks = async () => {
            try {
                const data = await api.getInstitutes();
                setTextbooks(data || []);
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

    const fetchWords = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                courseId,
                page: page.toString(),
                limit: '50',
                search,
                missingAudio: missingAudioOnly ? 'true' : 'false'
            });

            const data = await request<{ success: boolean; items: VocabItem[]; pages: number }>(`/admin/vocab?${params}`);

            if (data.success) {
                setWords(data.items);
                setTotalPages(data.pages);
            }
        } catch (err) {
            toast.error('Failed to fetch words');
        } finally {
            setLoading(false);
        }
    }, [courseId, page, search, missingAudioOnly]);

    useEffect(() => {
        fetchWords();
    }, [fetchWords]);

    const handleTTS = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setGeneratingId(id);
        try {
            const data = await request<any>(`/admin/vocab/${id}/tts`, { method: 'POST' });

            if (data.success) {
                toast.success('Audio generated');
                setWords(prev => prev.map(w => w.id === id ? { ...w, audioUrl: data.audioUrl } : w));
            } else {
                toast.error('TTS Failed');
            }
        } catch (err) {
            toast.error('Network Error');
        } finally {
            setGeneratingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this word?')) return;

        try {
            await request(`/admin/vocab/${id}`, { method: 'DELETE' });

            toast.success('Deleted');
            setWords(prev => prev.filter(w => w.id !== id));
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const playAudio = (url: string) => {
        const audio = new Audio(url);
        audio.play().catch(() => toast.error('Playback failed'));
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Toolbar */}
            <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <select
                        value={courseId}
                        onChange={(e) => { setCourseId(e.target.value); setPage(1); }}
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

                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search words..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && setPage(1)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white transition-all outline-none"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={missingAudioOnly}
                            onChange={e => setMissingAudioOnly(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-bold text-slate-600">No Audio Only</span>
                    </label>

                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span>Page {page} / {totalPages || 1}</span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr className="text-slate-500 text-xs uppercase tracking-wider border-b-2 border-slate-200">
                            <th className="p-4 font-bold w-16 text-center">Unit</th>
                            <th className="p-4 font-bold w-16 text-center">Audio</th>
                            <th className="p-4 font-bold w-48">Word / Hanja</th>
                            <th className="p-4 font-bold w-24">POS</th>
                            <th className="p-4 font-bold">Meaning</th>
                            <th className="p-4 font-bold max-w-md">Example</th>
                            <th className="p-4 font-bold w-20 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-slate-400">
                                    <div className="flex justify-center mb-2">
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    </div>
                                    Loading vocabulary...
                                </td>
                            </tr>
                        ) : words.map(word => (
                            <tr key={word.id} className="hover:bg-slate-50 group">
                                <td className="p-4 text-center font-bold text-slate-400">{word.unitId}</td>
                                <td className="p-4 text-center">
                                    {word.audioUrl ? (
                                        <button
                                            onClick={() => playAudio(word.audioUrl!)}
                                            className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                        >
                                            <Volume2 className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => handleTTS(word.id, e)}
                                            disabled={generatingId === word.id}
                                            className="p-2 bg-yellow-50 text-yellow-600 rounded-full hover:bg-yellow-100 transition-colors disabled:opacity-50"
                                            title="Generate TTS"
                                        >
                                            {generatingId === word.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}
                                </td>
                                <td className="p-4">
                                    <div className="font-black text-slate-900 text-lg">{word.word}</div>
                                    {word.hanja && <div className="text-xs text-slate-400 mt-1">{word.hanja}</div>}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${word.partOfSpeech.startsWith('VERB') ? 'bg-red-100 text-red-600' :
                                        word.partOfSpeech === 'ADJ' ? 'bg-purple-100 text-purple-600' :
                                            word.partOfSpeech === 'NOUN' ? 'bg-blue-100 text-blue-600' :
                                                'bg-slate-100 text-slate-600'
                                        }`}>
                                        {word.partOfSpeech}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-700 font-medium">{word.meaning}</td>
                                <td className="p-4 text-sm text-slate-500">
                                    {word.exampleSentence ? (
                                        <div>
                                            <p className="mb-0.5">{word.exampleSentence}</p>
                                            <p className="text-slate-400 text-xs">{word.exampleMeaning}</p>
                                        </div>
                                    ) : (
                                        <span className="text-slate-300 italic">No example</span>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => handleDelete(word.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
