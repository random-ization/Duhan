/**
 * auditGrammarSections.mjs
 * 
 * Identifies grammars in topik-grammar course where 'sections' fields 
 * are missing zh, vi, or mn translations.
 */

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL);
const COURSE_ID = "topik-grammar";

async function run() {
    console.log(`\n=== Auditing Grammar Sections for ${COURSE_ID} ===\n`);

    // Fetch all grammar IDs for the course
    const courseGrammars = await convex.query("grammars:getByCourse", { courseId: COURSE_ID });
    console.log(`Checking ${courseGrammars.length} grammar points...`);

    const missing = [];

    for (const item of courseGrammars) {
        // Fetch full record for each
        const full = await convex.query("grammars:getByIdInternal", { grammarId: item.id });
        if (!full || !full.sections) continue;

        const languages = ['zh', 'vi', 'mn'];
        const sectionTypes = ['introduction', 'core', 'comparative', 'cultural', 'commonMistakes', 'review'];

        let hasMissing = false;
        const missingDetails = {};

        for (const type of sectionTypes) {
            const section = full.sections[type];
            if (!section) continue;

            // If it is a string, it is likely English only or untranslated
            if (typeof section === 'string') {
                hasMissing = true;
                missingDetails[type] = "string_only";
                continue;
            }

            for (const lang of languages) {
                if (!section[lang]) {
                    hasMissing = true;
                    if (!missingDetails[type]) missingDetails[type] = [];
                    missingDetails[type].push(lang);
                }
            }
        }

        if (hasMissing) {
            missing.push({
                id: full._id,
                title: full.title,
                explanation: full.explanation, // Source for context
                sections: full.sections,
                missingDetails
            });
        }
    }

    console.log(`\nFound ${missing.length} items with missing section translations.`);

    if (missing.length > 0) {
        fs.writeFileSync("tmp/missing_sections.json", JSON.stringify(missing, null, 2));
        console.log("Details saved to tmp/missing_sections.json");
    }
}

run().catch(console.error);
