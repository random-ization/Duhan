import { describe, expect, it } from 'vitest';
import { buildPodcastChannelPath, buildPodcastSearchPath } from '../../src/utils/podcastRoutes';

describe('podcast route builders', () => {
  it('trims search queries before building podcast search URLs', () => {
    expect(buildPodcastSearchPath('  daily korean  ')).toBe('/podcasts/search?q=daily+korean');
  });

  it('returns null for empty podcast search queries', () => {
    expect(buildPodcastSearchPath('   ')).toBeNull();
  });

  it('omits missing feed URLs from podcast channel paths', () => {
    expect(buildPodcastChannelPath({ id: '123', feedUrl: undefined })).toBe(
      '/podcasts/channel?id=123'
    );
  });

  it('falls back to the bare channel route when there is no identifier', () => {
    expect(buildPodcastChannelPath({ feedUrl: null })).toBe('/podcasts/channel');
  });

  it('preserves returnTo when building podcast routes', () => {
    expect(
      buildPodcastSearchPath('daily korean', '/podcasts?returnTo=%2Fmedia%3Ftab%3Dpodcasts')
    ).toBe(
      '/podcasts/search?q=daily+korean&returnTo=%2Fpodcasts%3FreturnTo%3D%252Fmedia%253Ftab%253Dpodcasts'
    );
    expect(buildPodcastChannelPath({ id: '123' }, '/podcasts/search?q=daily+korean')).toBe(
      '/podcasts/channel?id=123&returnTo=%2Fpodcasts%2Fsearch%3Fq%3Ddaily%2Bkorean'
    );
  });
});
