import React from 'react';
import { createPortal } from 'react-dom';
import { Settings, X } from 'lucide-react';
import { ExtendedVocabularyItem } from '../types';
import { Language } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import FlashcardSettingsModal from './FlashcardSettingsModal';

interface FlashcardFullscreenOverlayProps {
    words: ExtendedVocabularyItem[];
    cardIndex: number;
    sessionStats: {
        correct: ExtendedVocabularyItem[];
        incorrect: ExtendedVocabularyItem[];
    };
    language: Language;
    showSettings: boolean;
    fullscreenMenuOpen: boolean;
    localSettings: {
        autoTTS: boolean;
        cardFront: 'KOREAN' | 'NATIVE';
        ratingMode: 'PASS_FAIL' | 'FOUR_BUTTONS';
    };
    flashcard: React.ReactNode;
    toolbar: React.ReactNode;
    onSetShowSettings: (show: boolean) => void;
    onSetFullscreenMenuOpen: (open: boolean) => void;
    onToggleFullscreen: () => void;
    onRequestNavigate?: (target: 'flashcard' | 'learn' | 'test' | 'match') => void;
    onUpdateSettings: (settings: any) => void;
}

const FlashcardFullscreenOverlay: React.FC<FlashcardFullscreenOverlayProps> = ({
    words,
    cardIndex,
    sessionStats,
    language,
    showSettings,
    fullscreenMenuOpen,
    localSettings,
    flashcard,
    toolbar,
    onSetShowSettings,
    onSetFullscreenMenuOpen,
    onToggleFullscreen,
    onRequestNavigate,
    onUpdateSettings,
}) => {
    const labels = getLabels(language);

    const content = (
        <div className="fixed inset-0 z-[95] bg-white flex flex-col">
            <FlashcardSettingsModal
                isOpen={showSettings}
                onClose={() => onSetShowSettings(false)}
                settings={localSettings}
                onUpdate={onUpdateSettings}
                labels={labels}
            />

            {/* Top Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="relative" data-flashcard-fullscreen-menu>
                        <button
                            type="button"
                            onClick={() => onSetFullscreenMenuOpen(!fullscreenMenuOpen)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 font-bold text-slate-700"
                        >
                            📘 {language === 'zh' ? '单词卡' : labels.flashcards || 'Flashcards'}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </button>

                        {fullscreenMenuOpen && (
                            <div className="absolute left-0 top-full mt-2 w-44 bg-white border-2 border-slate-200 rounded-xl shadow-lg overflow-hidden z-[96]">
                                {[
                                    {
                                        id: 'flashcard' as const,
                                        label: language === 'zh' ? '单词卡' : labels.flashcards || 'Flashcards',
                                    },
                                    {
                                        id: 'learn' as const,
                                        label: language === 'zh' ? '学习模式' : labels.learn || 'Learn',
                                    },
                                    {
                                        id: 'test' as const,
                                        label: language === 'zh' ? '测试模式' : labels.vocab?.quiz || 'Test',
                                    },
                                    { id: 'match' as const, label: language === 'zh' ? '配对' : 'Match' },
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            onSetFullscreenMenuOpen(false);
                                            onToggleFullscreen();
                                            onRequestNavigate?.(item.id);
                                        }}
                                        className="w-full text-left px-3 py-2 font-black text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-center">
                    <div className="font-bold text-slate-800">
                        {cardIndex + 1} / {words.length}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onSetShowSettings(true)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onToggleFullscreen}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Progress Counters */}
            <div className="flex items-center justify-between px-6 py-3">
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 text-orange-600 font-bold text-sm">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    {sessionStats.incorrect.length} {labels.stillLearning || '仍在学'}
                </span>
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-600 font-bold text-sm">
                    {language === 'zh' ? '本次记住' : 'Remembered'} {sessionStats.correct.length}
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                </span>
            </div>

            {/* Card */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
                {flashcard}
            </div>

            {/* Keyboard Hint */}
            <div className="text-center py-2 bg-indigo-50 text-indigo-600 text-sm font-medium">
                ⌨️ {labels.keyboardHint || '快捷键'}: 按{' '}
                <kbd className="px-2 py-0.5 bg-white rounded border border-indigo-200 mx-1">空格键</kbd>{' '}
                或单击卡片以翻页
            </div>

            {/* Bottom Toolbar */}
            <div className="px-6 py-4 border-t border-slate-100">
                {toolbar}
            </div>
        </div>
    );

    if (typeof document === 'undefined') return content;
    return createPortal(content, document.body);
};

export default FlashcardFullscreenOverlay;
