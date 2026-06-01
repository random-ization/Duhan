import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('TOPIK writing coach entry parity', () => {
  it('keeps writing coach reachable from shared desktop and mobile entry surfaces', () => {
    const routesConfig = readProjectFile('src/config/routes.config.ts');
    const desktopSidebar = readProjectFile('src/components/layout/DesktopSidebar.tsx');
    const commandPalette = readProjectFile('src/components/common/GlobalCommandPalette.tsx');
    const mobileDashboard = readProjectFile('src/components/mobile/MobileDashboard.tsx');

    expect(routesConfig).toContain("segments[1] === 'writing-coach'");
    expect(routesConfig).toContain("headerTitle: 'dashboard.topik.writingCoachTitle'");
    expect(desktopSidebar).toContain("id: 'writing-coach'");
    expect(desktopSidebar).toContain("path: toPath('/topik/writing-coach')");
    expect(commandPalette).toContain("id: 'topik-writing-coach'");
    expect(commandPalette).toContain("path: '/topik/writing-coach'");
    expect(mobileDashboard).toContain("navigate('/topik/writing-coach')");
    expect(mobileDashboard).toContain('TOPIK 写作教练');
  });
});
