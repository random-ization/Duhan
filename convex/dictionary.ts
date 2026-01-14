"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

const KRDICT_API_URL = "https://krdict.korean.go.kr/api/search";
const KRDICT_VIEW_URL = "https://krdict.korean.go.kr/api/view";

// Translation language codes
// 1: 영어(English), 2: 일본어(Japanese), 3: 프랑스어(French), 4: 스페인어(Spanish)
// 5: 아랍어(Arabic), 6: 몽골어(Mongolian), 7: 베트남어(Vietnamese), 8: 태국어(Thai)
// 9: 인도네시아어(Indonesian), 10: 러시아어(Russian), 11: 중국어(Chinese)
const TRANS_LANG_MAP: Record<string, string> = {
    en: "1",
    ja: "2",
    fr: "3",
    es: "4",
    ar: "5",
    mn: "6",
    vi: "7",
    th: "8",
    id: "9",
    ru: "10",
    zh: "11",
};

export interface DictionaryEntry {
    targetCode: string;
    word: string;
    pronunciation?: string;
    wordGrade?: string; // 초급, 중급, 고급
    pos?: string; // 품사 (part of speech)
    link?: string;
    senses: Array<{
        order: number;
        definition: string;
        translation?: {
            lang: string;
            word: string;
            definition: string;
        };
    }>;
}

export interface SearchResult {
    total: number;
    start: number;
    num: number;
    entries: DictionaryEntry[];
}

/**
 * Parse XML response from KRDICT API
 */
function parseSearchXML(xmlText: string): SearchResult {
    // Simple XML parsing without external dependencies
    const getTagContent = (xml: string, tag: string): string => {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
        const match = xml.match(regex);
        return match ? match[1].trim() : "";
    };

    const getAllTagContents = (xml: string, tag: string): string[] => {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "gi");
        const matches = [];
        let match;
        while ((match = regex.exec(xml)) !== null) {
            matches.push(match[1].trim());
        }
        return matches;
    };

    const total = parseInt(getTagContent(xmlText, "total")) || 0;
    const start = parseInt(getTagContent(xmlText, "start")) || 1;
    const num = parseInt(getTagContent(xmlText, "num")) || 10;

    const items = getAllTagContents(xmlText, "item");
    const entries: DictionaryEntry[] = items.map((item) => {
        const senses = getAllTagContents(item, "sense");

        return {
            targetCode: getTagContent(item, "target_code"),
            word: getTagContent(item, "word"),
            pronunciation: getTagContent(item, "pronunciation") || undefined,
            wordGrade: getTagContent(item, "word_grade") || undefined,
            pos: getTagContent(item, "pos") || undefined,
            link: getTagContent(item, "link") || undefined,
            senses: senses.map((sense, index) => {
                const translations = getAllTagContents(sense, "translation");
                const firstTranslation = translations[0] || "";

                return {
                    order: parseInt(getTagContent(sense, "sense_order")) || index + 1,
                    definition: getTagContent(sense, "definition"),
                    translation: firstTranslation ? {
                        lang: getTagContent(firstTranslation, "trans_lang"),
                        word: getTagContent(firstTranslation, "trans_word"),
                        definition: getTagContent(firstTranslation, "trans_dfn"),
                    } : undefined,
                };
            }),
        };
    });

    return { total, start, num, entries };
}

/**
 * Search Korean dictionary
 */
export const searchDictionary = action({
    args: {
        query: v.string(),
        translationLang: v.optional(v.string()), // en, zh, vi, mn, ja, etc.
        start: v.optional(v.number()), // Starting index (default 1)
        num: v.optional(v.number()), // Number of results (default 10, max 100)
        part: v.optional(v.string()), // word, dfn, exam (search in word, definition, or example)
        sort: v.optional(v.string()), // dict (dictionary order), popular (by popularity)
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.KRDICT_API_KEY;
        if (!apiKey) {
            throw new Error("Missing KRDICT_API_KEY environment variable");
        }

        const params = new URLSearchParams({
            key: apiKey,
            q: args.query,
            start: String(args.start || 1),
            num: String(Math.max(10, Math.min(args.num || 10, 100))),
        });

        // Add optional parameters
        if (args.part) {
            params.set("part", args.part);
        }
        if (args.sort) {
            params.set("sort", args.sort);
        }

        // Add translation if requested
        if (args.translationLang) {
            const transLangCode = TRANS_LANG_MAP[args.translationLang];
            if (transLangCode) {
                params.set("translated", "y");
                params.set("trans_lang", transLangCode);
            }
        }

        const url = `${KRDICT_API_URL}?${params.toString()}`;
        console.log("[KRDICT] Searching:", args.query);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`KRDICT API error: ${response.status}`);
            }

            const xmlText = await response.text();

            // Check for error response
            if (xmlText.includes("<error>")) {
                const errorCode = xmlText.match(/<error_code>(\d+)<\/error_code>/)?.[1];
                const errorMsg = xmlText.match(/<message>([^<]+)<\/message>/)?.[1];
                throw new Error(`KRDICT Error ${errorCode}: ${errorMsg}`);
            }

            const result = parseSearchXML(xmlText);
            console.log(`[KRDICT] Found ${result.total} results for "${args.query}"`);

            return result;
        } catch (error: any) {
            console.error("[KRDICT] Error:", error.message);
            throw error;
        }
    },
});

/**
 * Get detailed word information by target code
 */
export const getWordDetail = action({
    args: {
        targetCode: v.string(),
        translationLang: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.KRDICT_API_KEY;
        if (!apiKey) {
            throw new Error("Missing KRDICT_API_KEY environment variable");
        }

        const params = new URLSearchParams({
            key: apiKey,
            q: args.targetCode,
            method: "target_code",
        });

        // Add translation if requested
        if (args.translationLang) {
            const transLangCode = TRANS_LANG_MAP[args.translationLang];
            if (transLangCode) {
                params.set("translated", "y");
                params.set("trans_lang", transLangCode);
            }
        }

        const url = `${KRDICT_VIEW_URL}?${params.toString()}`;
        console.log("[KRDICT] Getting detail for:", args.targetCode);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`KRDICT API error: ${response.status}`);
            }

            const xmlText = await response.text();

            // Check for error response
            if (xmlText.includes("<error>")) {
                const errorCode = xmlText.match(/<error_code>(\d+)<\/error_code>/)?.[1];
                const errorMsg = xmlText.match(/<message>([^<]+)<\/message>/)?.[1];
                throw new Error(`KRDICT Error ${errorCode}: ${errorMsg}`);
            }

            const result = parseSearchXML(xmlText);
            return result.entries[0] || null;
        } catch (error: any) {
            console.error("[KRDICT] Error:", error.message);
            throw error;
        }
    },
});
