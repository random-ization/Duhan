// Types for helper functions
export type UpdateVocabFields = {
    word?: string;
    meaning?: string;
    meaningEn?: string;
    meaningVi?: string;
    meaningMn?: string;
    partOfSpeech?: string;
    unitId?: number;
    exampleSentence?: string;
    exampleMeaning?: string;
    exampleMeaningEn?: string;
    exampleMeaningVi?: string;
    exampleMeaningMn?: string;
};

export function buildWordUpdates(fields: Partial<UpdateVocabFields>) {
    const wordFields: Record<string, string | undefined> = {};
    if (fields.word !== undefined) wordFields.word = fields.word;
    if (fields.meaning !== undefined) wordFields.meaning = fields.meaning;
    if (fields.meaningEn !== undefined) wordFields.meaningEn = fields.meaningEn;
    if (fields.meaningVi !== undefined) wordFields.meaningVi = fields.meaningVi;
    if (fields.meaningMn !== undefined) wordFields.meaningMn = fields.meaningMn;
    if (fields.partOfSpeech !== undefined) wordFields.partOfSpeech = fields.partOfSpeech;
    return wordFields;
}

export function buildAppearanceUpdates(fields: Partial<UpdateVocabFields>) {
    const appFields: Record<string, string | number | undefined> = {};
    if (fields.unitId !== undefined) appFields.unitId = fields.unitId;
    if (fields.exampleSentence !== undefined) appFields.exampleSentence = fields.exampleSentence;
    if (fields.exampleMeaning !== undefined) appFields.exampleMeaning = fields.exampleMeaning;
    if (fields.exampleMeaningEn !== undefined) appFields.exampleMeaningEn = fields.exampleMeaningEn;
    if (fields.exampleMeaningVi !== undefined) appFields.exampleMeaningVi = fields.exampleMeaningVi;
    if (fields.exampleMeaningMn !== undefined) appFields.exampleMeaningMn = fields.exampleMeaningMn;
    return appFields;
}

// Logic for calculating normalized unit ID
export function normalizeUnitIdParam(unitIdArg: number | string | undefined): number | undefined {
    if (unitIdArg === undefined) return undefined;
    const val = typeof unitIdArg === 'number' ? unitIdArg : Number(unitIdArg);
    return Number.isNaN(val) ? undefined : val;
}

// Helper for mapping FSRS state to legacy status
export const mapFsrsStateToStatus = (state: number, stability: number): string => {
    switch (state) {
        case 0:
            return 'NEW';
        case 1:
            return 'LEARNING';
        case 2:
            return stability > 30 ? 'MASTERED' : 'REVIEW';
        case 3:
            return 'LEARNING'; // Relearning → LEARNING
        default:
            return 'LEARNING';
    }
};

// Helper for cleaning up undefined fields in object
export function cleanupUndefinedFields<T>(data: Record<string, unknown>): T {
    const cleanData: Record<string, unknown> = {};
    Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined) {
            cleanData[k] = v;
        }
    });
    return cleanData as T;
}

export type ImportItem = {
    word: string;
    meaning?: string;
    partOfSpeech?: string;
    hanja?: string;
    meaningEn?: string;
    meaningVi?: string;
    meaningMn?: string;
    courseId: string;
    unitId: number;
    exampleSentence?: string;
    exampleMeaning?: string;
    exampleMeaningEn?: string;
    exampleMeaningVi?: string;
    exampleMeaningMn?: string;
    tips?: {
        synonyms?: string[];
        antonyms?: string[];
        nuance?: string;
    };
};

// ... existing code ...
