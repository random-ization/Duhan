import React from 'react';
import { useQuery } from 'convex/react';
import { useParams, useNavigate as useRouterNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';
import { qRef } from '../../utils/convexRefs';
import type { Doc, Id } from '../../../convex/_generated/dataModel';

type VideoItem = Doc<'videos'> & {
  id: Id<'videos'>;
  transcriptData?: Array<{ ko: string; cn: string; time: number }>;
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function DRail({ kanji, title, action, children, pad = 14 }: { 
  kanji?: string; 
  title: string; 
  action?: string; 
  children: React.ReactNode; 
  pad?: number 
}) {
  return (
    <div className="mb-[22px]">
      <div className="mb-2.5 flex items-baseline px-0.5">
        {kanji && (
          <span className="mr-1.5 font-k-serif text-[14px] font-medium text-k-crimson">
            {kanji}
          </span>
        )}
        <span className="text-[11px] font-extrabold tracking-[0.4px] text-k-ink">
          {title}
        </span>
        {action && (
          <span className="ml-auto text-[10px] font-bold text-k-sub cursor-pointer hover:text-k-ink">
            {action}
          </span>
        )}
      </div>
      <div className="rounded-[14px] bg-k-card shadow-k-sh-sm" style={{ padding: pad }}>
        {children}
      </div>
    </div>
  );
}

export default function DesktopVideoPlayerPage() {
  const { t, i18n } = useTranslation('public');
  const { videoId } = useParams<{ videoId: string }>();
  const routerNavigate = useRouterNavigate();
  const { settings: globalSettings } = useGlobalSettings();
  
  // 获取视频详情
  const video = useQuery(
    qRef<{ id: Id<'videos'> }, VideoItem | null>('videos:get'),
    videoId ? { id: videoId as Id<'videos'> } : 'skip'
  );
  
  // 获取推荐视频
  const recommendedVideos = useQuery(qRef<Record<string, never>, VideoItem[]>('videos:list'));

  function formatViews(views?: number): string {
    if (!views) return '0';
    if (i18n.language.startsWith('zh') && views >= 10000) return `${(views / 10000).toFixed(1)}${t('common.tenThousand')}`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}k`;
    return views.toString();
  }

  if (!videoId) {
    return (
      <div className="p-6">
        <div className="mb-4 text-[12px] font-bold text-k-sub">
          {t('coursesOverview.desktop.video.title')}
        </div>
        <DesktopCard pad={24}>
          <div className="text-center text-[14px] font-semibold text-k-sub">
            {t('coursesOverview.desktop.video.notSelected')}
          </div>
        </DesktopCard>
      </div>
    );
  }

  if (video === undefined) {
    return (
      <div className="p-6">
        <div className="mb-4 text-[12px] font-bold text-k-sub">
          {t('coursesOverview.desktop.video.title')} · {t('common.loading', 'Loading...')}
        </div>
        <DesktopCard pad={24}>
          <div className="text-center text-[14px] font-semibold text-k-sub">
            {t('coursesOverview.desktop.video.loading')}
          </div>
        </DesktopCard>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="p-6">
        <div className="mb-4 text-[12px] font-bold text-k-sub">
          {t('coursesOverview.desktop.video.title')} · {t('common.notFound', 'Not Found')}
        </div>
        <DesktopCard pad={24}>
          <div className="text-center">
            <div className="text-[18px] font-extrabold text-k-ink">{t('coursesOverview.desktop.video.notFound')}</div>
            <button
              onClick={() => routerNavigate('/media')}
              className="mt-4 cursor-pointer rounded-[11px] border-none bg-k-ink px-4 py-2 text-[12px] font-bold text-k-bg"
            >
              {t('coursesOverview.desktop.podcast.backToMedia')}
            </button>
          </div>
        </DesktopCard>
      </div>
    );
  }

  const transcript = video.transcriptData || [];
  const relatedVideos = recommendedVideos
    ?.filter(v => v.id !== video.id)
    .slice(0, 3) || [];

  // 提取视频中的生词（从字幕中获取唯一词汇）
  const vocabFromTranscript = transcript.length > 0 
    ? transcript.slice(0, 5).map(line => ({
        w: (line as any).text?.split(' ').slice(0, 2).join(' ') || '',
        m: (line as any).translation || (line as any).translationEn || '',
      }))
    : [
        { w: '한옥', m: t('common.hanok', 'Hanok') },
        { w: '마을', m: t('common.village', 'Village') },
        { w: '산책', m: t('common.walk', 'Walk') },
        { w: '골목', m: t('common.alley', 'Alley') },
        { w: '전통', m: t('common.tradition', 'Tradition') },
      ];

  return (
    <div className="p-6">
      <div className="mb-4 text-[12px] font-bold text-k-sub">
        {t('coursesOverview.desktop.video.title')} · {video.title || t('coursesOverview.desktop.video.title')}
      </div>
      
      <div className="grid grid-cols-[1fr_320px] gap-[18px]">
        <div>
          <DesktopCard pad={0} className="overflow-hidden">
            <div className="relative aspect-video overflow-hidden bg-k-ink">
              {video.thumbnailUrl ? (
                <img 
                  src={video.thumbnailUrl} 
                  alt={video.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div 
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg, var(--color-k-indigo) 0%, rgba(162,59,46,0.53) 100%)' }}
                />
              )}
              <div className="absolute inset-0 grid place-items-center">
                <button className="flex h-[80px] w-[80px] cursor-pointer items-center justify-center rounded-full border-none bg-[rgba(255,255,255,0.95)] text-[28px] text-k-ink transition-transform hover:scale-105">
                  ▶
                </button>
              </div>
              <div className="absolute left-[22px] top-[18px]">
                <DesignChip tone="ink" size="sm">
                  {formatDuration(video.duration)} · {video.level || t('common.intermediate', 'Intermediate')}
                </DesignChip>
              </div>
              
              <div
                className="absolute bottom-0 left-0 right-0 px-[22px] pb-[24px] pt-[60px]"
                style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}
              >
                {transcript.length > 0 && (
                  <div className="absolute bottom-[56px] left-[22px] right-[22px] rounded-[10px] bg-[rgba(0,0,0,0.5)] px-[18px] py-[14px] backdrop-blur-md">
                    <div className="font-k-serif text-[19px] font-medium tracking-[0.2px] text-k-card">
                      {(transcript[0] as any).ko}
                    </div>
                    {globalSettings.mediaSubtitleMode === 'BILINGUAL' ? (
                      <div className="mt-1 text-[12px] font-semibold text-[rgba(255,255,255,0.75)]">
                        {i18n.language === 'zh' ? (transcript[0] as any).cn : (transcript[0] as any).en}
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="h-1 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.2)]">
                  <div className="h-full w-[38%] bg-k-crimson" />
                </div>
              </div>
            </div>
            
            <div className="p-[22px]">
              <DesignChip tone="butter" size="sm">
                VLOG · {video.level || t('common.culturalVisit', 'Cultural Visit')}
              </DesignChip>
              <div className="mt-2.5 text-[22px] font-extrabold tracking-[-0.5px] text-k-ink">
                {video.title}
              </div>
              <div className="mt-1 text-[12px] font-semibold text-k-sub">
                {t('coursesOverview.desktop.podcast.channel')} · {video.level || t('common.channel', 'Channel')} · {formatViews(video.views)} {t('coursesOverview.desktop.video.views')}
              </div>
              <div className="mt-3 flex gap-1.5">
                {transcript.length > 0 && (
                  <DesignChip tone="muted" size="sm">📝 {t('coursesOverview.desktop.video.fullTranscript')}</DesignChip>
                )}
                <DesignChip tone="muted" size="sm">📚 {t('coursesOverview.desktop.video.vocabCount', { count: vocabFromTranscript.length })}</DesignChip>
                <DesignChip tone="muted" size="sm">⏱ {t('coursesOverview.desktop.video.slowPlayback')}</DesignChip>
              </div>
            </div>
          </DesktopCard>
        </div>

        <div>
          <DRail kanji="次" title={t('coursesOverview.desktop.video.videoVocab')} pad={0}>
            {vocabFromTranscript.map((v, i, a) => (
              <div
                key={i}
                className="flex justify-between px-[14px] py-[8px]"
                style={{ borderBottom: i < a.length - 1 ? '1px solid var(--color-k-line)' : 'none' }}
              >
                <span className="text-[13px] font-extrabold tracking-[-0.2px] text-k-ink">{v.w}</span>
                <span className="text-[11px] font-semibold text-k-sub">{v.m}</span>
              </div>
            ))}
          </DRail>

          <DRail kanji="薦" title={t('coursesOverview.desktop.video.relatedVideos')} pad={0}>
            {relatedVideos.length === 0 ? (
              <div className="px-[14px] py-8 text-center text-[12px] font-semibold text-k-sub">
                {t('coursesOverview.desktop.video.noRecommendations')}
              </div>
            ) : (
              relatedVideos.map((v, i, a) => (
                <div
                  key={v.id}
                  onClick={() => routerNavigate(`/video/${v.id}`)}
                  className="flex cursor-pointer items-center gap-[10px] px-[14px] py-[10px] transition-colors hover:bg-k-bg2"
                  style={{ borderBottom: i < a.length - 1 ? '1px solid var(--color-k-line)' : 'none' }}
                >
                  <div
                    className="h-[36px] w-[64px] shrink-0 rounded-md overflow-hidden"
                    style={{ 
                      background: v.thumbnailUrl 
                        ? `url(${v.thumbnailUrl}) center/cover` 
                        : ['var(--color-k-pink)', 'var(--color-k-mint)', 'var(--color-k-butter)'][i % 3] 
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-extrabold text-k-ink">
                      {v.title}
                    </div>
                    <div className="text-[10px] font-bold text-k-sub">
                      {formatDuration(v.duration)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </DRail>
        </div>
      </div>
    </div>
  );
}
