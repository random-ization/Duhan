import { describe, expect, it } from 'vitest';
import { createTextHash } from '../../convex/textHash';

describe('createTextHash', () => {
  it('returns a stable 32-character hex hash', () => {
    const hash = createTextHash('안녕하세요');

    expect(hash).toMatch(/^[0-9a-f]{32}$/);
    expect(createTextHash('안녕하세요')).toBe(hash);
  });

  it('produces different hashes for different inputs', () => {
    expect(createTextHash('안녕하세요')).not.toBe(createTextHash('안녕히 가세요'));
  });
});
