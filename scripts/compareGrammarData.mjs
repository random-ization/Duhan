/**
 * compareGrammarData.mjs
 *
 * Compares non-TOPIK textbook grammar data against TOPIK grammar (canonical).
 * Uses Korean grammar kernel extraction + scoring-based fuzzy matching.
 *
 * Usage:
 *   node scripts/compareGrammarData.mjs
 *   node scripts/compareGrammarData.mjs --course ysk-1 --course ysk-2
 */

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

const TOPIK_COURSE_ID = "topik-grammar";
const args = process.argv.slice(2);

/**
 * Extract the Korean grammar kernel from a title.
 * Strips English text, romanization in brackets, prefixes like V-, A/V-, etc.
 */
function extractKoreanKernel(title) {
  let s = title;
  // Remove #N suffix
  s = s.replace(/ #\d+$/, "");
  // Remove bracketed romanization [...]
  s = s.replace(/\[.*?\]/g, "");
  // Remove parenthesized English (only if it contains mostly English)
  s = s.replace(/\([A-Za-z][^)]*\)/g, "");
  // Remove standalone English words/phrases
  s = s.replace(/\b[A-Za-z][A-Za-z0-9]*\b/g, " ");
  // Remove NOUN, VERB, etc. pattern markers
  s = s.replace(/\b(NOUN|VERB|ADJ|ADV)\s*\d*/g, " ");
  // Remove numbers
  s = s.replace(/\d+/g, "");
  // Keep Korean chars, ㄱ-ㅎ, ㅏ-ㅣ, 가-힣, and grammar punctuation /, ()
  // Remove other punctuation except / and ()
  s = s.replace(/["':;!?.,·]/g, "");
  // Normalize dashes/tildes to nothing
  s = s.replace(/[–—~-]/g, "");
  // Normalize whitespace
  s = s.replace(/\s+/g, " ").trim();
  // Strip leading/trailing slashes
  s = s.replace(/^\/+|\/+$/g, "").trim();
  return s;
}

/**
 * Further normalize a Korean kernel for matching.
 * Removes all spaces and optional-marker parentheses.
 */
function normalizeKernel(kernel) {
  let s = kernel;
  // Remove parentheses but keep content: (으) -> 으
  s = s.replace(/[()（）]/g, "");
  // Remove all whitespace
  s = s.replace(/\s+/g, "");
  return s.toLowerCase();
}

/**
 * Build match candidates from a Korean kernel.
 * Handles optional 으 patterns, slash variants, etc.
 */
function buildMatchCandidates(kernel) {
  const normalized = normalizeKernel(kernel);
  if (!normalized || normalized.length < 2) return [];

  const candidates = new Set([normalized]);

  // Handle optional 으: remove 으
  if (normalized.includes("으")) {
    candidates.add(normalized.replace(/으/g, ""));
  }

  // Handle slash variants: ㄴ/는 -> generate both ㄴ and 는
  if (normalized.includes("/")) {
    const parts = normalized.split("/");
    // Try each individual part
    for (const part of parts) {
      if (part.length >= 2) candidates.add(part);
    }
  }

  return [...candidates].filter((c) => c.length >= 2);
}

/**
 * Score how well two Korean grammar kernels match.
 * Returns 0 for no match, higher scores for better matches.
 */
function scoreMatch(nonTopikKernel, topikKernel) {
  const ntNorm = normalizeKernel(nonTopikKernel);
  const tNorm = normalizeKernel(topikKernel);

  if (!ntNorm || !tNorm) return 0;

  // Exact match after normalization
  if (ntNorm === tNorm) return 100;

  // One contains the other (for very close matches)
  if (ntNorm.length >= 4 && tNorm.length >= 4) {
    if (ntNorm === tNorm) return 100;
    // One is a substring of other + they share enough characters
    if (tNorm.includes(ntNorm) && ntNorm.length >= tNorm.length * 0.6) return 85;
    if (ntNorm.includes(tNorm) && tNorm.length >= ntNorm.length * 0.6) return 85;
  }

  // Build candidates from both and find overlaps
  const ntCandidates = buildMatchCandidates(nonTopikKernel);
  const tCandidates = buildMatchCandidates(topikKernel);

  let bestScore = 0;
  for (const ntc of ntCandidates) {
    for (const tc of tCandidates) {
      if (ntc === tc) {
        const matchLen = ntc.length;
        // Score based on match length relative to original
        const coverage = matchLen / Math.max(ntNorm.length, tNorm.length);
        const score = Math.round(50 + coverage * 40);
        bestScore = Math.max(bestScore, score);
      }
      // Substring match for longer patterns
      if (ntc.length >= 4 && tc.length >= 4) {
        if (tc.includes(ntc) && ntc.length >= tc.length * 0.7) {
          bestScore = Math.max(bestScore, 60);
        }
        if (ntc.includes(tc) && tc.length >= ntc.length * 0.7) {
          bestScore = Math.max(bestScore, 60);
        }
      }
    }
  }

  return bestScore;
}

function assessContentQuality(grammar) {
  return {
    hasSections: !!(
      grammar.sections && Object.keys(grammar.sections).length > 0
    ),
    hasQuizItems: !!(grammar.quizItems && grammar.quizItems.length > 0),
    hasSourceMeta: !!grammar.sourceMeta,
    exampleCount: grammar.examples?.length ?? 0,
    summaryLength: grammar.summary?.length ?? 0,
    explanationLength: grammar.explanation?.length ?? 0,
    hasSectionsZh: !!(
      grammar.sections?.introduction?.zh || grammar.sections?.core?.zh
    ),
    hasSectionsEn: !!(
      grammar.sections?.introduction?.en || grammar.sections?.core?.en
    ),
    hasSectionsVi: !!(
      grammar.sections?.introduction?.vi || grammar.sections?.core?.vi
    ),
    hasSectionsMn: !!(
      grammar.sections?.introduction?.mn || grammar.sections?.core?.mn
    ),
  };
}

// Minimum score threshold for considering a match
const MATCH_THRESHOLD = 70;

function parseSelectedCourses(argv) {
  const selected = [];

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--course" && argv[index + 1]) {
      selected.push(argv[index + 1]);
      index += 1;
    }
  }

  return [...new Set(selected)];
}

