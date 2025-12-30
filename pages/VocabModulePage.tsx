import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ChevronLeft, ChevronDown, ChevronRight, Volume2, Check, X, Star, Eye, EyeOff, Play, Square, BookOpen, Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { VocabularyItem } from '../types';
import VocabQuiz from '../src/features/vocab/components/VocabQuiz';
import VocabMatch from '../src/features/vocab/components/VocabMatch';
import { updateVocabProgress } from '../src/services/vocabApi';
import EmptyState from '../src/components/common/EmptyState';

interface ExtendedVocabItem extends VocabularyItem {
    id: string;
    unit: number;
    mastered?: boolean;
}

type ViewMode = 'flashcard' | 'quiz' | 'match' | 'list';

export default function VocabModulePage() {
    const navigate = useNavigate();
    const { instituteId } = useParams<{ instituteId: string }>();
    const { user, saveWord } = useAuth();
    const { setSelectedInstitute, selectedLevel, setSelectedLevel } = useLearning();
    const { institutes, textbookContexts } = useData();

    // Sync instituteId to context - only run when instituteId changes
    useEffect(() => {
        if (instituteId) {
            setSelectedInstitute(instituteId);
            // Only set level if it's not already set
            if (!selectedLevel) {
                setSelectedLevel(1);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instituteId]); // Only depend on instituteId to prevent loops

    const course = institutes.find(i => i.id === instituteId);

    // State
    const [allWords, setAllWords] = useState<ExtendedVocabItem[]>([]);
    const [selectedUnitId, setSelectedUnitId] = useState<number | 'ALL'>('ALL');
    const [viewMode, setViewMode] = useState<ViewMode>('flashcard');
    const [cardIndex, setCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
    const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [flashcardComplete, setFlashcardComplete] = useState(false); // Flashcard completion state

    // Quick Study (速记) mode states
    const [redSheetActive, setRedSheetActive] = useState(true); // 默认开启
    const [isAudioLooping, setIsAudioLooping] = useState(false);
    const audioLoopRef = useRef<boolean>(false);

    // Flashcard settings
    const [showFlashcardSettings, setShowFlashcardSettings] = useState(false);
    const [flashcardSettings, setFlashcardSettings] = useState({
        autoPlayTTS: false,
        cardFront: 'KOREAN' as 'KOREAN' | 'MEANING'
    });

    // Use ref to prevent parseWords from depending on textbookContexts object
    const textbookContextsRef = useRef(textbookContexts);
    useEffect(() => {
        textbookContextsRef.current = textbookContexts;
    }, [textbookContexts]);

    // Parse words from API or Legacy
    const parseWords = useCallback(async () => {
        setLoading(true);

        try {
            // 1. Try fetching from Admin/DB API first using centralized service
            // This handles API_URL correctly (e.g. /api proxy)
            const data = await (await import('../services/api')).api.getCourseVocab(instituteId!);

            if (data.success && data.words.length > 0) {
                const apiWords: ExtendedVocabItem[] = data.words.map((w: any) => ({
                    ...w,
                    korean: w.word,
                    english: w.meaning,
                    unit: w.unitId, // Remap unitId to unit
                    mastered: false
                }));
                setAllWords(apiWords);
                setLoading(false);
                return;
            }
        } catch (err) {
            console.warn('API fetch failed, falling back to legacy:', err);
        }

        // 2. Fallback to Legacy textbookContexts (use ref to avoid dependency)
        const combined: ExtendedVocabItem[] = [];
        const level = selectedLevel || 1;
        const prefix = `${instituteId}-${level}-`;
        const contexts = textbookContextsRef.current;

        Object.keys(contexts).forEach(key => {
            if (key.startsWith(prefix)) {
                const unitStr = key.slice(prefix.length);
                const unit = parseInt(unitStr, 10);
                const content = contexts[key];
                if (content?.vocabularyList && content.vocabularyList.startsWith('[')) {
                    try {
                        const parsed: VocabularyItem[] = JSON.parse(content.vocabularyList);
                        parsed.forEach((item, idx) => {
                            combined.push({ ...item, unit, id: `${unit}-${idx}`, mastered: false });
                        });
                    } catch (e) {
                        console.warn(`Failed to parse vocab for ${key}`, e);
                    }
                }
            }
        });

        // Mock data logic removed (it was only for testing)
        if (combined.length > 0) {
            setAllWords(combined);
        }

        setLoading(false);
    }, [instituteId, selectedLevel]); // Removed textbookContexts to prevent infinite loop

    useEffect(() => { parseWords(); }, [parseWords]);

    const filteredWords = useMemo(() => {
        if (selectedUnitId === 'ALL') return allWords;
        return allWords.filter(w => w.unit === selectedUnitId);
    }, [allWords, selectedUnitId]);

    useEffect(() => { setCardIndex(0); setIsFlipped(false); setFlashcardComplete(false); }, [selectedUnitId]);

    const availableUnits = useMemo(() => {
        const total = course?.totalUnits || 20;
        return Array.from({ length: total }, (_, i) => i + 1);
    }, [course]);

    const currentCard = filteredWords[cardIndex];
    const masteryCount = useMemo(() => filteredWords.filter(w => masteredIds.has(w.id)).length, [filteredWords, masteredIds]);
    const progressPercent = filteredWords.length > 0 ? ((cardIndex + 1) / filteredWords.length) * 100 : 0;

    // Memoized words for Quiz/Match to prevent re-renders
    const gameWords = useMemo(() =>
        filteredWords.map(w => ({ id: w.id, korean: w.korean, english: w.english, unit: w.unit })),
        [filteredWords]
    );

    const handleKnow = async () => {
        if (currentCard) {
            setMasteredIds(prev => new Set([...prev, currentCard.id]));
            // Call SRS API if user is logged in and word has database ID
            if (user?.id && currentCard.id && !currentCard.id.includes('-')) {
                try {
                    await updateVocabProgress(user.id, currentCard.id, 5);
                } catch (err) {
                    console.warn('Failed to update progress:', err);
                }
            }
        }
        goToNext();
    };
    const handleDontKnow = async () => {
        if (user?.id && currentCard?.id && !currentCard.id.includes('-')) {
            try {
                await updateVocabProgress(user.id, currentCard.id, 0);
            } catch (err) {
                console.warn('Failed to update progress:', err);
            }
        }
        goToNext();
    };
    const goToNext = () => {
        setIsFlipped(false);
        if (cardIndex < filteredWords.length - 1) {
            setCardIndex(cardIndex + 1);
        } else {
            // At last card, show completion
            setFlashcardComplete(true);
        }
    };
    const goToPrev = () => { setIsFlipped(false); if (cardIndex > 0) setCardIndex(cardIndex - 1); };
    const flipCard = () => { setIsFlipped(!isFlipped); };
    const toggleStar = (id: string) => { setStarredIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
    const speakWord = (text: string) => { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.8; speechSynthesis.speak(u); } };

    // Auto-play TTS when card changes (if enabled)
    useEffect(() => {
        if (flashcardSettings.autoPlayTTS && currentCard && viewMode === 'flashcard') {
            const textToSpeak = flashcardSettings.cardFront === 'KOREAN' ? currentCard.korean : currentCard.korean;
            speakWord(textToSpeak);
        }
    }, [cardIndex, flashcardSettings.autoPlayTTS, flashcardSettings.cardFront, viewMode]);

    // Audio loop for Quick Study mode (1.5s gap between words)
    const playAudioLoop = async () => {
        if (isAudioLooping) {
            audioLoopRef.current = false;
            setIsAudioLooping(false);
            speechSynthesis.cancel();
            return;
        }

        audioLoopRef.current = true;
        setIsAudioLooping(true);

        for (const word of filteredWords) {
            if (!audioLoopRef.current) break;

            // Speak word
            await new Promise<void>(resolve => {
                const u = new SpeechSynthesisUtterance(word.korean);
                u.lang = 'ko-KR';
                u.rate = 0.8;
                u.onend = () => resolve();
                u.onerror = () => resolve();
                speechSynthesis.speak(u);
            });

            if (!audioLoopRef.current) break;

            // Wait 1.5 seconds
            await new Promise(r => setTimeout(r, 1500));
        }

        audioLoopRef.current = false;
        setIsAudioLooping(false);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') { e.preventDefault(); flipCard(); }
            else if (e.code === 'ArrowLeft') goToPrev();
            else if (e.code === 'ArrowRight') goToNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cardIndex, filteredWords.length]);

    const modeButtons = [
        { id: 'flashcard', label: '单词卡', emoji: '🎴' },
        { id: 'quiz', label: '测试', emoji: '⚡️' },
        { id: 'match', label: '配对', emoji: '🧩' },
        { id: 'list', label: '速记', emoji: '📝' },
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0F4F8', backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium">加载词汇...</p>
                </div>
            </div>
        );
    }

    // Removed blocking EmptyState here to allow UI rendering even if empty

    return (
        <div className="min-h-screen flex flex-col items-center py-6 px-4" style={{ backgroundColor: '#F0F4F8', backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
            <div className="w-full max-w-4xl mb-6">
                {/* Top Bar */}
                <div className="flex items-center justify-between mb-6 z-50 relative">
                    <div className="flex items-center gap-4">
                        {/* Back Button */}
                        <button onClick={() => navigate(`/course/${instituteId}`)} className="w-10 h-10 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center hover:border-slate-900 transition-colors shadow-sm text-slate-400 hover:text-slate-900">
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Scope Dropdown */}
                        <div className="relative">
                            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-3 bg-white border-2 border-slate-900 rounded-xl px-4 py-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-y-0 active:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                                <div className="w-8 h-8 rounded-lg bg-green-100 border border-green-200 flex items-center justify-center text-lg">📚</div>
                                <div className="text-left mr-2">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Scope</div>
                                    <div className="font-black text-slate-900 leading-none">{selectedUnitId === 'ALL' ? '全册单词 (All Units)' : `第 ${selectedUnitId} 课`}</div>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {dropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden z-50">
                                    <div className="p-2 space-y-1">
                                        <button onClick={() => { setSelectedUnitId('ALL'); setDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg font-bold text-sm flex justify-between items-center ${selectedUnitId === 'ALL' ? 'bg-green-50 text-green-800 border border-green-200' : 'hover:bg-slate-50 text-slate-600'}`}>
                                            <span>📚 全册 (Level 1A)</span>
                                            <span className={`px-1.5 rounded text-[10px] ${selectedUnitId === 'ALL' ? 'bg-white border border-green-200' : 'text-slate-300'}`}>{allWords.length}</span>
                                        </button>
                                        <div className="h-px bg-slate-100 my-1" />
                                        {availableUnits.map(u => {
                                            const count = allWords.filter(w => w.unit === u).length;
                                            return (
                                                <button key={u} onClick={() => { setSelectedUnitId(u); setDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg font-medium text-sm flex justify-between items-center ${selectedUnitId === u ? 'bg-green-50 text-green-800 border border-green-200' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}`}>
                                                    <span>Unit {u}</span>
                                                    <span className="text-slate-300 text-xs">{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mastery */}
                    <div className="hidden md:flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200">
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Mastery</div>
                            <div className="font-black text-sm text-slate-900">{masteryCount} / {filteredWords.length}</div>
                        </div>
                        <div className="w-10 h-10 relative">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#4ADE80" strokeWidth="4" strokeDasharray={`${(masteryCount / Math.max(filteredWords.length, 1)) * 100} 100`} />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Mode Tabs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {modeButtons.map(mode => (
                        <button key={mode.id} onClick={() => setViewMode(mode.id as ViewMode)} className={`bg-white border-2 rounded-xl p-3 flex items-center justify-center gap-2 relative overflow-hidden transition-all ${viewMode === mode.id ? 'border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]' : 'border-transparent hover:border-slate-900 shadow-sm hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]'}`}>
                            {viewMode === mode.id && <div className="absolute inset-0 bg-green-50 z-0" />}
                            {viewMode === mode.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#4ADE80]" />}
                            <span className="relative z-10 text-xl">{mode.emoji}</span>
                            <span className={`relative z-10 font-black text-sm ${viewMode === mode.id ? 'text-slate-900' : 'text-slate-500'}`}>{mode.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {filteredWords.length === 0 && (
                <div className="w-full max-w-4xl py-12">
                    <EmptyState
                        icon={BookOpen}
                        title={selectedUnitId === 'ALL' ? "暂无单词" : `Unit ${selectedUnitId} 暂无单词`}
                        description="本单元尚未添加词汇内容"
                        actionLabel={selectedUnitId === 'ALL' ? "返回首页" : "查看其他单元"}
                        onAction={() => selectedUnitId === 'ALL' ? navigate('/dashboard') : setSelectedUnitId('ALL')}
                    />
                </div>
            )}

            {/* Flashcard */}
            {viewMode === 'flashcard' && filteredWords.length > 0 && (
                <div className="w-full max-w-4xl mb-10 z-0">
                    {/* Flashcard Settings Modal */}
                    {showFlashcardSettings && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowFlashcardSettings(false)}>
                            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-black text-slate-900">⚙️ 单词卡设置</h2>
                                    <button onClick={() => setShowFlashcardSettings(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Auto-play TTS */}
                                <div className="mb-5">
                                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100">
                                        <div>
                                            <span className="font-bold text-slate-700 block">🔊 自动播放发音</span>
                                            <span className="text-xs text-slate-400">切换卡片时自动朗读</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={flashcardSettings.autoPlayTTS}
                                            onChange={e => setFlashcardSettings(s => ({ ...s, autoPlayTTS: e.target.checked }))}
                                            className="w-5 h-5 accent-green-500"
                                        />
                                    </label>
                                </div>

                                {/* Card Front */}
                                <div className="mb-5">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">卡片正面显示</h3>
                                    <div className="space-y-2">
                                        <label className={`flex items-center p-4 rounded-xl cursor-pointer ${flashcardSettings.cardFront === 'KOREAN' ? 'bg-green-50 border-2 border-green-300' : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'}`}>
                                            <input
                                                type="radio"
                                                name="card-front"
                                                checked={flashcardSettings.cardFront === 'KOREAN'}
                                                onChange={() => setFlashcardSettings(s => ({ ...s, cardFront: 'KOREAN' }))}
                                                className="mr-3"
                                            />
                                            <div>
                                                <span className="font-bold">🇰🇷 韩语在正面</span>
                                                <span className="text-xs text-slate-400 block">看韩语，猜意思</span>
                                            </div>
                                        </label>
                                        <label className={`flex items-center p-4 rounded-xl cursor-pointer ${flashcardSettings.cardFront === 'MEANING' ? 'bg-green-50 border-2 border-green-300' : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'}`}>
                                            <input
                                                type="radio"
                                                name="card-front"
                                                checked={flashcardSettings.cardFront === 'MEANING'}
                                                onChange={() => setFlashcardSettings(s => ({ ...s, cardFront: 'MEANING' }))}
                                                className="mr-3"
                                            />
                                            <div>
                                                <span className="font-bold">🇨🇳 中文在正面</span>
                                                <span className="text-xs text-slate-400 block">看意思，想韩语</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <button onClick={() => setShowFlashcardSettings(false)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800">
                                    完成
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-[1.5rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden h-[450px] flex flex-col relative perspective-1000">
                        {flashcardComplete ? (
                            /* Completion Card */
                            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-green-50 to-white">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                    <span className="text-4xl">🎉</span>
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 mb-2">学习完成!</h2>
                                <p className="text-slate-500 mb-2">本单元 {filteredWords.length} 个单词已全部浏览</p>
                                <div className="flex gap-2 mb-8">
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                                        ✓ 记住 {masteredIds.size} 个
                                    </span>
                                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                                        ✕ 忘了 {filteredWords.length - masteredIds.size} 个
                                    </span>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => setViewMode('quiz')}
                                        className="px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 transition-all"
                                    >
                                        ⚡️ 进入测试
                                    </button>
                                    {selectedUnitId !== 'ALL' && availableUnits.indexOf(selectedUnitId as number) < availableUnits.length - 1 && (
                                        <button
                                            onClick={() => {
                                                const currentIdx = availableUnits.indexOf(selectedUnitId as number);
                                                if (currentIdx < availableUnits.length - 1) {
                                                    setSelectedUnitId(availableUnits[currentIdx + 1]);
                                                }
                                            }}
                                            className="px-6 py-3 bg-green-500 border-2 border-green-600 text-white font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(22,163,74,1)] hover:-translate-y-1 transition-all"
                                        >
                                            下一单元 →
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setCardIndex(0); setFlashcardComplete(false); setMasteredIds(new Set()); }}
                                    className="mt-4 text-sm text-slate-400 hover:text-slate-600"
                                >
                                    🔄 重新浏览
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Top Right: Unit + Star */}
                                <div className="absolute top-4 right-4 z-20 flex gap-2">
                                    <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-400">Unit {currentCard?.unit}</span>
                                    <button onClick={() => toggleStar(currentCard?.id || '')} className={`w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center ${starredIds.has(currentCard?.id || '') ? 'text-yellow-500' : 'text-slate-300'}`}>
                                        <Star className="w-5 h-5" fill={starredIds.has(currentCard?.id || '') ? 'currentColor' : 'none'} />
                                    </button>
                                </div>

                                {/* Card Content */}
                                <div onClick={flipCard} className="flex-1 relative cursor-pointer">
                                    <div className={`card-content w-full h-full relative transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                        {/* Front */}
                                        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center backface-hidden bg-white">
                                            <h2 className="text-6xl font-black text-slate-900 mb-6">
                                                {flashcardSettings.cardFront === 'KOREAN' ? currentCard?.korean : currentCard?.english}
                                            </h2>
                                            {flashcardSettings.cardFront === 'KOREAN' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); speakWord(currentCard?.korean || ''); }}
                                                    className="mt-2 p-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                                >
                                                    <Volume2 className="w-6 h-6" />
                                                </button>
                                            )}
                                        </div>
                                        {/* Back */}
                                        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center backface-hidden rotate-y-180 bg-green-50/50 p-6 overflow-y-auto">
                                            {/* Show Korean word with speaker if front is meaning */}
                                            {flashcardSettings.cardFront === 'MEANING' && (
                                                <div className="flex items-center gap-3 mb-4">
                                                    <h2 className="text-5xl font-black text-green-600">{currentCard?.korean}</h2>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); speakWord(currentCard?.korean || ''); }}
                                                        className="p-2 rounded-full bg-green-100 hover:bg-green-200 text-green-600 transition-colors"
                                                    >
                                                        <Volume2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* POS Badge */}
                                            {currentCard?.partOfSpeech && (
                                                <div className={`mb-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${currentCard.partOfSpeech === 'VERB_T' ? 'bg-red-100 text-red-700' :
                                                    currentCard.partOfSpeech === 'VERB_I' ? 'bg-orange-100 text-orange-700' :
                                                        currentCard.partOfSpeech === 'ADJ' ? 'bg-purple-100 text-purple-700' :
                                                            currentCard.partOfSpeech === 'NOUN' ? 'bg-blue-100 text-blue-700' :
                                                                currentCard.partOfSpeech === 'ADV' ? 'bg-green-100 text-green-700' :
                                                                    currentCard.partOfSpeech === 'PARTICLE' ? 'bg-gray-100 text-gray-700' :
                                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {currentCard.partOfSpeech === 'VERB_T' ? 'v.t. 他动词' :
                                                        currentCard.partOfSpeech === 'VERB_I' ? 'v.i. 自动词' :
                                                            currentCard.partOfSpeech === 'ADJ' ? 'adj. 形容词' :
                                                                currentCard.partOfSpeech === 'NOUN' ? 'n. 名词' :
                                                                    currentCard.partOfSpeech === 'ADV' ? 'adv. 副词' :
                                                                        currentCard.partOfSpeech === 'PARTICLE' ? '助词' :
                                                                            currentCard.partOfSpeech}
                                                </div>
                                            )}

                                            {/* Main Content */}
                                            {flashcardSettings.cardFront === 'KOREAN' && (
                                                <h3 className="font-bold text-4xl text-slate-900 mb-2">{currentCard?.english}</h3>
                                            )}

                                            {/* Hanja */}
                                            {currentCard?.hanja && (
                                                <p className="text-lg text-slate-500 mb-3">漢字: {currentCard.hanja}</p>
                                            )}

                                            {/* Tips Section (Yellow Background) */}
                                            {currentCard?.tips && (currentCard.tips.synonyms || currentCard.tips.antonyms || currentCard.tips.nuance) && (
                                                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg w-full max-w-md mb-3">
                                                    {currentCard.tips.synonyms && currentCard.tips.synonyms.length > 0 && (
                                                        <p className="text-sm text-yellow-800 mb-1">
                                                            <span className="font-bold">≈</span> {currentCard.tips.synonyms.join(', ')}
                                                        </p>
                                                    )}
                                                    {currentCard.tips.antonyms && currentCard.tips.antonyms.length > 0 && (
                                                        <p className="text-sm text-yellow-800 mb-1">
                                                            <span className="font-bold">≠</span> {currentCard.tips.antonyms.join(', ')}
                                                        </p>
                                                    )}
                                                    {currentCard.tips.nuance && (
                                                        <p className="text-sm text-yellow-700">
                                                            <span className="mr-1">💡</span>{currentCard.tips.nuance}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Example Sentence (Slate Background) */}
                                            {currentCard?.exampleSentence && (
                                                <div className="bg-slate-100 p-3 rounded-lg w-full max-w-md">
                                                    <p className="text-slate-700 text-base">{currentCard.exampleSentence}</p>
                                                    <p className="text-slate-500 text-sm mt-1">{currentCard.exampleTranslation}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Navigation Bar */}
                                <div className="bg-slate-100 border-t-2 border-slate-200 py-3 px-6 flex justify-between items-center text-xs font-bold text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <span>Space 翻转</span>
                                        <button
                                            onClick={() => setShowFlashcardSettings(true)}
                                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button onClick={goToPrev} disabled={cardIndex === 0} className="w-8 h-8 bg-white border border-slate-300 rounded-full hover:border-slate-900 disabled:opacity-30 flex items-center justify-center">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="font-black text-slate-900">{cardIndex + 1} / {filteredWords.length}</span>
                                        <button onClick={goToNext} disabled={cardIndex === filteredWords.length - 1} className="w-8 h-8 bg-white border border-slate-300 rounded-full hover:border-slate-900 disabled:opacity-30 flex items-center justify-center">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2"><span>快捷键支持</span></div>
                                </div>

                                {/* Progress Bar */}
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-200">
                                    <div className="h-full bg-[#4ADE80] transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Action Buttons - SRS (only show when not complete) */}
                    {!flashcardComplete && (
                        <div className="flex justify-center gap-6 mt-6 px-8">
                            <button onClick={handleDontKnow} className="flex-1 max-w-[180px] py-4 bg-red-50 border-2 border-red-500 text-red-600 rounded-2xl font-black text-lg shadow-[4px_4px_0px_0px_rgba(220,38,38,0.5)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(220,38,38,0.5)] active:translate-y-0 active:shadow-none transition-all">
                                ✕ 忘了
                            </button>
                            <button onClick={handleKnow} className="flex-1 max-w-[180px] py-4 bg-green-50 border-2 border-green-500 text-green-600 rounded-2xl font-black text-lg shadow-[4px_4px_0px_0px_rgba(34,197,94,0.5)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(34,197,94,0.5)] active:translate-y-0 active:shadow-none transition-all">
                                ✓ 记住
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Quick Learn List Mode (速记) */}
            {viewMode === 'list' && filteredWords.length > 0 && (
                <div className="w-full max-w-4xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-black text-slate-900">
                            速记 <span className="text-slate-400 text-lg font-normal ml-2">({filteredWords.length})</span>
                        </h3>
                        <div className="flex items-center gap-2">
                            {/* Red Sheet Toggle */}
                            <button
                                onClick={() => setRedSheetActive(!redSheetActive)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-bold text-sm transition-all ${redSheetActive
                                    ? 'bg-red-50 border-red-400 text-red-600'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                                    }`}
                            >
                                {redSheetActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                红膜
                            </button>
                            {/* Audio Loop */}
                            <button
                                onClick={playAudioLoop}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-bold text-sm transition-all ${isAudioLooping
                                    ? 'bg-green-50 border-green-400 text-green-600 animate-pulse'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                                    }`}
                            >
                                {isAudioLooping ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                {isAudioLooping ? '停止' : '连播'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredWords.map((word) => {
                            const isRevealed = masteredIds.has(word.id);

                            // Replace Korean word in example sentence with masked version
                            const maskedSentence = word.exampleSentence?.replace(
                                word.korean,
                                isRevealed ? word.korean : '█'.repeat(word.korean.length)
                            ) || '';

                            const handleReveal = () => {
                                if (!isRevealed) {
                                    setMasteredIds(prev => new Set([...prev, word.id]));
                                    // TTS: speak word first, then sentence
                                    speakWord(word.korean);
                                    setTimeout(() => {
                                        speakWord(word.exampleSentence || '');
                                    }, 800);
                                }
                            };

                            return (
                                <div
                                    key={word.id}
                                    onClick={handleReveal}
                                    className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all ${isRevealed
                                        ? 'border-green-300 bg-green-50/50'
                                        : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3 md:gap-4">
                                        <div className="flex-1">
                                            {/* Word + Meaning Row */}
                                            <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-3 md:gap-3">
                                                <span className={`text-2xl font-black transition-all ${isRevealed ? 'text-green-600' : 'text-slate-900'
                                                    }`}>
                                                    {word.korean}
                                                </span>
                                                {/* Meaning with red sheet support */}
                                                <span className={`text-slate-500 text-lg transition-all ${redSheetActive && !isRevealed
                                                    ? 'blur-sm hover:blur-none select-none'
                                                    : ''
                                                    }`}>
                                                    {word.english}
                                                </span>
                                                {word.partOfSpeech && isRevealed && (
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${word.partOfSpeech === 'VERB_T' ? 'bg-red-100 text-red-700' :
                                                        word.partOfSpeech === 'VERB_I' ? 'bg-orange-100 text-orange-700' :
                                                            word.partOfSpeech === 'ADJ' ? 'bg-purple-100 text-purple-700' :
                                                                word.partOfSpeech === 'NOUN' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {word.partOfSpeech === 'VERB_T' ? 'v.t.' :
                                                            word.partOfSpeech === 'VERB_I' ? 'v.i.' :
                                                                word.partOfSpeech === 'ADJ' ? 'adj.' :
                                                                    word.partOfSpeech === 'NOUN' ? 'n.' :
                                                                        word.partOfSpeech}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Example Sentence with Masked Word */}
                                            <div className={`p-3 rounded-xl transition-all ${isRevealed ? 'bg-slate-100' : 'bg-slate-50'
                                                }`}>
                                                <p className={`text-lg leading-relaxed ${isRevealed ? 'text-slate-800' : 'text-slate-600'
                                                    }`}>
                                                    {maskedSentence || '例句待添加'}
                                                </p>
                                                {isRevealed && word.exampleTranslation && (
                                                    <p className="text-sm text-slate-500 mt-1">{word.exampleTranslation}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status Indicator */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${isRevealed
                                            ? 'bg-green-500 text-white'
                                            : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            {isRevealed ? '✓' : '?'}
                                        </div>
                                    </div>

                                    {/* Hint */}
                                    {!isRevealed && (
                                        <p className="text-xs text-slate-400 mt-3 text-center">点击揭示答案并播放发音</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quiz Mode */}
            {viewMode === 'quiz' && filteredWords.length > 0 && (
                <div className="w-full max-w-4xl">
                    <VocabQuiz
                        key={`quiz-${selectedUnitId}-${gameWords.length}`}
                        words={gameWords}
                        onComplete={(stats) => console.log('Quiz completed:', stats)}
                        hasNextUnit={selectedUnitId !== 'ALL' && availableUnits.indexOf(selectedUnitId as number) < availableUnits.length - 1}
                        onNextUnit={() => {
                            if (selectedUnitId !== 'ALL') {
                                const currentIdx = availableUnits.indexOf(selectedUnitId as number);
                                if (currentIdx < availableUnits.length - 1) {
                                    setSelectedUnitId(availableUnits[currentIdx + 1]);
                                }
                            }
                        }}
                        currentUnitLabel={selectedUnitId === 'ALL' ? '全册' : `Unit ${selectedUnitId}`}
                        userId={user?.id}
                    />
                </div>
            )}

            {/* Match Mode */}
            {viewMode === 'match' && filteredWords.length > 0 && (
                <div className="w-full max-w-4xl">
                    <VocabMatch
                        key={`match-${selectedUnitId}-${gameWords.length}`}
                        words={gameWords}
                        onComplete={(time, moves) => console.log('Match completed:', time, moves)}
                    />
                </div>
            )}

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
        </div>
    );
}
