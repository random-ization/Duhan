import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { DRail } from '../../components/desktop/ui/DRail';
import { qRef, READING_BOOKS, NEWS, READING_LIBRARY, NoArgs } from '../../utils/convexRefs';
import { buildPodcastChannelPath } from '../../utils/podcastRoutes';
import { buildEpubLibraryPath, buildReadingArticlePath } from '../../utils/readingRoutes';

// 类型定义
interface PodcastChannel {
  id?: string;
  _id: string;
  title: string;
  author?: string;
  artworkUrl?: string;
  episodeCount?: number;
}

interface VideoItem {
  id?: string;
  _id: string;
  title: string;
  description?: string;
  duration?: number;
  createdAt?: number;
  thumbnailUrl?: string;
  level?: string;
}

interface ListeningHistoryItem {
  _id: string;
  episodeGuid: string;
  episodeTitle: string;
  episodeUrl: string;
  channelName: string;
  channelImage: string | null;
  playedAt: number;
  progress: number;
  duration?: number;
}

interface TrendingResult {
  internal: (PodcastChannel & { _id: string })[];
  external: (PodcastChannel & { _id: string })[];
}

interface PublishedReadingBook {
  _id: string;
  title: string;
  slug: string;
  levelLabel?: string;
  readingMinutes?: number;
  coverImageUrl?: string;
}

interface NewsFeedItem {
  _id: string;
  title: string;
  publishedAt?: number | string;
  sourceKey?: string;
}

interface NewsFeedResult {
  news: NewsFeedItem[];
}

interface UploadedEpubBook {
  _id: string;
  title: string;
  slug: string;
  author?: string;
  coverImageUrl?: string;
}

interface CatalogItem {
  _id: string;
  title: string;
  channelName?: string;
  episodeNumber: number;
  durationSec: number;
}

type MediaTab = 'pod' | 'vid' | 'rd' | 'pic';
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

