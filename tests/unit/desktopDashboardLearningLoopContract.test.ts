import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('desktop dashboard learning loop contract', () => {
  it('summarizes today, learned progress, and weakest gap before secondary entry surfaces', () => {
    const source = readProjectFile('src/pages/desktop/DesktopDashboardPage.tsx');

    expect(source).toContain('LearningLoopSummary');
    expect(source).toContain('今日指令台');
    expect(source).toContain('学习驾驶舱');
    expect(source).toContain('下一步');
    expect(source).toContain('为什么做');
    expect(source).toContain('CommandMetric');
    expect(source).toContain('开始今日学习');
    expect(source).toContain('已学');
    expect(source).toContain('不足');
    expect(source).toContain('LearningFeedbackCard');
    expect(source).toContain('EssentialActionsCard');
    expect(source).toContain('ContinueLearningCard');
    expect(source).not.toContain('DesktopKsoftDashboardRail');
    expect(source).not.toContain('Continue Learning + AI Suggestion row');
    expect(source).not.toContain('Library + Settings');
    expect(source).toContain('findWeakestAbilityDimension');
    expect(source.indexOf('<LearningLoopSummary')).toBeLessThan(
      source.indexOf('<DailyTaskCockpit')
    );
  });
});
