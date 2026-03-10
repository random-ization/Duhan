/**
 * exportGrammarAuditWorkbook.mjs
 *
 * Build a single Excel workbook for manual grammar-match review.
 *
 * Usage:
 *   node scripts/exportGrammarAuditWorkbook.mjs
 *   node scripts/exportGrammarAuditWorkbook.mjs tmp/grammar_comparison_report.json tmp/grammar_audit_review.xlsx
 */

import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

const REPORT_FILE = process.argv[2] || "tmp/grammar_comparison_report.json";
const OUTPUT_FILE =
  process.argv[3] || "tmp/grammar_comparison_audit_review.xlsx";

function readReport(reportFile) {
  if (!fs.existsSync(reportFile)) {
    throw new Error(
      `Comparison report not found: ${reportFile}\nRun node scripts/compareGrammarData.mjs first.`
    );
  }
  return JSON.parse(fs.readFileSync(reportFile, "utf8"));
}

function qualityCell(quality, key) {
  return quality?.[key] ?? "";
}

function getReviewAction(matchScore, status) {
  if (status === "MATCHED") {
    if (matchScore >= 90) return "Replace directly (90+)";
    if (matchScore >= 80) return "Review first (80-89)";
    if (matchScore >= 70) return "Manual review required (70-79)";
  }
  return "No confirmed match";
}

function getReviewBucket(matchScore, status) {
  if (status !== "MATCHED") return "UNMATCHED";
  if (matchScore >= 90) return "DIRECT_90_PLUS";
  if (matchScore >= 80) return "REVIEW_80_89";
  return "REVIEW_70_79";
}

function buildMatchedRows(report) {
  return (report.matchedPairs || []).map((pair) => ({
    status: "MATCHED",
    reviewBucket: getReviewBucket(pair.matchScore, "MATCHED"),
    reviewAction: getReviewAction(pair.matchScore, "MATCHED"),
    courseId: pair.courseId,
    courseName: pair.courseName || "",
    unitId: pair.unitId,
    nonTopikGrammarId: pair.nonTopikGrammarId,
    nonTopikTitle: pair.nonTopikTitle,
    nonTopikKernel: pair.nonTopikKernel,
    topikGrammarId: pair.topikGrammarId,
    topikTitle: pair.topikTitle,
    topikKernel: pair.topikKernel,
    matchScore: pair.matchScore,
    nonTopikHasSections: qualityCell(pair.nonTopikQuality, "hasSections"),
    nonTopikHasQuizItems: qualityCell(pair.nonTopikQuality, "hasQuizItems"),
    nonTopikHasSourceMeta: qualityCell(pair.nonTopikQuality, "hasSourceMeta"),
    nonTopikExampleCount: qualityCell(pair.nonTopikQuality, "exampleCount"),
    nonTopikSummaryLength: qualityCell(pair.nonTopikQuality, "summaryLength"),
    nonTopikExplanationLength: qualityCell(
      pair.nonTopikQuality,
      "explanationLength"
    ),
    topikHasSections: qualityCell(pair.topikQuality, "hasSections"),
    topikHasQuizItems: qualityCell(pair.topikQuality, "hasQuizItems"),
    topikHasSourceMeta: qualityCell(pair.topikQuality, "hasSourceMeta"),
    topikExampleCount: qualityCell(pair.topikQuality, "exampleCount"),
    topikSummaryLength: qualityCell(pair.topikQuality, "summaryLength"),
    topikExplanationLength: qualityCell(pair.topikQuality, "explanationLength"),
  }));
}

function buildUnmatchedRows(report) {
  return (report.unmatchedGrammars || []).map((item) => ({
    status: "UNMATCHED",
    reviewBucket: "UNMATCHED",
    reviewAction: item.bestTopikCandidate
      ? "No confirmed match; inspect suggested candidate"
      : "No TOPIK candidate found",
    courseId: item.courseId,
    courseName: item.courseName || "",
    unitId: item.unitId,
    nonTopikGrammarId: item.grammarId,
    nonTopikTitle: item.title,
    nonTopikKernel: item.koreanKernel,
    topikGrammarId: "",
    topikTitle: item.bestTopikCandidate?.title || "",
    topikKernel: item.bestTopikCandidate?.kernel || "",
    matchScore: item.bestTopikCandidate?.score ?? "",
    nonTopikHasSections: qualityCell(item.quality, "hasSections"),
    nonTopikHasQuizItems: qualityCell(item.quality, "hasQuizItems"),
    nonTopikHasSourceMeta: qualityCell(item.quality, "hasSourceMeta"),
    nonTopikExampleCount: qualityCell(item.quality, "exampleCount"),
    nonTopikSummaryLength: qualityCell(item.quality, "summaryLength"),
    nonTopikExplanationLength: qualityCell(item.quality, "explanationLength"),
    topikHasSections: "",
    topikHasQuizItems: "",
    topikHasSourceMeta: "",
    topikExampleCount: "",
    topikSummaryLength: "",
    topikExplanationLength: "",
  }));
}

