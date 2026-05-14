import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { NOTE_PAGES, ANNOTATIONS, type RecentAnnotation } from '../../utils/convexRefs';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import { Button } from '../../components/ui';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import type { Id } from '../../../convex/_generated/dataModel';
import type { SearchItem } from '../NotebookV2Page';

type NotebookCardTone = 'butter' | 'pink' | 'crimson' | 'lilac' | 'sky';

export default function DesktopNotebookV2Page() {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();

  const [renderTime] = useState(() => Date.now());

  const formatAnnotationTime = (ts: number) => {
    const diff = renderTime - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('relativeTime.justNow', { defaultValue: 'just now' });
    if (mins < 60) return `${mins}${t('relativeTime.minutesShort', { defaultValue: 'm' })}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}${t('relativeTime.hoursShort', { defaultValue: 'h' })}`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}${t('relativeTime.daysShort', { defaultValue: 'd' })}`;
    return new Date(ts).toLocaleDateString();
  };

  const KANJI_MAP: Record<string, string> = {
    [t('coursesOverview.desktop.notebook.types.grammar')]: '若',
    [t('coursesOverview.desktop.notebook.types.vocab')]: '春',
    [t('coursesOverview.desktop.notebook.types.mistakes')]: '誤',
    [t('coursesOverview.desktop.notebook.types.reflections')]: '想',
    default: '記',
  };

  const toneMap: Record<string, string> = {
    [t('coursesOverview.desktop.notebook.types.grammar')]: 'var(--color-k-butter)',
    [t('coursesOverview.desktop.notebook.types.vocab')]: 'var(--color-k-pink)',
    [t('coursesOverview.desktop.notebook.types.mistakes')]: 'var(--color-k-mint)',
    [t('coursesOverview.desktop.notebook.types.reflections')]: 'var(--color-k-lilac)',
    default: 'var(--color-k-sky)',
  };

  const tagToneMap: Record<string, NotebookCardTone> = {
    [t('coursesOverview.desktop.notebook.types.grammar')]: 'butter',
    [t('coursesOverview.desktop.notebook.types.vocab')]: 'pink',
    [t('coursesOverview.desktop.notebook.types.mistakes')]: 'crimson',
    [t('coursesOverview.desktop.notebook.types.reflections')]: 'lilac',
    default: 'sky',
  };

  const formatDate = (timestamp: number): string => {
    const diff = renderTime - timestamp;
    if (diff < 86400000) return t('coursesOverview.desktop.notebook.today');
    if (diff < 172800000) return t('coursesOverview.desktop.notebook.yesterday');
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
  };

  const [activeFilter, setActiveFilter] = useState<string>(
    t('coursesOverview.desktop.notebook.all')
  );
  const [searchQuery] = useState<string>(''); // Placeholder for search if needed later

  // 获取用户笔记统计和分类
  const facets = useQuery(NOTE_PAGES.listFacets, {});

  // 获取用户笔记列表
  const notesResult = useQuery(NOTE_PAGES.search, {
    query: searchQuery,
    noteTypes:
      activeFilter === t('coursesOverview.desktop.notebook.all') ? undefined : [activeFilter],
    limit: 50,
  });

  const notes = (notesResult?.items || []) as SearchItem[];
  const isLoading = facets === undefined || notesResult === undefined;

  const recentAnnotations = useQuery(ANNOTATIONS.getRecent, { limit: 6 });
  const hasRecentHighlights = Array.isArray(recentAnnotations) && recentAnnotations.length > 0;

  const scopeToneMap: Record<string, string> = {
    READING_ARTICLE: 'var(--color-k-pink)',
    TOPIK_REVIEW: 'var(--color-k-lilac)',
    READING_BOOK: 'var(--color-k-mint)',
    PODCAST: 'var(--color-k-butter)',
  };

  // 创建新笔记
  const createNote = useMutation(NOTE_PAGES.createPage);

  const handleCreateNote = async () => {
    try {
      const result = await createNote({
        title: t('coursesOverview.desktop.notebook.newNote'),
        tags: activeFilter !== t('coursesOverview.desktop.notebook.all') ? [activeFilter] : [],
        metadata: { status: 'Inbox', pinned: false },
        icon: '📝',
      });
      if (result?.id) {
        navigate(`/notebook-v2?page=${result.id}`);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const filters = [
    t('coursesOverview.desktop.notebook.all'),
    ...(facets?.noteTypes.map(ft => ft.key) || []),
  ];

  const displayNotes = notes;

  return (
    <div className="p-6">
      <div className="mb-4 text-[12px] font-bold text-k-sub uppercase tracking-widest">
        {t('coursesOverview.desktop.notebook.title').toUpperCase()} ·{' '}
        {t('coursesOverview.desktop.notebook.noteCount', { count: facets?.total || 0 })}
      </div>

      <div className="mb-[18px] flex gap-2">
        {filters.map((f, i) => {
          const isActive = f === activeFilter;
          const count =
            f === t('coursesOverview.desktop.notebook.all')
              ? facets?.total || 0
              : facets?.noteTypes.find(nt => nt.key === f)?.count || 0;

          return (
            <div
              key={i}
              onClick={() => setActiveFilter(f)}
              className="cursor-pointer rounded-[11px] px-[14px] py-[8px] text-[12px] font-extrabold transition-transform hover:-translate-y-0.5"
              style={{
                background: isActive ? 'var(--color-k-ink)' : 'var(--color-k-card)',
                color: isActive ? 'var(--color-k-bg)' : 'var(--color-k-ink)',
                boxShadow: isActive ? 'none' : 'var(--shadow-k-sh-sm)',
              }}
            >
              {f} {count}
            </div>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={handleCreateNote}
          className="cursor-pointer rounded-[11px] border-none px-[14px] py-[8px] text-[12px] font-extrabold transition-transform hover:-translate-y-0.5"
          style={{ background: 'var(--color-k-crimson)', color: 'var(--color-k-card)' }}
        >
          + {t('coursesOverview.desktop.notebook.newNote')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-k-sub font-bold animate-pulse">
          {t('coursesOverview.desktop.notebook.loadingNotes')}
        </div>
      ) : displayNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[14px]">
          {displayNotes.map(n => {
            const tone = toneMap[n.noteType || 'default'] || toneMap.default;
            const tagTone = tagToneMap[n.noteType || 'default'] || tagToneMap.default;
            const kanji = n.icon || KANJI_MAP[n.noteType || ''] || KANJI_MAP.default;
            const dateStr = formatDate(n.updatedAt);

            return (
              <DesktopCard
                key={n.id}
                pad={0}
                className="overflow-hidden transition-transform hover:-translate-y-1 cursor-pointer"
              >
                <div className="relative h-[56px] overflow-hidden" style={{ background: tone }}>
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'repeating-linear-gradient(135deg, transparent 0, transparent 6px, rgba(0,0,0,0.04) 6px, rgba(0,0,0,0.04) 7px)',
                    }}
                  />
                  <div className="absolute left-[14px] top-[12px]">
                    <DesignChip tone={tagTone} size="sm">
                      {n.noteType || t('coursesOverview.desktop.notebook.types.default')}
                    </DesignChip>
                  </div>
                  <div className="absolute right-[12px] top-[8px] font-k-serif text-[36px] font-medium text-[rgba(31,27,23,0.18)]">
                    {kanji}
                  </div>
                </div>

                <div className="p-4">
                  <div className="font-k-serif text-[14px] font-extrabold leading-[1.3] tracking-[-0.2px] text-k-ink">
                    {n.title}
                  </div>
                  <div className="mt-2 line-clamp-3 text-[12px] font-medium leading-[1.5] text-k-ink2">
                    {n.snippet || t('coursesOverview.desktop.notebook.noContent')}
                  </div>
                  <div className="mt-2.5 text-[10px] font-bold text-k-sub">{dateStr}</div>
                </div>
              </DesktopCard>
            );
          })}
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-k-line bg-k-card/30 p-12 text-center">
          <div className="mb-4 text-[48px] opacity-20">📭</div>
          <div className="text-[14px] font-bold text-k-ink">
            {t('coursesOverview.desktop.notebook.noNotes')}
          </div>
          <div className="mt-2 text-[12px] text-k-sub">
            {t('coursesOverview.desktop.notebook.startJourney')}
          </div>
          <Button
            onClick={handleCreateNote}
            className="mt-6 rounded-xl bg-k-ink text-k-bg px-6 py-2"
          >
            {t('coursesOverview.desktop.notebook.createFirstNote')}
          </Button>
        </div>
      )}

      {hasRecentHighlights && (
        <div style={{ marginTop: 24 }}>
          <div className="mb-3 flex items-baseline gap-2">
            <HanjaSeal c="標" size={28} bg="var(--color-k-crimson)" round={7} />
            <span className="text-[14px] font-extrabold text-k-ink">
              {t('notes.v2.recentHighlights', { defaultValue: 'Recent Highlights' })}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[14px]">
            {recentAnnotations!.map((ann: RecentAnnotation) => {
              const scopeLabel =
                ann.scopeType === 'READING_ARTICLE'
                  ? t('notes.v2.scope.reading', { defaultValue: 'Reading' })
                  : ann.scopeType === 'TOPIK_REVIEW'
                    ? t('notes.v2.scope.topik', { defaultValue: 'TOPIK' })
                    : ann.scopeType === 'READING_BOOK'
                      ? t('notes.v2.scope.book', { defaultValue: 'Book' })
                      : ann.scopeType === 'PODCAST'
                        ? t('notes.v2.scope.podcast', { defaultValue: 'Podcast' })
                        : ann.scopeType || '';
              return (
                <DesktopCard
                  key={ann.id}
                  pad={16}
                  className="cursor-pointer transition-transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-2">
                    <DesignChip tone="muted" size="sm">
                      {scopeLabel}
                    </DesignChip>
                    <span className="text-[10px] font-bold text-k-sub">
                      {formatAnnotationTime(ann.createdAt)}
                    </span>
                  </div>
                  <div className="text-[12px] font-semibold text-k-ink leading-[1.5] line-clamp-3">
                    {ann.text}
                  </div>
                  {ann.note && (
                    <div className="mt-2 pt-2 border-t border-k-line text-[11px] text-k-sub italic line-clamp-2">
                      {ann.note}
                    </div>
                  )}
                </DesktopCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
