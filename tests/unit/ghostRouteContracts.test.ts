import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('ghost route cleanup contracts', () => {
  it('does not leave legacy desktop media links pointing at removed route shapes', () => {
    const content = readProjectFile('src/pages/desktop/DesktopMediaHubPage.tsx');

    expect(content).not.toContain('/podcasts/channel/');
    expect(content).not.toContain('/reading/epub/');
    expect(content).not.toContain('/news/');
  });

  it('does not keep the retired mobile preview route in app routing', () => {
    const content = readProjectFile('src/routes.tsx');

    expect(content).not.toContain('path="preview/mobile"');
    expect(content).not.toContain('MobilePreviewPage');
  });
});
