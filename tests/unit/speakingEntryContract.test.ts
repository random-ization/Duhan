import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('speaking practice entry contract', () => {
  it('keeps speaking practice reachable from primary web entry surfaces', () => {
    const routes = readProjectFile('src/routes.tsx');
    const desktopSidebar = readProjectFile('src/components/layout/DesktopSidebar.tsx');
    const commandPalette = readProjectFile('src/components/common/GlobalCommandPalette.tsx');
    const desktopDashboard = readProjectFile('src/pages/desktop/DesktopDashboardPage.tsx');
    const mobileBottomNav = readProjectFile('src/components/mobile/MobileBottomNav.tsx');

    expect(routes).toContain('path="speaking"');
    expect(desktopSidebar).toContain("id: 'speaking'");
    expect(desktopSidebar).toContain("path: toPath('/speaking')");
    expect(commandPalette).toContain("id: 'speaking-coach'");
    expect(commandPalette).toContain("path: '/speaking'");
    expect(desktopDashboard).toContain("path: '/speaking'");
    expect(desktopDashboard).toContain('mobileSpeakingModule.title');
    expect(mobileBottomNav).toContain("pathWithoutLang.startsWith('/speaking')");
  });
});
