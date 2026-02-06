import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Podcast, Loader2, ArrowLeft } from 'lucide-react';
import { useAction } from 'convex/react';
import { PodcastChannel } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { getLabel, getLabels } from '../utils/i18n';
import { aRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';

interface SearchResultsContentProps {
  loading: boolean;
  error: string | null;
  results: PodcastChannel[];
  query: string;
  labels: any;
  navigate: (path: string) => void;
}

const SearchResultsContent: React.FC<SearchResultsContentProps> = ({
  loading,
  error,
  results,
  query,
  labels,
  navigate,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
        <p className="font-bold">{labels.podcast?.searching || 'Searching...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-red-100 text-red-500">
        <CardContent className="py-20 text-center font-bold">
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (results.length > 0) {
    return (
      <>
        <p className="font-bold text-slate-500 mb-4">
          {(labels.podcast?.foundResults || 'Found {{count}} results').replace(
            '{{count}}',
            String(results.length)
          )}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map(channel => (
            <Button
              key={channel.itunesId || channel.id}
              type="button"
              size="auto"
              onClick={() =>
                navigate(
                  `/podcasts/channel?id=${channel.itunesId || channel.id}&feedUrl=${encodeURIComponent(channel.feedUrl)}`
                )
              }
              variant="ghost"
              className="w-full text-left bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-sm hover:shadow-pop hover:-translate-y-1 transition cursor-pointer flex gap-4 group focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal"
            >
              <img
                src={channel.artworkUrl || channel.artwork}
                alt={channel.title}
                className="w-24 h-24 rounded-xl border-2 border-slate-100 object-cover group-hover:border-indigo-200 transition"
              />
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="font-black text-lg text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
                  {channel.title}
                </h3>
                <p className="text-sm font-bold text-slate-500 line-clamp-1 mb-2">
                  {channel.author}
                </p>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Podcast
                  </Badge>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </>
    );
  }

  if (query) {
    return (
      <Card className="rounded-[2rem] border-dashed border-2 border-slate-300">
        <CardContent className="py-20 text-center">
          <Podcast className="w-16 h-16 mx-auto text-slate-200 mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {labels.podcast?.noResults || 'No podcasts found'}
          </h3>
          <p className="text-slate-500">
            {labels.podcast?.msg?.EMPTY_SEARCH_DESC ||
              'Try another keyword? e.g. "Talk To Me In Korean"'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="text-center py-20">
      <p className="text-slate-400 font-bold">
        {labels.podcast?.searchPlaceholder || 'Enter keywords to start search'}
      </p>
    </div>
  );
};

export default function PodcastSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const labels = getLabels(language);

  const [searchTerm, setSearchTerm] = useState(query);
  const [results, setResults] = useState<PodcastChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(labels.podcast?.searchError || 'Search failed, please try again later');
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
      setSearchParams({ q: searchTerm });
    }
  };

  return (
    <div
      className="min-h-screen bg-[#F0F4F8] p-6 md:p-12 font-sans pb-32"
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header & Search */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => navigate('/podcasts')}
              className="w-12 h-12 border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all duration-150"
              aria-label={labels.errors?.backToHome || 'Back'}
            >
              <ArrowLeft className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
            </Button>
            <h1 className="text-3xl font-black text-slate-900">
              {labels.podcast?.searchTitle || 'Search Podcasts'}
            </h1>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative group">
            <Input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={labels.podcast?.searchPlaceholder || 'Enter keywords...'}
              autoFocus
              className="border-2 border-slate-900 px-12 font-bold text-lg focus:translate-y-1 focus:shadow-none"
            />
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition"
              size={24}
            />
            <Button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              size="sm"
              className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg"
            >
              {getLabel(labels, ['common', 'search']) || 'Search'}
            </Button>
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
          />
        </div>
      </div>
    </div>
  );
}
