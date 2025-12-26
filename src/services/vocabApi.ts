// Vocabulary API Service - SRS Learning System

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

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
    const params = new URLSearchParams({
        userId,
        courseId,
        limit: limit.toString(),
    });
    if (unitId && unitId !== 'ALL') {
        params.append('unitId', unitId);
    }

    const response = await fetch(`${API_BASE}/api/vocab/session?${params}`);
    if (!response.ok) {
        throw new Error('Failed to fetch vocab session');
    }
    return response.json();
}

// Update word progress with SRS algorithm
export async function updateVocabProgress(
    userId: string,
    wordId: string,
    quality: 0 | 5 // 0 = Forgot, 5 = Know
): Promise<VocabProgressResponse> {
    const response = await fetch(`${API_BASE}/api/vocab/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, wordId, quality }),
    });
    if (!response.ok) {
        throw new Error('Failed to update vocab progress');
    }
    return response.json();
}

// Get all vocabulary for a course (for Quiz/Match)
export async function fetchAllVocab(
    courseId: string,
    unitId?: string
): Promise<{ success: boolean; words: VocabWord[] }> {
    const params = new URLSearchParams({ courseId });
    if (unitId && unitId !== 'ALL') {
        params.append('unitId', unitId);
    }

    const response = await fetch(`${API_BASE}/api/vocab/words?${params}`);
    if (!response.ok) {
        throw new Error('Failed to fetch vocabulary');
    }
    return response.json();
}
