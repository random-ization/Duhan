import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Video,
  Languages,
  Loader2,
  Eye,
  Volume2,
  Plus,
  X,
  BookOpen,
  List,
} from 'lucide-react';
import { useQuery, useAction } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { getLabel, getLabels } from '../utils/i18n';
import type { Language } from '../types';
import type { MediaPlayerInstance } from '@vidstack/react';
import { aRef, qRef } from '../utils/convexRefs';
import { MobileSheet } from '../components/mobile/MobileSheet';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useTTS } from '../hooks/useTTS';
import { extractBestMeaning, normalizeLookupWord } from '../utils/dictionaryMeaning';
import { useUserActions } from '../hooks/useUserActions';

import { useIsMobile } from '../hooks/useIsMobile';
import { MobileVideoPlayerPage } from '../components/mobile/MobileVideoPlayerPage';

const LazyVideoPlayer = React.lazy(() => import('../components/media/VidstackVideoPlayer'));

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  translation?: string;
}

interface VideoData {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  level: string;
  duration?: number;
  transcriptData?: TranscriptSegment[];
  views: number;
}

type ConvexVideoDoc = Omit<VideoData, 'id'> & { _id: string };

interface DictionaryEntry {
  targetCode: string;
  word: string;
  pronunciation?: string;
  pos?: string;
  senses: Array<{
    order: number;
    definition: string;
    translation?: { lang: string; word: string; definition: string };
  }>;
}

interface SearchResult {
  total: number;
  start: number;
  num: number;
  entries: DictionaryEntry[];
}

// Word popup component (similar to ListeningModule)
interface WordPopupProps {
  word: string;
  meaning: string;
  position: { x: number; y: number };
  onClose: () => void;
  onSpeak: () => void;
  onSave: () => void;
  language: Language;
}

