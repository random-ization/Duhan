import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Play, Calendar, ArrowLeft } from 'lucide-react';
import { ListeningHistoryItem } from '../types';
import { PODCAST_MESSAGES } from '../constants/podcast-messages';

export default function HistoryPage() {
    const [history, setHistory] = useState<ListeningHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        api.getPodcastHistory()
            .then(setHistory)
            .catch(err => {
                console.error('Failed to load history:', err);
                setError(PODCAST_MESSAGES.ERROR_LOAD_HISTORY);
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="bg-white p-4 sticky top-0 z-10 border-b flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-100 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">{PODCAST_MESSAGES.HISTORY_TITLE}</h1>
            </div>

            <div className="p-4 space-y-3">
                {loading && (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                    </div>
                )}

                {!loading && error && (
                    <div className="text-center py-10">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-indigo-600 hover:underline"
                        >
                            {PODCAST_MESSAGES.ACTION_RETRY}
                        </button>
                    </div>
                )}

                {!loading && !error && history.length === 0 && (
                    <p className="text-center text-gray-400 mt-10">{PODCAST_MESSAGES.EMPTY_HISTORY}</p>
                )}

                {history.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => navigate('/podcasts/player', {
                            state: {
                                episode: {
                                    guid: item.episodeGuid,
                                    title: item.episodeTitle,
                                    audioUrl: item.episodeUrl,
                                    channel: { title: item.channelName, image: item.channelImage }
                                }
                            }
                        })}
                        className="bg-white p-3 rounded-xl shadow-sm flex items-center gap-4 cursor-pointer active:scale-95 transition hover:shadow-md"
                    >
                        <img
                            src={item.channelImage || '/placeholder-podcast.png'}
                            alt={item.channelName}
                            className="w-14 h-14 rounded-lg bg-gray-200 object-cover"
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 line-clamp-1">{item.episodeTitle}</h3>
                            <p className="text-xs text-slate-500 mb-1">{item.channelName}</p>
                            <div className="flex items-center text-xs text-slate-400 gap-1">
                                <Calendar size={12} />
                                {new Date(item.playedAt).toLocaleDateString('zh-CN')}
                            </div>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded-full text-indigo-600">
                            <Play size={16} fill="currentColor" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
