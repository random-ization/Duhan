import { describe, expect, it } from 'vitest';
import { buildPodcastChannelShareUrl } from '../../src/pages/PodcastChannelPage';
import { buildPodcastEpisodeShareUrl } from '../../src/pages/PodcastPlayerPage';

describe('podcast share URL', () => {
  it('preserves the current language in generated share links', () => {
    const url = buildPodcastEpisodeShareUrl({
      origin: 'https://koreanstudy.me',
      language: 'zh',
      episode: {
        audioUrl: 'https://cdn.example.com/audio.mp3?token=abc&lang=ko',
        title: 'Episode 12',
        guid: 'ep-12',
        channelTitle: 'Ignored fallback',
      },
      channel: {
        title: 'Korean Pod',
        artworkUrl: 'https://cdn.example.com/art.jpg',
      },
    });

    expect(url.startsWith('https://koreanstudy.me/zh/podcasts/player?')).toBe(true);
    expect(url).toContain('guid=ep-12');
    expect(url).toContain('channelTitle=Korean+Pod');
    expect(url).toContain('audioUrl=https%253A%252F%252Fcdn.example.com%252Faudio.mp3');
  });

  it('keeps the current language and omits undefined feed URLs for channel share links', () => {
    const url = buildPodcastChannelShareUrl({
      origin: 'https://koreanstudy.me',
      language: 'zh',
      channel: {
        id: 'channel-42',
        feedUrl: undefined,
      },
    });

    expect(url).toBe('https://koreanstudy.me/zh/podcasts/channel?id=channel-42');
  });
});
