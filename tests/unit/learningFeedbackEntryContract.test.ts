import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('learning feedback entry contract', () => {
  it('groups weekly report, ability profile, and review assets behind one feedback entry', () => {
    const desktopDashboard = readProjectFile('src/pages/desktop/DesktopDashboardPage.tsx');
    const mobileDashboard = readProjectFile('src/components/mobile/MobileDashboard.tsx');
    const desktopSidebar = readProjectFile('src/components/layout/DesktopSidebar.tsx');
    const commandPalette = readProjectFile('src/components/common/GlobalCommandPalette.tsx');

    for (const source of [desktopDashboard, mobileDashboard]) {
      expect(source).toContain('学习反馈');
      expect(source).toContain('能力画像');
      expect(source).toContain('复习资产');
      expect(source).toContain("'/dashboard/weekly-report'");
    }

    expect(desktopSidebar).toContain("id: 'learning-feedback'");
    expect(desktopSidebar).toContain("l: '学习反馈'");
    expect(desktopSidebar).toContain("path: toPath('/dashboard/weekly-report')");
    expect(commandPalette).toContain("id: 'learning-feedback'");
    expect(commandPalette).toContain("path: '/dashboard/weekly-report'");
  });
});
