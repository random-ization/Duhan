/**
 * migrateGrammarToTopik.mjs
 *
 * Reads the comparison report from compareGrammarData.mjs and replaces
 * non-TOPIK grammar content with TOPIK's rich content for matched pairs.
 *
 * Usage:
 *   node scripts/migrateGrammarToTopik.mjs                # Execute migration
 *   node scripts/migrateGrammarToTopik.mjs --dry-run      # Preview only
 *   node scripts/migrateGrammarToTopik.mjs --min-score 80 # Require higher match score
 *   node scripts/migrateGrammarToTopik.mjs --skip-rich    # Skip targets with rich content
 */

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

const REPORT_FILE = "tmp/grammar_comparison_report.json";
const RESULTS_FILE = "tmp/grammar_migration_results.json";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const skipRich = args.includes("--skip-rich");
const minScoreIndex = args.findIndex((arg) => arg === "--min-score");
const minScoreArg = minScoreIndex >= 0 ? Number(args[minScoreIndex + 1]) : null;
const minScore = Number.isFinite(minScoreArg) ? minScoreArg : null;

async function run() {
  console.log(`\n=== Grammar Migration Tool ${isDryRun ? "(DRY RUN)" : ""} ===\n`);

  if (!fs.existsSync(REPORT_FILE)) {
    console.error(
      "Comparison report not found. Run compareGrammarData.mjs first:\n" +
        "  node scripts/compareGrammarData.mjs"
    );
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_FILE, "utf8"));
  const matchedPairs = report.matchedPairs || [];
  const effectiveMinScore =
    minScore ?? (Number.isFinite(report.matchThreshold) ? report.matchThreshold : 70);

  console.log(`Found ${matchedPairs.length} matched pairs to migrate.\n`);
  console.log(`Min score: ${effectiveMinScore}`);
  console.log(`Skip rich content: ${skipRich ? "YES" : "NO"}`);

  if (matchedPairs.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  const results = {
    timestamp: new Date().toISOString(),
    isDryRun,
    total: matchedPairs.length,
    success: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  for (let i = 0; i < matchedPairs.length; i++) {
    const pair = matchedPairs[i];
    const progress = `[${i + 1}/${matchedPairs.length}]`;

    if (pair.matchScore < effectiveMinScore) {
      console.log(
        `${progress} SKIP (score ${pair.matchScore} < ${effectiveMinScore}): ${pair.nonTopikTitle}`
      );
      results.skipped++;
      results.details.push({
        ...pair,
        action: "skipped",
        reason: "below_min_score",
      });
      continue;
    }

    if (skipRich && pair.nonTopikQuality?.hasSections && pair.nonTopikQuality?.hasQuizItems) {
      console.log(
        `${progress} SKIP (already has sections+quiz): ${pair.nonTopikTitle}`
      );
      results.skipped++;
      results.details.push({
        ...pair,
        action: "skipped",
        reason: "already_has_rich_content",
      });
      continue;
    }

    if (isDryRun) {
      console.log(
        `${progress} WOULD REPLACE: "${pair.nonTopikTitle}" (${pair.courseId}) ` +
          `← "${pair.topikTitle}" (score: ${pair.matchScore})`
      );
      results.success++;
      results.details.push({
        ...pair,
        action: "would_replace",
      });
      continue;
    }

    try {
      const result = await convex.mutation("polyglot:replaceGrammarContent", {
        sourceId: pair.topikGrammarId,
        targetId: pair.nonTopikGrammarId,
      });

      console.log(
        `${progress} REPLACED: "${pair.nonTopikTitle}" (${pair.courseId}) ` +
          `← "${pair.topikTitle}" (score: ${pair.matchScore}, ${result.fieldsUpdated} fields)`
      );
      results.success++;
      results.details.push({
        ...pair,
        action: "replaced",
        fieldsUpdated: result.fieldsUpdated,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `${progress} FAILED: "${pair.nonTopikTitle}" (${pair.courseId}): ${message}`
      );
      results.failed++;
      results.details.push({
        ...pair,
        action: "failed",
        error: message,
      });
    }

    // Brief pause to avoid rate limiting
    if (!isDryRun) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Print summary
  console.log("\n=== Migration Summary ===");
  console.log(`Total: ${results.total}`);
  console.log(`Success: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Skipped: ${results.skipped}`);

  // Save results
  fs.mkdirSync("tmp", { recursive: true });
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${RESULTS_FILE}`);
}

run().catch(console.error);
