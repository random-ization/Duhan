import React, { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { Search as SearchIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEARCH, type SearchAllResult, type SearchBucketKind } from '../../utils/convexRefs';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { Input } from '../ui';
import { MobileSheet } from './MobileSheet';
import { KT, SectionHead } from './ksoft/ksoft';

const BUCKET_ORDER: SearchBucketKind[] = ['grammar', 'book', 'podcast', 'note'];

const BUCKET_LABEL_KEYS: Record<SearchBucketKind, string> = {
  grammar: 'search.bucket.grammar',
  book: 'search.bucket.book',
  podcast: 'search.bucket.podcast',
  note: 'search.bucket.note',
};

const BUCKET_LABEL_FALLBACKS: Record<SearchBucketKind, string> = {
  grammar: 'Grammar',
  book: 'Books',
  podcast: 'Podcasts',
  note: 'Notes',
};

type BucketRows = SearchAllResult['buckets'][SearchBucketKind];

export function MobileSearchSheet({
  isOpen,
  onClose,
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
}>) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const [needle, setNeedle] = useState('');
  const debouncedNeedle = useDebouncedValue(needle.trim(), 250);

  const searchResult = useQuery(
    SEARCH.searchAll,
    debouncedNeedle.length >= 2 ? { query: debouncedNeedle } : 'skip'
  );

  const bucketRows = useMemo(() => {
    const rows: Array<{ bucket: SearchBucketKind; items: BucketRows }> = [];
    if (!searchResult) return rows;
    for (const bucket of BUCKET_ORDER) {
      const items = searchResult.buckets[bucket] ?? [];
      if (items.length > 0) {
        rows.push({ bucket, items });
      }
    }
    return rows;
  }, [searchResult]);

  return (
    <MobileSheet
      isOpen={isOpen}
      onClose={() => {
        setNeedle('');
        onClose();
      }}
      title={t('common.search', { defaultValue: 'Search' })}
      height="full"
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <SearchIcon
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: KT.sub,
            }}
          />
          <Input
            value={needle}
            onChange={event => setNeedle(event.target.value)}
            autoFocus
            placeholder={t('search.placeholder', {
              defaultValue: 'Search grammar, books, notes...',
            })}
            className="pl-9 h-11"
          />
        </div>

        {debouncedNeedle.length < 2 ? (
          <div
            style={{
              borderRadius: 16,
              border: `1px dashed ${KT.line2}`,
              background: KT.bg2,
              color: KT.sub,
              fontSize: 13,
              fontWeight: 700,
              padding: '14px 12px',
            }}
          >
            {t('search.startTyping', { defaultValue: 'Start typing to search' })}
          </div>
        ) : searchResult === undefined ? (
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              color: KT.sub,
              fontSize: 13,
              fontWeight: 700,
              padding: '14px 12px',
            }}
          >
            {t('common.loading', { defaultValue: 'Loading…' })}
          </div>
        ) : bucketRows.length === 0 ? (
          <div
            style={{
              borderRadius: 16,
              border: `1px dashed ${KT.line2}`,
              background: KT.bg2,
              color: KT.sub,
              fontSize: 13,
              fontWeight: 700,
              padding: '14px 12px',
            }}
          >
            {t('search.empty', { defaultValue: 'No results found.' })}
          </div>
        ) : (
          bucketRows.map(row => (
            <section key={row.bucket} style={{ display: 'grid', gap: 8 }}>
              <SectionHead
                title={t(BUCKET_LABEL_KEYS[row.bucket], {
                  defaultValue: BUCKET_LABEL_FALLBACKS[row.bucket],
                })}
              />
              <div style={{ display: 'grid', gap: 8 }}>
                {row.items.map(item => (
                  <button
                    key={`${row.bucket}-${item.id}`}
                    type="button"
                    onClick={() => {
                      onClose();
                      setNeedle('');
                      navigate(item.linkPath);
                    }}
                    style={{
                      border: `1px solid ${KT.line}`,
                      background: KT.card,
                      borderRadius: 14,
                      boxShadow: KT.shSm,
                      padding: '10px 12px',
                      textAlign: 'left',
                      display: 'grid',
                      gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 800, color: KT.ink }}>
                      {item.title}
                    </span>
                    {item.subtitle ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: KT.sub }}>
                        {item.subtitle}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </MobileSheet>
  );
}
