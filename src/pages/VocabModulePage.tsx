import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Volume2,
  X,
  Star,
  Eye,
  EyeOff,
  Play,
  Square,
  BookOpen,
  Settings,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { UserWordProgress, VocabularyItem } from '../types';
import { VocabQuiz, VocabMatch } from '../features/vocab';
// import { updateVocabProgress } from '../services/vocabApi';
import EmptyState from '../components/common/EmptyState';
import { useQuery, useMutation } from 'convex/react';
import { useTTS } from '../hooks/useTTS';
import { useApp } from '../contexts/AppContext';
import { getLabel, getLabels } from '../utils/i18n';
import { getLocalizedContent } from '../utils/languageUtils';
import { VocabModuleSkeleton } from '../components/common';
import { VOCAB } from '../utils/convexRefs';

interface ExtendedVocabItem extends VocabularyItem {
  id: string;
  unit: number;
  mastered?: boolean;
  exampleTranslation?: string;
}

type ViewMode = 'flashcard' | 'quiz' | 'match' | 'list';

// Extracted constants for styles to prevent recreation on every render
const BACKGROUND_STYLE = {
  backgroundColor: '#F0F4F8',
  backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
  backgroundSize: '24px 24px',
} as const;

export default function VocabModulePage() {
  // Force Rebuild Trigger: 2026-01-02
  const navigate = useNavigate();
  const { instituteId } = useParams<{ instituteId: string }>();
  const { user } = useAuth();
  const { setSelectedInstitute, selectedLevel, setSelectedLevel } = useLearning();
  const { institutes, textbookContexts } = useData();
  const { speak: speakTTS, stop: stopTTS } = useTTS();
  const { language } = useApp();
  const labels = getLabels(language);

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

  // State - Merged related states for better performance
  const [selectedUnitId, setSelectedUnitId] = useState<number | 'ALL'>('ALL');
  const [viewState, setViewState] = useState({
    mode: 'flashcard' as ViewMode,
    cardIndex: 0,
    isFlipped: false,
    flashcardComplete: false,
  });
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Quick Study (速记) mode states
  const [redSheetActive, setRedSheetActive] = useState(true); // 默认开启
  const [isAudioLooping, setIsAudioLooping] = useState(false);
  const audioLoopRef = useRef<boolean>(false);

  // Flashcard settings
  const [showFlashcardSettings, setShowFlashcardSettings] = useState(false);
  const [flashcardSettings, setFlashcardSettings] = useState({
    autoPlayTTS: false,
    cardFront: 'KOREAN' as 'KOREAN' | 'MEANING',
  });

  // Use ref to prevent parseWords from depending on textbookContexts object
  const textbookContextsRef = useRef(textbookContexts);
  useEffect(() => {
    textbookContextsRef.current = textbookContexts;
  }, [textbookContexts]);

  // Convex Integration
  // Pass user ID (token or Convex ID) to ensure progress data is loaded
  const convexWordsQuery = useQuery(
    VOCAB.getOfCourse,
    instituteId ? { courseId: instituteId } : 'skip'
  );
  const updateProgressMutation = useMutation(VOCAB.updateProgress);

  // Derive loading state and allWords directly from query - no extra state needed
  const isLoading = convexWordsQuery === undefined;
  const allWords = useMemo<ExtendedVocabItem[]>(() => {
    if (!convexWordsQuery) return [];
    return convexWordsQuery.map(w => ({
      id: w._id,
      korean: w.word,
      english: w.meaning,
      word: w.word,
      meaning: w.meaning,
      meaningEn: w.meaningEn,
      meaningVi: w.meaningVi,
      meaningMn: w.meaningMn,
      pronunciation: w.pronunciation,
      hanja: w.hanja,
      partOfSpeech: w.partOfSpeech as VocabularyItem['partOfSpeech'],
      tips: w.tips as VocabularyItem['tips'],
      exampleSentence: w.exampleSentence,
      exampleMeaning: w.exampleMeaning,
      // Map DTO fields to Component fields
      exampleTranslation: w.exampleMeaning,
      exampleTranslationEn: w.exampleMeaningEn,
      exampleTranslationVi: w.exampleMeaningVi,
      exampleTranslationMn: w.exampleMeaningMn,
      unit: w.unitId,
      courseId: instituteId,
      unitId: String(w.unitId),
      progress: w.progress
        ? {
            ...w.progress,
            status: w.progress.status as UserWordProgress['status'],
          }
        : null,
      mastered: w.mastered || false,
    }));
  }, [convexWordsQuery, instituteId]);

  // Initialize Mastered IDs when data arrives
  useEffect(() => {
    if (allWords.length > 0) {
      const mastered = new Set(
        allWords.filter(w => w.mastered || w.progress?.status === 'MASTERED').map(w => w.id)
      );
      setMasteredIds(mastered);
    }
  }, [allWords]);

  const filteredWords = useMemo(() => {
    if (selectedUnitId === 'ALL') return allWords;
    return allWords.filter(w => w.unit === selectedUnitId);
  }, [allWords, selectedUnitId]);

  useEffect(() => {
    setViewState(prev => ({ ...prev, cardIndex: 0, isFlipped: false, flashcardComplete: false }));
  }, [selectedUnitId]);

  const availableUnits = useMemo(() => {
    const total = course?.totalUnits || 20;
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [course]);

  const currentCard = filteredWords[viewState.cardIndex];
  const masteryCount = useMemo(
    () => filteredWords.filter(w => masteredIds.has(w.id)).length,
    [filteredWords, masteredIds]
  );
  const progressPercent =
    filteredWords.length > 0 ? ((viewState.cardIndex + 1) / filteredWords.length) * 100 : 0;

  // Memoized words for Quiz/Match to prevent re-renders
  const gameWords = useMemo(
    () =>
      filteredWords.map(w => ({
        id: w.id,
        korean: w.korean,
        english: getLocalizedContent(w, 'meaning', language) || w.english,
        unit: w.unit,
      })),
    [filteredWords, language]
  );

  const handleKnow = async () => {
    if (currentCard) {
      setMasteredIds(prev => new Set([...prev, currentCard.id]));
      // Call Convex Mutation
      if (user?.id && currentCard.id) {
        try {
          await updateProgressMutation({
            wordId: currentCard.id,
            quality: 5,
          });
        } catch (err) {
          console.warn('Failed to update progress:', err);
        }
      }
    }
    goToNext();
  };
  const handleDontKnow = async () => {
    if (user?.id && currentCard?.id) {
      try {
        // Remove from mastered locally if forgot
        setMasteredIds(prev => {
          const next = new Set(prev);
          next.delete(currentCard.id);
          return next;
        });

        await updateProgressMutation({
          wordId: currentCard.id,
          quality: 0,
        });
      } catch (err) {
        console.warn('Failed to update progress:', err);
      }
    }
    goToNext();
  };
  const flipCard = useCallback(() => {
    setViewState(prev => ({ ...prev, isFlipped: !prev.isFlipped }));
  }, []);

  /*
    const handleRating = async (rating: number) => {
        const currentWord = filteredWords[viewState.cardIndex];
        if (currentWord && user?.id) {
            try {
                await updateProgressMutation({
                    wordId: currentWord.id,
                    quality: rating
                });
            } catch (err) {
                console.warn('Failed to update progress:', err);
            }
        }
        goToNext();
    };
    */

  // Use handleRating to avoid unused variable warning if it's meant to be used.
  // However, looking at the code, it seems unused. If so, remove it.
  // But Step Id 725 says: "handleRating" is assigned a value but never used
  // Let's remove it if it's truly unused.
  // Wait, let's check if it's used in the code I viewed.
  // I don't see handleRating used in the render.
  // I'll comment it out or remove it.
  /*
    const handleRating = async (rating: number) => {
       ...
    };
    */

  const goToNext = useCallback(() => {
    setViewState(prev => {
      if (prev.cardIndex < filteredWords.length - 1) {
        return { ...prev, cardIndex: prev.cardIndex + 1, isFlipped: false };
      } else {
        // At last card, show completion
        return { ...prev, flashcardComplete: true, isFlipped: false };
      }
    });
  }, [filteredWords.length]);

  const goToPrev = useCallback(() => {
    setViewState(prev =>
      prev.cardIndex > 0 ? { ...prev, cardIndex: prev.cardIndex - 1, isFlipped: false } : prev
    );
  }, []);
  const toggleStar = (id: string) => {
    setStarredIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const speakWord = useCallback(
    (text: string) => {
      speakTTS(text);
    },
    [speakTTS]
  );

  // Auto-play TTS when card changes (if enabled)
  useEffect(() => {
    if (flashcardSettings.autoPlayTTS && currentCard && viewState.mode === 'flashcard') {
      const textToSpeak =
        flashcardSettings.cardFront === 'KOREAN' ? currentCard.korean : currentCard.korean;
      speakWord(textToSpeak);
    }
  }, [
    viewState.cardIndex,
    flashcardSettings.autoPlayTTS,
    flashcardSettings.cardFront,
    viewState.mode,
    currentCard,
    speakWord,
  ]);

  // Audio loop for Quick Study mode (1.5s gap between words)
  const playAudioLoop = async () => {
    if (isAudioLooping) {
      audioLoopRef.current = false;
      setIsAudioLooping(false);
      stopTTS();
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
      if (e.code === 'Space') {
        e.preventDefault();
        flipCard();
      } else if (e.code === 'ArrowLeft') goToPrev();
      else if (e.code === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewState.cardIndex, filteredWords.length, flipCard, goToNext, goToPrev]);

  const tabs = [
    { id: 'flashcard', label: labels.vocab?.flashcard || 'Flashcard', emoji: '🎴' },
    { id: 'quiz', label: labels.vocab?.quiz || 'Quiz', emoji: '🎯' },
    { id: 'match', label: getLabel(labels, ['vocab', 'match']) || 'Match', emoji: '🧩' },
    { id: 'list', label: labels.vocab?.quickStudy || 'Quick Study', emoji: '⚡' },
  ];

  if (isLoading) {
    return <VocabModuleSkeleton />;
  }

  // Removed blocking EmptyState here to allow UI rendering even if empty

  return (
    <div className="min-h-screen flex flex-col items-center py-6 px-4" style={BACKGROUND_STYLE}>
      <div className="w-full max-w-4xl mb-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6 z-50 relative">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <button
              onClick={() => navigate(`/course/${instituteId}`)}
              className="w-10 h-10 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center hover:border-slate-900 transition-colors shadow-sm text-slate-400 hover:text-slate-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Scope Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 bg-white border-2 border-slate-900 rounded-xl px-4 py-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-y-0 active:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
              >
                <div className="w-8 h-8 rounded-lg bg-green-100 border border-green-200 flex items-center justify-center text-lg">
                  📚
                </div>
                <div className="text-left mr-2">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {labels.vocab?.currentScope || 'Current Scope'}
                  </div>
                  <div className="font-black text-slate-900 leading-none">
                    {selectedUnitId === 'ALL'
                      ? labels.vocab?.allUnits || 'All Units'
                      : `${labels.vocab?.unit || 'Unit'} ${selectedUnitId}`}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden z-50">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setSelectedUnitId('ALL');
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-bold text-sm flex justify-between items-center ${selectedUnitId === 'ALL' ? 'bg-green-50 text-green-800 border border-green-200' : 'hover:bg-slate-50 text-slate-600'}`}
                    >
                      <span>📚 {labels.vocab?.allUnits || 'All Units'} (Level 1A)</span>
                      <span
                        className={`px-1.5 rounded text-[10px] ${selectedUnitId === 'ALL' ? 'bg-white border border-green-200' : 'text-slate-300'}`}
                      >
                        {allWords.length}
                      </span>
                    </button>
                    <div className="h-px bg-slate-100 my-1" />
                    {availableUnits.map(u => {
                      const count = allWords.filter(w => w.unit === u).length;
                      return (
                        <button
                          key={u}
                          onClick={() => {
                            setSelectedUnitId(u);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg font-medium text-sm flex justify-between items-center ${selectedUnitId === u ? 'bg-green-50 text-green-800 border border-green-200' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}`}
                        >
                          <span>
                            {labels.vocab?.unit || 'Unit'} {u}
                          </span>
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
              <div className="text-[10px] font-bold text-slate-400 uppercase">
                {labels.vocab?.mastery || 'Mastery'}
              </div>
              <div className="font-black text-sm text-slate-900">
                {masteryCount} / {filteredWords.length}
              </div>
            </div>
            <div className="w-10 h-10 relative">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#4ADE80"
                  strokeWidth="4"
                  strokeDasharray={`${(masteryCount / Math.max(filteredWords.length, 1)) * 100} 100`}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tabs.map(mode => (
            <button
              key={mode.id}
              onClick={() => setViewState(prev => ({ ...prev, mode: mode.id as ViewMode }))}
              className={`bg-white border-2 rounded-xl p-3 flex items-center justify-center gap-2 relative overflow-hidden transition-all ${viewState.mode === mode.id ? 'border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]' : 'border-transparent hover:border-slate-900 shadow-sm hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]'}`}
            >
              {viewState.mode === mode.id && <div className="absolute inset-0 bg-green-50 z-0" />}
              {viewState.mode === mode.id && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-[#4ADE80]" />
              )}
              <span className="relative z-10 text-xl">{mode.emoji}</span>
              <span
                className={`relative z-10 font-black text-sm ${viewState.mode === mode.id ? 'text-slate-900' : 'text-slate-500'}`}
              >
                {mode.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filteredWords.length === 0 && (
        <div className="w-full max-w-4xl py-12">
          <EmptyState
            icon={BookOpen}
            title={
              selectedUnitId === 'ALL'
                ? labels.vocab?.noWords || 'No Words'
                : `${labels.vocab?.unit || 'Unit'} ${selectedUnitId} ${labels.vocab?.noWords || 'No Words'}`
            }
            description={labels.vocab?.noWordsDesc || 'No vocabulary content added yet.'}
            actionLabel={
              selectedUnitId === 'ALL'
                ? labels.coursesOverview?.backToHome || 'Back to Home'
                : labels.vocab?.allUnits || 'View All Units'
            }
            onAction={() =>
              selectedUnitId === 'ALL' ? navigate('/dashboard') : setSelectedUnitId('ALL')
            }
          />
        </div>
      )}

      {/* Flashcard */}
      {viewState.mode === 'flashcard' && filteredWords.length > 0 && (
        <div className="w-full max-w-4xl mb-10 z-0">
          {/* Flashcard Settings Modal */}
          {showFlashcardSettings && (
            <div
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowFlashcardSettings(false)}
            >
              <div
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-slate-900">
                    ⚙️ {labels.vocab?.settings || 'Settings'}
                  </h2>
                  <button
                    onClick={() => setShowFlashcardSettings(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Auto-play TTS */}
                <div className="mb-5">
                  <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100">
                    <div>
                      <span className="font-bold text-slate-700 block">
                        🔊 {labels.vocab?.autoPlay || 'Auto Play Audio'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {labels.vocab?.autoPlay || 'Auto play when changing cards'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={flashcardSettings.autoPlayTTS}
                      onChange={e =>
                        setFlashcardSettings(s => ({ ...s, autoPlayTTS: e.target.checked }))
                      }
                      className="w-5 h-5 accent-green-500"
                    />
                  </label>
                </div>

                {/* Card Front */}
                <div className="mb-5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">
                    {labels.vocab?.cardFront || 'Card Front'}
                  </h3>
                  <div className="space-y-2">
                    <label
                      className={`flex items-center p-4 rounded-xl cursor-pointer ${flashcardSettings.cardFront === 'KOREAN' ? 'bg-green-50 border-2 border-green-300' : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'}`}
                    >
                      <input
                        type="radio"
                        name="card-front"
                        checked={flashcardSettings.cardFront === 'KOREAN'}
                        onChange={() => setFlashcardSettings(s => ({ ...s, cardFront: 'KOREAN' }))}
                        className="mr-3"
                      />
                      <div>
                        <span className="font-bold">
                          🇰🇷 {labels.vocab?.koreanFront || 'Korean Front'}
                        </span>
                        <span className="text-xs text-slate-400 block">
                          {labels.vocab?.koreanFront || 'View Korean'}
                        </span>
                      </div>
                    </label>
                    <label
                      className={`flex items-center p-4 rounded-xl cursor-pointer ${flashcardSettings.cardFront === 'MEANING' ? 'bg-green-50 border-2 border-green-300' : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'}`}
                    >
                      <input
                        type="radio"
                        name="card-front"
                        checked={flashcardSettings.cardFront === 'MEANING'}
                        onChange={() => setFlashcardSettings(s => ({ ...s, cardFront: 'MEANING' }))}
                        className="mr-3"
                      />
                      <div>
                        <span className="font-bold">
                          🇨🇳 {labels.vocab?.meaningFront || 'Meaning Front'}
                        </span>
                        <span className="text-xs text-slate-400 block">
                          {labels.vocab?.meaningFront || 'View Meaning'}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  onClick={() => setShowFlashcardSettings(false)}
                  className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800"
                >
                  {labels.done || 'Done'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[1.5rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden h-[450px] flex flex-col relative perspective-1000">
            {viewState.flashcardComplete ? (
              /* Completion Card */
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-green-50 to-white">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <span className="text-4xl">🎉</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">
                  {labels.sessionComplete || 'Session Complete!'}
                </h2>
                <p className="text-slate-500 mb-2">
                  {filteredWords.length} {labels.wordsUnit || 'words'} reviewed
                </p>
                <div className="flex gap-2 mb-8">
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                    ✓ {labels.vocab?.remembered || 'Remembered'} {masteredIds.size}
                  </span>
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                    ✕ {labels.vocab?.forgot || 'Forgot'} {filteredWords.length - masteredIds.size}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setViewState(prev => ({ ...prev, mode: 'quiz' }))}
                    className="px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 transition-all"
                  >
                    ⚡️ {labels.vocab?.quiz || 'Quiz'}
                  </button>
                  {selectedUnitId !== 'ALL' &&
                    availableUnits.indexOf(selectedUnitId as number) <
                      availableUnits.length - 1 && (
                      <button
                        onClick={() => {
                          const currentIdx = availableUnits.indexOf(selectedUnitId as number);
                          if (currentIdx < availableUnits.length - 1) {
                            setSelectedUnitId(availableUnits[currentIdx + 1]);
                          }
                        }}
                        className="px-6 py-3 bg-green-500 border-2 border-green-600 text-white font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(22,163,74,1)] hover:-translate-y-1 transition-all"
                      >
                        {labels.common?.next || 'Next Unit'} →
                      </button>
                    )}
                </div>
                <button
                  onClick={() => {
                    setViewState(prev => ({ ...prev, cardIndex: 0, flashcardComplete: false }));
                    setMasteredIds(new Set());
                  }}
                  className="mt-4 text-sm text-slate-400 hover:text-slate-600"
                >
                  🔄 {labels.vocab?.restart || 'Restart'}
                </button>
              </div>
            ) : (
              <>
                {/* Top Right: Unit + Star */}
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-400">
                    {labels.vocab?.unit || 'Unit'} {currentCard?.unit}
                  </span>
                  <button
                    onClick={() => toggleStar(currentCard?.id || '')}
                    className={`w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center ${starredIds.has(currentCard?.id || '') ? 'text-yellow-500' : 'text-slate-300'}`}
                  >
                    <Star
                      className="w-5 h-5"
                      fill={starredIds.has(currentCard?.id || '') ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>

                {/* Card Content */}
                <div onClick={flipCard} className="flex-1 relative cursor-pointer">
                  <div
                    className={`card-content w-full h-full relative transition-transform duration-500 transform-style-3d ${viewState.isFlipped ? 'rotate-y-180' : ''}`}
                  >
                    {/* Front */}
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center backface-hidden bg-white">
                      <h2 className="text-6xl font-black text-slate-900 mb-6">
                        {flashcardSettings.cardFront === 'KOREAN'
                          ? currentCard?.korean
                          : getLocalizedContent(currentCard, 'meaning', language)}
                      </h2>
                      {flashcardSettings.cardFront === 'KOREAN' && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            speakWord(currentCard?.korean || '');
                          }}
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
                          <h2 className="text-5xl font-black text-green-600">
                            {currentCard?.korean}
                          </h2>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              speakWord(currentCard?.korean || '');
                            }}
                            className="p-2 rounded-full bg-green-100 hover:bg-green-200 text-green-600 transition-colors"
                          >
                            <Volume2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}

                      {/* POS Badge */}
                      {currentCard?.partOfSpeech && (
                        <div
                          className={`mb-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            currentCard.partOfSpeech === 'VERB_T'
                              ? 'bg-red-100 text-red-700'
                              : currentCard.partOfSpeech === 'VERB_I'
                                ? 'bg-orange-100 text-orange-700'
                                : currentCard.partOfSpeech === 'ADJ'
                                  ? 'bg-purple-100 text-purple-700'
                                  : currentCard.partOfSpeech === 'NOUN'
                                    ? 'bg-blue-100 text-blue-700'
                                    : currentCard.partOfSpeech === 'ADV'
                                      ? 'bg-green-100 text-green-700'
                                      : currentCard.partOfSpeech === 'PARTICLE'
                                        ? 'bg-gray-100 text-gray-700'
                                        : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {currentCard.partOfSpeech === 'VERB_T'
                            ? `${labels.vocab?.pos?.verb_t_short || 'v.t.'} ${labels.vocab?.pos?.verb_t || 'Transitive Verb'}`
                            : currentCard.partOfSpeech === 'VERB_I'
                              ? `${labels.vocab?.pos?.verb_i_short || 'v.i.'} ${labels.vocab?.pos?.verb_i || 'Intransitive Verb'}`
                              : currentCard.partOfSpeech === 'ADJ'
                                ? `${labels.vocab?.pos?.adj_short || 'adj.'} ${labels.vocab?.pos?.adj || 'Adjective'}`
                                : currentCard.partOfSpeech === 'NOUN'
                                  ? `${labels.vocab?.pos?.noun_short || 'n.'} ${labels.vocab?.pos?.noun || 'Noun'}`
                                  : currentCard.partOfSpeech === 'ADV'
                                    ? `${labels.vocab?.pos?.adv_short || 'adv.'} ${labels.vocab?.pos?.adv || 'Adverb'}`
                                    : currentCard.partOfSpeech === 'PARTICLE'
                                      ? labels.vocab?.pos?.particle || 'Particle'
                                      : currentCard.partOfSpeech}
                        </div>
                      )}

                      {/* Main Content */}
                      {flashcardSettings.cardFront === 'KOREAN' && (
                        <h3 className="font-bold text-4xl text-slate-900 mb-2">
                          {getLocalizedContent(currentCard, 'meaning', language)}
                        </h3>
                      )}

                      {/* Hanja */}
                      {currentCard?.hanja && (
                        <p className="text-lg text-slate-500 mb-3">漢字: {currentCard.hanja}</p>
                      )}

                      {/* Tips Section (Yellow Background) */}
                      {currentCard?.tips &&
                        (currentCard.tips.synonyms ||
                          currentCard.tips.antonyms ||
                          currentCard.tips.nuance) && (
                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg w-full max-w-md mb-3">
                            {currentCard.tips.synonyms && currentCard.tips.synonyms.length > 0 && (
                              <p className="text-sm text-yellow-800 mb-1">
                                <span className="font-bold">≈</span>{' '}
                                {currentCard.tips.synonyms.join(', ')}
                              </p>
                            )}
                            {currentCard.tips.antonyms && currentCard.tips.antonyms.length > 0 && (
                              <p className="text-sm text-yellow-800 mb-1">
                                <span className="font-bold">≠</span>{' '}
                                {currentCard.tips.antonyms.join(', ')}
                              </p>
                            )}
                            {currentCard.tips.nuance && (
                              <p className="text-sm text-yellow-700">
                                <span className="mr-1">💡</span>
                                {currentCard.tips.nuance}
                              </p>
                            )}
                          </div>
                        )}

                      {/* Example Sentence (Slate Background) */}
                      {currentCard?.exampleSentence && (
                        <div className="bg-slate-100 p-3 rounded-lg w-full max-w-md">
                          <p className="text-slate-700 text-base">{currentCard.exampleSentence}</p>
                          <p className="text-slate-500 text-sm mt-1 font-medium text-slate-400">
                            {getLocalizedContent(currentCard, 'exampleMeaning', language) ||
                              currentCard.exampleTranslation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation Bar */}
                <div className="bg-slate-100 border-t-2 border-slate-200 py-3 px-6 flex justify-between items-center text-xs font-bold text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>Space {labels.vocab?.flip || 'Flip'}</span>
                    <button
                      onClick={() => setShowFlashcardSettings(true)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={goToPrev}
                      disabled={viewState.cardIndex === 0}
                      className="w-8 h-8 bg-white border border-slate-300 rounded-full hover:border-slate-900 disabled:opacity-30 flex items-center justify-center"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-black text-slate-900">
                      {viewState.cardIndex + 1} / {filteredWords.length}
                    </span>
                    <button
                      onClick={goToNext}
                      disabled={viewState.cardIndex === filteredWords.length - 1}
                      className="w-8 h-8 bg-white border border-slate-300 rounded-full hover:border-slate-900 disabled:opacity-30 flex items-center justify-center"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{labels.vocab?.shortcuts || 'Shortcuts'}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-200">
                  <div
                    className="h-full bg-[#4ADE80] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Action Buttons - SRS (only show when not complete) */}
          {!viewState.flashcardComplete && (
            <div className="flex justify-center gap-6 mt-6 px-8">
              <button
                onClick={handleDontKnow}
                className="flex-1 max-w-[180px] py-4 bg-red-50 border-2 border-red-500 text-red-600 rounded-2xl font-black text-lg shadow-[4px_4px_0px_0px_rgba(220,38,38,0.5)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(220,38,38,0.5)] active:translate-y-0 active:shadow-none transition-all"
              >
                ✕ {labels.vocab?.forgot || 'Forgot'}
              </button>
              <button
                onClick={handleKnow}
                className="flex-1 max-w-[180px] py-4 bg-green-50 border-2 border-green-500 text-green-600 rounded-2xl font-black text-lg shadow-[4px_4px_0px_0px_rgba(34,197,94,0.5)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(34,197,94,0.5)] active:translate-y-0 active:shadow-none transition-all"
              >
                ✓ {labels.vocab?.remembered || 'Remembered'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Learn List Mode (速记) */}
      {viewState.mode === 'list' && filteredWords.length > 0 && (
        <div className="w-full max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-black text-slate-900">
              {labels.vocab?.quickStudy || 'Quick Study'}{' '}
              <span className="text-slate-400 text-lg font-normal ml-2">
                ({filteredWords.length})
              </span>
            </h3>
            <div className="flex items-center gap-2">
              {/* Red Sheet Toggle */}
              <button
                onClick={() => setRedSheetActive(!redSheetActive)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
                  redSheetActive
                    ? 'bg-red-50 border-red-400 text-red-600'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                }`}
              >
                {redSheetActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {labels.vocab?.redSheet || 'Red Sheet'}
              </button>
              {/* Audio Loop */}
              <button
                onClick={playAudioLoop}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
                  isAudioLooping
                    ? 'bg-green-50 border-green-400 text-green-600 animate-pulse'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                }`}
              >
                {isAudioLooping ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isAudioLooping ? labels.vocab?.stop || 'Stop' : labels.vocab?.loop || 'Loop'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredWords.map(word => {
              const isRevealed = masteredIds.has(word.id);

              // Replace Korean word in example sentence with masked version
              const maskedSentence =
                word.exampleSentence?.replace(
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
                  className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                    isRevealed
                      ? 'border-green-300 bg-green-50/50'
                      : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 md:gap-4">
                    <div className="flex-1">
                      {/* Word + Meaning Row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-3 md:gap-3">
                        <span
                          className={`text-2xl font-black transition-all ${
                            isRevealed ? 'text-green-600' : 'text-slate-900'
                          }`}
                        >
                          {word.korean}
                        </span>
                        {/* Meaning with red sheet support */}
                        <span
                          className={`text-slate-500 text-lg transition-all ${
                            redSheetActive && !isRevealed
                              ? 'blur-sm hover:blur-none select-none'
                              : ''
                          }`}
                        >
                          {getLocalizedContent(word, 'meaning', language) || word.english}
                        </span>
                        {word.partOfSpeech && isRevealed && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              word.partOfSpeech === 'VERB_T'
                                ? 'bg-red-100 text-red-700'
                                : word.partOfSpeech === 'VERB_I'
                                  ? 'bg-orange-100 text-orange-700'
                                  : word.partOfSpeech === 'ADJ'
                                    ? 'bg-purple-100 text-purple-700'
                                    : word.partOfSpeech === 'NOUN'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {word.partOfSpeech === 'VERB_T'
                              ? labels.vocab?.pos?.verb_t_short || 'v.t.'
                              : word.partOfSpeech === 'VERB_I'
                                ? labels.vocab?.pos?.verb_i_short || 'v.i.'
                                : word.partOfSpeech === 'ADJ'
                                  ? labels.vocab?.pos?.adj_short || 'adj.'
                                  : word.partOfSpeech === 'NOUN'
                                    ? labels.vocab?.pos?.noun_short || 'n.'
                                    : word.partOfSpeech}
                          </span>
                        )}
                      </div>

                      {/* Example Sentence with Masked Word */}
                      <div
                        className={`p-3 rounded-xl transition-all ${
                          isRevealed ? 'bg-slate-100' : 'bg-slate-50'
                        }`}
                      >
                        <p
                          className={`text-lg leading-relaxed ${
                            isRevealed ? 'text-slate-800' : 'text-slate-600'
                          }`}
                        >
                          {maskedSentence || labels.vocab?.noExample || 'Example pending'}
                        </p>
                        {isRevealed && word.exampleTranslation && (
                          <p className="text-sm text-slate-500 mt-1">
                            {getLocalizedContent(word, 'exampleMeaning', language) ||
                              word.exampleTranslation}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${
                        isRevealed ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isRevealed ? '✓' : '?'}
                    </div>
                  </div>

                  {/* Hint */}
                  {!isRevealed && (
                    <p className="text-xs text-slate-400 mt-3 text-center">
                      {labels.vocab?.reval || 'Click to reveal'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quiz Mode */}
      {viewState.mode === 'quiz' && filteredWords.length > 0 && (
        <div className="w-full max-w-4xl">
          <VocabQuiz
            key={`quiz-${selectedUnitId}-${gameWords.length}`}
            words={gameWords}
            onComplete={stats => console.log('Quiz completed:', stats)}
            hasNextUnit={
              selectedUnitId !== 'ALL' &&
              availableUnits.indexOf(selectedUnitId as number) < availableUnits.length - 1
            }
            onNextUnit={() => {
              if (selectedUnitId !== 'ALL') {
                const currentIdx = availableUnits.indexOf(selectedUnitId as number);
                if (currentIdx < availableUnits.length - 1) {
                  setSelectedUnitId(availableUnits[currentIdx + 1]);
                }
              }
            }}
            currentUnitLabel={
              selectedUnitId === 'ALL'
                ? labels.vocab?.allUnits || 'All Units'
                : `${labels.vocab?.unit || 'Unit'} ${selectedUnitId}`
            }
            userId={user?.id}
            language={language}
          />
        </div>
      )}

      {/* Match Mode */}
      {viewState.mode === 'match' && filteredWords.length > 0 && (
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
