import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Headphones, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';
import { cn } from '../../lib/utils';
import type { PictureBook } from '../../types';

type PictureBookShelfProps = {
  books: PictureBook[] | undefined;
  loading: boolean;
  onOpen: (slug: string) => void;
  emptyStateText?: string;
};

function getLevelNumber(levelLabel?: string) {
  const match = levelLabel?.match(/(\d+)/);
  return match?.[1] ?? null;
}

function formatBookMeta(
  book: PictureBook,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const parts = [];
  const levelNumber = getLevelNumber(book.levelLabel);
  if (levelNumber) {
    parts.push(
      t('readingDiscovery.pictureBooks.levelBadge', {
        defaultValue: 'Level {{level}}',
        level: levelNumber,
      })
    );
  }
  parts.push(
    t('readingDiscovery.pictureBooks.pages', {
      defaultValue: '{{count}} pages',
      count: book.pageCount,
    })
  );
  if (book.readingMinutes) {
    parts.push(
      t('readingDiscovery.pictureBooks.minutes', {
        defaultValue: '~{{minutes}} min',
        minutes: book.readingMinutes,
      })
    );
  }
  return parts.join(' • ');
}

export function PictureBookShelf({
  books,
  loading,
  onOpen,
  emptyStateText,
}: PictureBookShelfProps) {
  const { t } = useTranslation('public');
  const shelfRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const resolvedEmptyStateText =
    emptyStateText ||
    t('readingDiscovery.pictureBooks.emptyAfterImport', {
      defaultValue: 'Picture books will appear here after import.',
    });

  const updateScrollState = useCallback(() => {
    const shelf = shelfRef.current;
    if (!shelf) return;

    const maxScrollLeft = shelf.scrollWidth - shelf.clientWidth;
    setCanScrollLeft(shelf.scrollLeft > 8);
    setCanScrollRight(maxScrollLeft - shelf.scrollLeft > 8);
  }, []);

  useEffect(() => {
    updateScrollState();
    const shelf = shelfRef.current;
    if (!shelf) return;

    shelf.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      shelf.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [books, updateScrollState]);

  const scrollShelf = useCallback((direction: 'left' | 'right') => {
    const shelf = shelfRef.current;
    if (!shelf) return;
    const amount = Math.max(280, Math.floor(shelf.clientWidth * 0.82));
    shelf.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  }, []);

  if (loading) {
    return (
      <div className="rounded-[1.75rem] border border-border bg-card/70 p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {t('readingDiscovery.pictureBooks.shelfLabel', { defaultValue: 'Shelf' })}
            </div>
            <div className="mt-1 h-5 w-28 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="min-w-[250px] animate-pulse rounded-[1.75rem] border border-border bg-card p-4 sm:min-w-[270px]"
            >
              <div className="mb-4 aspect-[3/4] rounded-2xl bg-muted" />
              <div className="mb-2 h-4 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!books || books.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-border bg-card px-6 py-10 text-sm font-semibold text-muted-foreground">
        {resolvedEmptyStateText}
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-border bg-card/78 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            {t('readingDiscovery.pictureBooks.shelfCount', {
              defaultValue: '{{count}} books',
              count: books.length,
            })}
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => scrollShelf('left')}
            disabled={!canScrollLeft}
            className={cn('rounded-full', !canScrollLeft && 'opacity-40')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => scrollShelf('right')}
            disabled={!canScrollRight}
            className={cn('rounded-full', !canScrollRight && 'opacity-40')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={shelfRef}
        className="flex gap-4 overflow-x-auto pb-3 pr-2 scrollbar-hide snap-x snap-mandatory"
      >
        {books.map(book => (
          <Button
            key={book.slug}
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => onOpen(book.slug)}
            className="group !flex min-w-[240px] snap-start !items-stretch !justify-start flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card text-left transition hover:-translate-y-1 hover:border-foreground/20 hover:shadow-pop-sm sm:min-w-[258px]"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden border-b border-border bg-gradient-to-br from-[#f7efe3] via-[#e8f1ff] to-[#fff8e6]">
              {book.coverImageUrl ? (
                <img
                  src={book.coverImageUrl}
                  alt={book.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-4xl text-muted-foreground">
                  <BookOpen className="h-10 w-10" />
                </div>
              )}
              <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/90 px-2 py-1 text-[10px] font-black text-slate-700 shadow-sm backdrop-blur">
                <Sparkles className="h-3 w-3" />
                {t('readingDiscovery.pictureBooks.bookTag', { defaultValue: 'Book' })}
              </div>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="mb-2 line-clamp-2 text-[1.05rem] font-black leading-snug text-foreground">
                {book.title}
              </div>
              <div className="mb-4 text-xs font-semibold text-muted-foreground">
                {formatBookMeta(book, t)}
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-xs font-bold text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Headphones className="h-3.5 w-3.5" />
                  {t('readingDiscovery.pictureBooks.sentenceSync', {
                    defaultValue: 'Sentence sync',
                  })}
                </span>
                <span className="rounded-full border border-border bg-muted px-2 py-1 text-[11px] text-foreground">
                  {t('readingDiscovery.pictureBooks.open', { defaultValue: 'Open' })}
                </span>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}

export default PictureBookShelf;