const WordPopup: React.FC<WordPopupProps> = ({
  word,
  meaning,
  position,
  onClose,
  onSpeak,
  onSave,
  language,
}) => {
  const labels = getLabels(language);
  return (
    <div
      className="fixed z-50 bg-[#FDFBF7] border-2 border-zinc-900 rounded-xl shadow-[4px_4px_0px_0px_#18181B] p-4 min-w-[180px]"
      style={{ left: Math.min(position.x, window.innerWidth - 220), top: position.y }}
    >
      <button
        onClick={onClose}
        className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-900 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition"
      >
        <X className="w-3 h-3" />
      </button>
      <div className="text-xl font-black text-zinc-900 mb-3">{word}</div>
      <div className="text-sm text-zinc-600 mb-3">{meaning}</div>
      <div className="flex gap-2">
        <button
          onClick={onSpeak}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white border-2 border-zinc-900 rounded-lg font-bold text-xs hover:bg-zinc-100 shadow-[2px_2px_0px_0px_#18181B] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          <Volume2 className="w-3 h-3" />
          {getLabel(labels, ['dashboard', 'common', 'read']) || '朗读'}
        </button>
        <button
          onClick={onSave}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold text-xs hover:bg-lime-400 shadow-[2px_2px_0px_0px_#18181B] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          <Plus className="w-3 h-3" />
          {getLabel(labels, ['dashboard', 'common', 'favorite']) || '收藏'}
        </button>
      </div>
    </div>
  );
};

const DesktopVideoPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const { saveWord } = useUserActions();
  const labels = getLabels(language);
  const { speak: speakTTS, stop: stopTTS } = useTTS();
  const playerRef = useRef<MediaPlayerInstance>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchDictionary = useAction(
    aRef<
      {
        query: string;
        translationLang?: string;
        start?: number;
        num?: number;
        part?: string;
        sort?: string;
      },
      SearchResult
    >('dictionary:searchDictionary')
  );
  const dictionaryRequestRef = useRef(0);
  const translationLang = useMemo(() => {
    if (language === 'en' || language === 'zh' || language === 'vi' || language === 'mn') {
      return language;
    }
    return undefined;
  }, [language]);

  useEffect(() => stopTTS, [stopTTS]);

  // Player state
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranslation, setShowTranslation] = useState(true);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false); // Mobile transcript sheet state

  // Word popup state
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    meaning: string;
    position: { x: number; y: number };
  } | null>(null);

  // Convex Integration
  const convexVideo = useQuery(
    qRef<{ id: string }, ConvexVideoDoc | null>('videos:get'),
    id ? { id } : 'skip'
  );

  // Derived Data State
  const video = useMemo<VideoData | null>(() => {
    if (!convexVideo) return null;
    return {
      ...convexVideo,
      id: convexVideo._id,
      thumbnailUrl: convexVideo.thumbnailUrl || undefined,
      duration: convexVideo.duration || undefined,
      description: convexVideo.description || undefined,
      transcriptData: convexVideo.transcriptData || undefined,
    };
  }, [convexVideo]);

  const loading = convexVideo === undefined;
  const error =
    convexVideo === null
      ? getLabel(labels, ['dashboard', 'video', 'notFound']) || 'Video not found'
      : null;

  // Derived Player State
  const activeSegmentIndex = useMemo(() => {
    if (!video?.transcriptData) return -1;
    return video.transcriptData.findIndex(
      seg => currentTime >= seg.start && currentTime <= seg.end
    );
  }, [video, currentTime]);

  // Side Effect: Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentIndex >= 0 && segmentRefs.current[activeSegmentIndex]) {
      segmentRefs.current[activeSegmentIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeSegmentIndex]);

  // Close popup on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (selectedWord && !target.closest('[data-popup]') && !target.closest('[data-word]')) {
        setSelectedWord(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selectedWord]);

  // Handle video time update
  const handleTimeUpdate = (detail: any) => {
    if (detail?.currentTime !== undefined) {
      setCurrentTime(detail.currentTime);
    }
  };

  // Seek to specific time
  const seekTo = (time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = time;
      playerRef.current.play();
    }
  };

  // Handle word popup
  const handleWordClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    const target = e.target as any;
    const wordEl = target.closest('[data-word]') as HTMLElement | null;
    if (wordEl) {
      e.preventDefault();
      e.stopPropagation();
      const clickedWord = normalizeLookupWord(wordEl.dataset.word ?? '');
      if (!clickedWord) return;
      const rect = wordEl.getBoundingClientRect();
      const fallbackMeaning = labels.dashboard?.common?.noMeaning || '暂无释义';
      const requestId = dictionaryRequestRef.current + 1;
      dictionaryRequestRef.current = requestId;
      const popoverWidth = 260;
      const popoverHeight = 180;
      const x = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - popoverWidth - 8));
      const y = Math.min(
        Math.max(8, rect.bottom + 8),
        Math.max(8, window.innerHeight - popoverHeight - 8)
      );
      setSelectedWord({
        word: clickedWord,
        meaning: labels.dashboard?.common?.loading || '查询中...',
        position: { x, y },
      });
      void (async () => {
        try {
          const res = await searchDictionary({
            query: clickedWord,
            translationLang,
            num: 10,
            part: 'word',
            sort: 'dict',
          });
          if (dictionaryRequestRef.current !== requestId) return;
          const meaning = extractBestMeaning(res, clickedWord, fallbackMeaning);
          setSelectedWord(prev => (prev ? { ...prev, meaning } : prev));
        } catch {
          if (dictionaryRequestRef.current !== requestId) return;
          setSelectedWord(prev => (prev ? { ...prev, meaning: fallbackMeaning } : prev));
        }
      })();
    }
  };

  const speak = useCallback(
    (text: string) => {
      void speakTTS(text);
    },
    [speakTTS]
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-zinc-100">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-zinc-100">
        <div className="text-center">
          <p className="text-red-500 font-bold text-lg mb-4">
            {error || getLabel(labels, ['dashboard', 'video', 'notFound']) || 'Video not found'}
          </p>
          <button
            onClick={() => navigate('/videos')}
            className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold"
          >
            {getLabel(labels, ['dashboard', 'video', 'back']) || 'Back to Library'}
          </button>
        </div>
      </div>
    );
  }

  const transcriptBody = (
    <div className="space-y-3">
      {!video.transcriptData || video.transcriptData.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <Video className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-bold">
            {getLabel(labels, ['dashboard', 'video', 'noSubtitles']) || 'No Subtitles'}
          </p>
          <p className="text-sm mt-1">
            {getLabel(labels, ['dashboard', 'video', 'noSubtitlesDesc']) ||
              'This video has no subtitles yet'}
          </p>
        </div>
      ) : (
        video.transcriptData.map((segment, index) => {
          const isActive = index === activeSegmentIndex;
          const segmentId = `segment-${index}-${segment.start}`;

          return (
            <button
              key={segmentId}
              ref={el => {
                segmentRefs.current[index] = el as unknown as HTMLDivElement;
              }}
              onClick={() => seekTo(segment.start)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 text-left w-full block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                isActive
                  ? 'bg-indigo-100 border-indigo-400 shadow-[4px_4px_0px_0px_#6366f1] scale-[1.02]'
                  : 'bg-white border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <div className="text-xs font-mono text-zinc-400 mb-2">
                {formatTime(segment.start)} - {formatTime(segment.end)}
              </div>

              <button
                className={`text-lg font-medium leading-relaxed text-left w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-300 rounded px-1 ${
                  isActive ? 'text-zinc-900' : 'text-zinc-700'
                }`}
                onClick={handleWordClick}
              >
                {segment.text.split(/(\s+)/).map((part, wordIndex) => {
                  const word = part.trim();
                  if (!word) {
                    const spaceId = `space-${index}-${wordIndex}`;
                    return <span key={spaceId}>{part}</span>;
                  }
                  const wordId = `word-${index}-${wordIndex}-${word}`;
                  return (
                    <span
                      key={wordId}
                      data-word={word}
                      className={`cursor-pointer rounded px-0.5 transition-colors ${
                        isActive ? 'hover:bg-indigo-200' : 'hover:bg-yellow-100'
                      }`}
                    >
                      {word}
                    </span>
                  );
                })}
              </button>

              {showTranslation && segment.translation && (
                <div className="text-sm text-zinc-500 mt-2 border-t border-zinc-100 pt-2">
                  {segment.translation}
                </div>
              )}
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <div
      className="min-h-screen min-h-[100dvh]"
      style={{
        backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundColor: '#f4f4f5',
      }}
    >
      {/* Header */}
      <header className="bg-[#FDFBF7] border-b-2 border-zinc-900 px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/videos')}
            className="w-10 h-10 bg-white border-2 border-zinc-900 rounded-xl flex items-center justify-center hover:bg-zinc-100 shadow-[3px_3px_0px_0px_#18181B] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="hidden md:block">
            <h1 className="font-black text-lg line-clamp-1">{video.title}</h1>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Eye className="w-4 h-4" />
              {(getLabel(labels, ['dashboard', 'video', 'views']) || '{count} views').replace(
                '{count}',
                String(video.views)
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Transcript Toggle */}
          <button
            onClick={() => setIsTranscriptOpen(true)}
            className="lg:hidden px-3 py-2 bg-white border-2 border-zinc-900 rounded-xl flex items-center gap-2 font-bold text-sm shadow-[2px_2px_0px_0px_#18181B] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">
              {getLabel(labels, ['dashboard', 'video', 'subtitleList']) || 'Subtitles'}
            </span>
          </button>

          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${
              showTranslation
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'bg-white border-zinc-200 text-zinc-600'
            }`}
          >
            <Languages className="w-4 h-4 inline mr-1" />
            {getLabel(labels, ['dashboard', 'video', 'translation']) || 'Translation'}
          </button>
        </div>
      </header>

      {/* Main Content - Desktop: Side by Side, Mobile: Stacked */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-65px)] h-[calc(100dvh-65px)]">
        {/* Video Player - 70% on desktop */}
        <div className="lg:w-[70%] bg-black flex items-center justify-center">
          {video && (
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center text-white text-sm">
                  Loading player...
                </div>
              }
            >
              <LazyVideoPlayer
                ref={playerRef}
                src={video.videoUrl}
                title={video.title}
                poster={video.thumbnailUrl}
                className="w-full h-full"
                onTimeUpdate={handleTimeUpdate}
              />
            </Suspense>
          )}
        </div>

        <div className="hidden lg:flex lg:w-[30%] bg-[#FDFBF7] border-zinc-900 flex-col lg:border-l-2 lg:static lg:h-full lg:shadow-none lg:rounded-none">
          <div className="sticky top-0 bg-[#FDFBF7] border-b-2 border-zinc-200 px-4 py-3 z-10">
            <h2 className="font-black text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              {getLabel(labels, ['dashboard', 'video', 'realtimeSubtitles']) ||
                'Real-time Subtitles'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {getLabel(labels, ['dashboard', 'video', 'hint']) ||
                'Click sentence to jump, click word to look up'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{transcriptBody}</div>
        </div>
      </div>

      <MobileSheet
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        title={getLabel(labels, ['dashboard', 'video', 'subtitleList']) || 'Subtitles'}
        height="half"
      >
        {transcriptBody}
      </MobileSheet>

      {/* Word Popup */}
      {selectedWord && (
        <div data-popup>
          <WordPopup
            word={selectedWord.word}
            meaning={selectedWord.meaning}
            position={selectedWord.position}
            onClose={() => setSelectedWord(null)}
            onSpeak={() => speak(selectedWord.word)}
            onSave={async () => {
              try {
                await saveWord(selectedWord.word, selectedWord.meaning);
                toast.success(labels.dashboard?.common?.saved || '已保存到生词本');
              } catch (err) {
                console.error('Failed to save word:', err);
                toast.error(labels.dashboard?.common?.saveFailed || '保存失败');
              }
              setSelectedWord(null);
            }}
            language={language}
          />
        </div>
      )}
    </div>
  );
};

const VideoPlayerPage: React.FC = () => {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileVideoPlayerPage />;
  return <DesktopVideoPlayerPage />;
};

export default VideoPlayerPage;
