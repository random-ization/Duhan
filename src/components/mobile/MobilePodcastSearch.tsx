import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Podcast, Loader2, ArrowLeft, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAction } from 'convex/react';
import { PodcastChannel } from '../../types';
import { aRef } from '../../utils/convexRefs';
import { useAuth } from '../../contexts/AuthContext';
import { getLabels } from '../../utils/i18n';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { Input } from '../ui/input';

export const MobilePodcastSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const labels = getLabels(language);

  const [searchTerm, setSearchTerm] = useState(query);
  const [results, setResults] = useState<PodcastChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchPodcastsAction = useAction(
    aRef<{ term: string }, PodcastChannel[]>('podcastActions:searchPodcasts')
  );

  const handleSearchRequest = useCallback(
    async (term: string) => {
      if (!term.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const data = await searchPodcastsAction({ term });
        setResults(data || []);
      } catch (err) {
        console.error(err);
        setError('Search failed');
      } finally {
        setLoading(false);
      }
    },
    [searchPodcastsAction]
  );

  // Debounce or just search on submit? Mobile usually likes immediate or submit.
  // Let's stick to Submit for now to save API calls, or simple debounce.
  // The Desktop version acts on effect [query]. Let's mimic that.
  useEffect(() => {
    if (query) {
      handleSearchRequest(query);
    }
  }, [query, handleSearchRequest]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
      inputRef.current?.blur();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm px-4 py-3 flex gap-3 items-center">
        <button
          onClick={() => navigate('/podcasts')}
          className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-500 active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <form className="flex-1 relative" onSubmit={handleSubmit}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            ref={inputRef}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={labels.podcast?.searchPlaceholder || 'Search podcasts...'}
            className="pl-9 pr-9 h-10 bg-slate-100 border-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl font-bold text-slate-900 placeholder:font-normal"
            enterKeyHint="search"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Results List */}
      <div className="flex-1 p-4 overflow-y-auto">
        {loading ? (
          <div className="py-20 flex flex-col items-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
            <p className="font-bold text-sm">Searching...</p>
          </div>
        ) : error ? (
          <div className="py-20 text-center text-red-500 font-bold">{error}</div>
        ) : results.length > 0 ? (
          <div className="space-y-4 pb-20">
            {results.map(channel => (
              <button
                key={channel.itunesId || channel.id}
                onClick={() =>
                  navigate(
                    `/podcasts/channel?id=${channel.itunesId || channel.id}&feedUrl=${encodeURIComponent(channel.feedUrl)}`
                  )
                }
                className="w-full flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all text-left"
              >
                <img
                  src={channel.artworkUrl || channel.artwork}
                  className="w-16 h-16 rounded-xl bg-slate-200 object-cover border border-slate-100"
                  alt={channel.title}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 line-clamp-2 leading-tight mb-1">
                    {channel.title}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 line-clamp-1">{channel.author}</p>
                </div>
              </button>
            ))}
          </div>
        ) : query ? (
          <div className="py-20 text-center text-slate-400">
            <Podcast className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold text-slate-500">No podcasts found</p>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400">
            <p>Type to search...</p>
          </div>
        )}
      </div>
    </div>
  );
};
