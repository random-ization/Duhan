import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, X } from 'lucide-react';
import { useKoreanTyping } from '../../features/typing/hooks/useKoreanTyping';
import { HiddenInput } from '../../features/typing/components/HiddenInput';
import { TypingArea } from '../../features/typing/components/TypingArea';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { PRACTICE_CATEGORIES, PracticeCategory } from '../../features/typing/data/practiceTexts';

export const MobileTypingPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'finished'>('lobby');
  const [selectedCategory, setSelectedCategory] = useState<PracticeCategory | null>(null);
  const [targetText, setTargetText] = useState('');
  const [sentenceIndex, setSentenceIndex] = useState(0);

  const { userInput, stats, inputRef, reset, checkInput } = useKoreanTyping(targetText, 'sentence');
  const wpm = stats?.wpm ?? 0;
  const accuracy = stats?.accuracy ?? 100;

  // Focus management for mobile
  const ensureFocus = () => {
    inputRef.current?.focus();
  };

  const startGame = (category: PracticeCategory) => {
    setSelectedCategory(category);
    setSentenceIndex(0);
    setTargetText(category.sentences[0] || '');
    setGameState('playing');
    reset();
    setTimeout(ensureFocus, 100);
  };

  const nextSentence = () => {
    if (!selectedCategory) return;
    const len = selectedCategory.sentences.length;
    if (len === 0) return;
    const nextIdx = (sentenceIndex + 1) % len;
    setSentenceIndex(nextIdx);
    setTargetText(selectedCategory.sentences[nextIdx] || '');
    reset();
    setTimeout(ensureFocus, 100);
  };

  if (gameState === 'lobby') {
    return (
      <div className="min-h-[100dvh] bg-slate-50 p-6 flex flex-col">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-slate-900" />
          </button>
          <h1 className="text-2xl font-black text-slate-900">{t('typingGame.title')}</h1>
        </div>

        <div className="space-y-4">
          {PRACTICE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => startGame(cat)}
              className="w-full text-left bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:shadow-indigo-100 active:scale-[0.98] transition-all"
            >
              <h3 className="font-black text-lg text-slate-800 mb-1">{cat.title}</h3>
              <p className="text-slate-500 font-medium text-sm">{cat.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Playing State
  return (
    <div
      className="h-[100dvh] bg-slate-50 flex flex-col outline-none"
      onClick={ensureFocus}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          ensureFocus();
        }
      }}
    >
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100">
        <button onClick={() => setGameState('lobby')} className="p-2 -ml-2">
          <X className="w-6 h-6 text-slate-400" />
        </button>
        <div className="flex gap-4 font-mono font-bold text-sm">
          <div className="text-slate-900">
            {t('typingGame.wpm')}: <span className="text-indigo-600">{wpm}</span>
          </div>
          <div className="text-slate-900">
            {t('typingGame.acc')}: <span className="text-green-600">{accuracy}%</span>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col justify-center px-4 pb-[40vh]">
        {' '}
        {/* Padding bottom to avoid keyboard */}
        <div
          className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm mb-6 outline-none focus:ring-2 focus:ring-indigo-100"
          onClick={e => {
            e.stopPropagation();
            ensureFocus();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              ensureFocus();
            }
          }}
        >
          <TypingArea
            text={targetText}
            userInput={userInput}
            currIndex={userInput.length}
            checkInput={checkInput}
            onClick={ensureFocus}
            focused={true}
            className="text-xl leading-relaxed break-keep"
          />
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={e => {
              e.stopPropagation();
              nextSentence();
            }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
          >
            <RefreshCw className="w-4 h-4" />
            {t('typingGame.nextSentence')}
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              ensureFocus();
            }}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-100 text-indigo-700 rounded-xl font-bold active:scale-95 transition-transform"
          >
            {t('typingGame.focusInput')}
          </button>
        </div>
      </div>

      <HiddenInput ref={inputRef} />
    </div>
  );
};
