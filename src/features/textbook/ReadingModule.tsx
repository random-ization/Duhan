import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    ArrowLeft,
    Settings,
    Volume2,
    Plus,
    Languages,
    PenLine,
    Highlighter,
    BookOpen,
    MessageSquare,
    Sparkles,
    Send,
    X,
    ChevronDown
} from 'lucide-react';

// =========================================
// Types
// =========================================
interface SavedWord {
    id: string;
    word: string;
    meaning: string;
    timestamp: number;
}

interface Note {
    id: string;
    text: string;
    comment: string;
    color: 'yellow' | 'green' | 'pink';
    startOffset: number;
    endOffset: number;
    timestamp: number;
}

interface Highlight {
    id: string;
    text: string;
    color: 'yellow' | 'green' | 'pink';
    startOffset: number;
    endOffset: number;
}

interface Article {
    id: string;
    title: string;
    content: string;
}

// =========================================
// Mock Data
// =========================================
const MOCK_ARTICLES: Article[] = [
    {
        id: '1',
        title: '자기 소개',
        content: `안녕하세요. 저는 김민수입니다. 저는 한국 사람입니다. 서울에서 왔습니다.

저는 대학생입니다. 서울대학교에서 컴퓨터 공학을 공부합니다. 올해 스물두 살입니다.

취미는 음악 듣기와 영화 보기입니다. 특히 한국 영화를 좋아합니다. 주말에는 친구들과 카페에서 만납니다.

한국어를 배우는 것은 재미있습니다. 매일 열심히 공부합니다. 감사합니다.`
    },
    {
        id: '2',
        title: '나의 하루',
        content: `저는 매일 아침 7시에 일어납니다. 먼저 세수를 하고 아침을 먹습니다.

8시에 학교에 갑니다. 버스로 30분 정도 걸립니다. 오전에는 수업을 듣습니다.

점심은 학교 식당에서 먹습니다. 오후에는 도서관에서 공부합니다.

저녁에는 집에서 가족과 함께 밥을 먹습니다. 밤에는 텔레비전을 보거나 책을 읽습니다. 보통 11시에 잡니다.`
    }
];