function sortRows(rows) {
  return [...rows].sort((left, right) => {
    if (left.courseName !== right.courseName) {
      return String(left.courseName).localeCompare(String(right.courseName));
    }
    if (left.courseId !== right.courseId) {
      return String(left.courseId).localeCompare(String(right.courseId));
    }
    if (left.unitId !== right.unitId) {
      return Number(left.unitId) - Number(right.unitId);
    }
    if (left.status !== right.status) {
      return String(left.status).localeCompare(String(right.status));
    }
    return String(left.nonTopikTitle).localeCompare(String(right.nonTopikTitle));
  });
}

function withAutoFilterAndWidths(worksheet, rows) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  if (headers.length > 0) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    worksheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { c: 0, r: 0 },
        e: { c: range.e.c, r: range.e.r },
      }),
    };
    worksheet["!cols"] = headers.map((header) => {
      const maxLength = Math.max(
        header.length,
        ...rows.map((row) => String(row[header] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLength + 2, 12), 40) };
    });
  }
}

function appendJsonSheet(workbook, name, rows) {
  const worksheet = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
  withAutoFilterAndWidths(worksheet, rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

function appendSummarySheet(workbook, report, allRows) {
  const courseRows = Object.entries(report.courses || {})
    .map(([courseId, stats]) => ({
      courseId,
      courseName: stats.courseName || "",
      total: stats.total || 0,
      matched: stats.matched || 0,
      unmatched: stats.noMatch || 0,
      sameRecord: stats.sameRecord || 0,
      matchRate:
        stats.total && stats.total > 0
          ? `${Math.round((stats.matched / stats.total) * 100)}%`
          : "0%",
    }))
    .sort((left, right) => right.matched - left.matched);

  const directCount = allRows.filter(
    (row) => row.reviewBucket === "DIRECT_90_PLUS"
  ).length;
  const review80Count = allRows.filter(
    (row) => row.reviewBucket === "REVIEW_80_89"
  ).length;
  const review70Count = allRows.filter(
    (row) => row.reviewBucket === "REVIEW_70_79"
  ).length;
  const unmatchedCount = allRows.filter(
    (row) => row.reviewBucket === "UNMATCHED"
  ).length;

  const overview = [
    ["Metric", "Value"],
    ["GeneratedAt", report.timestamp || ""],
    ["ComparedCourseCount", report.comparedCourseCount || 0],
    ["TopikGrammarCount", report.topikGrammarCount || 0],
    ["TotalNonTopikGrammarRows", report.summary?.totalNonTopik || 0],
    ["MatchedRows", report.summary?.matched || 0],
    ["UnmatchedRows", report.summary?.noMatch || 0],
    ["DirectReplace90Plus", directCount],
    ["Review80To89", review80Count],
    ["Review70To79", review70Count],
    ["UnmatchedForManualResearch", unmatchedCount],
    ["Note", "Migration keeps course grammar count and position unchanged."],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([
    ...overview,
    [],
    ["Course Summary"],
    Object.keys(courseRows[0] || {}),
    ...courseRows.map((row) => Object.values(row)),
  ]);

  worksheet["!cols"] = [{ wch: 28 }, { wch: 24 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, "Summary");
}

function ensureOutputDir(outputFile) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
}

function run() {
  const report = readReport(REPORT_FILE);
  const matchedRows = buildMatchedRows(report);
  const unmatchedRows = buildUnmatchedRows(report);
  const allRows = sortRows([...matchedRows, ...unmatchedRows]);

  const workbook = XLSX.utils.book_new();
  appendSummarySheet(workbook, report, allRows);
  appendJsonSheet(workbook, "All Entries", allRows);
  appendJsonSheet(workbook, "Matched", sortRows(matchedRows));
  appendJsonSheet(
    workbook,
    "Direct 90+",
    sortRows(matchedRows.filter((row) => row.matchScore >= 90))
  );
  appendJsonSheet(
    workbook,
    "Review 80-89",
    sortRows(
      matchedRows.filter((row) => row.matchScore >= 80 && row.matchScore < 90)
    )
  );
  appendJsonSheet(
    workbook,
    "Review 70-79",
    sortRows(
      matchedRows.filter((row) => row.matchScore >= 70 && row.matchScore < 80)
    )
  );
  appendJsonSheet(workbook, "Unmatched", sortRows(unmatchedRows));

  ensureOutputDir(OUTPUT_FILE);
  XLSX.writeFile(workbook, OUTPUT_FILE);
  console.log(`Audit workbook saved to ${OUTPUT_FILE}`);
}

run();
