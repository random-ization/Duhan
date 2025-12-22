import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Play,
    Pause,
    RotateCcw,
    Repeat,
    Sparkles,
    MoreHorizontal,
    X,
    BookOpen,
    MessageSquare,
    Lightbulb,
    SkipBack,
    SkipForward,
    Languages,
    Volume2,
    Heart,
    Share2,
    ListMusic
} from 'lucide-react';
import { api } from '../services/api';

// Types
interface TranscriptLine {
    start: number;
    end: number;
    text: string;
    translation: string;
}

interface AnalysisData {
    vocabulary: { word: string; root: string; meaning: string; type: string }[];
    grammar: { structure: string; explanation: string }[];
    nuance: string;
    cached?: boolean;
}

// CDN Domain for transcript cache
const CDN_DOMAIN = import.meta.env.VITE_CDN_URL || '';

// Mock transcript for fallback
const MOCK_TRANSCRIPT: TranscriptLine[] = [
    { start: 0, end: 4.5, text: "안녕하세요, 여러분. 오늘도 한국어 공부 시작해볼까요?", translation: "大家好，今天也开始学习韩语吗？" },
    { start: 4.5, end: 8.2, text: "꾸준히 하는 것이 가장 중요합니다.", translation: "坚持是最重要的。" },
    { start: 8.2, end: 12.0, text: "이 문장은 조금 빠르니까 다시 들어보세요.", translation: "这句话有点快，请再听一遍。" },
    { start: 12.0, end: 16.5, text: "오늘은 일상 대화에서 많이 쓰는 표현을 배워볼 거예요.", translation: "今天我们来学习日常对话中常用的表达。" },
    { start: 16.5, end: 21.0, text: "예를 들어, '어떻게 지내세요?'라는 표현이 있어요.", translation: "比如，有'您最近怎么样？'这样的表达。" },
];

