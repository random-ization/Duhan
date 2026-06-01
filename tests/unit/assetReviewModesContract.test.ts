import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('asset review modes contract', () => {
  it('routes sentence and grammar review modes to saved learning assets instead of vocab fallback', () => {
    const reviewQuizPage = readProjectFile('src/pages/ReviewQuizPage.tsx');
    const assetReviewSession = readProjectFile('src/pages/review/AssetReviewSession.tsx');
    const useAssetReviewFlow = readProjectFile('src/pages/review/useAssetReviewFlow.ts');

    expect(assetReviewSession).toContain("export type AssetReviewMode = 'sentences' | 'grammar'");
    expect(useAssetReviewFlow).toContain('FSRS_REVIEW.getDueItems');
    expect(useAssetReviewFlow).toContain('FSRS_REVIEW.applyReviewResult');
    expect(useAssetReviewFlow).toContain(
      "kind: assetMode === 'sentences' ? 'sentence' : 'grammar'"
    );
    expect(useAssetReviewFlow).toContain('calculateFSRSReview');
    expect(reviewQuizPage).toContain('useAssetReviewFlow({');
    expect(reviewQuizPage).not.toContain('FSRS_REVIEW.applyReviewResult');
    expect(reviewQuizPage).toContain('import AssetReviewSession, {');
    expect(reviewQuizPage).toContain("from './review/AssetReviewSession'");
    expect(reviewQuizPage).toContain("from './review/useAssetReviewFlow'");
    expect(reviewQuizPage).not.toContain('function AssetReviewSession');
    expect(assetReviewSession).toContain('type AssetReviewGradeOption');
    expect(assetReviewSession).toContain('ASSET_REVIEW_GRADE_OPTIONS');
    expect(assetReviewSession).toContain('Still shaky');
    expect(assetReviewSession).toContain('Remembered');
    expect(assetReviewSession).toContain('Very familiar');
    expect(assetReviewSession).toContain(
      'onReviewAsset: (item: DueReviewItem, grade: Grade) => AssetReviewFeedback'
    );
    expect(useAssetReviewFlow).toContain('calculateFSRSReview(grade');
    expect(assetReviewSession).toContain('export type AssetReviewFeedback');
    expect(assetReviewSession).toContain('formatAssetNextReviewLabel');
    expect(assetReviewSession).toContain('Recorded');
    expect(assetReviewSession).toContain('Next review');
    expect(assetReviewSession).toContain('Asset review complete');
    expect(assetReviewSession).toContain('setCompleted(true)');
    expect(useAssetReviewFlow).toContain('serializeCard');
    expect(reviewQuizPage).not.toContain('renderAssetReviewSession');
    expect(reviewQuizPage).toContain('navigate(returnActionPath)');
  });
});
