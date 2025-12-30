"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

export const analyzeText = action({
    args: { text: v.string() },
    handler: async (ctx, args) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.warn("OPENAI_API_KEY not set");
            return null;
        }

        const client = new OpenAI({ apiKey });

        // Skip analysis for very short texts
        if (!args.text || args.text.trim().length < 10) {
            return null;
        }

        try {
            const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a Korean linguistics expert. Analyze the provided text for language learners.

Task: Perform morphological analysis (Lemmatization).
1. Break down the text into meaningful tokens (words, particles, endings).
2. For verbs/adjectives, identify their dictionary base form (Lemma).
3. Calculate the precise 'offset' (0-based start index) and 'length' of each token in the original string.

IMPORTANT: 
- Be precise with offset calculations - count exact character positions
- Include spaces in your offset calculations
- Only return tokens that are meaningful for language learning (skip punctuation, spaces)

Return a JSON object with a "tokens" key containing an array of:
{ 
  "surface": string (the exact word in text, e.g., "갔습니다"), 
  "base": string (dictionary form, e.g., "가다"), 
  "offset": number (0-based index), 
  "length": number (character length of surface form), 
  "pos": string (e.g., "Verb", "Noun", "Adjective", "Particle", "Adverb", "Pronoun", "Number", "Determiner") 
}`,
                    },
                    { role: "user", content: args.text },
                ],
                response_format: { type: "json_object" },
                temperature: 0,
                max_tokens: 4000,
            });

            const content = completion.choices[0].message.content;
            if (!content) return null;

            const result = JSON.parse(content);
            return { tokens: result.tokens || [], tokenCount: (result.tokens || []).length };
        } catch (error) {
            console.error("Text analysis failed:", error);
            return null;
        }
    },
});