const PodcastPlayerPage: React.FC = () => {
    const { state } = useLocation();
    const navigate = useNavigate();

    // Episode Data
    const episode = state?.episode || {
        title: "Demo Episode",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        channelTitle: "Demo Channel",
        channelArtwork: "",
        guid: "demo-episode"
    };
    const channel = state?.channel || {};

    // Refs
    const audioRef = useRef<HTMLAudioElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeLineRef = useRef<HTMLDivElement>(null);

    // Audio State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1.0);
    const [volume, setVolume] = useState(1.0);
    const [isLoading, setIsLoading] = useState(true);

    // Learning Features State
    const [showTranslation, setShowTranslation] = useState(true);
    const [autoScroll, setAutoScroll] = useState(true);
    const [abLoop, setAbLoop] = useState<{ a: number | null; b: number | null; active: boolean }>({
        a: null, b: null, active: false
    });

    // Transcript State
    const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
    const [transcriptLoading, setTranscriptLoading] = useState(true);
    const [transcriptError, setTranscriptError] = useState<string | null>(null);
    const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);

    // AI Analysis State
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [analyzingLine, setAnalyzingLine] = useState<TranscriptLine | null>(null);
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    // --- Helpers ---
    const formatTime = (seconds: number) => {
        if (!seconds) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getEpisodeId = useCallback(() => {
        if (episode.guid) return encodeURIComponent(episode.guid);
        let hash = 0;
        const str = `${episode.title}-${episode.audioUrl}`;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return `ep_${Math.abs(hash).toString(16)}`;
    }, [episode]);

    // --- Effects ---

    // 1. Initial Load & Analytics
    useEffect(() => {
        loadTranscript();

        // Track View
        if (episode?.audioUrl) {
            api.trackPodcastView({
                guid: episode.guid || `${episode.title}-${Date.now()}`,
                title: episode.title,
                audioUrl: episode.audioUrl,
                duration: episode.duration,
                pubDate: episode.pubDate,
                channel: {
                    itunesId: channel.itunesId || channel.id || 'unknown',
                    title: channel.title || episode.channelTitle || 'Unknown',
                    author: channel.author || '',
                    feedUrl: channel.feedUrl || '',
                    artworkUrl: channel.artworkUrl || channel.artwork || episode.channelArtwork
                }
            }).catch(console.error);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2. Transcript Loading Logic
    const loadTranscript = async () => {
        const episodeId = getEpisodeId();
        setTranscriptLoading(true);
        setTranscriptError(null);

        try {
            // S3 Cache First
            if (CDN_DOMAIN) {
                try {
                    const s3Url = `${CDN_DOMAIN}/transcripts/${episodeId}.json`;
                    const s3Res = await fetch(s3Url);
                    if (s3Res.ok) {
                        const data = await s3Res.json();
                        setTranscript(data.segments || data);
                        setTranscriptLoading(false);
                        return;
                    }
                } catch (e) { /* Fallback to API */ }
            }

            // Generate
            setIsGeneratingTranscript(true);
            const result = await api.generateTranscript(episode.audioUrl, episodeId, 'zh');

            if (result.success && result.data?.segments) {
                setTranscript(result.data.segments);
            } else {
                throw new Error('Invalid transcript response');
            }
        } catch (err) {
            console.error('Transcript failed:', err);
            setTranscript(MOCK_TRANSCRIPT);
            setTranscriptError('使用演示字幕 (AI 生成失败)');
        } finally {
            setTranscriptLoading(false);
            setIsGeneratingTranscript(false);
        }
    };

    // 3. Auto-Scroll Logic
    const activeLineIndex = useMemo(() => {
        return transcript.findIndex(line => currentTime >= line.start && currentTime < line.end);
    }, [currentTime, transcript]);

    useEffect(() => {
        if (autoScroll && activeLineIndex !== -1 && activeLineRef.current) {
            activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeLineIndex, autoScroll]);

    // --- Handlers ---

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const curr = audioRef.current.currentTime;

        // A-B Loop
        if (abLoop.active && abLoop.b !== null && curr >= abLoop.b) {
            audioRef.current.currentTime = abLoop.a || 0;
            return;
        }
        setCurrentTime(curr);
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const seekTo = (time: number) => {
        if (audioRef.current) {
            const t = Math.max(0, Math.min(time, duration));
            audioRef.current.currentTime = t;
            setCurrentTime(t);
        }
    };

    const skip = (sec: number) => seekTo(currentTime + sec);

    const changeSpeed = () => {
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
        setSpeed(next);
        if (audioRef.current) audioRef.current.playbackRate = next;
    };

    const toggleLoop = () => {
        if (abLoop.a === null) setAbLoop({ a: currentTime, b: null, active: false });
        else if (abLoop.b === null) setAbLoop({ ...abLoop, b: currentTime, active: true });
        else setAbLoop({ a: null, b: null, active: false });
    };

    const analyze = async (line: TranscriptLine) => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
        setAnalyzingLine(line);
        setShowAnalysis(true);
        setAnalysisLoading(true);
        setAnalysisData(null);

        try {
            const res = await api.analyzeSentence(line.text);
            if (res.success) setAnalysisData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setAnalysisLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
            {/* Header - Fixed on Mobile, Part of layout on Desktop */}
            <header className="flex-none flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 z-20 md:hidden">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-sm truncate max-w-[200px]">{episode.title}</span>
                <button className="p-2 hover:bg-slate-100 rounded-full">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </header>

            {/* Main Layout: Stack on Mobile, Split on Desktop */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

                {/* Left Column: Meta & Controls (Sticky on Desktop) */}
                <aside className="w-full md:w-[320px] lg:w-[380px] flex-none bg-white md:border-r border-slate-200 flex flex-col z-10">
                    <div className="p-6 md:p-8 flex flex-col items-center md:items-start text-center md:text-left h-full overflow-y-auto">

                        {/* Desktop Back Button */}
                        <button
                            onClick={() => navigate(-1)}
                            className="hidden md:flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm font-medium">Back to Feed</span>
                        </button>

                        {/* Cover Art */}
                        <div className="relative group w-48 h-48 md:w-64 md:h-64 rounded-2xl shadow-xl overflow-hidden mb-6 flex-shrink-0">
                            <img
                                src={episode.image || channel.artworkUrl || episode.channelArtwork || '/api/placeholder/400/400'}
                                alt="Cover"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                            {/* CD Hole Effect (Optional style) */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity">
                                <div className="w-8 h-8 bg-white/30 backdrop-blur-md rounded-full" />
                            </div>
                        </div>

                        {/* Meta Info */}
                        <div className="space-y-2 mb-8 w-full">
                            <h1 className="text-xl md:text-2xl font-bold leading-tight text-slate-800 line-clamp-2 md:line-clamp-none">
                                {episode.title}
                            </h1>
                            <p className="text-sm md:text-base font-medium text-indigo-600">
                                {channel.title || episode.channelTitle}
                            </p>
                        </div>

                        {/* Sidebar Controls */}
                        <div className="w-full space-y-4 md:mt-auto pb-4 md:pb-0">
                            {/* Translation Switch */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-500">
                                        <Languages className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-slate-700">翻译字幕</p>
                                        <p className="text-xs text-slate-400">显示中文翻译</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowTranslation(!showTranslation)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${showTranslation ? 'bg-indigo-600' : 'bg-slate-300'
                                        }`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-md ${showTranslation ? 'left-7' : 'left-1'
                                        }`} />
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                <button className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-indigo-200 transition-all text-slate-600 font-medium text-sm">
                                    <Heart className="w-4 h-4" /> 收藏此集
                                </button>
                                <button className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-indigo-200 transition-all text-slate-600 font-medium text-sm">
                                    <Share2 className="w-4 h-4" /> 分享
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Right Column: Transcript Stream */}
                <main
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto scroll-smooth bg-slate-50/50 pb-[180px] md:pb-[140px]"
                    onScroll={() => {
                        // Optional: Detect user scroll to pause auto-scroll temporarily?
                    }}
                >
                    <div className="max-w-3xl mx-auto p-4 md:p-8 lg:p-12 space-y-2">
                        {/* Loading State */}
                        {transcriptLoading && (
                            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                <p className="text-slate-500 font-medium animate-pulse">AI 正在生成只能字幕...</p>
                                {isGeneratingTranscript && (
                                    <span className="text-xs text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                                        首次生成约需 1 分钟
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Error State */}
                        {transcriptError && !transcriptLoading && (
                            <div className="bg-white border border-red-100 rounded-2xl p-6 text-center shadow-sm mx-4 mt-8">
                                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
                                    <Volume2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-slate-800 font-bold mb-1">无法加载字幕</h3>
                                <p className="text-sm text-slate-500 mb-4">{transcriptError}</p>
                                <button
                                    onClick={loadTranscript}
                                    className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                                >
                                    重试
                                </button>
                            </div>
                        )}

                        {/* Empty State */}
                        {!transcriptLoading && !transcriptError && transcript.length === 0 && (
                            <div className="text-center py-20 text-slate-400">
                                <p>暂无字幕内容</p>
                            </div>
                        )}

                        {/* Transcript List */}
                        {!transcriptLoading && transcript.map((line, idx) => {
                            const isActive = idx === activeLineIndex;

                            return (
                                <div
                                    key={idx}
                                    id={`line-${idx}`}
                                    ref={isActive ? activeLineRef : null}
                                    className={`
                                        group relative p-4 md:p-6 rounded-2xl transition-all duration-300 border-l-4
                                        ${isActive
                                            ? 'bg-white shadow-lg border-indigo-500 scale-[1.01] z-10'
                                            : 'bg-transparent border-transparent hover:bg-white/60 hover:border-slate-200'
                                        }
                                    `}
                                >
                                    <div className="flex gap-4 items-start">
                                        {/* Timestamp Bubble */}
                                        <button
                                            onClick={() => seekTo(line.start)}
                                            className={`
                                                flex-none text-[11px] font-bold px-2 py-1 rounded-md transition-colors
                                                ${isActive
                                                    ? 'bg-indigo-100 text-indigo-700'
                                                    : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                                                }
                                            `}
                                        >
                                            {formatTime(line.start)}
                                        </button>

                                        {/* Content */}
                                        <div className="flex-1 space-y-2 cursor-pointer" onClick={() => seekTo(line.start)}>
                                            <p className={`
                                                text-lg md:text-xl font-bold leading-relaxed transition-colors
                                                ${isActive ? 'text-indigo-900' : 'text-slate-700 group-hover:text-slate-900'}
                                            `}>
                                                {line.text}
                                            </p>

                                            {showTranslation && line.translation && (
                                                <p className={`
                                                    text-base leading-relaxed transition-colors border-l-2 pl-3
                                                    ${isActive
                                                        ? 'text-indigo-600/80 border-indigo-200'
                                                        : 'text-slate-500 border-slate-200'
                                                    }
                                                `}>
                                                    {line.translation}
                                                </p>
                                            )}
                                        </div>

                                        {/* Analyze Button (Visible on Hover/Active) */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                analyze(line);
                                            }}
                                            className={`
                                                p-2 rounded-full transition-all flex-none
                                                ${isActive
                                                    ? 'bg-indigo-100 text-indigo-600 opacity-100'
                                                    : 'bg-white text-slate-600 opacity-0 group-hover:opacity-100 shadow-sm border border-slate-100'
                                                }
                                                hover:scale-110 hover:bg-indigo-600 hover:text-white
                                            `}
                                            title="Analyze this sentence"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div>

            {/* Fixed Bottom Player Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
                <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-3">

                    {/* Progress Slider (Top of bar) */}
                    <div className="relative group mb-2 md:mb-4 pt-2">
                        <div
                            className="absolute -top-3 left-0 right-0 h-4 cursor-pointer z-10"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pct = (e.clientX - rect.left) / rect.width;
                                seekTo(pct * duration);
                            }}
                        />
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-600 rounded-full relative"
                                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-600 rounded-full shadow border-2 border-white scale-0 group-hover:scale-100 transition-transform" />
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1 select-none">
                            <span>{formatTime(currentTime)}</span>
                            <span>-{formatTime(duration - currentTime)}</span>
                        </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between">

                        {/* Left: Speed & Loop */}
                        <div className="flex items-center gap-2 md:gap-4 flex-1">
                            <button
                                onClick={changeSpeed}
                                className="text-xs font-bold text-slate-600 hover:text-indigo-600 px-2 py-1 rounded hover:bg-slate-50 transition-colors w-12"
                            >
                                {speed}x
                            </button>
                            <button
                                onClick={toggleLoop}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all
                                    ${abLoop.active
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                        : abLoop.a !== null
                                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                            : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                                    }
                                `}
                            >
                                <Repeat className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">{abLoop.active ? 'Loop Active' : abLoop.a !== null ? 'Set B' : 'Loop'}</span>
                            </button>
                        </div>

                        {/* Center: Main Playback */}
                        <div className="flex items-center gap-6 md:gap-8 flex-none">
                            <button onClick={() => skip(-10)} className="text-slate-400 hover:text-slate-700 transition-colors hover:scale-110">
                                <SkipBack className="w-6 h-6 md:w-7 md:h-7" strokeWidth={1.5} />
                            </button>

                            <button
                                onClick={togglePlay}
                                className="w-14 h-14 md:w-16 md:h-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-indigo-600 hover:scale-105 transition-all active:scale-95 ring-4 ring-transparent hover:ring-indigo-100"
                            >
                                {isPlaying ? (
                                    <Pause className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" />
                                ) : (
                                    <Play className="w-6 h-6 md:w-8 md:h-8 ml-1" fill="currentColor" />
                                )}
                            </button>

                            <button onClick={() => skip(10)} className="text-slate-400 hover:text-slate-700 transition-colors hover:scale-110">
                                <SkipForward className="w-6 h-6 md:w-7 md:h-7" strokeWidth={1.5} />
                            </button>
                        </div>

                        {/* Right: Tools / Volume (Hidden mobile) */}
                        <div className="flex items-center justify-end gap-4 flex-1">
                            <div className="hidden md:flex items-center gap-2 group w-24">
                                <Volume2 className="w-4 h-4 text-slate-400" />
                                <input
                                    type="range" min="0" max="1" step="0.1"
                                    value={audioRef.current?.volume || 1}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setVolume(v);
                                        if (audioRef.current) audioRef.current.volume = v;
                                    }}
                                    className="w-full h-1 bg-slate-200 rounded-full accent-slate-500"
                                />
                            </div>
                            <button
                                onClick={() => setAutoScroll(!autoScroll)}
                                className={`hidden md:block p-2 rounded-lg transition-colors ${autoScroll ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Auto Scroll"
                            >
                                <ListMusic className="w-5 h-5" />
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            {/* Hidden Audio Element */}
            <audio
                ref={audioRef}
                src={episode.audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => {
                    setDuration(e.currentTarget.duration);
                    setIsLoading(false);
                }}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            {/* AI Analysis Modal/Sheet */}
            {showAnalysis && analyzingLine && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center pointer-events-none">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity"
                        onClick={() => setShowAnalysis(false)}
                    />

                    {/* Modal Content */}
                    <div className="
                        bg-white w-full md:w-[600px] md:rounded-2xl rounded-t-2xl shadow-2xl 
                        pointer-events-auto transform transition-transform duration-300 md:max-h-[80vh] max-h-[85vh] flex flex-col overflow-hidden
                    ">

                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                                        AI Analysis
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                                    {analyzingLine.text}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowAnalysis(false)}
                                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto p-6 space-y-8 bg-white flex-1">
                            {analysisLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
                                    <Sparkles className="w-8 h-8 animate-spin text-indigo-400" />
                                    <p className="text-sm">Analyzing context & grammar...</p>
                                </div>
                            ) : analysisData ? (
                                <>
                                    {/* Vocab Grid */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold border-b border-slate-100 pb-2">
                                            <BookOpen className="w-5 h-5 text-indigo-500" />
                                            Core Vocabulary
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {analysisData.vocabulary.map((v, i) => (
                                                <div key={i} className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-indigo-100 hover:shadow-sm transition-all">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-slate-900">{v.word}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500">{v.type}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 mb-0.5">Root: {v.root}</div>
                                                    <div className="text-sm text-slate-700">{v.meaning}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Grammar */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold border-b border-slate-100 pb-2">
                                            <MessageSquare className="w-5 h-5 text-emerald-500" />
                                            Grammar Points
                                        </div>
                                        <div className="space-y-3">
                                            {analysisData.grammar.map((g, i) => (
                                                <div key={i} className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                                    <div className="font-bold text-emerald-800 mb-1">{g.structure}</div>
                                                    <div className="text-sm text-emerald-900/80 leading-relaxed">{g.explanation}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Nuance */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold border-b border-slate-100 pb-2">
                                            <Lightbulb className="w-5 h-5 text-amber-500" />
                                            Cultural Nuance
                                        </div>
                                        <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 text-sm text-amber-900/80 leading-relaxed italic">
                                            "{analysisData.nuance}"
                                        </div>
                                    </section>
                                </>
                            ) : (
                                <div className="text-center py-12 text-slate-400">Analysis failed. Please try again.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PodcastPlayerPage;
