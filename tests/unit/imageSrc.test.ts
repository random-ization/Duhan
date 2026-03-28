import { describe, expect, it } from 'vitest';
import { getSafeImageSrc } from '../../src/utils/imageSrc';

describe('getSafeImageSrc', () => {
  it('returns the first non-empty trimmed candidate', () => {
    expect(getSafeImageSrc('', '   ', ' https://example.com/image.png ')).toBe(
      'https://example.com/image.png'
    );
  });

  it('returns null when every candidate is empty', () => {
    expect(getSafeImageSrc('', '   ', undefined, null)).toBeNull();
  });
});
