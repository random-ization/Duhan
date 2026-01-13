import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    ArrowLeft,
    Settings,
    Volume2,
    Plus,
    Languages,
    Headphones,
    Loader2,
    X
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { StickyAudioPlayer } from '../../components/audio/StickyAudioPlayer';
import { Language } from '../../../types';
import { getLocalizedContent } from '../../../utils/languageUtils';

// =========================================
// Types
// =========================================

interface TranscriptSegment {
    start: number;  // Start time in seconds
    end: number;    // End time in seconds
    text: string;   // Korean text
    translation?: string; // Chinese translation
    translationEn?: string;
    translationVi?: string;
    translationMn?: string;
    tokens?: { surface: string; base: string; pos: string }[];
}

interface UnitData {
    id: string;
    title: string;
    audioUrl: string;
    transcriptData?: TranscriptSegment[];
}

// Legacy mock data (fallback)
const MOCK_VOCAB: Record<string, string> = {
    '안녕하세요': '你好',
    '저는': '我是',
    '한국': '韩国',
    '사람': '人',
    '감사합니다': '谢谢',
    '좋아요': '好',
    '학교': '学校',
    '친구': '朋友',
};

// =========================================
// Sub-Components
// =========================================

// Word Flashcard Popover
interface FlashcardPopoverProps {
    word: string;
    meaning: string;
    position: { x: number; y: number };
    onClose: () => void;
    onSave: () => void;
    onSpeak: () => void;
}

const FlashcardPopover: React.FC<FlashcardPopoverProps> = ({
    word, meaning, position, onClose, onSave, onSpeak
}) => {
    return (
        <div
            className="fixed z-50 bg-[#FDFBF7] border-2 border-zinc-900 rounded-lg shadow-[4px_4px_0px_0px_#18181B] p-4 min-w-[200px]"
            style={{ left: position.x, top: position.y }}
        >
            <button
                onClick={onClose}
                className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-900 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
            >
                <X className="w-3 h-3" />
            </button>

            <div className="text-xl font-black text-zinc-900 mb-1">{word}</div>
            <div className="text-sm text-zinc-600 mb-3">{meaning}</div>

            <div className="flex gap-2">
                <button
                    onClick={onSpeak}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white border-2 border-zinc-900 rounded-lg font-bold text-xs hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#18181B] transition-all"
                >
                    <Volume2 className="w-3 h-3" />
                    朗读
                </button>
                <button
                    onClick={onSave}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold text-xs hover:bg-lime-400 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#18181B] transition-all"
                >
                    <Plus className="w-3 h-3" />
                    加入生词本
                </button>
            </div>
        </div>
    );
};

