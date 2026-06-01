import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('public help center route and entry contracts', () => {
  it('registers /help as a public localized route outside the protected app layout', () => {
    const routesContent = readProjectFile('src/routes.tsx');
    const helpRouteIndex = routesContent.indexOf('path="help"');
    const protectedRouteIndex = routesContent.indexOf(
      '<Route element={withPageLoader(<ProtectedRoute />)}>'
    );

    expect(routesContent).toContain(
      "const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'))"
    );
    expect(helpRouteIndex).toBeGreaterThan(-1);
    expect(protectedRouteIndex).toBeGreaterThan(-1);
    expect(helpRouteIndex).toBeLessThan(protectedRouteIndex);
    expect(routesContent).not.toContain('path="docs"');
  });

  it('exposes the help center in desktop, mobile support, command search, and public SEO config', () => {
    const sidebarContent = readProjectFile('src/components/layout/DesktopSidebar.tsx');
    const mobileProfileContent = readProjectFile('src/components/mobile/MobileProfilePage.tsx');
    const commandPaletteContent = readProjectFile('src/components/common/GlobalCommandPalette.tsx');
    const publicRoutesContent = readProjectFile('src/seo/publicRoutesData.mjs');

    expect(sidebarContent).toContain("path: toPath('/help')");
    expect(mobileProfileContent).toContain("onClick: () => navigate('/help')");
    expect(commandPaletteContent).toContain("id: 'help-center'");
    expect(commandPaletteContent).toContain("path: '/help'");
    expect(publicRoutesContent).toContain("path: '/help'");
  });
});
