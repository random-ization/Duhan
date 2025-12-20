import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube, { YouTubeProps } from 'react-youtube';
import { ArrowLeft, BookOpen, Clock, Globe, Languages, Loader2, PlayCircle, Sparkles } from 'lucide-react';
import { api } from '../services/api';

const YouTubeLearnPage: React.FC = () => {
    const { youtubeId } = useParams<{ youtubeId: string }>();
    const navigate = useNavigate();
    const playerRef = useRef<any>(null);

    const [loading, setLoading] = useState(true);
    const [videoData, setVideoData] = useState<any>(null); // video metadata
    const [transcript, setTranscript] = useState<any>(null); // { segments, vocabulary, summary ... }
    const [currentTime, setCurrentTime] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Initial Fetch
    useEffect(() => {
        if (!youtubeId) return;
        const fetchLesson = async () => {
            try {
                // Call importVideo again to get data (it handles finding existing DB records)
                const res = await api.importVideo(youtubeId);
                if (res.success) {
                    setVideoData(res.data.video);
                    setTranscript(res.data.transcript);
                }
            } catch (err: any) {
                setError('加载课程失败，请重试');
            } finally {
                setLoading(false);
            }
        };
        fetchLesson();
    }, [youtubeId]);

    // Timer to sync video time
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current) {
                const time = playerRef.current.getCurrentTime();
                setCurrentTime(time);
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const onReady: YouTubeProps['onReady'] = (event) => {
        playerRef.current = event.target;
    };

    // Helper: Seek video when clicking transcript
    // Since we don't have exact timestamps from the AI prompt (simplified version),
    // we can't seek accurately to sentence level yet.
    // Ideally, we'd map AI segments back to original youtube-transcript timestamps.
    // FOR NOW: Let's assume we can't seek directly to "text segments" unless we kept timestamps.
    // IMPROVEMENT for future: Pass timestamps to AI prompt or keep index map.
    const handleSeek = (seconds: number) => {
        if (playerRef.current) {
            playerRef.current.seekTo(seconds, true);
            playerRef.current.playVideo();
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
                    <p className="text-slate-500">正在准备课程...</p>
                </div>
            </div>
        );
    }

    if (error || !videoData) {
        return (
            <div className="h-screen flex flex-col items-center justify-center space-y-4">
                <p className="text-red-500">{error || '未找到课程'}</p>
                <button
                    onClick={() => navigate('/youtube/search')}
                    className="text-indigo-600 hover:underline flex items-center gap-1"
                >
                    <ArrowLeft className="w-4 h-4" /> 返回搜索
                </button>
            </div>
        );
    }

    // Determine current active segment (approximate if we don't have timestamps)
    // For this MVP without timestamps in `segments`, we can't highlight automatically.
    // Displaying them as a readable article/script.

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
            {/* Header */}
            <header className="flex-none h-16 border-b border-slate-100 flex items-center px-6 bg-white z-10">
                <button
                    onClick={() => navigate('/youtube/search')}
                    className="mr-4 p-2 hover:bg-slate-50 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </button>
                <h1 className="text-lg font-bold text-slate-800 line-clamp-1 flex-1">
                    {videoData.title}
                </h1>
                {/* Status Badge */}
                {transcript?.isPreview && (
                    <span className="ml-4 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider">
                        Preview Mode
                    </span>
                )}
            </header>

            {/* Main Content: Split View */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Video Player */}
                <div className="w-full md:w-2/3 bg-black flex items-center justify-center relative">
                    <div className="w-full h-full">
                        <YouTube
                            videoId={videoData.youtubeId}
                            opts={{
                                width: '100%',
                                height: '100%',
                                playerVars: {
                                    autoplay: 1, // Auto-play
                                    modestbranding: 1,
                                    rel: 0,
                                },
                            }}
                            onReady={onReady}
                            className="w-full h-full absolute inset-0"
                        />
                    </div>
                </div>

                {/* Right: Transcript & AI Analysis */}
                <div className="w-full md:w-1/3 border-l border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
                    {/* Tabs / Toggle (Optional) */}
                    <div className="flex-none p-4 pb-0">
                        <div className="bg-white rounded-lg shadow-sm p-1 border border-slate-200 flex">
                            <button className="flex-1 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md shadow-sm">
                                字幕 & 翻译
                            </button>
                            {/* Future: Add 'Vocabulary' Tab */}
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Summary Card */}
                        {transcript?.summary && (
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
                                <div className="flex items-center gap-2 mb-2 opacity-90">
                                    <Sparkles className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">AI 摘要</span>
                                </div>
                                <p className="text-sm leading-relaxed opacity-95">
                                    {transcript.summary}
                                </p>
                            </div>
                        )}

                        {/* Vocabulary List */}
                        {transcript?.vocabulary && transcript.vocabulary.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">核心词汇</h3>
                                <div className="grid gap-2">
                                    {transcript.vocabulary.map((vocab: any, i: number) => (
                                        <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center hover:border-indigo-200 transition-colors">
                                            <span className="font-bold text-slate-700">{vocab.word}</span>
                                            <span className="text-sm text-slate-500">{vocab.meaning}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Transcript Segments */}
                        {transcript?.segments?.length > 0 ? (
                            <div className="space-y-4 pt-2">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">双语字幕</h3>
                                {transcript.segments.map((seg: any, i: number) => (
                                    <div
                                        key={i}
                                        className={`p-4 rounded-xl border transition-all duration-200 bg-white border-slate-200 hover:shadow-md cursor-default`}
                                    >
                                        <div className="text-slate-800 font-medium leading-relaxed mb-2">
                                            {/* Highlight vocab if possible? For now just text */}
                                            {seg.original}
                                        </div>
                                        <div className="text-sm text-indigo-600 leading-relaxed bg-indigo-50/50 p-2 rounded-lg">
                                            {seg.translated}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-400">
                                <p>暂无字幕内容</p>
                            </div>
                        )}

                        {/* Premium Blocker */}
                        {transcript?.isPreview && (
                            <div className="sticky bottom-0 mt-8">
                                <div className="bg-slate-900/95 backdrop-blur text-white p-5 rounded-xl shadow-2xl border border-slate-700 text-center space-y-3">
                                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-2 text-white">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold">试看结束</h3>
                                    <p className="text-slate-300 text-sm">
                                        升级会员解锁完整 AI 逐句精听与全篇翻译。
                                    </p>
                                    <button className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors">
                                        升级 Premium
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Spacing for bottom */}
                        <div className="h-10" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default YouTubeLearnPage;
