import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('today flow continuity contract', () => {
  it('preserves flow and return context when opening daily tasks from dashboard surfaces', () => {
    const desktopDashboard = readProjectFile('src/pages/desktop/DesktopDashboardPage.tsx');
    const mobileDashboard = readProjectFile('src/components/mobile/MobileDashboard.tsx');
    const todayFlow = readProjectFile('src/utils/todayFlow.ts');

    expect(todayFlow).toContain('export const addTodayFlowParam');
    expect(todayFlow).toContain('export const buildTodayTaskPath');
    expect(todayFlow).toContain('normalizeTodayTaskLinkPath');
    expect(todayFlow).toContain("return '/review/quiz?mode=full'");
    expect(todayFlow).toContain('taskId?: string');
    expect(todayFlow).toContain("params.set('taskId', taskId)");
    expect(desktopDashboard).toContain('buildTodayTaskPath(nextTask, dashboardReturnPath)');
    expect(desktopDashboard).toContain('buildTodayTaskPath(task, dashboardReturnPath)');
    expect(mobileDashboard).toContain('buildTodayTaskPath(nextDailyTask, dashboardPath)');
    expect(mobileDashboard).toContain('buildTodayTaskPath(task, dashboardPath)');
    expect(mobileDashboard).not.toContain('navigate(task.linkPath)');
  });

  it('preserves learning feedback return context for feedback action buttons', () => {
    const weeklyReportPage = readProjectFile('src/pages/dashboard/WeeklyReportPage.tsx');

    expect(weeklyReportPage).toContain("const feedbackReturnPath = '/dashboard/weekly-report'");
    expect(weeklyReportPage).toContain(
      "appendReturnToPath('/review/quiz?mode=sentences', feedbackReturnPath)"
    );
    expect(weeklyReportPage).toContain(
      "appendReturnToPath('/review/quiz?mode=grammar', feedbackReturnPath)"
    );
    expect(weeklyReportPage).toContain(
      "appendReturnToPath('/topik/writing-coach', feedbackReturnPath)"
    );
  });
});
