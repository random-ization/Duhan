import { describe, expect, it } from 'vitest';
import { buildVideoPlayerPath } from '../../src/utils/videoRoutes';

describe('video route builders', () => {
  it('builds a bare video player path when there is no returnTo', () => {
    expect(buildVideoPlayerPath('video-1')).toBe('/video/video-1');
  });

  it('preserves returnTo when building a video player path', () => {
    expect(buildVideoPlayerPath('video-1', '/videos?returnTo=%2Fmedia%3Ftab%3Dvideos')).toBe(
      '/video/video-1?returnTo=%2Fvideos%3FreturnTo%3D%252Fmedia%253Ftab%253Dvideos'
    );
  });
});
