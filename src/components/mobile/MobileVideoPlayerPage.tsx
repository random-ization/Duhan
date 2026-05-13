import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Video, Loader2, Eye, Languages, Clock } from 'lucide-react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { useAuth } from '../../contexts/AuthContext';
import { getLabels } from '../../utils/i18n';
import type { MediaPlayerInstance, MediaTimeUpdateEventDetail } from '@vidstack/react';
import { aRef, ENTITLEMENTS, mRef, qRef } from '../../utils/convexRefs';
import { MobileDictionarySheet } from './MobileDictionarySheet';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { extractBestMeaning, normalizeLookupWord } from '../../utils/dictionaryMeaning';
import { useUserActions } from '../../hooks/useUserActions';
import { useUpgradeFlow } from '../../hooks/useUpgradeFlow';
import { getEntitlementErrorData } from '../../utils/entitlements';
import { buildMediaPath } from '../../utils/mediaRoutes';
import { notify } from '../../utils/notify';
import { resolveSafeReturnTo } from '../../utils/navigation';
import { buildVideoPlayerPath } from '../../utils/videoRoutes';
import { MobileImmersiveHeader } from './MobileImmersiveHeader';
import { normalizePublicAssetUrl } from '../../utils/imageSrc';
import { KT } from './ksoft/ksoft';
import { useTranslation } from 'react-i18next';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';

const LazyVideoPlayer = React.lazy(() => import('../media/VidstackVideoPlayer'));

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

