import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { Video as VideoIcon, Play, Eye, Clock, ChevronRight } from 'lucide-react';

import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { qRef } from '../../utils/convexRefs';
import { buildVideoPlayerPath } from '../../utils/videoRoutes';
import { formatSafeDateLabel } from '../../utils/dateLabel';
import { normalizePublicAssetUrl } from '../../utils/imageSrc';
import { KT, Chip, Card, type ChipTone } from './ksoft/ksoft';

type ConvexVideoItem = {
  _id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  level: string;
  duration?: number | null;
  views: number;
  createdAt: number;
};

type MediaTone = {
  readonly chipTone: ChipTone;
  readonly surface: string;
  readonly accent: string;
  readonly gradient: string;
  readonly deep: string;
  readonly seal: 'HD' | 'KR' | 'VOD';
};

const VIDEO_TONES: MediaTone[] = [
  {
    chipTone: 'sky',
    surface: `${KT.sky}55`,
    accent: KT.skyDeep,
    gradient: `linear-gradient(135deg, ${KT.sky} 0%, ${KT.lilac} 100%)`,
    deep: KT.skyDeep,
    seal: 'HD',
  },
  {
    chipTone: 'mint',
    surface: `${KT.mint}55`,
    accent: KT.mintDeep,
    gradient: `linear-gradient(135deg, ${KT.mint} 0%, ${KT.sky} 100%)`,
    deep: KT.mintDeep,
    seal: 'KR',
  },
  {
    chipTone: 'butter',
    surface: `${KT.butter}65`,
    accent: KT.butterDeep,
    gradient: `linear-gradient(135deg, ${KT.butter} 0%, ${KT.pink} 100%)`,
    deep: KT.butterDeep,
    seal: 'VOD',
  },
];

const clampTextStyle = (lines: number): React.CSSProperties => ({
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
});

const getVideoTone = (index: number): MediaTone => VIDEO_TONES[index % VIDEO_TONES.length];

const getLocale = (lang: string) => {
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'en') return 'en-US';
  if (lang === 'vi') return 'vi-VN';
  return 'mn-MN';
};

const EmptyMediaCard: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <Card pad={18}>
    <div style={{ textAlign: 'center', padding: '10px 6px' }}>
      <div
        style={{
          fontFamily: KT.serif,
          fontSize: 13,
          color: KT.crimson,
          letterSpacing: 3,
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        EMPTY
      </div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 800,
          color: KT.ink,
          lineHeight: 1.3,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 12,
          color: KT.sub,
          lineHeight: 1.6,
          marginTop: 8,
        }}
      >
        {description}
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: 14,
            padding: '10px 18px',
            borderRadius: 999,
            border: `1px solid ${KT.line}`,
            background: KT.bg,
            color: KT.ink,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.4,
            fontFamily: KT.font,
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  </Card>
);

type MobileVideoTabProps = {
  active: boolean;
  language: string;
};

