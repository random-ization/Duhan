/**
 * remediateMissingCommonMistakes.mjs
 * 
 * Specifically targets items that have an empty commonMistakes section
 * by fetching raw content from GitHub and using AI to translate it.
 */

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL);
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/tristcoil/hanabira.org-japanese-content/main/markdown_grammar_korean/";

const MAPPING = [
    { id: "jd7bw65a347xjbecs3xdsjhnh182dxnm", file: "~지_않을까_하다_[ji_anheulkka_hada]_(I_guess,_I_suspect).md" },
    { id: "jd7f62j04870e01zdke4vvnpan82d615", file: "~혹시_[hoksi]_(By_any_chance).md" },
    { id: "jd7aapfv5yy2cmtq250p5y3ct582dx23", file: "~지만_[jiman]_(But).md" },
    { id: "jd7d0rdxbxezaa2jfa33fgsddd82c0qz", file: "~지만_[jimyeon]_(But,_although).md" },
    { id: "jd76fr2n9w5k6a6rxcrzezh3t182c12b", file: "~하기보다_[hakiboda]_(Rather_than).md" },
    { id: "jd7ebkqdqz1g2rsmrzp4qak67d82cphz", file: "~지_않을테니_[ji_anheulteni]_(Won_t,_wouldn_t).md" },
    { id: "jd70f2ew4x405h99vvvr0ds8ah82canx", file: "~테니까_[tenikka]_(So,_therefore).md" },
    { id: "jd74eg8jx7cvfw3f9x8mbpk01s82dxq3", file: "~테니라고_[tenirago]_(Since,_because).md" },
    { id: "jd71x06w6tfv87dtjqawz9fqvn82drtd", file: "~지_않아도_되다_[ji_anado_dweda]_(Don_t_have_to).md" },
    { id: "jd75pqpxgtft43snnx3y0estns82dwfz", file: "~지_얼마나_되다_[ji_eolmana_dweda]_(How_long_has_it_been).md" },
    { id: "jd7fkfvb5xjdvm7mfjxpa5fgw982ccan", file: "~키로_[kiro]_(By_means_of,_with).md" },
    { id: "jd72wp3099zka030791qdkhr4182dd4y", file: "~지요_[jiyo]_(~right?,_isn_t_it?).md" },
    { id: "jd78fzz5wy42cdpj9gqnc73y9s82c647", file: "~지요_[jiyo]_(Isn_t_it?_Right?).md" },
    { id: "jd7046nak05bke9jvj4g5msv5d82c0wj", file: "~지_않다-지_못하다_[ji_anhda-ji_mothada]_(Not,_don_t,_can_t).md" }
];

async function fetchFromGithub(fileName) {
    const url = GITHUB_RAW_BASE + encodeURIComponent(fileName);
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.text();
    } catch {
        return null;
    }
}

function extractSection(content, sectionName) {
    if (!content) return null;
    const lines = content.split('\n');
    let start = -1;
    let end = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(sectionName.toLowerCase()) && (lines[i].startsWith('#') || lines[i].startsWith('**'))) {
            start = i;
            break;
        }
    }
    if (start === -1) return null;
    for (let i = start + 1; i < lines.length; i++) {
        if (lines[i].startsWith('#')) {
            end = i;
            break;
        }
    }
    return lines.slice(start, end === -1 ? lines.length : end).join('\n').trim();
}

async function run() {
    console.log(`Starting final remediation for ${MAPPING.length} items...\n`);

    for (const item of MAPPING) {
        console.log(`Processing ${item.file}...`);
        const fullContent = await fetchFromGithub(item.file);
        const sectionText = extractSection(fullContent, "Common Mistakes");

        if (!sectionText) {
            console.log(`! No common mistakes found for ${item.id}`);
            continue;
        }

        console.log(`Translating section for ${item.id}...`);
        const translations = await convex.action("ai:translateGrammarSections", {
            enContent: sectionText,
            targetLangs: ["zh", "vi", "mn"]
        });

        if (translations) {
            // Get existing sections first (simplified approach: we just update the field)
            // Ideally we should merge, but we know commonMistakes is empty for these.
            const grammar = await convex.query("grammars:getByIdInternal", { grammarId: item.id });
            const updatedSections = {
                ...(grammar.sections || {}),
                commonMistakes: translations
            };

            await convex.mutation("grammars:updateSections", {
                id: item.id,
                sections: updatedSections
            });
            console.log(`✓ Successfully updated ${item.id}\n`);
        }
    }
    console.log("Final remediation complete!");
}

run().catch(console.error);