export const MobileVideoPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const { language, user, viewerAccess } = useAuth();
  const { startUpgradeFlow } = useUpgradeFlow();
  const { saveWord } = useUserActions();
  const labels = getLabels(language);
  const { settings: globalSettings, updateSettings: updateGlobalSettings } = useGlobalSettings();
  const playerRef = useRef<MediaPlayerInstance>(null);
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dictionaryRequestRef = useRef(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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
  const saveVideoProgress = useMutation(
    mRef<{ videoId: string; progress: number; duration?: number }, null>('videos:saveProgress')
  );

  const convexVideo = useQuery(
    qRef<{ id: string }, ConvexVideoDoc | null>('videos:get'),
    id ? { id } : 'skip'
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [showTranslation, setShowTranslation] = useState(
    () => globalSettings.mediaSubtitleMode === 'BILINGUAL'
  );
  const [autoScroll, setAutoScroll] = useState(() => globalSettings.mediaAutoScroll);
  const [selectedWordObj, setSelectedWordObj] = useState<{ word: string; meaning: string } | null>(
    null
  );
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [unlockedPlaybackKey, setUnlockedPlaybackKey] = useState<string | null>(null);
  const playbackResourceKey = id ? `video:${id}` : null;
  const playbackUnlocked =
    playbackResourceKey !== null && unlockedPlaybackKey === playbackResourceKey;
  const backPath = useMemo(
    () => resolveSafeReturnTo(searchParams.get('returnTo'), buildMediaPath('video')),
    [searchParams]
  );
  const upgradeReturnTarget = useMemo(() => {
    if (!id) return buildMediaPath('video');
    return buildVideoPlayerPath(id, backPath);
  }, [id, backPath]);

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

  useEffect(() => {
    if (autoScroll && activeSegmentIndex >= 0 && segmentRefs.current[activeSegmentIndex]) {
      segmentRefs.current[activeSegmentIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeSegmentIndex, autoScroll]);

  const lastSaveRef = useRef(0);
  const handleTimeUpdate = (detail: MediaTimeUpdateEventDetail) => {
    setCurrentTime(detail.currentTime);
    if (id && detail.currentTime - lastSaveRef.current >= 10) {
      lastSaveRef.current = detail.currentTime;
      saveVideoProgress({
        videoId: id,
        progress: detail.currentTime,
        duration: playerRef.current?.duration || undefined,
      }).catch(() => {});
    }
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
      startUpgradeFlow({ plan: 'ANNUAL', source: 'media_limit', returnTo: upgradeReturnTarget });
      return false;
    }

    try {
      if (!playbackResourceKey) return false;
      await consumeMediaPlay({ resourceKey: playbackResourceKey });
      setUnlockedPlaybackKey(playbackResourceKey);
      return true;
    } catch (error) {
      const entitlementError = getEntitlementErrorData(error);
      if (playerRef.current) playerRef.current.pause();
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
      <div style={{ padding: 32, textAlign: 'center', color: KT.sub, fontFamily: KT.font }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
      </div>
    );
  if (!video)
    return (
      <div style={{ padding: 32, textAlign: 'center', color: KT.sub, fontFamily: KT.font }}>
        {t('dashboard.video.notFound')}
      </div>
    );

  return (
    <div
      style={{
        display: 'flex',
        height: '100dvh',
        flexDirection: 'column',
        background: KT.bg,
        fontFamily: KT.font,
      }}
    >
      {/* 1. Video Player */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: '#000',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Suspense
          fallback={
            <div
              style={{
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                fontSize: 14,
              }}
            >
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

      {/* 2. Info Header */}
      <MobileImmersiveHeader
        title={video.title}
        subtitle={video.description}
        eyebrow={t('nav.videos', { defaultValue: 'Videos' })}
        onBack={() => navigate(backPath)}
        backLabel={t('common.back', { defaultValue: 'Back' })}
        status={
          video.level ? (
            <div
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: `1px solid ${KT.line2}`,
                background: KT.bg2,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: KT.sub,
              }}
            >
              {video.level}
            </div>
          ) : null
        }
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                const nextValue = !showTranslation;
                setShowTranslation(nextValue);
                void updateGlobalSettings({
                  mediaSubtitleMode: nextValue ? 'BILINGUAL' : 'SOURCE_ONLY',
                });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                height: 36,
                padding: '0 12px',
                borderRadius: 18,
                border: showTranslation ? `1px solid rgba(162,59,46,0.2)` : `1px solid ${KT.line}`,
                background: showTranslation ? 'rgba(162,59,46,0.08)' : KT.card,
                color: showTranslation ? KT.crimson : KT.sub,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: KT.font,
                letterSpacing: 0.5,
              }}
            >
              <Languages size={14} />
              {showTranslation ? '双语' : '原文'}
            </button>
            <button
              type="button"
              onClick={() => {
                const nextValue = !autoScroll;
                setAutoScroll(nextValue);
                void updateGlobalSettings({ mediaAutoScroll: nextValue });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                height: 36,
                padding: '0 12px',
                borderRadius: 18,
                border: autoScroll ? `1px solid rgba(162,59,46,0.2)` : `1px solid ${KT.line}`,
                background: autoScroll ? 'rgba(162,59,46,0.08)' : KT.card,
                color: autoScroll ? KT.crimson : KT.sub,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: KT.font,
                letterSpacing: 0.5,
              }}
            >
              <Clock size={14} />
              {autoScroll ? '跟随' : '手动'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 20,
              border: `1px solid ${KT.line}`,
              background: KT.bg2,
              fontSize: 11,
              fontWeight: 700,
              color: KT.sub,
              letterSpacing: 0.5,
            }}
          >
            <Eye size={12} />
            <span>{video.views}</span>
          </div>
          {video.duration ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 20,
                border: `1px solid ${KT.line}`,
                background: KT.bg2,
                fontSize: 11,
                fontWeight: 700,
                color: KT.sub,
                letterSpacing: 0.5,
              }}
            >
              <Clock size={12} />
              <span>{formatDuration(video.duration)}</span>
            </div>
          ) : null}
        </div>
      </MobileImmersiveHeader>

      {/* 3. Transcript */}
      <div
        ref={scrollAreaRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          background: KT.bg2,
          padding: '14px 16px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
        }}
      >
        {!video.transcriptData || video.transcriptData.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              color: KT.sub,
            }}
          >
            <Video style={{ width: 44, height: 44, margin: '0 auto 10px', opacity: 0.2 }} />
            <p style={{ fontSize: 14, fontWeight: 500 }}>
              {t('dashboard.video.noSubtitles', { defaultValue: 'No subtitles available' })}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {video.transcriptData.map((segment, index) => {
              const isActive = index === activeSegmentIndex;
              return (
                <button
                  type="button"
                  key={index}
                  ref={el => {
                    segmentRefs.current[index] = el;
                  }}
                  onClick={() => seekTo(segment.start)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: 20,
                    border: isActive ? `1px solid ${KT.line2}` : `1px solid ${KT.line}`,
                    background: isActive ? KT.card : `${KT.card}cc`,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? KT.sh : KT.shSm,
                    fontFamily: KT.font,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 8px',
                        borderRadius: 12,
                        background: isActive ? 'rgba(162,59,46,0.08)' : KT.bg2,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 1,
                        color: isActive ? KT.crimson : KT.sub,
                      }}
                    >
                      <Clock size={10} />
                      <span>{formatSegmentTime(segment.start)}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        color: isActive ? KT.crimson : KT.subLight,
                      }}
                    >
                      {isActive
                        ? t('common.now', { defaultValue: 'Now' })
                        : t('dashboard.video.jumpToLine', { defaultValue: 'Jump' })}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: isActive ? 600 : 500,
                      lineHeight: 1.7,
                      color: isActive ? KT.ink : KT.ink2,
                      wordBreak: 'break-word',
                    }}
                  >
                    {segment.text.split(/(\s+)/).map((part, i) => {
                      if (!part.trim()) return part;
                      return (
                        <span
                          key={i}
                          role="button"
                          tabIndex={0}
                          style={{ cursor: 'pointer', borderRadius: 4, padding: '1px 1px' }}
                          onClick={e => handleWordClick(e, part)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') handleWordClick(e, part);
                          }}
                        >
                          {part}
                        </span>
                      );
                    })}
                  </div>

                  {showTranslation && segment.translation ? (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: KT.bg2,
                        fontSize: 12,
                        fontWeight: 500,
                        lineHeight: 1.5,
                        color: KT.sub,
                      }}
                    >
                      {segment.translation}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ height: 20 }} />
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
