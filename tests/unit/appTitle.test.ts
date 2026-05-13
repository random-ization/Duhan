import { describe, expect, it } from 'vitest';
import { getAuthedDocumentTitle } from '../../src/utils/appTitle';

const translate = (key: string, options?: { defaultValue?: string }) => {
  const dictionary: Record<string, string> = {
    'common.appName': 'DuHan',
    'community.title': '社区',
    'qa.title': '问答',
    'qa.communityProfile': '社区资料',
    'qa.askQuestion': '提问',
    'nav.dashboard': '仪表盘',
  };

  return dictionary[key] ?? options?.defaultValue ?? key;
};

describe('getAuthedDocumentTitle', () => {
  it('uses the community title for the community feed route', () => {
    expect(getAuthedDocumentTitle('/community', translate)).toBe('社区 - DuHan');
  });

  it('uses a specific ask title for the ask question route', () => {
    expect(getAuthedDocumentTitle('/community/qa/ask', translate)).toBe('提问 - DuHan');
  });

  it('falls back to route config titles for standard authed pages', () => {
    expect(getAuthedDocumentTitle('/dashboard', translate)).toBe('仪表盘 - DuHan');
  });
});