// 格式化时长
function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function DesktopMediaHubPage() {
  const { t } = useTranslation('public');
  const navigate = useLocalizedNavigate();
  const [activeTab, setActiveTab] = useState<MediaTab>('pod');
  const [selectedLevel, setSelectedLevel] = useState<DifficultyFilter>('all');

  const tabs: ReadonlyArray<{ id: MediaTab; l: string; k: string }> = [
    { id: 'pod', l: t('coursesOverview.desktop.mediaHub.podcasts'), k: '聲' },
    { id: 'vid', l: t('coursesOverview.desktop.mediaHub.videos'), k: '映' },
    { id: 'rd', l: t('coursesOverview.desktop.mediaHub.reading'), k: '讀' },
    { id: 'pic', l: t('coursesOverview.desktop.mediaHub.pictureBooks'), k: '畵' },
  ];

  // 获取各种媒体数据
  const readingBooks = useQuery(READING_BOOKS.listPublishedBooks, {}) as
    | PublishedReadingBook[]
    | undefined;
  const newsFeed = useQuery(NEWS.getUserFeed, { newsLimit: 4, articleLimit: 8 }) as
    | NewsFeedResult
    | undefined;
  const myUploads = useQuery(READING_LIBRARY.getMyUploads, {}) as UploadedEpubBook[] | undefined;

  // 修正：添加缺失的查询逻辑
  const podcastHistory = useQuery(qRef<NoArgs, ListeningHistoryItem[]>('podcasts:getHistory'), {});
  const trendingPodcasts = useQuery(qRef<NoArgs, TrendingResult>('podcasts:getTrending'), {});
  const playlists = useQuery(qRef<NoArgs, PodcastChannel[]>('podcasts:getSubscriptions'), {}) ?? [];
  const videos = useQuery(qRef<{ level?: string }, VideoItem[]>('videos:list'), {
    level: selectedLevel === 'all' ? undefined : selectedLevel,
  });

  // 修正：计算 catalogItems
  const catalogItems = useMemo<CatalogItem[]>(() => {
    if (activeTab === 'pod') {
      if (!trendingPodcasts) return [];
      // 这里简单合并内外播客，或者根据需要展示
      return [...trendingPodcasts.internal, ...trendingPodcasts.external].map(p => ({
        ...p,
        episodeNumber: p.episodeCount || 0,
        durationSec: 0, // 频道通常没有总时长，此处为占位
      }));
    }
    if (activeTab === 'vid') {
      return (videos || []).map(v => ({
        ...v,
        episodeNumber: 0,
        durationSec: v.duration || 0,
        channelName: 'Duhan Video',
      }));
    }
    return [];
  }, [activeTab, trendingPodcasts, videos]);

  // 当前继续播放的内容
  const continuePlaying = useMemo(() => {
    if (activeTab === 'pod' && Array.isArray(podcastHistory) && podcastHistory.length > 0) {
      const last = podcastHistory[0];
      return {
        type: 'podcast',
        title: last.episodeTitle,
        channelName: last.channelName,
        durationSec: last.duration || 0,
        progressSec: last.progress || 0,
        episodeNumber: 0,
        level: t('common.intermediate', 'Intermediate'),
      };
    }
    // 如果是阅读标签，可以显示最近阅读的书籍
    if (
      (activeTab === 'rd' || activeTab === 'pic') &&
      Array.isArray(readingBooks) &&
      readingBooks.length > 0
    ) {
      const book = readingBooks[0];
      return {
        type: 'reading',
        title: book.title,
        channelName: book.levelLabel || t('common.reading', 'Reading'),
        durationSec: (book.readingMinutes || 5) * 60,
        progressSec: 0,
        episodeNumber: 0,
        level: book.levelLabel || 'N1',
        slug: book.slug,
      };
    }
    return null;
  }, [activeTab, podcastHistory, readingBooks, t]);

  const content = (
    <div>
      {/* Tabs + Filters */}
      <div className="mb-[22px] flex gap-2">
        {tabs.map(x => {
          const on = activeTab === x.id;
          return (
            <button
              key={x.id}
              onClick={() => setActiveTab(x.id)}
              className="flex cursor-pointer items-center gap-2 rounded-xl border-none px-[18px] py-[10px] text-[12px] font-extrabold transition-colors"
              style={{
                background: on ? 'var(--color-k-ink)' : 'var(--color-k-card)',
                color: on ? 'var(--color-k-bg)' : 'var(--color-k-ink)',
                boxShadow: on ? 'none' : 'var(--shadow-k-sh-sm)',
              }}
            >
              <span className="font-k-serif text-[14px] font-medium opacity-70">{x.k}</span>
              <span>{x.l}</span>
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={() =>
            setSelectedLevel(
              selectedLevel === 'all'
                ? 'beginner'
                : selectedLevel === 'beginner'
                  ? 'intermediate'
                  : selectedLevel === 'intermediate'
                    ? 'advanced'
                    : 'all'
            )
          }
          className="cursor-pointer rounded-xl border border-[rgba(31,27,23,0.1)] bg-k-card px-3.5 py-2.5 text-[12px] font-bold text-k-ink shadow-sm hover:bg-k-bg2"
        >
          {t('coursesOverview.desktop.mediaHub.difficulty')} ▾{' '}
          {t(`coursesOverview.desktop.mediaHub.${selectedLevel}`)}
        </button>
      </div>

      {/* Hero Section */}
      {continuePlaying && (
        <DesktopCard pad={0} className="mb-[22px] overflow-hidden">
          <div className="flex">
            <div
              className="relative h-[220px] w-[280px] shrink-0"
              style={{
                background:
                  activeTab === 'pod'
                    ? 'linear-gradient(135deg, var(--color-k-indigo) 0%, rgba(162,59,46,0.8) 100%)'
                    : 'linear-gradient(135deg, var(--color-k-crimson) 0%, var(--color-k-lilac) 100%)',
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'repeating-linear-gradient(45deg, transparent 0, transparent 18px, rgba(255,255,255,0.06) 18px, rgba(255,255,255,0.06) 19px)',
                }}
              />
              <div className="absolute right-[22px] top-[18px] font-k-serif text-[100px] font-medium leading-[1] text-[rgba(255,255,255,0.18)]">
                {activeTab === 'pod' ? '話' : '讀'}
              </div>
              <div className="absolute bottom-[18px] left-[22px]">
                <DesignChip tone="ink" size="sm">
                  {continuePlaying.type === 'podcast'
                    ? `EP.${continuePlaying.episodeNumber}`
                    : continuePlaying.level}{' '}
                  ·{' '}
                  {continuePlaying.progressSec > 0
                    ? t('common.playing', 'Playing')
                    : t('common.notStarted', 'Not Started')}
                </DesignChip>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-[22px]">
              <div className="text-[11px] font-extrabold tracking-[1.5px] text-k-crimson uppercase">
                {activeTab === 'pod'
                  ? t('coursesOverview.desktop.mediaHub.continueListening')
                  : t('common.continueReading', { defaultValue: 'Continue Reading' })}
              </div>
              <div className="mt-1.5 text-[22px] font-extrabold tracking-[-0.5px] text-k-ink line-clamp-1">
                {continuePlaying.title}
              </div>
              <div className="mt-1 text-[12px] font-semibold text-k-sub">
                {continuePlaying.channelName || t('common.unknownSource', 'Unknown Source')} ·{' '}
                {continuePlaying.type === 'podcast'
                  ? formatDuration(continuePlaying.durationSec)
                  : `${Math.round(continuePlaying.durationSec / 60)} 分钟`}{' '}
                · {continuePlaying.level}
              </div>
              <div className="flex-1" />
              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[rgba(31,27,23,0.1)]">
                <div
                  className="h-full bg-k-ink"
                  style={{
                    width:
                      continuePlaying.progressSec > 0
                        ? `${(continuePlaying.progressSec / (continuePlaying.durationSec || 1)) * 100}%`
                        : '0%',
                  }}
                />
              </div>
              <div className="mt-3.5 flex items-center gap-2.5">
                <button
                  onClick={() =>
                    navigate(
                      continuePlaying.type === 'podcast'
                        ? '/podcasts/player'
                        : `/reading/books/${continuePlaying.slug}`
                    )
                  }
                  className="px-6 py-2.5 cursor-pointer rounded-xl border-none bg-k-ink text-[13px] font-black text-k-bg hover:bg-k-ink/90 active:scale-95 transition-all"
                >
                  {continuePlaying.type === 'podcast' ? '立即收听' : '开始阅读'} →
                </button>
                <div className="flex-1" />
                <DesignChip tone="muted" size="sm">
                  {continuePlaying.type === 'podcast'
                    ? t('coursesOverview.desktop.podcast.bilingual')
                    : '精选内容'}
                </DesignChip>
              </div>
            </div>
          </div>
        </DesktopCard>
      )}

      {/* Grid Sections */}
      {activeTab === 'pod' || activeTab === 'vid' ? (
        <section>
          <div className="mb-3 flex items-baseline">
            <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">列</span>
            <span className="text-[14px] font-extrabold text-k-ink">
              {activeTab === 'pod'
                ? t('coursesOverview.desktop.mediaHub.trendingPodcasts')
                : t('coursesOverview.desktop.mediaHub.trendingVideos')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-[14px]">
            {catalogItems.map((item, i) => (
              <DesktopCard
                key={item._id || i}
                pad={0}
                className="overflow-hidden cursor-pointer hover:shadow-k-sh transition-shadow group"
                onClick={() =>
                  navigate(
                    activeTab === 'pod'
                      ? buildPodcastChannelPath({ _id: item._id })
                      : `/video/${item._id}`
                  )
                }
              >
                <div
                  className="relative h-24 overflow-hidden"
                  style={{
                    background: `var(--color-k-${['pink', 'mint', 'butter', 'lilac', 'sky'][i % 5]})`,
                  }}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                  <div className="absolute inset-0 grid place-items-center font-k-serif text-[36px] font-medium text-k-ink opacity-20">
                    {item.episodeNumber > 0 ? item.episodeNumber : i + 1}
                  </div>
                  {item.durationSec > 0 && (
                    <div className="absolute right-2 top-2">
                      <DesignChip tone="ink" size="sm" className="bg-k-ink/70 backdrop-blur-sm">
                        {formatDuration(item.durationSec)}
                      </DesignChip>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-[13px] font-extrabold leading-[1.3] tracking-[-0.2px] text-k-ink group-hover:text-k-crimson transition-colors line-clamp-1">
                    {item.title}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-k-sub">
                    {item.channelName || t('common.unknownSource', 'Unknown Source')}
                  </div>
                </div>
              </DesktopCard>
            ))}
          </div>
        </section>
      ) : activeTab === 'pic' ? (
        <section>
          <div className="mb-3 flex items-baseline">
            <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">畵</span>
            <span className="text-[14px] font-extrabold text-k-ink">精选绘本</span>
          </div>
          <div className="grid grid-cols-3 gap-[14px]">
            {Array.isArray(readingBooks) &&
              readingBooks.slice(0, 9).map(book => (
                <DesktopCard
                  key={book._id}
                  pad={0}
                  className="overflow-hidden cursor-pointer hover:shadow-k-sh transition-shadow group"
                  onClick={() => navigate(`/reading/books/${book.slug}`)}
                >
                  <div className="relative aspect-video overflow-hidden bg-k-bg2">
                    {book.coverImageUrl ? (
                      <img
                        src={book.coverImageUrl}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center font-k-serif text-[40px] text-k-ink/10">
                        閱
                      </div>
                    )}
                    <div className="absolute right-2 top-2">
                      <DesignChip tone="ink" size="sm" className="bg-k-ink/70 backdrop-blur-sm">
                        {book.levelLabel}
                      </DesignChip>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-[13px] font-extrabold text-k-ink group-hover:text-k-crimson transition-colors line-clamp-1">
                      {book.title}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-k-sub">
                      {book.levelLabel || 'Duhan Reading'} · {book.readingMinutes || 5} min
                    </div>
                  </div>
                </DesktopCard>
              ))}
          </div>
        </section>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <div className="flex items-baseline">
                <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">新</span>
                <span className="text-[14px] font-extrabold text-k-ink">实时新闻</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-[14px]">
              {newsFeed?.news?.slice(0, 4).map(item => (
                <DesktopCard
                  key={item._id}
                  className="group cursor-pointer hover:bg-k-bg2/30 transition-colors"
                  onClick={() => navigate(buildReadingArticlePath(item._id))}
                >
                  <div className="text-[10px] font-black text-k-sub uppercase tracking-wider mb-1.5">
                    {item.sourceKey || 'News'}
                  </div>
                  <div className="text-[14px] font-extrabold text-k-ink group-hover:text-k-crimson transition-colors line-clamp-2 leading-snug mb-2">
                    {item.title}
                  </div>
                  <div className="text-[11px] font-bold text-k-sub opacity-70">
                    {item.publishedAt
                      ? new Date(item.publishedAt).toLocaleDateString()
                      : t('common.recently', 'Recently')}
                  </div>
                </DesktopCard>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <div className="flex items-baseline">
                <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">庫</span>
                <span className="text-[14px] font-extrabold text-k-ink">我的电子书柜</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-[14px]">
              {Array.isArray(myUploads) &&
                myUploads.slice(0, 3).map(book => (
                  <DesktopCard
                    key={book._id}
                    pad={12}
                    className="cursor-pointer group hover:bg-k-bg2/30 transition-colors"
                    onClick={() => navigate(buildEpubLibraryPath(book.slug))}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-14 rounded bg-k-bg2 shrink-0 border border-k-line/10 overflow-hidden">
                        {book.coverImageUrl && (
                          <img
                            src={book.coverImageUrl}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12px] font-extrabold text-k-ink truncate group-hover:text-k-crimson transition-colors">
                          {book.title}
                        </div>
                        <div className="text-[10px] font-bold text-k-sub mt-1">
                          {book.author || 'Private Book'}
                        </div>
                      </div>
                    </div>
                  </DesktopCard>
                ))}
              <button
                onClick={() => navigate('/reading/upload')}
                className="flex flex-col items-center justify-center gap-2 border border-dashed border-k-line rounded-2xl p-4 text-k-sub hover:text-k-ink hover:bg-k-bg2/50 transition-all"
              >
                <div className="text-xl">+</div>
                <div className="text-[11px] font-black uppercase tracking-wider">上传 EPUB</div>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );

  const right = (
    <div className="w-[320px] shrink-0 pl-[22px]">
      <DRail kanji="架" title={t('coursesOverview.desktop.mediaHub.mySubscriptions')} pad={0}>
        {playlists.length > 0 ? (
          playlists.map((p, i, a) => (
            <div
              key={p._id || i}
              onClick={() => navigate(buildPodcastChannelPath({ _id: p._id }))}
              className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 hover:bg-k-bg2/50 transition-colors"
              style={{ borderBottom: i < a.length - 1 ? '1px solid rgba(31,27,23,0.08)' : 'none' }}
            >
              <HanjaSeal c={p.title.charAt(0)} size={28} bg="var(--color-k-ink)" round={7} />
              <div className="flex-1 text-[12px] font-extrabold text-k-ink truncate">{p.title}</div>
              <span className="text-[10px] font-bold text-k-sub">
                {p.episodeCount ?? 0} {t('coursesOverview.desktop.mediaHub.episodes')}
              </span>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-[12px] font-semibold text-k-sub opacity-50">
            {t('coursesOverview.desktop.mediaHub.noSubscriptions')}
          </div>
        )}
      </DRail>

      <DRail kanji="新" title={t('coursesOverview.desktop.mediaHub.contentUpdates')} pad={14}>
        <div className="text-[12px] font-semibold leading-[1.5] text-[rgba(31,27,23,0.65)]">
          {t('coursesOverview.desktop.mediaHub.exploreMessage', {
            channelCount:
              (trendingPodcasts?.internal?.length || 0) + (trendingPodcasts?.external?.length || 0),
            videoCount: videos?.length ?? 0,
          })}
        </div>
      </DRail>
    </div>
  );

  return (
    <div className="flex font-sans p-2">
      <div className="flex-1">{content}</div>
      {right}
    </div>
  );
}
