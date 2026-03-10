/**
 * remediateMissingSections.mjs
 * 
 * Orchestrates AI translation for missing 'sections' fields (zh, vi, mn)
 * in the topik-grammar course.
 */

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL);
const MISSING_FILE = "tmp/missing_sections.json";

async function translateSection(grammarId, sectionType, enContent, targetLangs) {
    console.log(`Translating [${sectionType}] for grammar ${grammarId} to [${targetLangs.join(', ')}]...`);

    // Use the existing classifyGrammars or a similar AI action pattern
    // However, since we don't have a specific "translateSection" action, 
    // we might need to add one to convex/ai.ts or use a generic one if available.
    // Looking at previous patterns, let's assume we add 'ai:translateGrammarSections'

    try {
        const result = await convex.action("ai:translateGrammarSections", {
            enContent,
            targetLangs
        });
        return result; // Expected: { zh: "...", vi: "...", mn: "..." }
    } catch (error) {
        console.error(`AI Translation failed for ${grammarId} - ${sectionType}:`, error);
        return null;
    }
}

async function run() {
    if (!fs.existsSync(MISSING_FILE)) {
        console.error("Missing sections file not found. Run audit script first.");
        return;
    }

    const missingData = JSON.parse(fs.readFileSync(MISSING_FILE, "utf8"));
    console.log(`Starting remediation for ${missingData.length} items...\n`);

    for (const item of missingData) {
        const updates = { ...item.sections };
        let hasNewTranslations = false;

        for (const [sectionType, langs] of Object.entries(item.missingDetails)) {
            const enContent = item.sections[sectionType]?.en;
            if (!enContent) continue;

            const translations = await translateSection(item.id, sectionType, enContent, langs);
            if (translations) {
                updates[sectionType] = {
                    ...updates[sectionType],
                    ...translations
                };
                hasNewTranslations = true;
            }
        }

        if (hasNewTranslations) {
            console.log(`Updating grammar ${item.id} in database...`);
            // We'll use a mutation to update all sections at once
            await convex.mutation("grammars:updateSections", {
                id: item.id,
                sections: updates
            });
            console.log(`Successfully updated ${item.title}\n`);
        }

        // Brief pause to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log("Remediation complete!");
}

run().catch(console.error);
