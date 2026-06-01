import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Search, Podcast, Loader2, ArrowLeft } from 'lucide-react';
import { useAction } from 'convex/react';
import { PodcastChannel } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getLabels, type Labels } from '../utils/i18n';
import { aRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobilePodcastSearch } from '../components/mobile/MobilePodcastSearch';
import { buildMediaPath } from '../utils/mediaRoutes';
import { buildPodcastChannelPath } from '../utils/podcastRoutes';
import { resolveSafeReturnTo } from '../utils/navigation';
import { DesktopCard } from '../components/desktop/ui/DesktopCard';
import { DesignChip } from '../components/desktop/ui/DesignChip';

interface SearchResultsContentProps {
  loading: boolean;
  error: string | null;
  results: PodcastChannel[];
  query: string;
  labels: Labels;
  navigate: (path: string) => void;
  buildChannelHref: (channel: PodcastChannel) => string;
}

const SearchResultsContent: React.FC<SearchResultsContentProps> = ({
  loading,
  error,
  results,
  query,
  labels,
  navigate,
  buildChannelHref,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-k-sub">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-k-crimson" />
        <p className="font-extrabold">{labels.podcast?.searching || '正在搜索...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <DesktopCard className="border border-k-crimson/20 bg-k-crimson/5">
        <div className="py-20 text-center font-bold text-k-crimson">
          <p>{error}</p>
        </div>
      </DesktopCard>
    );
  }

  if (results.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-k-line pb-4">
          <h2 className="text-[14px] font-extrabold text-k-sub">
            搜尋結果 <span className="opacity-50">({results.length})</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map(channel => (
            <DesktopCard
              key={channel.itunesId || channel.id}
              pad={16}
              onClick={() => navigate(buildChannelHref(channel))}
              className="flex items-center gap-5 border border-transparent hover:border-k-line hover:bg-k-card transition-all hover:shadow-k-sh-sm cursor-pointer group"
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 shadow-sm border border-k-line/10 transition-transform group-hover:scale-105">
                <img
                  src={channel.artworkUrl || channel.artwork}
                  alt={channel.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[16px] font-extrabold text-k-ink line-clamp-1 group-hover:text-k-crimson transition-colors">
                  {channel.title}
                </h3>
                <p className="text-[12px] font-bold text-k-sub line-clamp-1 mb-2">
                  {channel.author}
                </p>
                <DesignChip tone="muted" size="sm">
                  Podcast
                </DesignChip>
              </div>
            </DesktopCard>
          ))}
        </div>
      </div>
    );
  }

  if (query) {
    return (
      <DesktopCard className="bg-k-bg2/50 border-2 border-dashed border-k-line">
        <div className="py-20 text-center">
          <Podcast className="w-16 h-16 mx-auto text-k-sub opacity-20 mb-4" />
          <h3 className="text-[18px] font-extrabold text-k-ink mb-2">
            {labels.podcast?.noResults || '未找到相關播客'}
          </h3>
          <p className="text-k-sub font-bold text-[14px]">
            {labels.podcast?.msg?.EMPTY_SEARCH_DESC || '嘗試換個關鍵詞搜索吧'}
          </p>
        </div>
      </DesktopCard>
    );
  }

  return (
    <div className="text-center py-32">
      <p className="text-k-sub font-bold italic opacity-40">
        {labels.podcast?.searchPlaceholder || '輸入關鍵詞開始搜索...'}
      </p>
    </div>
  );
};

const DesktopPodcastSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const query = searchParams.get('q') || '';
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const labels = getLabels(language);

  const [searchTerm, setSearchTerm] = useState(query);
  const [results, setResults] = useState<PodcastChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backPath = resolveSafeReturnTo(searchParams.get('returnTo'), buildMediaPath('podcast'));
  const currentPath = `${location.pathname}${location.search}`;

  const searchPodcastsAction = useAction(
    aRef<{ term: string }, PodcastChannel[]>('podcastActions:searchPodcasts')
  );

  const handleSearchRequest = useCallback(
    async (term: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchPodcastsAction({ term });
        setResults(data || []);
      } catch (err: unknown) {
        console.error('Search failed:', err);
        setError(labels.podcast?.searchError || '搜索失敗，請稍後重試');
      } finally {
        setLoading(false);
      }
    },
    [searchPodcastsAction, labels.podcast?.searchError]
  );

  useEffect(() => {
    if (query) {
      handleSearchRequest(query);
    }
  }, [query, handleSearchRequest]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      const next = new URLSearchParams();
      next.set('q', searchTerm.trim());
      next.set('returnTo', backPath);
      setSearchParams(next);
    }
  };

  return (
    <div className="min-h-screen bg-k-bg font-sans pb-32">
      <div className="max-w-4xl mx-auto px-10 py-12 space-y-10">
        {/* Header & Search */}
        <div className="space-y-8">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(backPath)}
              className="w-11 h-11 rounded-xl bg-k-card border border-k-line flex items-center justify-center text-k-ink shadow-k-sh-sm hover:bg-k-bg2 transition-all hover:scale-105 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-baseline gap-3">
              <span className="font-k-serif text-[24px] font-medium text-k-crimson">搜</span>
              <h1 className="text-[24px] font-extrabold tracking-tight text-k-ink">
                {labels.podcast?.searchTitle || '搜索播客'}
              </h1>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative group">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={labels.podcast?.searchPlaceholder || '輸入播客名稱或關鍵詞...'}
              autoFocus
              className="w-full h-14 rounded-2xl bg-k-card border border-k-line pl-12 pr-32 text-[16px] font-bold text-k-ink focus:border-k-crimson focus:ring-1 focus:ring-k-crimson outline-none shadow-k-sh transition-all"
            />
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-k-sub group-focus-within:text-k-crimson transition-colors"
              size={22}
            />
            <button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 rounded-xl bg-k-crimson text-k-bg text-[14px] font-extrabold shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : '搜索'}
            </button>
          </form>
        </div>

        {/* Results Area */}
        <div className="space-y-4">
          <SearchResultsContent
            loading={loading}
            error={error}
            results={results}
            query={query}
            labels={labels}
            navigate={navigate}
            buildChannelHref={channel => buildPodcastChannelPath(channel, currentPath)}
          />
        </div>
      </div>
    </div>
  );
};

export default function PodcastSearchPage() {
  const isMobile = useIsMobile();
  return isMobile ? <MobilePodcastSearch /> : <DesktopPodcastSearchPage />;
}
