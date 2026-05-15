import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: ".env.local" });

function parseConvexOutput(output: string) {
    try {
        // Find the first { and last }
        const start = output.indexOf('{');
        const end = output.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error("No JSON-like structure found");
        
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
            const clean = output.substring(output.indexOf('{'))
                .replace(/Id<[^>]+>\(/g, '(');
            return new Function('Id', `return ${clean}`)( (id: any) => id );
        } catch (e2) {
            throw new Error(`Failed to parse: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
}

async function runEval() {
  const sentencesPath = path.resolve(__dirname, 'sentences.json');
  const sentences = JSON.parse(fs.readFileSync(sentencesPath, 'utf-8'));
  const regex = /{([^}]+)}/g;
  
  const report: any[] = [];
  
  console.log(`Starting Eval for ${sentences.length} sentences...`);
  
  for (const item of sentences) {
    console.log(`Evaluating [${item.id}/20]: ${item.text}`);
    
    try {
      const identity = JSON.stringify({ subject: "kh70xpvwxxxpvqx0r5tfn542vx7y9z5a" });
      const args = JSON.stringify({ sentence: item.text, targetLanguage: 'zh' });
      const output = execSync(`npx convex run --identity '${identity}' sentenceExplainer/explain:explainSentence '${args}'`, { encoding: 'utf-8' });
      
      const result = parseConvexOutput(output);
      const data = result.data || {};
      const tokens = data.tokens || [];
      const vocabulary = data.vocabulary || [];
      
      // Collect all lemmas from tokens and vocabulary
      const extractedLemmas = new Set([
        ...tokens.map((t: any) => (t.lemma || t.surface)?.trim()),
        ...vocabulary.map((v: any) => (v.lemma || v.surface)?.trim())
      ]);
      
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
      
    } catch (err: any) {
      console.error(`Error processing ${item.id}: ${err.message}`);
      report.push({ id: item.id, text: item.text, status: 'error', error: err.message });
    }
  }
  
  const successItems = report.filter(r => r.status === 'success');
  const avgRecall = successItems.length > 0 
    ? successItems.reduce((acc, r) => acc + r.recall, 0) / successItems.length
    : 0;
  
  const finalReport = {
    timestamp: new Date().toISOString(),
    averageRecall: avgRecall,
    details: report
  };
  
  const reportPath = path.resolve(__dirname, 'eval_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
  
  console.log(`\nEval Complete!`);
  console.log(`Average Recall: ${(avgRecall * 100).toFixed(2)}%`);
  console.log(`Report saved to: ${reportPath}`);
}

runEval().catch(console.error);