const MOCK_VOCAB: Record<string, string> = {
    '안녕하세요': '你好',
    '저는': '我是',
    '한국': '韩国',
    '사람': '人',
    '서울': '首尔',
    '대학생': '大学生',
    '공부합니다': '学习',
    '취미': '爱好',
    '음악': '音乐',
    '영화': '电影',
    '좋아합니다': '喜欢',
    '주말': '周末',
    '친구': '朋友',
    '카페': '咖啡厅',
    '재미있습니다': '有趣',
    '매일': '每天',
    '열심히': '努力地',
    '감사합니다': '谢谢',
    '아침': '早上',
    '일어납니다': '起床',
    '학교': '学校',
    '버스': '公交车',
    '수업': '课',
    '점심': '午餐',
    '식당': '食堂',
    '도서관': '图书馆',
    '저녁': '晚上',
    '가족': '家人',
    '밥': '饭',
    '책': '书',
    '잡니다': '睡觉'
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

// Selection Toolbar
interface SelectionToolbarProps {
    position: { x: number; y: number };
    onTranslate: () => void;
    onSpeak: () => void;
    onNote: () => void;
    onHighlight: (color: 'yellow' | 'green' | 'pink') => void;
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
    position, onTranslate, onSpeak, onNote, onHighlight
}) => {
    const [showColors, setShowColors] = useState(false);

    return (
        <div
            className="fixed z-50 bg-zinc-900 text-white rounded-lg shadow-lg flex items-center gap-1 p-1"
            style={{ left: position.x, top: position.y }}
        >
            <button
                onClick={onTranslate}
                className="flex items-center gap-1 px-3 py-2 rounded hover:bg-zinc-700 text-xs font-bold transition-colors"
            >
                <Languages className="w-3 h-3" />
                翻译
            </button>
            <button
                onClick={onSpeak}
                className="flex items-center gap-1 px-3 py-2 rounded hover:bg-zinc-700 text-xs font-bold transition-colors"
            >
                <Volume2 className="w-3 h-3" />
                朗读
            </button>
            <button
                onClick={onNote}
                className="flex items-center gap-1 px-3 py-2 rounded hover:bg-zinc-700 text-xs font-bold transition-colors"
            >
                <PenLine className="w-3 h-3" />
                笔记
            </button>
            <div className="relative">
                <button
                    onClick={() => setShowColors(!showColors)}
                    className="flex items-center gap-1 px-3 py-2 rounded hover:bg-zinc-700 text-xs font-bold transition-colors"
                >
                    <Highlighter className="w-3 h-3" />
                    高亮
                </button>
                {showColors && (
                    <div className="absolute top-full left-0 mt-1 bg-zinc-800 rounded-lg p-2 flex gap-2">
                        <button
                            onClick={() => { onHighlight('yellow'); setShowColors(false); }}
                            className="w-5 h-5 bg-yellow-300 rounded-full border-2 border-white hover:scale-110 transition-transform"
                        />
                        <button
                            onClick={() => { onHighlight('green'); setShowColors(false); }}
                            className="w-5 h-5 bg-green-300 rounded-full border-2 border-white hover:scale-110 transition-transform"
                        />
                        <button
                            onClick={() => { onHighlight('pink'); setShowColors(false); }}
                            className="w-5 h-5 bg-pink-300 rounded-full border-2 border-white hover:scale-110 transition-transform"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// Note Input Modal
interface NoteInputModalProps {
    selectedText: string;
    onSave: (comment: string, color: 'yellow' | 'green' | 'pink') => void;
    onClose: () => void;
}

const NoteInputModal: React.FC<NoteInputModalProps> = ({ selectedText, onSave, onClose }) => {
    const [comment, setComment] = useState('');
    const [color, setColor] = useState<'yellow' | 'green' | 'pink'>('yellow');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#FDFBF7] border-2 border-zinc-900 rounded-xl shadow-[8px_8px_0px_0px_#18181B] p-6 w-96">
                <h3 className="font-black text-lg mb-4">添加笔记</h3>

                <div className="bg-zinc-100 border-2 border-zinc-300 rounded-lg p-3 mb-4">
                    <p className="text-sm text-zinc-600 font-bold">选中文本：</p>
                    <p className="text-zinc-900 font-bold">{selectedText}</p>
                </div>

                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="写下你的笔记..."
                    className="w-full h-24 px-3 py-2 border-2 border-zinc-900 rounded-lg font-bold text-sm focus:shadow-[2px_2px_0px_0px_#18181B] outline-none resize-none mb-4"
                />

                <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm font-bold text-zinc-600">颜色：</span>
                    <div className="flex gap-2">
                        {(['yellow', 'green', 'pink'] as const).map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-zinc-900 scale-110' : 'border-zinc-400'
                                    } ${c === 'yellow' ? 'bg-yellow-300' : c === 'green' ? 'bg-green-300' : 'bg-pink-300'} transition-all`}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-white border-2 border-zinc-900 rounded-lg font-bold hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#18181B] transition-all"
                    >
                        取消
                    </button>
                    <button
                        onClick={() => onSave(comment, color)}
                        disabled={!comment.trim()}
                        className="flex-1 px-4 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold hover:bg-lime-400 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#18181B] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        保存
                    </button>
                </div>
            </div>
        </div>
    );
};

// Settings Panel
interface SettingsPanelProps {
    fontSize: number;
    isSerif: boolean;
    onFontSizeChange: (size: number) => void;
    onSerifToggle: () => void;
    onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    fontSize, isSerif, onFontSizeChange, onSerifToggle, onClose
}) => {
    return (
        <div className="absolute right-0 top-full mt-2 bg-[#FDFBF7] border-2 border-zinc-900 rounded-lg shadow-[4px_4px_0px_0px_#18181B] p-4 w-56 z-50">
            <h4 className="font-black text-sm mb-3">阅读设置</h4>

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
                <span className="text-xs font-bold text-zinc-600">衬线字体</span>
                <button
                    onClick={onSerifToggle}
                    className={`w-12 h-6 rounded-full border-2 border-zinc-900 relative transition-colors ${isSerif ? 'bg-lime-300' : 'bg-zinc-200'}`}
                >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full border border-zinc-900 transition-all ${isSerif ? 'left-6' : 'left-0.5'}`} />
                </button>
            </div>
        </div>
    );
};

// =========================================
// Main Component
// =========================================
interface ReadingModuleProps {
    unitTitle?: string;
    onBack?: () => void;
}

const ReadingModule: React.FC<ReadingModuleProps> = ({
    unitTitle = '第1单元: 自我介绍',
    onBack
}) => {
    // State
    const [activeArticle, setActiveArticle] = useState(0);
    const [fontSize, setFontSize] = useState(18);
    const [isSerif, setIsSerif] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const [savedWords, setSavedWords] = useState<SavedWord[]>([
        { id: '1', word: '안녕하세요', meaning: '你好', timestamp: Date.now() - 3600000 },
        { id: '2', word: '감사합니다', meaning: '谢谢', timestamp: Date.now() - 1800000 }
    ]);
    const [notes, setNotes] = useState<Note[]>([
        { id: '1', text: '저는 대학생입니다', comment: '这是"我是大学生"的意思，저는表示"我"', color: 'yellow', startOffset: 50, endOffset: 62, timestamp: Date.now() - 7200000 }
    ]);
    const [highlights, setHighlights] = useState<Highlight[]>([
        { id: '1', text: '컴퓨터 공학', color: 'green', startOffset: 85, endOffset: 92 }
    ]);

    // Selection & Popover state
    const [selectedWord, setSelectedWord] = useState<{ word: string; meaning: string; position: { x: number; y: number } } | null>(null);
    const [selectionToolbar, setSelectionToolbar] = useState<{ text: string; position: { x: number; y: number }; range: Range } | null>(null);
    const [noteModal, setNoteModal] = useState<{ text: string; startOffset: number; endOffset: number } | null>(null);

    // Right panel tab
    const [activeTab, setActiveTab] = useState<'notes' | 'vocab' | 'ai'>('notes');
    const [aiInput, setAiInput] = useState('');
    const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
        { role: 'ai', content: '你好！我是你的AI助教。有什么语法问题想问我吗？' }
    ]);

    const readerRef = useRef<HTMLDivElement>(null);

    // Handle word click
    const handleWordClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.dataset.word) {
            const word = target.dataset.word;
            const meaning = MOCK_VOCAB[word] || '暂无释义';
            const rect = target.getBoundingClientRect();
            setSelectedWord({
                word,
                meaning,
                position: { x: rect.left, y: rect.bottom + 8 }
            });
            setSelectionToolbar(null);
        }
    }, []);

    // Handle text selection
    const handleMouseUp = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0 && !selectedWord) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setSelectionToolbar({
                text: selection.toString(),
                position: { x: rect.left + rect.width / 2 - 100, y: rect.top - 50 },
                range: range.cloneRange()
            });
        }
    }, [selectedWord]);

    // Close popovers on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (selectedWord || selectionToolbar) {
                const target = e.target as HTMLElement;
                if (!target.closest('[data-popover]') && !target.dataset.word) {
                    setSelectedWord(null);
                    setSelectionToolbar(null);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedWord, selectionToolbar]);

    // TTS function
    const speak = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        speechSynthesis.speak(utterance);
    };

    // Save word to vocab
    const saveWordToVocab = (word: string, meaning: string) => {
        if (!savedWords.find(w => w.word === word)) {
            setSavedWords(prev => [...prev, { id: Date.now().toString(), word, meaning, timestamp: Date.now() }]);
        }
        setSelectedWord(null);
    };

    // Add highlight
    const addHighlight = (color: 'yellow' | 'green' | 'pink') => {
        if (selectionToolbar) {
            setHighlights(prev => [...prev, {
                id: Date.now().toString(),
                text: selectionToolbar.text,
                color,
                startOffset: 0,
                endOffset: 0
            }]);
            setSelectionToolbar(null);
            window.getSelection()?.removeAllRanges();
        }
    };

    // Save note
    const saveNote = (comment: string, color: 'yellow' | 'green' | 'pink') => {
        if (noteModal) {
            setNotes(prev => [...prev, {
                id: Date.now().toString(),
                text: noteModal.text,
                comment,
                color,
                startOffset: noteModal.startOffset,
                endOffset: noteModal.endOffset,
                timestamp: Date.now()
            }]);
            setNoteModal(null);
        }
    };

    // Render content with clickable words
    const renderContent = (content: string) => {
        // Split by spaces and newlines while preserving them
        const parts = content.split(/(\s+)/);

        return parts.map((part, i) => {
            if (/^\s+$/.test(part)) {
                // Preserve whitespace/newlines
                return part.includes('\n') ? <br key={i} /> : <span key={i}> </span>;
            }

            // Check if this word is highlighted or has a note
            const hasHighlight = highlights.find(h => h.text.includes(part));
            const hasNote = notes.find(n => n.text.includes(part));

            let className = 'cursor-pointer hover:bg-yellow-100 rounded px-0.5 transition-colors';
            if (hasHighlight) {
                className += ` bg-${hasHighlight.color}-200`;
            }
            if (hasNote) {
                className += ' underline decoration-wavy decoration-amber-500';
            }

            return (
                <span
                    key={i}
                    data-word={part}
                    className={className}
                    style={{
                        backgroundColor: hasHighlight ?
                            (hasHighlight.color === 'yellow' ? '#FEF08A' : hasHighlight.color === 'green' ? '#BBF7D0' : '#FBCFE8')
                            : undefined
                    }}
                >
                    {part}
                </span>
            );
        });
    };

    // Send AI message
    const sendAiMessage = () => {
        if (!aiInput.trim()) return;
        setAiMessages(prev => [...prev, { role: 'user', content: aiInput }]);
        // Mock AI response
        setTimeout(() => {
            setAiMessages(prev => [...prev, {
                role: 'ai',
                content: `关于"${aiInput}"的解释：这是一个很好的问题！在韩语中，这个语法点用于表示...（AI回复示例）`
            }]);
        }, 500);
        setAiInput('');
    };

    return (
        <div
            className="h-[calc(100vh-48px)] flex flex-col"
            style={{
                backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                backgroundColor: '#f4f4f5'
            }}
        >
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
                    <h1 className="font-black text-lg">{unitTitle}</h1>
                </div>

                {/* Center: Article Tabs */}
                <div className="flex gap-2">
                    {MOCK_ARTICLES.map((article, i) => (
                        <button
                            key={article.id}
                            onClick={() => setActiveArticle(i)}
                            className={`px-4 py-2 border-2 border-zinc-900 rounded-lg font-bold text-sm transition-all ${activeArticle === i
                                    ? 'bg-zinc-900 text-white'
                                    : 'bg-white hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_#18181B] active:shadow-none'
                                }`}
                        >
                            文章 {i + 1}
                        </button>
                    ))}
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
                            isSerif={isSerif}
                            onFontSizeChange={setFontSize}
                            onSerifToggle={() => setIsSerif(!isSerif)}
                            onClose={() => setShowSettings(false)}
                        />
                    )}
                </div>
            </header>

            {/* Main Content: Split Screen */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Reader Panel (65%) */}
                <div className="w-[65%] border-r-2 border-zinc-900 overflow-y-auto p-8">
                    <div
                        ref={readerRef}
                        onClick={handleWordClick}
                        onMouseUp={handleMouseUp}
                        className={`bg-[#FDFBF7] border-2 border-zinc-900 rounded-xl shadow-[6px_6px_0px_0px_#18181B] p-8 max-w-2xl mx-auto ${isSerif ? 'font-serif' : 'font-sans'}`}
                        style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                    >
                        <h2 className="text-2xl font-black mb-6 text-zinc-900">
                            {MOCK_ARTICLES[activeArticle].title}
                        </h2>
                        <div className="text-zinc-800 leading-loose">
                            {renderContent(MOCK_ARTICLES[activeArticle].content)}
                        </div>
                    </div>
                </div>

                {/* Right: Study Hub (35%) */}
                <div className="w-[35%] bg-[#FDFBF7] flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b-2 border-zinc-900 shrink-0">
                        {[
                            { key: 'notes', label: '学习笔记', icon: PenLine },
                            { key: 'vocab', label: '生词本', icon: BookOpen },
                            { key: 'ai', label: 'AI 助教', icon: Sparkles }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 font-bold text-sm border-r-2 border-zinc-900 last:border-r-0 transition-colors ${activeTab === tab.key ? 'bg-lime-300' : 'bg-white hover:bg-zinc-100'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'notes' && (
                            <div className="space-y-3">
                                {notes.length === 0 ? (
                                    <div className="text-center text-zinc-400 py-8">
                                        <PenLine className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="font-bold">暂无笔记</p>
                                        <p className="text-xs">选中文本添加笔记</p>
                                    </div>
                                ) : (
                                    notes.map(note => (
                                        <div
                                            key={note.id}
                                            className="bg-white border-2 border-zinc-900 rounded-lg p-3 cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[3px_3px_0px_0px_#18181B] transition-all"
                                            style={{ borderLeftColor: note.color === 'yellow' ? '#FDE047' : note.color === 'green' ? '#86EFAC' : '#F9A8D4', borderLeftWidth: 4 }}
                                        >
                                            <p className="font-bold text-sm text-zinc-900 mb-1 underline decoration-wavy decoration-amber-500">{note.text}</p>
                                            <p className="text-xs text-zinc-600">{note.comment}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'vocab' && (
                            <div className="space-y-2">
                                {savedWords.length === 0 ? (
                                    <div className="text-center text-zinc-400 py-8">
                                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="font-bold">暂无生词</p>
                                        <p className="text-xs">点击单词添加到生词本</p>
                                    </div>
                                ) : (
                                    savedWords.map(word => (
                                        <div
                                            key={word.id}
                                            className="flex items-center justify-between bg-white border-2 border-zinc-900 rounded-lg p-3 shadow-[2px_2px_0px_0px_#18181B]"
                                        >
                                            <div>
                                                <span className="font-bold text-zinc-900">{word.word}</span>
                                                <span className="text-sm text-zinc-500 ml-2">{word.meaning}</span>
                                            </div>
                                            <button
                                                onClick={() => speak(word.word)}
                                                className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center hover:bg-zinc-200 transition-colors"
                                            >
                                                <Volume2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
                                    {aiMessages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`p-3 rounded-lg border-2 border-zinc-900 ${msg.role === 'user'
                                                    ? 'bg-lime-100 ml-8'
                                                    : 'bg-white mr-8'
                                                }`}
                                        >
                                            <p className="text-sm">{msg.content}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <input
                                        type="text"
                                        value={aiInput}
                                        onChange={(e) => setAiInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendAiMessage()}
                                        placeholder="问我语法问题..."
                                        className="flex-1 px-4 py-2 border-2 border-zinc-900 rounded-lg font-bold text-sm focus:shadow-[2px_2px_0px_0px_#18181B] outline-none"
                                    />
                                    <button
                                        onClick={sendAiMessage}
                                        className="px-4 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold hover:bg-lime-400 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_#18181B] active:shadow-none transition-all"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Popovers */}
            {selectedWord && (
                <div data-popover>
                    <FlashcardPopover
                        word={selectedWord.word}
                        meaning={selectedWord.meaning}
                        position={selectedWord.position}
                        onClose={() => setSelectedWord(null)}
                        onSave={() => saveWordToVocab(selectedWord.word, selectedWord.meaning)}
                        onSpeak={() => speak(selectedWord.word)}
                    />
                </div>
            )}

            {selectionToolbar && (
                <div data-popover>
                    <SelectionToolbar
                        position={selectionToolbar.position}
                        onTranslate={() => {
                            // Mock translation
                            alert(`翻译：${selectionToolbar.text}`);
                            setSelectionToolbar(null);
                        }}
                        onSpeak={() => {
                            speak(selectionToolbar.text);
                            setSelectionToolbar(null);
                        }}
                        onNote={() => {
                            setNoteModal({
                                text: selectionToolbar.text,
                                startOffset: 0,
                                endOffset: 0
                            });
                            setSelectionToolbar(null);
                        }}
                        onHighlight={addHighlight}
                    />
                </div>
            )}

            {noteModal && (
                <NoteInputModal
                    selectedText={noteModal.text}
                    onSave={saveNote}
                    onClose={() => setNoteModal(null)}
                />
            )}
        </div>
    );
};

export default ReadingModule;
