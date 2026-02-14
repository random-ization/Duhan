export type SourceType = 'rss' | 'api';

export type NewsSourceDefinition = {
  key: string;
  name: string;
  type: SourceType;
  endpoint: string;
  pollMinutes: number;
  enabled: boolean;
};

export const DEGRADE_FAILURE_THRESHOLD = 12;

export const NEWS_SOURCES: NewsSourceDefinition[] = [
  {
    key: 'khan',
    name: 'Kyunghyang',
    type: 'rss',
    endpoint: 'https://www.khan.co.kr/rss/rssdata/total_news.xml',
    pollMinutes: 10,
    enabled: true,
  },
  {
    key: 'donga',
    name: 'Donga',
    type: 'rss',
    endpoint: 'https://rss.donga.com/total.xml',
    pollMinutes: 10,
    enabled: true,
  },
  {
    key: 'hankyung',
    name: 'Hankyung',
    type: 'rss',
    endpoint: 'https://www.hankyung.com/feed/all-news',
    pollMinutes: 10,
    enabled: true,
  },
  {
    key: 'mk',
    name: 'Maeil Business',
    type: 'rss',
    endpoint: 'https://www.mk.co.kr/rss/30000001/',
    pollMinutes: 10,
    enabled: true,
  },
  {
    key: 'itdonga',
    name: 'IT Donga',
    type: 'rss',
    endpoint: 'https://it.donga.com/feeds/rss',
    pollMinutes: 20,
    enabled: true,
  },
  {
    key: 'voa_ko',
    name: 'VOA Korean',
    type: 'rss',
    endpoint: 'https://www.voakorea.com/api/z$yquoeiom',
    pollMinutes: 20,
    enabled: true,
  },
  {
    key: 'naver_news_search',
    name: 'Naver News Search',
    type: 'api',
    endpoint: 'https://openapi.naver.com/v1/search/news.json',
    pollMinutes: 30,
    enabled: true,
  },
];
