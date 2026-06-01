import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('return CTA continuity contract', () => {
  it('lets review quiz return to today path or learning feedback from returnTo context', () => {
    const reviewQuizPage = readProjectFile('src/pages/ReviewQuizPage.tsx');
    const desktopReviewQuizPage = readProjectFile('src/pages/desktop/DesktopReviewQuizPage.tsx');
    const useAssetReviewFlow = readProjectFile('src/pages/review/useAssetReviewFlow.ts');

    expect(reviewQuizPage).toMatch(/resolveSafeReturnTo\(\s*params\.get\('returnTo'\)/);
    expect(reviewQuizPage).toContain("params.get('flow') === 'today'");
    expect(reviewQuizPage).toContain("params.get('taskId')");
    expect(reviewQuizPage).toContain('useAssetReviewFlow({');
    expect(reviewQuizPage).toContain('completeTodayTask');
    expect(useAssetReviewFlow).toContain('updateTaskCompletion');
    expect(reviewQuizPage).toContain('returnActionLabel');
    expect(reviewQuizPage).toContain('returnActionPath');
    expect(desktopReviewQuizPage).toContain('returnActionLabel');
    expect(desktopReviewQuizPage).toContain('navigate(returnActionPath)');
    expect(desktopReviewQuizPage).toContain('onCompleteReview');
  });

  it('lets TOPIK writing coach return to the originating feedback or today surface', () => {
    const writingCoachPage = readProjectFile('src/pages/learning/TopikWritingCoachPage.tsx');

    expect(writingCoachPage).toMatch(/resolveSafeReturnTo\(\s*searchParams\.get\('returnTo'\)/);
    expect(writingCoachPage).toContain('returnActionLabel');
    expect(writingCoachPage).toContain("searchParams.get('taskId')");
    expect(writingCoachPage).toContain('todayTaskId !== rewriteTaskId');
    expect(writingCoachPage).toContain('回到学习反馈');
    expect(writingCoachPage).toContain('回到今日之路');
  });
});