// Settings Panel
interface SettingsPanelProps {
    fontSize: number;
    isKaraokeMode: boolean;
    onFontSizeChange: (size: number) => void;
    onKaraokeModeToggle: () => void;
    onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    fontSize, isKaraokeMode, onFontSizeChange, onKaraokeModeToggle, onClose
}) => {
    return (
        <div className="absolute right-0 top-full mt-2 bg-[#FDFBF7] border-2 border-zinc-900 rounded-lg shadow-[4px_4px_0px_0px_#18181B] p-4 w-56 z-50">
            <h4 className="font-black text-sm mb-3">听力设置</h4>

            <div className="mb-4">
                <label className="text-xs font-bold text-zinc-600 mb-2 block">字体大小</label>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onFontSizeChange(Math.max(14, fontSize - 2))}
                        className="px-3 py-1 bg-white border-2 border-zinc-900 rounded font-bold text-sm hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_#18181B] active:shadow-none transition-all"
                    >
                        A-
                    </button>
                    <span className="flex-1 text-center font-bold">{fontSize}px</span>
                    <button
                        onClick={() => onFontSizeChange(Math.min(28, fontSize + 2))}
                        className="px-3 py-1 bg-white border-2 border-zinc-900 rounded font-bold text-sm hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_#18181B] active:shadow-none transition-all"
                    >
                        A+
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-600">卡拉OK高亮</span>
                <button
                    onClick={onKaraokeModeToggle}
                    className={`w-12 h-6 rounded-full border-2 border-zinc-900 relative transition-colors ${isKaraokeMode ? 'bg-lime-300' : 'bg-zinc-200'}`}
                >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full border border-zinc-900 transition-all ${isKaraokeMode ? 'left-6' : 'left-0.5'}`} />
                </button>
            </div>
        </div>
    );
};

// =========================================
// Main Component
// =========================================
interface ListeningModuleProps {
    courseId?: string;
    unitIndex?: number;
    unitTitle?: string;
    language?: Language;
    onBack?: () => void;
}

const ListeningModule: React.FC<ListeningModuleProps> = ({
    courseId = 'snu_1a',
    unitIndex = 1,
    unitTitle = '第1单元: 听力练习',
    language = 'zh',
    onBack
}) => {
    // Loading state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // API data state
    const [unitData, setUnitData] = useState<UnitData | null>(null);

    // UI State
    const [fontSize, setFontSize] = useState(20);
    const [showSettings, setShowSettings] = useState(false);
    const [isKaraokeMode, setIsKaraokeMode] = useState(true);
    const [showTranslation, setShowTranslation] = useState(false);

    // Audio/Karaoke State
    const [currentTime, setCurrentTime] = useState(0);
    const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);

    // Word popup state
    const [selectedWord, setSelectedWord] = useState<{
        word: string;
        meaning: string;
        position: { x: number; y: number };
    } | null>(null);

    const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

    // ========================================
    // Data Fetching - Use dedicated listening API
    // ========================================
    // ========================================
    // Data Fetching - Use dedicated listening API
    // ========================================
    const unitDetails = useQuery(api.units.getDetails, { courseId, unitIndex });

    // Use state variable instead of early return to avoid hooks order issues
    const isQueryLoading = unitDetails === undefined;

    useEffect(() => {
        if (unitDetails === undefined) {
            setLoading(true);
            return;
        }

        if (unitDetails && unitDetails.unit) {
            setUnitData({
                id: unitDetails.unit._id,
                title: unitDetails.unit.title,
                audioUrl: unitDetails.unit.audioUrl || '',
                transcriptData: unitDetails.unit.transcriptData,
            });
            setLoading(false);
        } else {
            // Not found or empty
            setUnitData(null);
            setLoading(false);
        }
    }, [unitDetails]);

    // Cleanup error state logic as useQuery handles it differently (returns undefined on loading)

    // ========================================
    // Karaoke Logic: Update active segment based on current time
    // ========================================
    useEffect(() => {
        if (!unitData?.transcriptData || !isKaraokeMode) return;

        const segments = unitData.transcriptData;
        const newActiveIndex = segments.findIndex(
            seg => currentTime >= seg.start && currentTime <= seg.end
        );

        if (newActiveIndex !== activeSegmentIndex) {
            setActiveSegmentIndex(newActiveIndex);

            // Auto-scroll to active segment
            if (newActiveIndex >= 0 && segmentRefs.current[newActiveIndex]) {
                segmentRefs.current[newActiveIndex]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }
    }, [currentTime, unitData, isKaraokeMode, activeSegmentIndex]);

    // ========================================
    // Handlers
    // ========================================
    const handleTimeUpdate = (time: number) => {
        setCurrentTime(time);
    };

    const handleSegmentClick = (segment: TranscriptSegment, index: number) => {
        // This will trigger the audio to seek to this time
        // We need to communicate with the audio player
        setCurrentTime(segment.start);
        // The actual seek happens via audioRef in parent - we'll need to lift this up
    };

    const handleWordClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.dataset.word) {
            const clickedWord = target.dataset.word;
            const rect = target.getBoundingClientRect();

            // Lookup meaning from mock vocab
            const meaning = MOCK_VOCAB[clickedWord] || '暂无释义';

            setSelectedWord({
                word: clickedWord,
                meaning,
                position: { x: rect.left, y: rect.bottom + 8 }
            });
        }
    }, []);

    // TTS function
    const speak = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        speechSynthesis.speak(utterance);
    };

    // Close popup on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (selectedWord) {
                const target = e.target as HTMLElement;
                if (!target.closest('[data-popover]') && !target.dataset.word) {
                    setSelectedWord(null);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedWord]);

    // ========================================
    // Render Transcript with Karaoke Highlighting
    // ========================================
    const renderTranscript = () => {
        // No listening unit exists yet, or no transcript data
        if (!unitData || !unitData.transcriptData || unitData.transcriptData.length === 0) {
            // No transcript data - show empty state
            return (
                <div className="text-center py-12 text-zinc-400">
                    <Headphones className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="font-bold">暂无听力内容</p>
                    <p className="text-sm mt-2">请在管理后台添加听力音频和时间戳文稿</p>
                </div>
            );
        }

        // Render karaoke-style transcript
        return (
            <div className="space-y-4" style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}>
                {unitData.transcriptData.map((segment, index) => {
                    const isActive = isKaraokeMode && index === activeSegmentIndex;

                    return (
                        <div
                            key={index}
                            ref={el => { segmentRefs.current[index] = el; }}
                            onClick={() => handleSegmentClick(segment, index)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${isActive
                                ? 'bg-lime-100 border-lime-400 shadow-[4px_4px_0px_0px_#84cc16] scale-[1.02]'
                                : 'bg-white border-zinc-200 hover:border-zinc-400'
                                }`}
                        >
                            {/* Timestamp */}
                            <div className="text-xs font-mono text-zinc-400 mb-2">
                                {formatTime(segment.start)} - {formatTime(segment.end)}
                            </div>

                            {/* Korean text with word click */}
                            <div
                                className={`font-medium ${isActive ? 'text-zinc-900' : 'text-zinc-700'}`}
                                onClick={handleWordClick}
                            >
                                {segment.text.split(/\s+/).map((word, wordIndex) => (
                                    <span
                                        key={wordIndex}
                                        data-word={word}
                                        className={`cursor-pointer rounded px-0.5 transition-colors ${isActive
                                            ? 'hover:bg-lime-200'
                                            : 'hover:bg-yellow-100'
                                            }`}
                                    >
                                        {word}{' '}
                                    </span>
                                ))}
                            </div>

                            {/* Translation - show if toggled on or if this is active segment */}
                            {(showTranslation || isActive) && (
                                getLocalizedContent(segment, 'translation', language) || segment.translation
                            ) && (
                                    <div className="mt-2 text-sm text-zinc-500">
                                        {getLocalizedContent(segment, 'translation', language)}
                                    </div>
                                )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // Format time helper
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className="h-[calc(100vh-48px)] flex flex-col pb-20" // pb-20 for sticky player
            style={{
                backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                backgroundColor: '#f4f4f5'
            }}
        >
            {/* Loading State */}
            {loading && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-zinc-400" />
                        <p className="font-bold text-zinc-500">加载中...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="font-bold text-red-500 mb-4">{error}</p>
                        <button
                            onClick={onBack}
                            className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-bold"
                        >
                            返回
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content - only show when loaded */}
            {!loading && !error && (
                <>
                    {/* Header */}
                    <header className="bg-[#FDFBF7] border-b-2 border-zinc-900 px-6 py-3 flex items-center justify-between shrink-0">
                        {/* Left: Back + Title */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="w-10 h-10 bg-white border-2 border-zinc-900 rounded-lg flex items-center justify-center hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 shadow-[3px_3px_0px_0px_#18181B] active:shadow-none transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="font-black text-lg flex items-center gap-2">
                                <Headphones className="w-5 h-5 text-lime-600" />
                                {unitData?.title || unitTitle}
                            </h1>
                        </div>

                        {/* Center: Unit Info Badge */}
                        <div className="flex gap-2">
                            <span className="px-4 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold text-sm">
                                🎧 第 {unitIndex} 课 · 听力
                            </span>
                            <button
                                onClick={() => setShowTranslation(!showTranslation)}
                                className={`px-3 py-2 border-2 border-zinc-900 rounded-lg font-bold text-xs transition-colors ${showTranslation ? 'bg-blue-100' : 'bg-white'
                                    }`}
                            >
                                <Languages className="w-4 h-4 inline mr-1" />
                                译文
                            </button>
                        </div>

                        {/* Right: Settings */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="w-10 h-10 bg-white border-2 border-zinc-900 rounded-lg flex items-center justify-center hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 shadow-[3px_3px_0px_0px_#18181B] active:shadow-none transition-all"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                            {showSettings && (
                                <SettingsPanel
                                    fontSize={fontSize}
                                    isKaraokeMode={isKaraokeMode}
                                    onFontSizeChange={setFontSize}
                                    onKaraokeModeToggle={() => setIsKaraokeMode(!isKaraokeMode)}
                                    onClose={() => setShowSettings(false)}
                                />
                            )}
                        </div>
                    </header>

                    {/* Main Content: Full Width Transcript Panel */}
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="bg-[#FDFBF7] border-2 border-zinc-900 rounded-xl shadow-[6px_6px_0px_0px_#18181B] p-8 max-w-3xl mx-auto">
                            <h2 className="text-2xl font-black mb-6 text-zinc-900 flex items-center gap-2">
                                <Headphones className="w-6 h-6 text-lime-600" />
                                听力文稿
                            </h2>

                            {/* Karaoke hint */}
                            {unitData?.transcriptData && unitData.transcriptData.length > 0 && (
                                <div className="mb-6 p-3 bg-lime-50 border border-lime-200 rounded-lg text-sm text-lime-700">
                                    💡 点击任意句子可跳转到对应位置播放
                                </div>
                            )}

                            {renderTranscript()}
                        </div>
                    </div>
                </>
            )}

            {/* Word Popover */}
            {selectedWord && (
                <div data-popover>
                    <FlashcardPopover
                        word={selectedWord.word}
                        meaning={selectedWord.meaning}
                        position={selectedWord.position}
                        onClose={() => setSelectedWord(null)}
                        onSave={() => {
                            // TODO: Save to vocab list
                            setSelectedWord(null);
                        }}
                        onSpeak={() => speak(selectedWord.word)}
                    />
                </div>
            )}

            {/* Sticky Audio Player */}
            {!loading && !error && unitData?.audioUrl && (
                <StickyAudioPlayer
                    audioUrl={unitData.audioUrl}
                    onTimeUpdate={handleTimeUpdate}
                />
            )}
        </div>
    );
};

export default ListeningModule;
