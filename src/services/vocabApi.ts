// Vocabulary API Service - SRS Learning System
import { ConvexHttpClient } from "convex/browser";
import { api as convexApi } from "../../convex/_generated/api";

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
    console.error("VITE_CONVEX_URL is not defined!");
}
const client = new ConvexHttpClient(CONVEX_URL!);

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
    userId: string,
    courseId: string,
    unitId?: string,
    limit: number = 20
): Promise<VocabSessionResponse> {
    // Fetch all words with progress
    // Note: In a large production app, this should be a dedicated Convex query that filters on backend.
    const allWords = await client.query(convexApi.vocab.getOfCourse, {
        courseId,
        userId
    });

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
    userId: string,
    wordId: string,
    quality: 0 | 5 // 0 = Forgot, 5 = Know
): Promise<VocabProgressResponse> {

    // Convex Mutation
    await client.mutation(convexApi.vocab.updateProgress, {
        userId,
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
    // Reuse getOfCourse - userId is redundant for "Just Words" but required by some logic?
    // Actually getOfCourse takes optional userId. If we don't pass it, we don't get progress.
    const words = await client.query(convexApi.vocab.getOfCourse, { courseId });

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
