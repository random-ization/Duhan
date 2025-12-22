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
    SkipForward
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

// Mock transcript for demo (when no AI transcript available)
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

    // Audio States
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1.0);
    const [isLoading, setIsLoading] = useState(true);

    // Learning Features
    const [abLoop, setAbLoop] = useState<{ a: number | null; b: number | null; active: boolean }>({
        a: null, b: null, active: false
    });

    // Transcript State with S3-first loading
    const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
    const [transcriptLoading, setTranscriptLoading] = useState(true);
    const [transcriptError, setTranscriptError] = useState<string | null>(null);
    const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);

    // AI Analysis
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [analyzingLine, setAnalyzingLine] = useState<TranscriptLine | null>(null);
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    // Generate episode ID for transcript caching
    const getEpisodeId = useCallback(() => {
        if (episode.guid) return encodeURIComponent(episode.guid);
        // Fallback: hash the title + audio URL
        const str = `${episode.title}-${episode.audioUrl}`;
        return btoa(str).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
    }, [episode]);

    // Load transcript with S3-first, API-fallback strategy
    const loadTranscript = useCallback(async () => {
        const episodeId = getEpisodeId();
        setTranscriptLoading(true);
        setTranscriptError(null);

        try {
            // Step 1: Try S3/CDN cache first (if configured)
            if (CDN_DOMAIN) {
                const s3Url = `${CDN_DOMAIN}/transcripts/${episodeId}.json`;
                console.log('[Transcript] Trying S3 cache:', s3Url);

                try {
                    const s3Res = await fetch(s3Url);
                    if (s3Res.ok) {
                        const data = await s3Res.json();
                        console.log('[Transcript] S3 cache hit!');
                        setTranscript(data.segments || data);
                        setTranscriptLoading(false);
                        return;
                    }
                } catch (e) {
                    console.log('[Transcript] S3 fetch failed, trying API...');
                }
            }

            // Step 2: Call API with auth (will generate and cache to S3)
            console.log('[Transcript] Calling API to generate transcript...');
            setIsGeneratingTranscript(true);

            const result = await api.generateTranscript(
                episode.audioUrl,
                episodeId,
                'zh' // Chinese translation
            );

            if (result.success && result.data?.segments) {
                console.log('[Transcript] API success, got', result.data.segments.length, 'segments');
                setTranscript(result.data.segments);
            } else {
                throw new Error('Invalid transcript response');
            }
        } catch (err: any) {
            console.error('[Transcript] Failed to load:', err);
            // Use mock transcript as fallback
            console.log('[Transcript] Using mock transcript');
            setTranscript(MOCK_TRANSCRIPT);
            setTranscriptError('字幕生成失败，使用演示数据');
        } finally {
            setTranscriptLoading(false);
            setIsGeneratingTranscript(false);
        }
    }, [episode, getEpisodeId]);

    // Load transcript on mount
    useEffect(() => {
        loadTranscript();
    }, [loadTranscript]);

    // Track view on mount
    useEffect(() => {
        if (episode?.audioUrl && channel) {
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
    }, [episode, channel]);

    // Time Update Handler with A-B Loop
    const handleTimeUpdate = useCallback(() => {
        if (!audioRef.current) return;
        const curr = audioRef.current.currentTime;

        // A-B Loop Logic
        if (abLoop.active && abLoop.b !== null && curr >= abLoop.b) {
            audioRef.current.currentTime = abLoop.a || 0;
            return;
        }
        setCurrentTime(curr);
    }, [abLoop]);

    // Find active transcript line
    const activeLineIndex = useMemo(() => {
        return transcript.findIndex(line => currentTime >= line.start && currentTime < line.end);
    }, [currentTime, transcript]);

    // Auto-scroll to active line
    useEffect(() => {
        if (activeLineIndex !== -1 && scrollRef.current) {
            const el = document.getElementById(`line-${activeLineIndex}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeLineIndex]);

    // Playback Controls
    const togglePlay = () => {
        if (!audioRef.current) return;
        if (audioRef.current.paused) {
            audioRef.current.play();
            setIsPlaying(true);
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const seekTo = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
        }
    };

    const skip = (seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, Math.min(currentTime + seconds, duration));
        }
    };

    // Speed Control
    const handleSpeedChange = () => {
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
        const nextSpeed = speeds[nextIdx];
        setSpeed(nextSpeed);
        if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
    };

    // A-B Loop Control
    const handleLoopControl = () => {
        if (abLoop.a === null) {
            // Set A point
            setAbLoop({ a: currentTime, b: null, active: false });
        } else if (abLoop.b === null) {
            // Set B point and activate
            setAbLoop({ ...abLoop, b: currentTime, active: true });
        } else {
            // Clear loop
            setAbLoop({ a: null, b: null, active: false });
        }
    };

    // AI Analysis
    const openAnalysis = async (line: TranscriptLine) => {
        // Pause audio
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
            if (res.success) {
                setAnalysisData(res.data);
            }
        } catch (err) {
            console.error('Analysis failed:', err);
        } finally {
            setAnalysisLoading(false);
        }
    };

    const closeAnalysis = () => {
        setShowAnalysis(false);
        setAnalyzingLine(null);
    };

    // Format time (mm:ss)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-screen bg-white text-slate-900">
            {/* Header */}
            <header className="flex-none flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center flex-1 min-w-0 px-4">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Podcast Learning
                    </span>
                    <span className="font-bold text-sm truncate max-w-[200px]">
                        {episode.title}
                    </span>
                </div>
                <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </header>

            {/* Main Transcript Area */}
            <main
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50"
            >
                {/* Transcript Loading State */}
                {transcriptLoading && (
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-slate-500 text-sm">
                            {isGeneratingTranscript ? 'AI 正在生成字幕...' : '加载字幕中...'}
                        </p>
                        {isGeneratingTranscript && (
                            <p className="text-xs text-slate-400 max-w-xs text-center">
                                首次播放需要生成 AI 字幕，可能需要 1-2 分钟
                            </p>
                        )}
                    </div>
                )}

                {/* Transcript Error Notice */}
                {transcriptError && !transcriptLoading && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                        <p className="text-xs text-amber-700">{transcriptError}</p>
                    </div>
                )}

                {/* Transcript Lines */}
                {!transcriptLoading && transcript.map((line, idx) => {
                    const isActive = idx === activeLineIndex;
                    return (
                        <div
                            key={idx}
                            id={`line-${idx}`}
                            className={`group transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-80'
                                }`}
                        >
                            <div className="flex gap-3 items-start">
                                {/* Timestamp */}
                                <span className="text-xs text-slate-400 pt-1 w-12 flex-shrink-0">
                                    {formatTime(line.start)}
                                </span>

                                {/* Text Content (Click to Seek) */}
                                <div
                                    className="flex-1 cursor-pointer"
                                    onClick={() => seekTo(line.start)}
                                >
                                    <p className={`text-lg font-bold leading-relaxed mb-1 ${isActive ? 'text-indigo-600' : 'text-slate-800'
                                        }`}>
                                        {line.text}
                                    </p>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        {line.translation}
                                    </p>
                                </div>

                                {/* AI Analyze Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openAnalysis(line);
                                    }}
                                    className={`p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                        }`}
                                >
                                    <Sparkles className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
                {/* Bottom Spacer */}
                <div className="h-48" />
            </main>

            {/* Bottom Controls */}
            <div className="flex-none bg-white border-t border-slate-200 pb-safe">
                {/* Learning Tools Bar */}
                <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                    <button
                        onClick={handleLoopControl}
                        className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full transition-colors ${abLoop.active
                            ? 'bg-indigo-600 text-white'
                            : abLoop.a !== null
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <Repeat className="w-4 h-4" />
                        {abLoop.active ? 'Loop ON' : abLoop.a !== null ? 'Set B' : 'A-B Loop'}
                    </button>

                    {abLoop.active && (
                        <span className="text-xs text-slate-500">
                            {formatTime(abLoop.a || 0)} → {formatTime(abLoop.b || 0)}
                        </span>
                    )}

                    <button
                        onClick={handleSpeedChange}
                        className="text-xs font-bold bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full text-slate-700 transition-colors"
                    >
                        {speed}x
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-4 pt-4">
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={(e) => seekTo(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Playback Buttons */}
                <div className="flex items-center justify-center gap-8 py-4">
                    <button
                        onClick={() => skip(-10)}
                        className="p-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <SkipBack className="w-6 h-6" />
                    </button>

                    <button
                        onClick={togglePlay}
                        className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all"
                    >
                        {isPlaying ? (
                            <Pause className="w-7 h-7" fill="currentColor" />
                        ) : (
                            <Play className="w-7 h-7 ml-1" fill="currentColor" />
                        )}
                    </button>

                    <button
                        onClick={() => skip(10)}
                        className="p-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <SkipForward className="w-6 h-6" />
                    </button>
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

            {/* AI Analysis Bottom Sheet */}
            {showAnalysis && analyzingLine && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        onClick={closeAnalysis}
                    />

                    {/* Sheet */}
                    <div className="fixed bottom-0 left-0 right-0 z-50">
                        <div className="bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden">
                            {/* Handle */}
                            <div className="flex justify-center py-3">
                                <div className="w-10 h-1 bg-slate-300 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="px-6 pb-4 border-b border-slate-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-indigo-600 mb-1 uppercase tracking-wider flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            AI Deep Dive
                                        </p>
                                        <p className="text-lg font-bold text-slate-800 leading-relaxed">
                                            {analyzingLine.text}
                                        </p>
                                    </div>
                                    <button
                                        onClick={closeAnalysis}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors -mr-2"
                                    >
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-6 space-y-5">
                                {analysisLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                        <p className="text-slate-500 text-sm">AI 正在分析句子...</p>
                                    </div>
                                ) : analysisData ? (
                                    <>
                                        {/* Vocabulary */}
                                        <section>
                                            <div className="flex items-center gap-2 mb-3">
                                                <BookOpen className="w-4 h-4 text-amber-500" />
                                                <h4 className="font-bold text-slate-700">词汇 Vocabulary</h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {analysisData.vocabulary.map((v, i) => (
                                                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                                        <p className="font-bold text-slate-800">{v.word}</p>
                                                        <p className="text-xs text-slate-400">{v.root} · {v.type}</p>
                                                        <p className="text-sm text-slate-600 mt-1">{v.meaning}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {/* Grammar */}
                                        <section>
                                            <div className="flex items-center gap-2 mb-3">
                                                <MessageSquare className="w-4 h-4 text-emerald-500" />
                                                <h4 className="font-bold text-slate-700">语法 Grammar</h4>
                                            </div>
                                            <div className="space-y-2">
                                                {analysisData.grammar.map((g, i) => (
                                                    <div key={i} className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                                        <p className="font-bold text-emerald-700">{g.structure}</p>
                                                        <p className="text-sm text-slate-600 mt-1">{g.explanation}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {/* Nuance */}
                                        <section>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Lightbulb className="w-4 h-4 text-purple-500" />
                                                <h4 className="font-bold text-slate-700">语感 Nuance</h4>
                                            </div>
                                            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                                                <p className="text-sm text-slate-700">{analysisData.nuance}</p>
                                            </div>
                                        </section>
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-slate-400">
                                        分析失败，请重试
                                    </div>
                                )}
                            </div>

                            {/* Safe area */}
                            <div className="h-6" />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PodcastPlayerPage;
