import React, { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { ChevronRight, Clock3 } from 'lucide-react';
import { NEWS } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';

type DifficultyFilter = 'ALL' | 'L1' | 'L2' | 'L3';

type NewsItem = {
  _id: string;
  sourceKey: string;
  sourceUrl: string;
  title: string;
  summary?: string;
  bodyText: string;
  section?: string;
  publishedAt: number;
  difficultyLevel: 'L1' | 'L2' | 'L3';
  difficultyScore: number;
};

type CuratedArticle = {
  id: string;
  source: string;
  sourceType: string;
  icon: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  badge: string;
  bookmarkText: string;
  tone: 'default' | 'warm' | 'dark';
};

const curatedArticles: CuratedArticle[] = [
  {
    id: 'wiki-hanok',
    source: 'Wikipedia',
    sourceType: '韩国文化百科',
    icon: '🏛️',
    title: '한옥 (韩屋)',
    excerpt:
      '한옥은 한국의 전통 건축 양식으로 지어진 집을 말한다. 자연과의 조화를 중요하게 생각하며, 온돌과 마루가 있는 것이 특징이다...',
    badge: 'B2 中阶 • 说明文',
    bookmarkText: '精读收藏',
    tone: 'default',
  },
  {
    id: 'folktale-sun-moon',
    source: 'Folktale',
    sourceType: '韩国传统童话',
    icon: '🦊',
    title: '해와 달이 된 오누이',
    subtitle: '成为日月的兄妹',
    excerpt:
      '옛날 옛적에, 홀어머니와 오누이가 살고 있었어요. 어느 날 고개를 넘던 어머니는 무서운 호랑이를 만나고 말았답니다...',
    badge: 'A1 初阶 • 记叙文',
    bookmarkText: '睡前伴读',
    tone: 'warm',
  },
  {
    id: 'poem-seosi',
    source: 'Literature',
    sourceType: '公版名家名篇',
    icon: '✍️',
    title: '서시 (序诗)',
    subtitle: '윤동주 (尹东柱)',
    excerpt:
      '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 잎새에 이는 바람에도 나는 괴로워했다...',
    badge: 'C2 母语级 • 诗歌',
    bookmarkText: '文学赏析',
    tone: 'dark',
  },
];

function getDifficultyChip(level: 'L1' | 'L2' | 'L3') {
  if (level === 'L1') {
    return {
      text: 'A2 初阶',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
  if (level === 'L2') {
    return {
      text: 'B2 中高阶',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
  return {
    text: 'C1 高级',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };
}

function getSourceLabel(sourceKey: string) {
  const map: Record<string, string> = {
    khan: '경향신문',
    donga: '동아일보',
    hankyung: '한국경제',
    mk: '매일경제',
    itdonga: 'IT동아',
    voa_ko: 'VOA 한국어',
    naver_news_search: 'NAVER News',
    wiki_ko_featured: '위키백과 알찬 글',
  };
  return map[sourceKey] || sourceKey;
}

function formatRelativeTime(publishedAt: number) {
  const diffMs = Date.now() - publishedAt;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} 天前`;
  return new Date(publishedAt).toLocaleDateString();
}

function estimateReadingMinutes(bodyText: string) {
  const length = bodyText?.length ?? 0;
  return Math.max(1, Math.round(length / 450));
}

export default function ReadingDiscoveryPage() {
  const navigate = useLocalizedNavigate();
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('ALL');

  const newsQueryArgs =
    difficultyFilter === 'ALL' ? { limit: 24 } : { difficultyLevel: difficultyFilter, limit: 24 };
  const news = useQuery(NEWS.listRecent, newsQueryArgs) as NewsItem[] | undefined;
  const featuredArticles = useQuery(NEWS.listRecent, {
    sourceKey: 'wiki_ko_featured',
    limit: 12,
  }) as NewsItem[] | undefined;

  const topNews = useMemo(() => (news || []).slice(0, 8), [news]);
  const featuredNews = topNews[0];
  const secondaryNews = topNews.slice(1, 3);
  const weeklyReadCount = 5;
  const estimatedWords = useMemo(
    () =>
      topNews.slice(0, 5).reduce((sum, item) => {
        const tokenGuess = Math.max(5, Math.round((item.bodyText?.length ?? 0) / 85));
        return sum + tokenGuess;
      }, 0),
    [topNews]
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] px-2 pb-16 pt-4 sm:px-4 lg:px-6">
      <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
            阅读发现
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500 md:text-base">
            同步韩国真实资讯，沉淀经典文化阅读
          </p>
        </div>
        <div className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <div className="flex flex-col">
            <span className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              本周已读
            </span>
            <span className="text-xl font-black text-slate-800">
              {weeklyReadCount} <span className="text-sm font-medium text-slate-400">篇</span>
            </span>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="flex flex-col">
            <span className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              估算新词
            </span>
            <span className="text-xl font-black text-indigo-600">
              {estimatedWords} <span className="text-sm font-medium text-slate-400">词</span>
            </span>
          </div>
        </div>
      </div>

      <section className="mb-14">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-black text-slate-900">
              <span>📰 实时资讯</span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 animate-pulse">
                LIVE
              </span>
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              RSS 自动抓取，适合泛读与了解时事
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'L1', 'L2', 'L3'] as DifficultyFilter[]).map(item => {
              const selected = difficultyFilter === item;
              const label =
                item === 'ALL' ? '全部' : item === 'L1' ? '初阶' : item === 'L2' ? '中阶' : '高阶';
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDifficultyFilter(item)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {news === undefined ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr,1fr,1fr]">
            <div className="h-[280px] animate-pulse rounded-3xl bg-slate-200" />
            <div className="h-[280px] animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-[280px] animate-pulse rounded-3xl bg-slate-100" />
          </div>
        ) : topNews.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-sm font-semibold text-slate-500">
            暂无新闻数据，请先在管理后台触发一次抓取
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr,1fr,1fr]">
            {featuredNews && (
              <button
                type="button"
                onClick={() => navigate(`/reading/${featuredNews._id}`)}
                className="group relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-left transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/25 to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="mb-16 flex items-start justify-between gap-2">
                    <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                      {getSourceLabel(featuredNews.sourceKey)}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {formatRelativeTime(featuredNews.publishedAt)}
                    </span>
                  </div>
                  <div>
                    {(() => {
                      const chip = getDifficultyChip(featuredNews.difficultyLevel);
                      return (
                        <span
                          className={`mb-3 inline-block rounded border px-2 py-1 text-[10px] font-bold ${chip.className}`}
                        >
                          {chip.text}
                        </span>
                      );
                    })()}
                    <h3 className="mb-3 text-2xl font-black leading-snug text-white transition group-hover:text-blue-200">
                      {featuredNews.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <span>
                        AI 提取 {Math.max(5, Math.round(featuredNews.bodyText.length / 95))} 词
                      </span>
                      <span>•</span>
                      <span>约 {estimateReadingMinutes(featuredNews.bodyText)} 分钟阅读</span>
                    </div>
                  </div>
                </div>
              </button>
            )}

            {secondaryNews.map(item => {
              const chip = getDifficultyChip(item.difficultyLevel);
              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => navigate(`/reading/${item._id}`)}
                  className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 text-left transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="mb-6 flex items-start justify-between">
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                      {getSourceLabel(item.sourceKey)}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {formatRelativeTime(item.publishedAt)}
                    </span>
                  </div>
                  <div>
                    <span className="mb-3 inline-block rounded border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                      {chip.text}
                    </span>
                    <h3 className="mb-3 text-lg font-black leading-snug text-slate-900 transition group-hover:text-indigo-600">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <span>AI 提取 {Math.max(5, Math.round(item.bodyText.length / 95))} 词</span>
                      <span>•</span>
                      <span>约 {estimateReadingMinutes(item.bodyText)} 分钟阅读</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="mb-14 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <section>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">📚 文化与典藏</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              韩国传统故事、维基百科与文学作品，适合精读解析
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            查看全部文章
            <ChevronRight size={16} />
          </button>
        </div>

        {featuredArticles === undefined ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <div className="h-[260px] animate-pulse rounded-3xl bg-slate-200" />
            <div className="h-[260px] animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-[260px] animate-pulse rounded-3xl bg-slate-100" />
          </div>
        ) : featuredArticles.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredArticles.slice(0, 6).map((item, index) => {
              const tone = index % 3;
              const baseClass =
                tone === 2
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : tone === 1
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-100'
                    : 'bg-white border-slate-200';
              const titleClass =
                tone === 2
                  ? 'text-white group-hover:text-indigo-300'
                  : tone === 1
                    ? 'text-slate-900 group-hover:text-orange-600'
                    : 'text-slate-900 group-hover:text-blue-600';
              const textClass = tone === 2 ? 'text-slate-400' : 'text-slate-600';
              const badgeClass =
                tone === 2
                  ? 'bg-slate-700 text-slate-200 border-slate-600'
                  : tone === 1
                    ? 'bg-orange-100/70 text-orange-700 border-orange-200'
                    : 'bg-blue-100/60 text-blue-700 border-blue-200';
              const sourceTypeText = item.section || '위키백과 알찬 글';

              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => navigate(`/reading/${item._id}`)}
                  className={`group flex h-full flex-col rounded-3xl border p-6 text-left transition hover:-translate-y-1 hover:shadow-xl ${baseClass}`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-full text-xl ${
                        tone === 2 ? 'border border-slate-600 bg-slate-700' : 'bg-white'
                      }`}
                    >
                      🏛️
                    </div>
                    <div>
                      <div
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          tone === 2 ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        Wikipedia
                      </div>
                      <div
                        className={`text-sm font-bold ${tone === 2 ? 'text-slate-200' : 'text-slate-800'}`}
                      >
                        {sourceTypeText}
                      </div>
                    </div>
                  </div>

                  <h3
                    className={`mb-3 text-2xl font-black tracking-tight transition ${titleClass}`}
                  >
                    {item.title}
                  </h3>

                  <p className={`mb-6 line-clamp-3 text-sm leading-relaxed ${textClass}`}>
                    {(item.summary || item.bodyText || '').slice(0, 160)}
                  </p>

                  <div
                    className={`mt-auto flex items-center justify-between border-t pt-4 ${
                      tone === 2 ? 'border-slate-700/60' : 'border-slate-200/70'
                    }`}
                  >
                    <span
                      className={`rounded-md border px-2.5 py-1 text-xs font-bold ${badgeClass}`}
                    >
                      {getDifficultyChip(item.difficultyLevel).text} • 百科条目
                    </span>
                    <span className="text-xs font-semibold text-slate-500">🔖 推荐精读</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {curatedArticles.map(item => {
              const baseClass =
                item.tone === 'dark'
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : item.tone === 'warm'
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-100'
                    : 'bg-white border-slate-200';
              const titleClass =
                item.tone === 'dark'
                  ? 'text-white group-hover:text-indigo-300'
                  : item.tone === 'warm'
                    ? 'text-slate-900 group-hover:text-orange-600'
                    : 'text-slate-900 group-hover:text-blue-600';
              const textClass = item.tone === 'dark' ? 'text-slate-400' : 'text-slate-600';
              const badgeClass =
                item.tone === 'dark'
                  ? 'bg-slate-700 text-slate-200 border-slate-600'
                  : item.tone === 'warm'
                    ? 'bg-orange-100/70 text-orange-700 border-orange-200'
                    : 'bg-blue-100/60 text-blue-700 border-blue-200';

              return (
                <article
                  key={item.id}
                  className={`group flex h-full flex-col rounded-3xl border p-6 transition hover:-translate-y-1 hover:shadow-xl ${baseClass}`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-full text-xl ${
                        item.tone === 'dark' ? 'bg-slate-700 border border-slate-600' : 'bg-white'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          item.tone === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {item.source}
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          item.tone === 'dark' ? 'text-slate-200' : 'text-slate-800'
                        }`}
                      >
                        {item.sourceType}
                      </div>
                    </div>
                  </div>

                  <h3
                    className={`mb-3 text-2xl font-black tracking-tight transition ${titleClass}`}
                  >
                    {item.title}
                    {item.subtitle && (
                      <span
                        className={`mt-1 block text-lg font-bold ${
                          item.tone === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        ({item.subtitle})
                      </span>
                    )}
                  </h3>

                  <p className={`mb-6 line-clamp-3 text-sm leading-relaxed ${textClass}`}>
                    {item.excerpt}
                  </p>

                  <div
                    className={`mt-auto flex items-center justify-between border-t pt-4 ${
                      item.tone === 'dark' ? 'border-slate-700/60' : 'border-slate-200/70'
                    }`}
                  >
                    <span
                      className={`rounded-md border px-2.5 py-1 text-xs font-bold ${badgeClass}`}
                    >
                      {item.badge}
                    </span>
                    <span
                      className={`text-xs font-semibold ${item.tone === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}
                    >
                      🔖 {item.bookmarkText}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-10 flex items-center justify-end gap-2 text-xs font-semibold text-slate-400">
        <Clock3 size={14} />
        数据来自 Convex `newsIngestion:listRecent`（新闻 + 维基典范条目）
      </div>
    </div>
  );
}
