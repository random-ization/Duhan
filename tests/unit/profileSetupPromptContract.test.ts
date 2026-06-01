import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('profile setup prompt contract', () => {
  it('does not block the dashboard or today-task flow with a modal prompt', () => {
    const trigger = readProjectFile('src/components/modals/ProfileSetupModalTrigger.tsx');

    expect(trigger).toContain('isDailyCockpitRoute');
    expect(trigger).toContain("pathWithoutLang === '/dashboard'");
    expect(trigger).toContain("pathWithoutLang.startsWith('/dashboard/')");
    expect(trigger).toContain("new URLSearchParams(location.search).get('flow') === 'today'");
    expect(trigger).toContain('if (isDailyCockpitRoute) return;');
  });
});
