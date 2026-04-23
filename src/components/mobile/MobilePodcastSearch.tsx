import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Podcast, Loader2, ArrowLeft, X } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAction } from 'convex/react';
import { PodcastChannel } from '../../types';
import { aRef } from '../../utils/convexRefs';
import { useAuth } from '../../contexts/AuthContext';
import { getLabels } from '../../utils/i18n';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { buildMediaPath } from '../../utils/mediaRoutes';
import { buildPodcastChannelPath } from '../../utils/podcastRoutes';
import { resolveSafeReturnTo } from '../../utils/navigation';
import { Input } from '../ui';
import { KT } from './ksoft/ksoft';

export const MobilePodcastSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const query = searchParams.get('q') || '';
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const labels = getLabels(language);
  const searchErrorText = labels.podcast?.searchError || 'Search failed';

  const [searchTerm, setSearchTerm] = useState(query);
  const [results, setResults] = useState<PodcastChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const backPath = resolveSafeReturnTo(searchParams.get('returnTo'), buildMediaPath('podcast'));
  const currentPath = `${location.pathname}${location.search}`;

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
      } catch (err: unknown) {
        console.error(err);
        setError(searchErrorText);
      } finally {
        setLoading(false);
      }
    },
    [searchPodcastsAction, searchErrorText]
  );

  useEffect(() => {
    if (query) {
      handleSearchRequest(query);
      return;
    }
    setResults([]);
    setError(null);
    setLoading(false);
  }, [query, handleSearchRequest]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchTerm.trim()) {
      const next = new URLSearchParams();
      next.set('q', searchTerm.trim());
      next.set('returnTo', backPath);
      setSearchParams(next);
      inputRef.current?.blur();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchParams({});
    setResults([]);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: KT.bg2,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: KT.font,
      }}
    >
      {/* Sticky Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: KT.card,
          borderBottom: `1px solid ${KT.line}`,
          boxShadow: KT.shSm,
          padding: '10px 16px',
          paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(backPath)}
          style={{
            width: 38,
            height: 38,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 12,
            border: `1px solid ${KT.line}`,
            background: KT.bg2,
            color: KT.ink,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={17} />
        </button>
        <form style={{ flex: 1, position: 'relative' }} onSubmit={handleSubmit}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: KT.sub,
              pointerEvents: 'none',
            }}
          />
          <Input
            ref={inputRef}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={labels.podcast?.searchPlaceholder || 'Search podcasts...'}
            style={{
              paddingLeft: 36,
              paddingRight: searchTerm ? 36 : 12,
              height: 40,
              borderRadius: 12,
              background: KT.bg2,
              border: `1px solid ${KT.line}`,
              fontSize: 14,
              fontWeight: 600,
              color: KT.ink,
              fontFamily: KT.font,
              width: '100%',
              outline: 'none',
            }}
            enterKeyHint="search"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: KT.sub,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </form>
      </div>

      {/* Results */}
      <div
        style={{
          flex: 1,
          padding: '14px 16px',
          overflowY: 'auto',
        }}
      >
        {loading ? (
          <div
            style={{
              padding: '60px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: KT.sub,
              gap: 14,
            }}
          >
            <Loader2
              size={30}
              style={{ color: KT.crimson, animation: 'spin 1s linear infinite' }}
            />
            <p style={{ fontWeight: 700, fontSize: 14 }}>
              {labels.podcast?.searching || 'Searching...'}
            </p>
          </div>
        ) : error ? (
          <div
            style={{
              padding: '60px 0',
              textAlign: 'center',
              color: KT.crimson,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : results.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              paddingBottom: 80,
            }}
          >
            {results.map(channel => (
              <button
                type="button"
                key={channel.itunesId || channel.id}
                onClick={() => navigate(buildPodcastChannelPath(channel, currentPath))}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: KT.card,
                  padding: '12px 14px',
                  borderRadius: 18,
                  border: `1px solid ${KT.line}`,
                  boxShadow: KT.shSm,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: KT.font,
                }}
              >
                <img
                  src={channel.artworkUrl || channel.artwork}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    objectFit: 'cover',
                    border: `1px solid ${KT.line}`,
                    flexShrink: 0,
                  }}
                  alt={channel.title}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: KT.ink,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.4,
                      marginBottom: 4,
                    }}
                  >
                    {channel.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: KT.sub,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {channel.author}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : query ? (
          <div
            style={{
              padding: '60px 0',
              textAlign: 'center',
              color: KT.sub,
            }}
          >
            <Podcast style={{ width: 44, height: 44, margin: '0 auto 14px', opacity: 0.2 }} />
            <p style={{ fontWeight: 700, fontSize: 14 }}>
              {labels.podcast?.noResults || 'No podcasts found'}
            </p>
          </div>
        ) : (
          <div
            style={{
              padding: '60px 0',
              textAlign: 'center',
              color: KT.sub,
              fontSize: 14,
            }}
          >
            <p>{labels.podcast?.searchPlaceholder || 'Type to search...'}</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
