import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Video, Loader2, Eye, Languages } from 'lucide-react';
import { useQuery, useAction } from 'convex/react';
import { useAuth } from '../../contexts/AuthContext';
import { getLabels } from '../../utils/i18n';
import type { MediaPlayerInstance } from '@vidstack/react';
import { aRef, qRef } from '../../utils/convexRefs';
// Use existing MobileDictionarySheet
import { MobileDictionarySheet } from './MobileDictionarySheet';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { extractBestMeaning, normalizeLookupWord } from '../../utils/dictionaryMeaning';
import { useUserActions } from '../../hooks/useUserActions';
import { cn } from '../../lib/utils';

const LazyVideoPlayer = React.lazy(() => import('../media/VidstackVideoPlayer'));

// --- Types (Copied from VideoPlayerPage or imported if centralized) ---
// Ideally these should be in a types file
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

// --- Component ---

export const MobileVideoPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const { saveWord } = useUserActions();
  const labels = getLabels(language);
  // Refs
  const playerRef = useRef<MediaPlayerInstance>(null);
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]); // Changed to button for semantics
  const dictionaryRequestRef = useRef(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Convex Actions
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

  const convexVideo = useQuery(
    qRef<{ id: string }, ConvexVideoDoc | null>('videos:get'),
    id ? { id } : 'skip'
  );

  // State
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranslation, setShowTranslation] = useState(true);
  // Mobile Dictionary State
  const [selectedWordObj, setSelectedWordObj] = useState<{ word: string; meaning: string } | null>(
    null
  );
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);

  // Memoized Data
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

  const activeSegmentIndex = useMemo(() => {
    if (!video?.transcriptData) return -1;
    return video.transcriptData.findIndex(
      seg => currentTime >= seg.start && currentTime <= seg.end
    );
  }, [video, currentTime]);

  const translationLang = useMemo(() => {
    if (language === 'en' || language === 'zh' || language === 'vi' || language === 'mn')
      return language;
    return undefined;
  }, [language]);

  // Auto-scroll
  useEffect(() => {
    if (activeSegmentIndex >= 0 && segmentRefs.current[activeSegmentIndex]) {
      segmentRefs.current[activeSegmentIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeSegmentIndex]);

  // Handlers
  const handleTimeUpdate = (detail: any) => {
    if (detail?.currentTime !== undefined) {
      setCurrentTime(detail.currentTime);
    }
  };

  const seekTo = (time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = time;
      playerRef.current.play();
    }
  };

  const handleWordClick = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    const clickedWord = normalizeLookupWord(word);
    if (!clickedWord) return;

    // Open Dictionary Sheet
    setIsDictionaryOpen(true);
    setSelectedWordObj({
      word: clickedWord,
      meaning: labels.dashboard?.common?.loading || 'Loading...',
    });

    const requestId = dictionaryRequestRef.current + 1;
    dictionaryRequestRef.current = requestId;

    const fallbackMeaning = labels.dashboard?.common?.noMeaning || 'No definition found';

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
        setSelectedWordObj({ word: clickedWord, meaning });
      } catch {
        if (dictionaryRequestRef.current !== requestId) return;
        setSelectedWordObj({ word: clickedWord, meaning: fallbackMeaning });
      }
    })();
  };

  if (!video && !convexVideo)
    return (
      <div className="p-8 text-center text-slate-500">
        <Loader2 className="animate-spin mx-auto" />
      </div>
    );
  if (!video) return <div className="p-8 text-center text-slate-500">Video not found</div>;

  return (
    <div className="flex flex-col h-[100dvh] bg-white">
      {/* 1. Stick Video Player at Top */}
      <div className="w-full aspect-video bg-black shrink-0 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 text-white bg-black/50 p-2 rounded-full backdrop-blur-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Suspense
          fallback={
            <div className="text-white flex items-center justify-center h-full">Loading...</div>
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
      </div>

      {/* 2. Controls & Info Bar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
        <div className="min-w-0">
          <h1 className="font-bold text-slate-900 text-lg truncate pr-2">{video.title}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {video.views}
            </span>
            {video.level && (
              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-bold uppercase">
                {video.level}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowTranslation(!showTranslation)}
          className={cn(
            'p-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 shrink-0',
            showTranslation ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
          )}
        >
          <Languages className="w-4 h-4" />
          {showTranslation ? 'On' : 'Off'}
        </button>
      </div>

      {/* 3. Scrollable Transcript List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50" ref={scrollAreaRef}>
        {!video.transcriptData || video.transcriptData.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Video className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No subtitles available</p>
          </div>
        ) : (
          video.transcriptData.map((segment, index) => {
            const isActive = index === activeSegmentIndex;
            return (
              <button
                key={index}
                ref={el => {
                  segmentRefs.current[index] = el;
                }}
                onClick={() => seekTo(segment.start)}
                className={cn(
                  'w-full text-left p-4 rounded-2xl transition-all duration-300 border-2',
                  isActive
                    ? 'bg-white border-indigo-500 shadow-lg scale-[1.02] z-10'
                    : 'bg-white border-transparent shadow-sm opacity-80'
                )}
              >
                <div className="text-lg font-medium text-slate-900 leading-relaxed mb-1">
                  {segment.text.split(/(\s+)/).map((part, i) => {
                    if (!part.trim()) return part;
                    return (
                      <span
                        key={i}
                        className="active:bg-yellow-200 rounded px-0.5 cursor-pointer"
                        onClick={e => handleWordClick(e, part)}
                      >
                        {part}
                      </span>
                    );
                  })}
                </div>
                {showTranslation && segment.translation && (
                  <div className="text-sm text-slate-500 font-medium">{segment.translation}</div>
                )}
              </button>
            );
          })
        )}
        {/* Bottom padding for safety */}
        <div className="h-20" />
      </div>

      {/* 4. Dictionary Sheet */}
      <MobileDictionarySheet
        isOpen={isDictionaryOpen}
        onClose={() => setIsDictionaryOpen(false)}
        word={selectedWordObj?.word || ''}
        meaning={selectedWordObj?.meaning || ''}
        onSave={async () => {
          if (selectedWordObj) {
            await saveWord(selectedWordObj.word, selectedWordObj.meaning);
            toast.success('Saved!');
          }
        }}
      />
    </div>
  );
};