async function resolveNonTopikCourses() {
  const selectedCourses = parseSelectedCourses(args);
  if (selectedCourses.length > 0) {
    return selectedCourses.map((courseId) => ({
      id: courseId,
      name: courseId,
    }));
  }

  const institutes = await convex.query("institutes:getAll", {});
  return institutes
    .filter((course) => course.id && course.id !== TOPIK_COURSE_ID)
    .map((course) => ({
      id: course.id,
      name: course.name || course.id,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function run() {
  console.log("\n=== Grammar Data Comparison Tool ===\n");

  // 1. Fetch all grammar points
  console.log("Fetching all grammar points...");
  const allGrammars = await convex.query("polyglot:getItems", {});
  console.log(`Total grammar points: ${allGrammars.length}`);

  // 2. Fetch course-grammar links for TOPIK
  console.log(`\nFetching TOPIK grammar links (${TOPIK_COURSE_ID})...`);
  const topikLinks = await convex.query("grammars:getByCourse", {
    courseId: TOPIK_COURSE_ID,
  });
  console.log(`TOPIK grammar entries: ${topikLinks.length}`);

  // Build TOPIK grammar map
  const topikGrammarIds = new Set(topikLinks.map((l) => l.id));
  const topikGrammars = [];
  for (const grammar of allGrammars) {
    if (topikGrammarIds.has(grammar._id)) {
      topikGrammars.push({
        ...grammar,
        koreanKernel: extractKoreanKernel(grammar.title),
      });
    }
  }

  console.log(
    `TOPIK grammars with kernels: ${topikGrammars.length}`
  );

  const grammarById = new Map(allGrammars.map((grammar) => [grammar._id, grammar]));
  const nonTopikCourses = await resolveNonTopikCourses();
  console.log(
    `Discovered non-TOPIK courses to compare: ${nonTopikCourses.length}`
  );

  // Debug: show some TOPIK kernels
  console.log("\nSample TOPIK kernels:");
  for (const g of topikGrammars.slice(0, 10)) {
    console.log(`  "${g.title}" -> kernel: "${g.koreanKernel}"`);
  }

  // 3. Process non-TOPIK courses
  const report = {
    timestamp: new Date().toISOString(),
    topikGrammarCount: topikLinks.length,
    matchThreshold: MATCH_THRESHOLD,
    comparedCourseCount: nonTopikCourses.length,
    comparedCourses: nonTopikCourses,
    courses: {},
    summary: {
      totalNonTopik: 0,
      matched: 0,
      noMatch: 0,
      alreadySameRecord: 0,
    },
    matchedPairs: [],
    unmatchedGrammars: [],
  };

  for (const course of nonTopikCourses) {
    const courseId = course.id;
    console.log(`\nProcessing course: ${courseId} (${course.name})...`);
    const courseLinks = await convex.query("grammars:getByCourse", {
      courseId,
    });

    if (courseLinks.length === 0) {
      console.log(`  No grammar entries found for ${courseId}`);
      report.courses[courseId] = {
        courseName: course.name,
        total: 0,
        matched: 0,
        noMatch: 0,
        sameRecord: 0,
      };
      continue;
    }

    console.log(`  Found ${courseLinks.length} grammar entries`);
    const courseStats = {
      courseName: course.name,
      total: courseLinks.length,
      matched: 0,
      noMatch: 0,
      sameRecord: 0,
    };

    for (const link of courseLinks) {
      const grammarId = link.id;
      report.summary.totalNonTopik++;

      // Check if this grammar record is already a TOPIK grammar (shared record)
      if (topikGrammarIds.has(grammarId)) {
        courseStats.sameRecord++;
        report.summary.alreadySameRecord++;
        continue;
      }

      // Find the full grammar record
      const grammar = grammarById.get(grammarId);
      if (!grammar) continue;

      const nonTopikKernel = extractKoreanKernel(grammar.title);

      // Score against all TOPIK grammars and find best match
      let bestMatch = null;
      let bestScore = 0;

      for (const topikGrammar of topikGrammars) {
        const score = scoreMatch(nonTopikKernel, topikGrammar.koreanKernel);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = topikGrammar;
        }
      }

      if (bestMatch && bestScore >= MATCH_THRESHOLD) {
        courseStats.matched++;
        report.summary.matched++;

        report.matchedPairs.push({
          courseId,
          courseName: course.name,
          unitId: link.unitId,
          nonTopikGrammarId: grammar._id,
          nonTopikTitle: grammar.title,
          nonTopikKernel,
          topikGrammarId: bestMatch._id,
          topikTitle: bestMatch.title,
          topikKernel: bestMatch.koreanKernel,
          matchScore: bestScore,
          nonTopikQuality: assessContentQuality(grammar),
          topikQuality: assessContentQuality(bestMatch),
        });
      } else {
        courseStats.noMatch++;
        report.summary.noMatch++;
        report.unmatchedGrammars.push({
          courseId,
          courseName: course.name,
          unitId: link.unitId,
          grammarId: grammar._id,
          title: grammar.title,
          koreanKernel: nonTopikKernel,
          bestTopikCandidate: bestMatch
            ? {
                title: bestMatch.title,
                kernel: bestMatch.koreanKernel,
                score: bestScore,
              }
            : null,
          quality: assessContentQuality(grammar),
        });
      }
    }

    report.courses[courseId] = courseStats;
    console.log(
      `  Results: matched=${courseStats.matched}, noMatch=${courseStats.noMatch}, sameRecord=${courseStats.sameRecord}`
    );
  }

  // 4. Print summary
  console.log("\n=== Summary ===");
  console.log(`Total non-TOPIK grammars: ${report.summary.totalNonTopik}`);
  console.log(`Already same record: ${report.summary.alreadySameRecord}`);
  console.log(`Matched (score >= ${MATCH_THRESHOLD}): ${report.summary.matched}`);
  console.log(`No match: ${report.summary.noMatch}`);
  console.log(`\nMatched pairs to migrate: ${report.matchedPairs.length}`);

  if (report.matchedPairs.length > 0) {
    console.log("\n--- Matched Pairs ---");
    for (const pair of report.matchedPairs) {
      console.log(
        `  [${pair.courseId}] "${pair.nonTopikTitle}" => "${pair.topikTitle}" (score: ${pair.matchScore})`
      );
    }
  }

  if (report.unmatchedGrammars.length > 0) {
    console.log("\n--- Unmatched (with best candidate) ---");
    for (const u of report.unmatchedGrammars.slice(0, 30)) {
      const candidateInfo = u.bestTopikCandidate
        ? ` | closest: "${u.bestTopikCandidate.title}" (score: ${u.bestTopikCandidate.score})`
        : " | no candidate";
      console.log(
        `  [${u.courseId}] "${u.title}" kernel="${u.koreanKernel}"${candidateInfo}`
      );
    }
  }

  // 5. Save report
  fs.mkdirSync("tmp", { recursive: true });
  fs.writeFileSync(
    "tmp/grammar_comparison_report.json",
    JSON.stringify(report, null, 2)
  );
  console.log("\nReport saved to tmp/grammar_comparison_report.json");
}

run().catch(console.error);
