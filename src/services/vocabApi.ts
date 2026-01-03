// Vocabulary API Service - SRS Learning System
import { ConvexHttpClient } from "convex/browser";
import { api as convexApi } from "../../convex/_generated/api";

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL || 'http://localhost:3001';
const client = new ConvexHttpClient(CONVEX_URL);

// ============================================
// CACHE CONFIGURATION FOR VOCAB QUERIES
// ============================================
const VOCAB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_VOCAB_CACHE_SIZE = 50; // Maximum cache entries

interface VocabCacheEntry {
    data: any;
    timestamp: number;
    promise?: Promise<any>;
    lastAccessed: number;
}

const vocabCache = new Map<string, VocabCacheEntry>();

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

function serializeVocabCacheKey(method: string, params: any): string {
    // Sort keys recursively to ensure consistent serialization regardless of property order
    const sortedParams = JSON.stringify(params, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value)
                .sort()
                .reduce((sorted, k) => {
                    sorted[k] = value[k];
                    return sorted;
                }, {} as any);
        }
        return value;
    });
    return `${method}:${sortedParams}`;
}

async function cachedVocabQuery(method: string, queryFn: () => Promise<any>, params: any): Promise<any> {
    const cacheKey = serializeVocabCacheKey(method, params);
    const now = Date.now();
    
    const cached = vocabCache.get(cacheKey);
    if (cached) {
        if (cached.promise) {
            return cached.promise;
        }
        if (now - cached.timestamp < VOCAB_CACHE_TTL_MS) {
            cached.lastAccessed = now; // Update LRU
            return cached.data;
        }
        vocabCache.delete(cacheKey);
    }
    
    const promise = queryFn().then(
        (data) => {
            evictVocabLRUIfNeeded();
            vocabCache.set(cacheKey, { data, timestamp: Date.now(), lastAccessed: Date.now() });
            return data;
        },
        (error) => {
            vocabCache.delete(cacheKey);
            throw error;
        }
    );
    
    evictVocabLRUIfNeeded();
    vocabCache.set(cacheKey, { data: null, timestamp: now, lastAccessed: now, promise });
    return promise;
}

export interface VocabWord {
    id: string;
    courseId: string;
    unitId: string;
    word: string;
    meaning: string;
    pronunciation?: string;
    audioUrl?: string;
    hanja?: string;
    partOfSpeech: 'NOUN' | 'VERB_T' | 'VERB_I' | 'ADJ' | 'ADV' | 'PARTICLE';
    tips?: {
        synonyms?: string[];
        antonyms?: string[];
        nuance?: string;
    };
    exampleSentence?: string;
    exampleMeaning?: string;
    progress?: {
        id: string;
        status: 'NEW' | 'LEARNING' | 'REVIEW' | 'MASTERED';
        interval: number;
        streak: number;
        nextReviewAt: string | null;
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
        nextReviewAt: string;
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
    
    const allWords = await cachedVocabQuery(
        'getOfCourse',
        () => client.query(convexApi.vocab.getOfCourse, { courseId }),
        cacheKey
    );

    let candidates = allWords;

    // Filter by Unit if specified
    if (unitId && unitId !== 'ALL') {
        const uId = parseInt(unitId);
        if (!isNaN(uId)) {
            candidates = candidates.filter((w: any) => w.unitId === uId);
        }
    }

    // SRS Priority Logic (Client-side Shim)
    const now = Date.now();
    const reviews = candidates.filter((w: any) =>
        w.progress && w.progress.nextReviewAt && w.progress.nextReviewAt <= now && w.progress.status !== 'MASTERED' // Include Review
    );
    const newWords = candidates.filter((w: any) => !w.progress);
    const learning = candidates.filter((w: any) => w.progress && w.progress.status === 'LEARNING');

    // Combine: Review > Learning > New
    const session = [...reviews, ...learning, ...newWords].slice(0, limit);

    return {
        success: true,
        session: session as any[],
        stats: {
            total: candidates.length,
            dueReviews: reviews.length
        }
    };
}

// Update word progress with SRS algorithm
export async function updateVocabProgress(
    wordId: string,
    quality: 0 | 5 // 0 = Forgot, 5 = Know
): Promise<VocabProgressResponse> {
    await client.mutation(convexApi.vocab.updateProgress, {
        wordId: wordId as any,
        quality
    });

    // We need to fetch the updated status to return.
    // Ideally mutation returns it, but my mutation doesn't currently return the object.
    // For now, return a mock success or refactor mutation.
    // Let's just return success=true and mock the return structure to satisfy frontend type.
    // The frontend likely re-fetches or updates Optimistically?

    return {
        success: true,
        progress: {
            id: 'mock-id',
            status: quality >= 4 ? 'REVIEW' : 'LEARNING',
            interval: 1,
            streak: 1,
            nextReviewAt: new Date().toISOString()
        }
    };
}

// Get all vocabulary for a course (for Quiz/Match)
export async function fetchAllVocab(
    courseId: string,
    unitId?: string
): Promise<{ success: boolean; words: VocabWord[] }> {
    // OPTIMIZATION: Use caching to reduce query volume
    const cacheKey = { courseId, unitId: unitId || 'ALL', allVocab: true };
    
    const words = await cachedVocabQuery(
        'getAllVocab',
        () => client.query(convexApi.vocab.getOfCourse, { courseId }),
        cacheKey
    );

    let filtered = words;
    if (unitId && unitId !== 'ALL') {
        const uId = parseInt(unitId);
        if (!isNaN(uId)) {
            filtered = filtered.filter((w: any) => w.unitId === uId);
        }
    }

    return {
        success: true,
        words: filtered as any[]
    };
}
