import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

type EvalSentence = {
  id: string | number;
  text: string;
  expected_lemmas?: string[];
};

type EvalToken = {
  lemma?: string;
  surface?: string;
};

type EvalReportItem =
  | {
      id: EvalSentence['id'];
      text: string;
      status: 'success';
      recall: number;
      hits: string[];
      missing: string[];
      translation?: unknown;
    }
  | {
      id: EvalSentence['id'];
      text: string;
      status: 'error';
      error: string;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isEvalSentence = (value: unknown): value is EvalSentence => {
  if (!isRecord(value)) return false;
  const expected = value.expected_lemmas;
  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    typeof value.text === 'string' &&
    (expected === undefined ||
      (Array.isArray(expected) && expected.every(item => typeof item === 'string')))
  );
};

const isEvalToken = (value: unknown): value is EvalToken => {
  if (!isRecord(value)) return false;
  return (
    (value.lemma === undefined || typeof value.lemma === 'string') &&
    (value.surface === undefined || typeof value.surface === 'string')
  );
};

function parseConvexOutput(output: string): unknown {
  try {
    // Find the first { and last }
    const start = output.indexOf('{');
    const end = output.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON-like structure found');

    let jsonStr = output.substring(start, end + 1);

    // Convert JS object format to JSON
    jsonStr = jsonStr
      .replace(/([a-zA-Z0-9_]+):/g, '"$1":') // Quote keys
      .replace(/'/g, '"') // Replace single quotes with double
      .replace(/Id<[^>]+>\("([^"]+)"\)/g, '"$1"') // Flatten Convex IDs
      .replace(/undefined/g, 'null') // Handle undefined
      .replace(/,(\s*[\]}])/g, '$1'); // Remove trailing commas

    return JSON.parse(jsonStr);
  } catch (e) {
    // Fallback: try to eval in a safe-ish way if JSON.parse fails
    try {
      const clean = output.substring(output.indexOf('{')).replace(/Id<[^>]+>\(/g, '(');
      return new Function('Id', `return ${clean}`)((id: unknown) => id);
    } catch {
      throw new Error(`Failed to parse: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

async function runEval() {
  const sentencesPath = path.resolve(__dirname, 'sentences.json');
  const rawSentences: unknown = JSON.parse(fs.readFileSync(sentencesPath, 'utf-8'));
  const sentences = Array.isArray(rawSentences) ? rawSentences.filter(isEvalSentence) : [];

  const report: EvalReportItem[] = [];

  console.log(`Starting Eval for ${sentences.length} sentences...`);

  for (const item of sentences) {
    console.log(`Evaluating [${item.id}/20]: ${item.text}`);

    try {
      const identity = JSON.stringify({ subject: 'kh70xpvwxxxpvqx0r5tfn542vx7y9z5a' });
      const args = JSON.stringify({ sentence: item.text, targetLanguage: 'zh' });
      const output = execSync(
        `npx convex run --identity '${identity}' sentenceExplainer/explain:explainSentence '${args}'`,
        { encoding: 'utf-8' }
      );

      const result = parseConvexOutput(output);
      const resultRecord = isRecord(result) ? result : {};
      const data = isRecord(resultRecord.data) ? resultRecord.data : {};
      const tokens = Array.isArray(data.tokens) ? data.tokens.filter(isEvalToken) : [];
      const vocabulary = Array.isArray(data.vocabulary) ? data.vocabulary.filter(isEvalToken) : [];

      // Collect all lemmas from tokens and vocabulary
      const extractedLemmas = new Set(
        [...tokens, ...vocabulary]
          .map(token => (token.lemma || token.surface)?.trim())
          .filter((lemma): lemma is string => Boolean(lemma))
      );

      const expected = item.expected_lemmas || [];
      const hits = expected.filter((l: string) => extractedLemmas.has(l));
      const recall = expected.length > 0 ? hits.length / expected.length : 1;

      report.push({
        id: item.id,
        text: item.text,
        status: 'success',
        recall: recall,
        hits: hits,
        missing: expected.filter((l: string) => !hits.includes(l)),
        translation: data.naturalTranslation,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error processing ${item.id}: ${message}`);
      report.push({ id: item.id, text: item.text, status: 'error', error: message });
    }
  }

  const successItems = report.filter(
    (item): item is Extract<EvalReportItem, { status: 'success' }> => item.status === 'success'
  );
  const avgRecall =
    successItems.length > 0
      ? successItems.reduce((acc, r) => acc + r.recall, 0) / successItems.length
      : 0;

  const finalReport = {
    timestamp: new Date().toISOString(),
    averageRecall: avgRecall,
    details: report,
  };

  const reportPath = path.resolve(__dirname, 'eval_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));

  console.log(`\nEval Complete!`);
  console.log(`Average Recall: ${(avgRecall * 100).toFixed(2)}%`);
  console.log(`Report saved to: ${reportPath}`);
}

runEval().catch(console.error);
