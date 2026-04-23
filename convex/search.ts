/**
 * Unified global search (E5).
 *
 * `searchAll({ query })` returns a bucketed DTO grouping matches across the
 * app's content types so the mobile search bar can show one result sheet
 * instead of routing the user to a type-specific search.
 *
 * Current buckets
 *  - grammar  — uses the `search_title` searchIndex on `grammar_points`
 *  - books    — recent `reading_books` scan + substring match on title
 *  - podcasts — recent `podcast_episodes` scan + substring match on title
 *  - notes    — caller's own `annotations` scanned + substring match
 *
 * Vocab lookup is intentionally out of scope — callers should continue to
 * use `dictionary:searchDictionary` for that surface, which already does
 * cross-language expansion. Once a `searchIndex` is added to `words`
 * (schema migration), this module can absorb it as a fifth bucket.
 *
 * All scans are bounded; worst case touches ~200 rows per call.
 */

import { query } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { getOptionalAuthUserId } from './utils';

const MAX_PER_BUCKET = 6;
const RECENT_SCAN_SIZE = 60;

export type SearchBucketKind = 'grammar' | 'book' | 'podcast' | 'note';

export type SearchHit = {
  kind: SearchBucketKind;
  id: string;
  title: string;
  subtitle?: string;
  /** Route path (no language prefix) the FE should navigate to on tap. */
  linkPath: string;
};

export type SearchAllResult = {
  query: string;
  buckets: Record<SearchBucketKind, SearchHit[]>;
  totalCount: number;
};

function emptyBuckets(): Record<SearchBucketKind, SearchHit[]> {
  return { grammar: [], book: [], podcast: [], note: [] };
}

function includesCI(haystack: string | undefined, needle: string): boolean {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle);
}

export const searchAll = query({
  args: {
    query: v.string(),
    limitPerBucket: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SearchAllResult> => {
    const query = args.query.trim();
    if (query.length < 2) {
      return { query, buckets: emptyBuckets(), totalCount: 0 };
    }
    const limit = Math.max(1, Math.min(args.limitPerBucket ?? MAX_PER_BUCKET, 20));
    const needle = query.toLowerCase();
    const viewerId = await getOptionalAuthUserId(ctx);

    // 1. Grammar — full text via searchIndex.
    const grammarRows = await ctx.db
      .query('grammar_points')
      .withSearchIndex('search_title', q => q.search('title', query))
      .take(limit);
    const grammar: SearchHit[] = grammarRows.map(row => ({
      kind: 'grammar' as const,
      id: String(row._id),
      title: row.title,
      subtitle: row.level ? `TOPIK ${row.level}` : undefined,
      linkPath: `/grammar/${String(row._id)}`,
    }));

    // 2. Books — recent scan + substring match.
    const recentBooks = await ctx.db
      .query('reading_books')
      .withIndex('by_published_source_book_id', q => q.eq('isPublished', true))
      .order('desc')
      .take(RECENT_SCAN_SIZE);
    const books: SearchHit[] = recentBooks
      .filter(b => includesCI(b.title, needle) || includesCI(b.pageTitle, needle))
      .slice(0, limit)
      .map(row => ({
        kind: 'book' as const,
        id: String(row._id),
        title: row.pageTitle || row.title,
        subtitle: row.levelLabel,
        linkPath: `/reading/book/${row.slug}`,
      }));

    // 3. Podcast episodes — recent scan + substring match.
    const recentEpisodes = await ctx.db
      .query('podcast_episodes')
      .withIndex('by_pubDate')
      .order('desc')
      .take(RECENT_SCAN_SIZE);
    const podcasts: SearchHit[] = recentEpisodes
      .filter(ep => includesCI(ep.title, needle) || includesCI(ep.description, needle))
      .slice(0, limit)
      .map(row => ({
        kind: 'podcast' as const,
        id: String(row._id),
        title: row.title,
        subtitle: row.duration ? `${Math.round(row.duration / 60)} min` : undefined,
        linkPath: `/podcasts/episode/${String(row._id)}`,
      }));

    // 4. Notes — caller's own annotations only.
    let notes: SearchHit[] = [];
    if (viewerId) {
      const rows = await ctx.db
        .query('annotations')
        .withIndex('by_user', q => q.eq('userId', viewerId as Id<'users'>))
        .order('desc')
        .take(RECENT_SCAN_SIZE);
      notes = rows
        .filter(row => includesCI(row.quote, needle) || includesCI(row.note, needle))
        .slice(0, limit)
        .map(row => ({
          kind: 'note' as const,
          id: String(row._id),
          title: row.quote || row.note || '(annotation)',
          subtitle: row.scopeType,
          linkPath: row.contextKey ? `/notebook?annotationId=${String(row._id)}` : `/notebook`,
        }));
    }

    const buckets: Record<SearchBucketKind, SearchHit[]> = {
      grammar,
      book: books,
      podcast: podcasts,
      note: notes,
    };
    const totalCount = grammar.length + books.length + podcasts.length + notes.length;

    return { query, buckets, totalCount };
  },
});