export function MobileVideoTab({ active, language }: Readonly<MobileVideoTabProps>) {
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [activeLevel, setActiveLevel] = useState('');
  const currentPath = `${location.pathname}${location.search}`;

  const convexVideos = useQuery(
    qRef<{ level?: string }, ConvexVideoItem[]>('videos:list'),
    activeLevel ? { level: activeLevel } : {}
  );

  const videos = useMemo(() => {
    if (!convexVideos) return [];
    return convexVideos.map(video => ({
      ...video,
      id: video._id,
      thumbnailUrl: normalizePublicAssetUrl(video.thumbnailUrl) || undefined,
    }));
  }, [convexVideos]);

  const loading = convexVideos === undefined;
  const hasVideoError = !loading && activeLevel !== '' && videos.length === 0;

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'Beginner':
        return t('dashboard.video.beginner', { defaultValue: 'Beginner' });
      case 'Intermediate':
        return t('dashboard.video.intermediate', { defaultValue: 'Intermediate' });
      case 'Advanced':
        return t('dashboard.video.advanced', { defaultValue: 'Advanced' });
      default:
        return level;
    }
  };

  if (!active) return null;

  return (
    <div
      className="h-full overflow-y-auto no-scrollbar px-[18px] pb-mobile-nav pt-4 animate-in fade-in slide-in-from-right-4 duration-300"
      style={{ touchAction: 'pan-y', maxWidth: '100%', overflowX: 'hidden' }}
    >
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Chip tone="sky">
              {loading
                ? t('loading', { defaultValue: '...' })
                : t('media.videoCountLabel', {
                    defaultValue: '{{count}} Lessons',
                    count: videos.length,
                  })}
            </Chip>
            {activeLevel ? <Chip tone="muted">{getLevelLabel(activeLevel)}</Chip> : null}
          </div>
          <button
            type="button"
            onClick={() => setActiveLevel('')}
            style={{
              height: 30,
              padding: '0 12px',
              borderRadius: 999,
              border: `1px solid ${KT.line}`,
              background: KT.bg,
              color: KT.ink,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.4,
              fontFamily: KT.font,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {t('common.reset', { defaultValue: 'All' })}
          </button>
        </div>

        <div
          className="hide-scroll"
          style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}
        >
          {[
            { key: '', label: t('notes.tabs.all', { defaultValue: 'All' }) },
            { key: 'Beginner', label: t('dashboard.video.beginner', { defaultValue: 'Beginner' }) },
            {
              key: 'Intermediate',
              label: t('dashboard.video.intermediate', { defaultValue: 'Intermediate' }),
            },
            { key: 'Advanced', label: t('dashboard.video.advanced', { defaultValue: 'Advanced' }) },
          ].map(level => {
            const activeLevelFilter = activeLevel === level.key;
            return (
              <button
                key={level.key}
                type="button"
                onClick={() => setActiveLevel(level.key)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '10px 16px',
                  borderRadius: 18,
                  border: activeLevelFilter ? 'none' : `1px solid ${KT.line}`,
                  background: activeLevelFilter ? KT.ink : KT.card,
                  color: activeLevelFilter ? KT.card : KT.ink,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.4,
                  fontFamily: KT.font,
                  boxShadow: activeLevelFilter ? KT.shSm : 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {level.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(item => (
            <Card key={item} pad={0} style={{ overflow: 'hidden' }}>
              <div className="aspect-video animate-pulse" style={{ background: KT.bg2 }} />
              <div style={{ padding: 18 }}>
                <div
                  className="animate-pulse"
                  style={{ height: 12, width: 84, borderRadius: 999, background: KT.bg2 }}
                />
                <div
                  className="animate-pulse"
                  style={{
                    height: 22,
                    width: '78%',
                    borderRadius: 999,
                    background: KT.bg2,
                    marginTop: 12,
                  }}
                />
                <div
                  className="animate-pulse"
                  style={{
                    height: 12,
                    width: '56%',
                    borderRadius: 999,
                    background: KT.bg2,
                    marginTop: 10,
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <div
                    className="animate-pulse"
                    style={{ height: 32, width: 84, borderRadius: 999, background: KT.bg2 }}
                  />
                  <div
                    className="animate-pulse"
                    style={{ height: 32, width: 84, borderRadius: 999, background: KT.bg2 }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <EmptyMediaCard
          title={
            hasVideoError
              ? t('dashboard.video.noVideosForLevel', {
                  defaultValue: 'No videos found for this level. Try another filter.',
                })
              : t('dashboard.video.noVideos', { defaultValue: 'No videos found' })
          }
          description={t('media.videoEmptyHint', {
            defaultValue: 'Try another level or reset filters to browse the full lesson library.',
          })}
          actionLabel={
            hasVideoError ? t('common.viewAll', { defaultValue: 'View All' }) : undefined
          }
          onAction={hasVideoError ? () => setActiveLevel('') : undefined}
        />
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {videos.map((video, index) => {
            const tone = getVideoTone(index);
            return (
              <button
                key={video.id}
                onClick={() => navigate(buildVideoPlayerPath(video.id, currentPath))}
                style={{
                  width: '100%',
                  overflow: 'hidden',
                  borderRadius: 26,
                  border: `1px solid ${KT.line}`,
                  background: KT.card,
                  textAlign: 'left',
                  boxShadow: KT.shSm,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '16 / 9',
                    overflow: 'hidden',
                    background: video.thumbnailUrl ? tone.surface : tone.gradient,
                  }}
                >
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        placeItems: 'center',
                        color: tone.accent,
                      }}
                    >
                      <VideoIcon size={42} />
                    </div>
                  )}

                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, rgba(31,27,23,0.04) 0%, rgba(31,27,23,0.42) 100%)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'repeating-linear-gradient(45deg, transparent 0, transparent 12px, rgba(255,255,255,0.05) 12px, rgba(255,255,255,0.05) 13px)',
                      opacity: video.thumbnailUrl ? 0.45 : 0.8,
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 14,
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Chip tone={tone.chipTone}>{getLevelLabel(video.level)}</Chip>
                    <div
                      style={{
                        padding: '5px 10px',
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.16)',
                        color: KT.card,
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: 0.4,
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      {formatDuration(video.duration)}
                    </div>
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      fontFamily: KT.serif,
                      fontSize: 54,
                      color: 'rgba(255,255,255,0.14)',
                      fontWeight: 500,
                      lineHeight: 1,
                    }}
                  >
                    {tone.seal}
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.16)',
                        color: KT.card,
                        display: 'grid',
                        placeItems: 'center',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.24)',
                      }}
                    >
                      <Play size={22} fill="currentColor" />
                    </div>
                  </div>
                </div>

                <div style={{ padding: 18 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: KT.serif,
                        fontSize: 13,
                        color: tone.deep,
                        fontWeight: 500,
                      }}
                    >
                      {tone.seal}
                    </span>
                    <span
                      style={{ fontSize: 10, color: KT.sub, fontWeight: 800, letterSpacing: 0.8 }}
                    >
                      {t('nav.videos', { defaultValue: 'Videos' }).toUpperCase()}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      lineHeight: 1.3,
                      color: KT.ink,
                      letterSpacing: -0.4,
                      ...clampTextStyle(2),
                    }}
                  >
                    {video.title}
                  </div>
                  {video.description ? (
                    <div
                      style={{
                        fontSize: 13,
                        color: KT.sub,
                        lineHeight: 1.6,
                        marginTop: 8,
                        ...clampTextStyle(2),
                      }}
                    >
                      {video.description}
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      marginTop: 14,
                      borderTop: `1px solid ${KT.line}`,
                      paddingTop: 14,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          color: KT.sub,
                          fontWeight: 800,
                          letterSpacing: 0.5,
                        }}
                      >
                        <Eye size={13} />
                        {video.views}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          color: KT.sub,
                          fontWeight: 800,
                          letterSpacing: 0.5,
                        }}
                      >
                        <Clock size={13} />
                        {formatSafeDateLabel(
                          video.createdAt,
                          getLocale(language),
                          t('common.recently', { defaultValue: 'Recently' }),
                          { month: 'short', day: 'numeric' }
                        )}
                      </span>
                    </div>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        background: KT.bg2,
                        color: KT.sub,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
