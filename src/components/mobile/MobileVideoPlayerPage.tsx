import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Video, Loader2, Eye, Languages, Clock } from 'lucide-react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { useAuth } from '../../contexts/AuthContext';
import { getLabels } from '../../utils/i18n';
import type { MediaPlayerInstance, MediaTimeUpdateEventDetail } from '@vidstack/react';
import { aRef, ENTITLEMENTS, qRef } from '../../utils/convexRefs';
// Use existing MobileDictionarySheet
import { MobileDictionarySheet } from './MobileDictionarySheet';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { extractBestMeaning, normalizeLookupWord } from '../../utils/dictionaryMeaning';
import { useUserActions } from '../../hooks/useUserActions';
import { cn } from '../../lib/utils';
import { Button } from '../ui';
import { useUpgradeFlow } from '../../hooks/useUpgradeFlow';
import { getEntitlementErrorData } from '../../utils/entitlements';
import { notify } from '../../utils/notify';
import { hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';
import { buildVideoPlayerPath } from '../../utils/videoRoutes';
import { MobileImmersiveHeader } from './MobileImmersiveHeader';
import { normalizePublicAssetUrl } from '../../utils/imageSrc';

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

import { useTranslation } from 'react-i18next';

export const MobileVideoPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const { language, user, viewerAccess } = useAuth();
  const { startUpgradeFlow } = useUpgradeFlow();
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
  const consumeMediaPlay = useMutation(ENTITLEMENTS.consumeMediaPlay);

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
  const [unlockedPlaybackKey, setUnlockedPlaybackKey] = useState<string | null>(null);
  const playbackResourceKey = id ? `video:${id}` : null;
  const playbackUnlocked =
    playbackResourceKey !== null && unlockedPlaybackKey === playbackResourceKey;
  const backPath = useMemo(
    () => resolveSafeReturnTo(searchParams.get('returnTo'), '/videos'),
    [searchParams]
  );
  const canReturnTo = useMemo(() => hasSafeReturnTo(searchParams.get('returnTo')), [searchParams]);
  const upgradeReturnTarget = useMemo(() => {
    if (!id) return '/videos';
    return buildVideoPlayerPath(id, backPath);
  }, [id, backPath]);

  // Memoized Data
  const video = useMemo<VideoData | null>(() => {
    if (!convexVideo) return null;
    return {
      ...convexVideo,
      id: convexVideo._id,
      videoUrl: normalizePublicAssetUrl(convexVideo.videoUrl) || convexVideo.videoUrl,
      thumbnailUrl: normalizePublicAssetUrl(convexVideo.thumbnailUrl) || undefined,
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

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSegmentTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
  const handleTimeUpdate = (detail: MediaTimeUpdateEventDetail) => {
    setCurrentTime(detail.currentTime);
  };

  const seekTo = (time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = time;
      playerRef.current.play();
    }
  };

  const ensurePlaybackAccess = async (): Promise<boolean> => {
    if (viewerAccess?.isPremium) return true;
    if (playbackUnlocked) return true;

    if (!user) {
      startUpgradeFlow({
        plan: 'ANNUAL',
        source: 'media_limit',
        returnTo: upgradeReturnTarget,
      });
      return false;
    }

    try {
      if (!playbackResourceKey) return false;
      await consumeMediaPlay({ resourceKey: playbackResourceKey });
      setUnlockedPlaybackKey(playbackResourceKey);
      return true;
    } catch (error) {
      const entitlementError = getEntitlementErrorData(error);
      if (playerRef.current) {
        playerRef.current.pause();
      }
      if (entitlementError?.upgradeSource) {
        startUpgradeFlow({
          plan: 'ANNUAL',
          source: entitlementError.upgradeSource,
          returnTo: upgradeReturnTarget,
        });
        return false;
      }
      notify.error(
        t('dashboard.video.playbackLocked', { defaultValue: 'Playback is unavailable.' })
      );
      return false;
    }
  };

  const handleWordClick = (e: React.MouseEvent | React.KeyboardEvent, word: string) => {
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
      <div className="p-8 text-center text-muted-foreground">
        <Loader2 className="animate-spin mx-auto" />
      </div>
    );
  if (!video)
    return (
      <div className="p-8 text-center text-muted-foreground">{t('dashboard.video.notFound')}</div>
    );

  return (
    <div className="flex h-[100dvh] flex-col bg-[#f3f7ff] dark:bg-slate-950">
      {/* 1. Stick Video Player at Top */}
      <div className="w-full aspect-video bg-black shrink-0 relative z-10">
        <Suspense
          fallback={
            <div className="text-white flex items-center justify-center h-full">
              {t('dashboard.common.loading', { defaultValue: 'Loading...' })}
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
            onPlay={() => {
              void ensurePlaybackAccess();
            }}
            playbackRates={viewerAccess?.flags.mediaSpeedControl ? undefined : [1]}
          />
        </Suspense>
      </div>

      {/* 2. Controls & Info Bar */}
      <MobileImmersiveHeader
        title={video.title}
        subtitle={video.description}
        eyebrow={t('nav.videos', { defaultValue: 'Videos' })}
        onBack={() => {
          if (canReturnTo) {
            navigate(backPath);
            return;
          }
          navigate(-1);
        }}
        backLabel={t('common.back', { defaultValue: 'Back' })}
        className="relative z-20 border-b border-slate-200/80 bg-white/95 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950/92"
        status={
          video.level ? (
            <div className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 shadow-sm dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-200">
              {video.level}
            </div>
          ) : null
        }
        actions={
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setShowTranslation(!showTranslation)}
            className={cn(
              'flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[11px] font-black tracking-[0.08em] shadow-sm transition-colors',
              showTranslation
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-300/20 dark:bg-indigo-400/14 dark:text-indigo-200'
                : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            )}
          >
            <Languages className="h-4 w-4" />
            {showTranslation
              ? t('common.on', { defaultValue: 'On' })
              : t('common.off', { defaultValue: 'Off' })}
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black tracking-[0.12em] text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <Eye className="h-3.5 w-3.5" />
              <span>{video.views}</span>
            </div>
            {video.duration ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black tracking-[0.12em] text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDuration(video.duration)}</span>
              </div>
            ) : null}
          </div>
        </div>
      </MobileImmersiveHeader>

      {/* 3. Scrollable Transcript List */}
      <div
        className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_100%)] px-4 pb-mobile-safe pt-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]"
        ref={scrollAreaRef}
      >
        {!video.transcriptData || video.transcriptData.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>{t('dashboard.video.noSubtitles', { defaultValue: 'No subtitles available' })}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {video.transcriptData.map((segment, index) => {
              const isActive = index === activeSegmentIndex;
              return (
                <Button
                  variant="ghost"
                  size="auto"
                  key={index}
                  ref={el => {
                    segmentRefs.current[index] = el;
                  }}
                  onClick={() => seekTo(segment.start)}
                  className={cn(
                    'flex w-full flex-col items-stretch justify-start whitespace-normal overflow-hidden rounded-[26px] border px-4 py-3 text-left transition-all duration-200',
                    isActive
                      ? 'border-indigo-300 bg-white shadow-[0_18px_40px_-28px_rgba(99,102,241,0.7)] dark:border-indigo-400/35 dark:bg-slate-900'
                      : 'border-slate-200/80 bg-white/88 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/92'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.16em]',
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      <span>{formatSegmentTime(segment.start)}</span>
                    </div>
                    <div
                      className={cn(
                        'text-[10px] font-black uppercase tracking-[0.16em]',
                        isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400'
                      )}
                    >
                      {isActive
                        ? t('common.now', { defaultValue: 'Now' })
                        : t('dashboard.video.jumpToLine', { defaultValue: 'Jump' })}
                    </div>
                  </div>

                  <div className="mt-3 w-full break-words text-[0.98rem] font-semibold leading-7 text-slate-800 dark:text-slate-100">
                    {segment.text.split(/(\s+)/).map((part, i) => {
                      if (!part.trim()) return part;
                      return (
                        <span
                          key={i}
                          className={cn(
                            'cursor-pointer rounded-md px-0.5 py-0.5 transition-colors active:bg-yellow-100 dark:active:bg-yellow-500/20',
                            isActive && 'text-slate-950 dark:text-white'
                          )}
                          role="button"
                          tabIndex={0}
                          onClick={e => handleWordClick(e, part)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              handleWordClick(e, part);
                            }
                          }}
                        >
                          {part}
                        </span>
                      );
                    })}
                  </div>

                  {showTranslation && segment.translation ? (
                    <div className="mt-3 w-full rounded-2xl bg-slate-50/90 px-3 py-2 text-left text-[13px] font-medium leading-5 text-slate-500 dark:bg-slate-800/80 dark:text-slate-300">
                      {segment.translation}
                    </div>
                  ) : null}
                </Button>
              );
            })}
          </div>
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
