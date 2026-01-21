import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  Volume2,
  CheckCircle,
  XCircle,
  Undo2,
  Shuffle,
  Settings,
  Maximize2,
  X,
  Minimize2,
} from 'lucide-react';
import { ExtendedVocabularyItem, VocabSettings } from '../types';
import { Language } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import { getLocalizedContent } from '../../../utils/languageUtils';
import { speak } from '../utils';

interface FlashcardViewProps {
  words: ExtendedVocabularyItem[];
  settings: VocabSettings;
  language: Language;
  onComplete: (stats: {
    correct: ExtendedVocabularyItem[];
    incorrect: ExtendedVocabularyItem[];
  }) => void;
  onSaveWord?: (word: ExtendedVocabularyItem) => void;
  courseId?: string;
}

// Settings Modal Component
const FlashcardSettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  settings: {
    autoTTS: boolean;
    cardFront: 'KOREAN' | 'NATIVE';
    ratingMode: 'PASS_FAIL' | 'FOUR_BUTTONS';
  };
  onUpdate: (settings: {
    autoTTS: boolean;
    cardFront: 'KOREAN' | 'NATIVE';
    ratingMode: 'PASS_FAIL' | 'FOUR_BUTTONS';
  }) => void;
  labels: ReturnType<typeof getLabels>;
}> = ({ isOpen, onClose, settings, onUpdate, labels }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-900">⚙️ {labels.settings}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto TTS */}
        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 mb-3">
          <div>
            <span className="font-bold text-slate-700 block">🔊 {labels.autoTTS}</span>
          </div>
          <input
            type="checkbox"
            checked={settings.autoTTS}
            onChange={e => onUpdate({ ...settings, autoTTS: e.target.checked })}
            className="w-5 h-5 accent-indigo-500"
          />
        </label>

        {/* Card Front */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {labels.cardFront}
          </label>
          <div className="space-y-2">
            <label
              className={`flex items-center p-3 rounded-xl cursor-pointer ${
                settings.cardFront === 'KOREAN'
                  ? 'bg-indigo-50 border-2 border-indigo-300'
                  : 'bg-slate-50 border-2 border-transparent'
              }`}
            >
              <input
                type="radio"
                checked={settings.cardFront === 'KOREAN'}
                onChange={() => onUpdate({ ...settings, cardFront: 'KOREAN' })}
                className="mr-3"
              />
              <span className="font-medium">🇰🇷 {labels.koreanFront}</span>
            </label>
            <label
              className={`flex items-center p-3 rounded-xl cursor-pointer ${
                settings.cardFront === 'NATIVE'
                  ? 'bg-indigo-50 border-2 border-indigo-300'
                  : 'bg-slate-50 border-2 border-transparent'
              }`}
            >
              <input
                type="radio"
                checked={settings.cardFront === 'NATIVE'}
                onChange={() => onUpdate({ ...settings, cardFront: 'NATIVE' })}
                className="mr-3"
              />
              <span className="font-medium">🇨🇳 {labels.nativeFront}</span>
            </label>
          </div>
        </div>

        {/* Rating Mode */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {labels.ratingMode || '评分模式'}
          </label>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => onUpdate({ ...settings, ratingMode: 'PASS_FAIL' })}
              className={`flex-1 px-3 py-2 text-sm font-bold rounded-md transition-all ${
                settings.ratingMode === 'PASS_FAIL'
                  ? 'bg-white shadow text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ✓/✗ {labels.passFail || '对/错'}
            </button>
            <button
              onClick={() => onUpdate({ ...settings, ratingMode: 'FOUR_BUTTONS' })}
              className={`flex-1 px-3 py-2 text-sm font-bold rounded-md transition-all ${
                settings.ratingMode === 'FOUR_BUTTONS'
                  ? 'bg-white shadow text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              🎚️ {labels.fourButtons || '4级'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {settings.ratingMode === 'PASS_FAIL'
              ? labels.passFailDesc || '简单模式：对或错'
              : labels.fourButtonsDesc || '详细模式：忘记/困难/正常/轻松'}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800"
        >
          {labels.done || '完成'}
        </button>
      </div>
    </div>
  );
};

const FlashcardView: React.FC<FlashcardViewProps> = React.memo(
  ({ words: initialWords, settings, language, onComplete, onSaveWord, courseId }) => {
    const labels = useMemo(() => getLabels(language), [language]);

    // Local settings state
    const [localSettings, setLocalSettings] = useState({
      autoTTS: settings.flashcard.autoTTS,
      cardFront: settings.flashcard.cardFront,
      ratingMode:
        (settings.flashcard as { ratingMode?: 'PASS_FAIL' | 'FOUR_BUTTONS' }).ratingMode ||
        'PASS_FAIL',
    });

    // Shuffle words if random mode is on
    const [isRandom, setIsRandom] = useState(settings.flashcard.random);
    const [words, setWords] = useState<ExtendedVocabularyItem[]>(() => {
      if (settings.flashcard.random) {
        return [...initialWords].sort(() => Math.random() - 0.5);
      }
      return initialWords;
    });

    // Core state - initialize from localStorage if available
    const [cardIndex, setCardIndex] = useState(() => {
      if (courseId) {
        const saved = localStorage.getItem(`flashcard_progress_${courseId}`);
        if (saved) {
          try {
            const { index } = JSON.parse(saved);
            if (typeof index === 'number' && index < initialWords.length) {
              return index;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
      return 0;
    });
    const [isFlipped, setIsFlipped] = useState(false);
    const [history, setHistory] = useState<number[]>([]);
    const [trackProgress, setTrackProgress] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [sessionStats, setSessionStats] = useState<{
      correct: ExtendedVocabularyItem[];
      incorrect: ExtendedVocabularyItem[];
    }>(() => {
      if (courseId) {
        const saved = localStorage.getItem(`flashcard_progress_${courseId}`);
        if (saved) {
          try {
            const { stats } = JSON.parse(saved);
            if (stats) {
              return stats;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
      return { correct: [], incorrect: [] };
    });

    // Drag state
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const currentCard = words[cardIndex];

    // Save progress to localStorage
    useEffect(() => {
      if (courseId && trackProgress && cardIndex > 0) {
        localStorage.setItem(
          `flashcard_progress_${courseId}`,
          JSON.stringify({ index: cardIndex, stats: sessionStats })
        );
      }
    }, [courseId, trackProgress, cardIndex, sessionStats]);

    const resetDrag = useCallback(() => {
      setDragStart(null);
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
    }, []);

    const handleDragStart = useCallback((x: number, y: number) => {
      setDragStart({ x, y });
      setIsDragging(true);
    }, []);

    const handleDragMove = (x: number, y: number) => {
      if (!dragStart) return;
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;
      setDragOffset({ x: deltaX, y: deltaY });
    };

    const handleDragEnd = () => {
      if (!dragStart) return;
      const threshold = 100;
      if (dragOffset.x > threshold) {
        handleCardRate(true);
      } else if (dragOffset.x < -threshold) {
        handleCardRate(false);
      }
      resetDrag();
    };

    const handleCardRate = useCallback(
      (know: boolean) => {
        if (!currentCard) return;
        setHistory(prev => [...prev, cardIndex]);
        const updatedStats = {
          correct: know ? [...sessionStats.correct, currentCard] : sessionStats.correct,
          incorrect: !know ? [...sessionStats.incorrect, currentCard] : sessionStats.incorrect,
        };
        setSessionStats(updatedStats);
        if (!know && onSaveWord) {
          onSaveWord(currentCard);
        }
        if (cardIndex + 1 < words.length) {
          setCardIndex(cardIndex + 1);
          setIsFlipped(false);
        } else {
          if (courseId) {
            localStorage.removeItem(`flashcard_progress_${courseId}`);
          }
          onComplete(updatedStats);
        }
      },
      [cardIndex, currentCard, courseId, onComplete, onSaveWord, sessionStats, words.length]
    );

    const handleUndo = useCallback(() => {
      if (history.length === 0) return;
      const prevIndex = history[history.length - 1];
      const prevCard = words[prevIndex];
      setSessionStats(prev => ({
        correct: prev.correct.filter(w => w.id !== prevCard.id),
        incorrect: prev.incorrect.filter(w => w.id !== prevCard.id),
      }));
      setHistory(prev => prev.slice(0, -1));
      setCardIndex(prevIndex);
      setIsFlipped(false);
    }, [history, words]);

    const toggleRandom = useCallback(() => {
      setIsRandom(prev => {
        const newRandom = !prev;
        if (newRandom) {
          setWords([...initialWords].sort(() => Math.random() - 0.5));
        } else {
          setWords(initialWords);
        }
        setCardIndex(0);
        setHistory([]);
        setSessionStats({ correct: [], incorrect: [] });
        return newRandom;
      });
    }, [initialWords]);

    const toggleFullscreen = useCallback(() => {
      setIsFullscreen(prev => !prev);
    }, []);

    // Auto TTS
    useEffect(() => {
      if (localSettings.autoTTS && currentCard && !isFlipped) {
        speak(currentCard.korean);
      }
    }, [cardIndex, localSettings.autoTTS, currentCard, isFlipped]);

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isFlipped) {
          if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            setIsFlipped(true);
          }
        } else {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            handleCardRate(false);
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            handleCardRate(true);
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          e.preventDefault();
          handleUndo();
        }
        if (e.key === 'Escape' && isFullscreen) {
          setIsFullscreen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFlipped, handleCardRate, handleUndo, isFullscreen]);

    if (!currentCard) {
      return <div className="text-center text-slate-500">{labels.noWords}</div>;
    }

    // Card render helper
    const renderCardContent = () => (
      <div
        className="perspective-1000 w-full max-w-2xl h-96 relative cursor-pointer group select-none touch-none"
        onClick={() => !isDragging && setIsFlipped(!isFlipped)}
        onMouseDown={e => handleDragStart(e.clientX, e.clientY)}
        onMouseMove={e => handleDragMove(e.clientX, e.clientY)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={e => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={e => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleDragEnd}
        ref={cardRef}
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{
            transform: isDragging
              ? `translateX(${dragOffset.x}px) rotate(${dragOffset.x * 0.05}deg) ${isFlipped ? 'rotateY(180deg)' : ''}`
              : undefined,
            transition: isDragging ? 'none' : 'transform 0.5s',
          }}
        >
          {/* Drag Overlays */}
          {isDragging && dragOffset.x > 50 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-emerald-500/20 rounded-2xl border-4 border-emerald-500">
              <CheckCircle className="w-32 h-32 text-emerald-600 opacity-50" />
            </div>
          )}
          {isDragging && dragOffset.x < -50 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-500/20 rounded-2xl border-4 border-red-500">
              <XCircle className="w-32 h-32 text-red-600 opacity-50" />
            </div>
          )}

          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center justify-center p-8 text-center">
            <button
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
              onClick={e => {
                e.stopPropagation();
                speak(currentCard.korean);
              }}
              onMouseDown={e => e.stopPropagation()}
            >
              <Volume2 className="w-5 h-5" />
            </button>

            {localSettings.cardFront === 'KOREAN' ? (
              <h3 className="text-5xl font-bold text-slate-900 leading-tight">
                {currentCard.korean}
              </h3>
            ) : (
              <h3 className="text-4xl font-medium text-slate-800 leading-tight">
                {getLocalizedContent(currentCard, 'meaning', language) || currentCard.english}
              </h3>
            )}
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
            <button
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
              onClick={e => {
                e.stopPropagation();
                speak(currentCard.korean);
              }}
              onMouseDown={e => e.stopPropagation()}
            >
              <Volume2 className="w-5 h-5" />
            </button>

            {currentCard.partOfSpeech && (
              <div
                className={`mb-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  currentCard.partOfSpeech === 'VERB_T'
                    ? 'bg-blue-100 text-blue-700'
                    : currentCard.partOfSpeech === 'VERB_I'
                      ? 'bg-red-100 text-red-700'
                      : currentCard.partOfSpeech === 'ADJ'
                        ? 'bg-purple-100 text-purple-700'
                        : currentCard.partOfSpeech === 'NOUN'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700'
                }`}
              >
                {currentCard.partOfSpeech}
              </div>
            )}

            {localSettings.cardFront === 'KOREAN' ? (
              <>
                <p className="text-3xl font-medium text-indigo-600 mb-2">
                  {getLocalizedContent(currentCard, 'meaning', language) || currentCard.english}
                </p>
                {currentCard.hanja && (
                  <p className="text-lg text-slate-500 mb-4">漢字: {currentCard.hanja}</p>
                )}
              </>
            ) : (
              <>
                <h3 className="text-5xl font-bold text-indigo-600 mb-2">{currentCard.korean}</h3>
                {currentCard.hanja && (
                  <p className="text-lg text-slate-500 mb-2">漢字: {currentCard.hanja}</p>
                )}
              </>
            )}

            {currentCard.exampleSentence && (
              <div className="bg-slate-50 p-3 rounded-lg w-full max-w-lg mt-4">
                <p className="text-slate-800 text-base mb-1">{currentCard.exampleSentence}</p>
                {currentCard.exampleTranslation && (
                  <p className="text-slate-500 text-sm">
                    {getLocalizedContent(currentCard, 'exampleTranslation', language)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );

    // Toolbar render helper
    const renderToolbar = () => (
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 p-3 flex items-center justify-between">
        {/* Left: Track Progress */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-sm font-medium text-slate-600">
            {labels.trackProgress || '跟踪进度'}
          </span>
          <div
            className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
              trackProgress ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
            onClick={() => setTrackProgress(!trackProgress)}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                trackProgress ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </div>
        </label>

        {/* Center: Rating Buttons + Counter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCardRate(false)}
            className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
          <span className="px-4 py-2 text-slate-600 font-medium">
            {cardIndex + 1} / {words.length}
          </span>
          <button
            onClick={() => handleCardRate(true)}
            className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-green-200 text-green-500 hover:bg-green-50 transition-colors"
          >
            <CheckCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className={`p-2.5 rounded-lg transition-colors ${
              history.length === 0
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title={labels.undo || '撤销'}
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            onClick={toggleRandom}
            className={`p-2.5 rounded-lg transition-colors ${
              isRandom
                ? 'bg-indigo-100 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title={labels.randomMode || '随机模式'}
          >
            <Shuffle className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title={labels.settings || '设置'}
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title={labels.fullscreen || '全屏'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    );

    // Fullscreen mode
    if (isFullscreen) {
      return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <FlashcardSettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            settings={localSettings}
            onUpdate={setLocalSettings}
            labels={labels}
          />

          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 font-bold text-slate-700">
                📘 {labels.flashcards || '单词卡'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
            <div className="text-center">
              <div className="font-bold text-slate-800">
                {cardIndex + 1} / {words.length}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={toggleFullscreen}
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
              {labels.mastered || '已了解'} {sessionStats.correct.length}
              <span className="w-2 h-2 rounded-full bg-green-500" />
            </span>
          </div>

          {/* Card */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {renderCardContent()}
          </div>

          {/* Keyboard Hint */}
          <div className="text-center py-2 bg-indigo-50 text-indigo-600 text-sm font-medium">
            ⌨️ {labels.keyboardHint || '快捷键'}: 按{' '}
            <kbd className="px-2 py-0.5 bg-white rounded border border-indigo-200 mx-1">空格键</kbd>{' '}
            或单击卡片以翻页
          </div>

          {/* Bottom Toolbar */}
          <div className="px-6 py-4 border-t border-slate-100">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-sm font-medium text-slate-600">
                  {labels.trackProgress || '跟踪进度'}
                </span>
                <div
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    trackProgress ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                  onClick={() => setTrackProgress(!trackProgress)}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${trackProgress ? 'translate-x-5' : 'translate-x-1'}`}
                  />
                </div>
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleCardRate(false)}
                  className="w-14 h-14 flex items-center justify-center rounded-full border-2 border-red-200 text-red-500 hover:bg-red-50"
                >
                  <XCircle className="w-7 h-7" />
                </button>
                <button
                  onClick={() => handleCardRate(true)}
                  className="w-14 h-14 flex items-center justify-center rounded-full border-2 border-green-200 text-green-500 hover:bg-green-50"
                >
                  <CheckCircle className="w-7 h-7" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className={`p-2.5 rounded-lg ${history.length === 0 ? 'text-slate-300' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <Undo2 className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleRandom}
                  className={`p-2.5 rounded-lg ${isRandom ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <Shuffle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Normal mode
    return (
      <div className="flex flex-col items-center">
        <FlashcardSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={localSettings}
          onUpdate={setLocalSettings}
          labels={labels}
        />
        {renderCardContent()}
        <div className="mt-6">{renderToolbar()}</div>
      </div>
    );
  }
);
FlashcardView.displayName = 'FlashcardView';
console.log('FlashcardView v2 loaded');

export default FlashcardView;
