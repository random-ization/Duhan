// Vocabulary API Service - SRS Learning System
import { ConvexHttpClient } from 'convex/browser';
import { getConvexUrl } from '../utils/convexConfig';
import { Id } from '../../convex/_generated/dataModel';
import { VOCAB } from '../utils/convexRefs';

const CONVEX_URL = getConvexUrl();
const client = new ConvexHttpClient(CONVEX_URL);

// ============================================
// CACHE CONFIGURATION FOR VOCAB QUERIES
// ============================================
const VOCAB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_VOCAB_CACHE_SIZE = 50; // Maximum cache entries

import { VocabWordDto } from '../../convex/vocab';

// Type for vocab word returned from Convex
type ConvexVocabWord = VocabWordDto;

// Helper function to convert ConvexVocabWord to VocabWord
function toVocabWord(word: ConvexVocabWord): VocabWord {
  return {
    ...word,
    id: word._id,
    progress: word.progress
      ? {
          ...word.progress,
          id: `progress-${word._id}`,
        }
      : null,
  };
}

interface VocabCacheEntry<T = unknown> {
  data: T | null;
  timestamp: number;
  promise?: Promise<T>;
  lastAccessed: number;
}

const vocabCache = new Map<string, VocabCacheEntry<unknown>>();

// LRU eviction for vocab cache
function evictVocabLRUIfNeeded() {
  if (vocabCache.size >= MAX_VOCAB_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    vocabCache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      vocabCache.delete(oldestKey);
    }
  }
}

function serializeVocabCacheKey(method: string, params: Record<string, unknown> | unknown): string {
  // Sort keys recursively to ensure consistent serialization regardless of property order
  const sortedParams = JSON.stringify(params, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce(
          (sorted, k) => {
            sorted[k] = (value as Record<string, unknown>)[k];
            return sorted;
          },
          {} as Record<string, unknown>
        );
    }
    return value;
  });
  return `${method}:${sortedParams}`;
}

async function cachedVocabQuery<T>(
  method: string,
  queryFn: () => Promise<T>,
  params: unknown
): Promise<T> {
  const cacheKey = serializeVocabCacheKey(method, params);
  const now = Date.now();

  const cached = vocabCache.get(cacheKey);
  if (cached) {
    if (cached.promise) {
      return cached.promise as Promise<T>;
    }
    if (now - cached.timestamp < VOCAB_CACHE_TTL_MS) {
      cached.lastAccessed = now; // Update LRU
      return cached.data as T;
    }
    vocabCache.delete(cacheKey);
  }

  const promise = queryFn().then(
    data => {
      evictVocabLRUIfNeeded();
      vocabCache.set(cacheKey, { data, timestamp: Date.now(), lastAccessed: Date.now() });
      return data;
    },
    error => {
      vocabCache.delete(cacheKey);
      throw error;
    }
  );

  evictVocabLRUIfNeeded();
  vocabCache.set(cacheKey, { data: null, timestamp: now, lastAccessed: now, promise });
  return promise;
}

export interface VocabWord {
  _id: Id<'words'>;
  id: Id<'words'>;
  word: string;
  meaning: string;
  meaningEn?: string;
  meaningVi?: string;
  meaningMn?: string;
  pronunciation?: string;
  audioUrl?: string;
  hanja?: string;
  partOfSpeech: string;
  courseId?: string;
  unitId?: number;
  appearanceId?: string;
  progress?: {
    id: string;
    status: string;
    interval: number;
    streak: number;
    nextReviewAt: number | null;
  } | null;
}

export interface VocabSessionResponse {
  success: boolean;
  session: VocabWord[];
  stats: {
    total: number;
    dueReviews: number;
  };
}

export interface VocabProgressResponse {
  success: boolean;
  progress: {
    id: string;
    status: string;
    interval: number;
    streak: number;
    nextReviewAt: number;
  };
}

// Fetch study session (prioritized by SRS algorithm)
export async function fetchVocabSession(
  courseId: string,
  unitId?: string,
  limit: number = 20
): Promise<VocabSessionResponse> {
  // OPTIMIZATION: Use caching to reduce query volume
  const cacheKey = { courseId, unitId: unitId || 'ALL' };

  const allWords = await cachedVocabQuery<ConvexVocabWord[]>(
    'getOfCourse',
    () => client.query(VOCAB.getOfCourse, { courseId }),
    cacheKey
  );

  let candidates: ConvexVocabWord[] = allWords;

  // Filter by Unit if specified
  if (unitId && unitId !== 'ALL') {
    const uId = parseInt(unitId);
    if (!isNaN(uId)) {
      candidates = candidates.filter(w => w.unitId === uId);
    }
  }

  // SRS Priority Logic (Client-side Shim)
  const now = Date.now();
  const reviews = candidates.filter(
    w =>
      w.progress &&
      w.progress.nextReviewAt &&
      new Date(w.progress.nextReviewAt).getTime() <= now &&
      w.progress.status !== 'MASTERED' // Include Review
  );
  const newWords = candidates.filter(w => !w.progress);
  const learning = candidates.filter(w => w.progress && w.progress.status === 'LEARNING');

  // Assemble and Shim ID
  const session = [...reviews, ...learning, ...newWords].slice(0, limit).map(toVocabWord);

  return {
    success: true,
    session,
    stats: {
      total: candidates.length,
      dueReviews: reviews.length,
    },
  };
}

// Update word progress with SRS algorithm
export async function updateVocabProgress(
  wordId: string,
  quality: 0 | 5 // 0 = Forgot, 5 = Know
): Promise<VocabProgressResponse> {
  await client.mutation(VOCAB.updateProgress, {
    wordId,
    quality,
  });

  return {
    success: true,
    progress: {
      id: 'mock-id',
      status: quality >= 4 ? 'REVIEW' : 'LEARNING',
      interval: 1,
      streak: 1,
      nextReviewAt: Date.now(),
    },
  };
}

// Get all vocabulary for a course (for Quiz/Match)
export async function fetchAllVocab(
  courseId: string,
  unitId?: string
): Promise<{ success: boolean; words: VocabWord[] }> {
  // OPTIMIZATION: Use caching to reduce query volume
  const cacheKey = { courseId, unitId: unitId || 'ALL', allVocab: true };

  const words = await cachedVocabQuery<ConvexVocabWord[]>(
    'getAllVocab',
    () => client.query(VOCAB.getOfCourse, { courseId }),
    cacheKey
  );

  let filtered = words;
  if (unitId && unitId !== 'ALL') {
    const uId = parseInt(unitId);
    if (!isNaN(uId)) {
      filtered = filtered.filter(w => w.unitId === uId);
    }
  }

  return {
    success: true,
    words: filtered.map(toVocabWord),
  };
}
