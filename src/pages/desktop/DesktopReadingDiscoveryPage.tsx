import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { READING_BOOKS, NEWS, READING_LIBRARY } from '../../utils/convexRefs';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { 
  BookOpen, 
  Newspaper, 
  BookMarked, 
  ChevronLeft,
  ChevronRight,
  Upload, 
  Clock, 
  Layers,
  ArrowRight,
  X,
  Search
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Sheet, SheetContent, SheetTitle } from '../../components/ui/sheet';
import { Button } from '../../components/ui';

type ReadingTab = 'all' | 'picture_books' | 'news' | 'epubs';

export default function DesktopReadingDiscoveryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useLocalizedNavigate();
  const [activeTab, setActiveTab] = useState<ReadingTab>('all');
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [showAllBooks, setShowAllBooks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // --- DATA FETCHING ---
  const books = useQuery(READING_BOOKS.listPublishedBooks, {});
  const newsFeed = useQuery(NEWS.getUserFeed, {
    newsLimit: 6,
    articleLimit: 12,
  });
  const myUploads = useQuery(READING_LIBRARY.getMyUploads, user?.id ? {} : 'skip');

  const isLoadingBooks = books === undefined;
  const isLoadingNews = newsFeed === undefined;
  const isLoadingEpubs = user?.id ? myUploads === undefined : false;

  const difficultyFilter = searchParams.get('difficulty') || 'ALL';

  const featuredList = useMemo(() => {
    if (!books) return [];
    return books.slice(0, 3);
  }, [books]);

  const featured = featuredList[featuredIndex] || null;

  const catalog = useMemo(() => {
    if (!books) return [];
    return books;
  }, [books]);

  const news = useMemo(() => {
    const list = newsFeed?.news || [];
    return difficultyFilter === 'ALL'
      ? list
      : list.filter(n => n.difficultyLevel === difficultyFilter);
  }, [newsFeed, difficultyFilter]);

  const epubs = myUploads || [];

  const categorizedBooks = useMemo(() => {
    if (!books) return {};
    const filtered = searchQuery
      ? books.filter(
          b =>
            b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.levelLabel || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : books;

    const groups: Record<string, any[]> = {};
    filtered.forEach(book => {
      const level = book.levelLabel || t('readingDiscovery.pictureBooks.unclassified', { defaultValue: 'Unclassified' });
      if (!groups[level]) groups[level] = [];
      groups[level].push(book);
    });
    return groups;
  }, [books, searchQuery]);

  const nextFeatured = () => setFeaturedIndex((i) => (i + 1) % featuredList.length);
  const prevFeatured = () => setFeaturedIndex((i) => (i - 1 + featuredList.length) % featuredList.length);

  // Auto slide
  React.useEffect(() => {
    if (featuredList.length <= 1) return;
    const timer = setInterval(nextFeatured, 5000);
    return () => clearInterval(timer);
  }, [featuredList.length]);

  const setDifficulty = (d: string) => {
    if (d === 'ALL') {
      searchParams.delete('difficulty');
    } else {
      searchParams.set('difficulty', d);
    }
    setSearchParams(searchParams);
  };

  const filteredNews = useMemo(() => {
    if (!news) return [];
    if (difficultyFilter === 'ALL') return news;
    return news.filter(n => n.difficultyLevel === difficultyFilter);
  }, [news, difficultyFilter]);

  const tabs: { id: ReadingTab; label: string; icon: any }[] = [
    { id: 'all', label: t('readingDiscovery.tabs.all', { defaultValue: 'All' }), icon: Layers },
    { id: 'picture_books', label: t('readingDiscovery.tabs.pictureBooks', { defaultValue: 'Books' }), icon: BookOpen },
    { id: 'news', label: t('readingDiscovery.tabs.news', { defaultValue: 'News' }), icon: Newspaper },
    { id: 'epubs', label: t('readingDiscovery.tabs.epubs', { defaultValue: 'Library' }), icon: BookMarked },
  ];

  const renderPictureBooks = (limit?: number) => {
    const displayCatalog = limit ? catalog.slice(0, limit) : catalog;
    
    return (
      <section className="space-y-6">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline">
            <span className="mr-2 font-k-serif text-[20px] font-medium text-k-crimson">冊</span>
            <span className="text-[16px] font-extrabold text-k-ink">{t('readingDiscovery.pictureBooks.featured', { defaultValue: 'Featured Books' })}</span>
          </div>
          {activeTab === 'all' && (
            <button 
              onClick={() => setShowAllBooks(true)}
              className="text-[12px] font-bold text-k-sub hover:text-k-crimson transition-colors flex items-center gap-1"
            >
              {t('readingDiscovery.pictureBooks.viewAll', { defaultValue: 'View all' })} <ChevronRight size={14} />
            </button>
          )}
        </div>

      {featured && (
        <div className="relative group/carousel">
          <DesktopCard pad={0} className="overflow-hidden border border-k-line/10 shadow-k-sh-sm hover:shadow-k-sh-lg transition-all">
            <div className="flex h-[280px]">
              <div className="relative w-[380px] shrink-0 overflow-hidden">
                {featured.coverImageUrl ? (
                  <img 
                    key={featured._id}
                    src={featured.coverImageUrl} 
                    className="h-full w-full object-cover transition-all duration-700 animate-in fade-in zoom-in-95" 
                    alt="" 
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-k-crimson/20 to-k-indigo/20 flex items-center justify-center">
                    <BookOpen size={64} className="text-k-ink/10" />
                  </div>
                )}
                <div className="absolute left-6 top-6">
                  <DesignChip tone="ink" size="sm" className="backdrop-blur-md bg-k-ink/80">{t('readingDiscovery.pictureBooks.weeklyFeatured', { defaultValue: 'Weekly Featured' })}</DesignChip>
                </div>
              </div>
              <div className="flex-1 p-10 flex flex-col justify-center animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <DesignChip tone="butter" size="sm">
                    {featured.levelLabel || t('readingDiscovery.difficulty.intermediate', { defaultValue: 'Intermediate' })}
                  </DesignChip>
                  <span className="text-[12px] font-bold text-k-sub flex items-center gap-1.5">
                    <Clock size={14} /> {featured.readingMinutes || 5} {t('readingDiscovery.pictureBooks.readingMinutes', { defaultValue: 'min read' })}
                  </span>
                </div>
                <h2 className="font-k-serif text-[36px] font-medium tracking-tight text-k-ink leading-tight mb-4 line-clamp-1">
                  {featured.title}
                </h2>
                <p className="text-k-sub text-[15px] font-medium mb-8 line-clamp-2 max-w-[500px]">
                  {t('readingDiscovery.pictureBooks.description', { defaultValue: 'Explore wonderful Korean stories and improve your reading comprehension.' })}
                </p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigate(`/reading/books/${featured.slug}`)}
                    className="w-fit flex items-center gap-2 px-8 py-3 bg-k-ink text-k-bg rounded-xl font-bold hover:bg-k-crimson transition-all transform hover:-translate-y-1 active:scale-95"
                  >
                    {t('readingDiscovery.articles.startReading', { defaultValue: 'Start Reading' })} <ArrowRight size={18} />
                  </button>
                  
                  {/* Indicators */}
                  <div className="flex gap-1.5 ml-4">
                    {featuredList.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setFeaturedIndex(idx)}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          idx === featuredIndex ? "w-6 bg-k-crimson" : "w-1.5 bg-k-line"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </DesktopCard>

          {/* Navigation Arrows */}
          <button 
            onClick={(e) => { e.stopPropagation(); prevFeatured(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-k-line shadow-k-sh-sm flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-white"
          >
            <ChevronLeft size={20} className="text-k-ink" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); nextFeatured(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-k-line shadow-k-sh-sm flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-white"
          >
            <ChevronRight size={20} className="text-k-ink" />
          </button>
        </div>
      )}

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayCatalog.map((p) => (
            <DesktopCard 
              key={p._id} 
              pad={0} 
              className="overflow-hidden cursor-pointer group border border-k-line/10 hover:shadow-k-sh transition-all"
              onClick={() => navigate(`/reading/books/${p.slug}`)}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-k-bg2">
                {p.coverImageUrl ? (
                  <img src={p.coverImageUrl} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <BookOpen size={40} className="text-k-ink/5" />
                  </div>
                )}
                <div className="absolute right-3 top-3">
                  <DesignChip tone="ink" size="sm" className="backdrop-blur-md bg-k-ink/70">
                    {p.levelLabel || t('readingDiscovery.meta.reading', { defaultValue: 'Reading' })}
                  </DesignChip>
                </div>
              </div>
              <div className="p-5">
                <h4 className="font-k-serif text-[18px] font-medium leading-tight text-k-ink group-hover:text-k-crimson transition-colors mb-2">
                  {p.title}
                </h4>
                <div className="flex items-center gap-3 text-[11px] font-bold text-k-sub">
                   <span>{p.readingMinutes || 5} {t('readingDiscovery.meta.minutes', { defaultValue: 'min' })}</span>
                   <span className="w-1 h-1 rounded-full bg-k-line" />
                   <span>{p.pageCount || 0} {t('readingDiscovery.meta.pages', { defaultValue: 'pages' })}</span>
                </div>
              </div>
            </DesktopCard>
          ))}
        </div>
      </section>
    );
  };

  const renderNews = () => {
    const getSourceInfo = (key: string) => {
      const sources: Record<string, { label: string; color: string; initial: string }> = {
        mk: { label: '매일경제', color: '#B59461', initial: '매' },
        khan: { label: '경향신문', color: '#D32F2F', initial: '京' },
        donga: { label: '동아일보', color: '#0054A6', initial: '東' },
        hankyung: { label: '한국경제', color: '#1E40AF', initial: '韓' },
        voa_ko: { label: 'VOA', color: '#E65100', initial: 'V' },
        itdonga: { label: 'IT동아', color: '#00BFA5', initial: 'IT' },
      };
      return sources[key.toLowerCase()] || { label: key, color: 'var(--color-k-ink)', initial: key.charAt(0).toUpperCase() };
    };

    return (
      <section className="space-y-8">
        <div className="flex items-baseline justify-between border-b border-k-line pb-4">
          <div className="flex items-baseline gap-3">
            <span className="font-k-serif text-[24px] font-medium text-k-crimson">新</span>
            <span className="text-[20px] font-extrabold text-k-ink">{t('readingDiscovery.news.liveTitle', { defaultValue: 'Live News' })}</span>
            <span className="ml-2 text-[12px] font-bold text-k-sub bg-k-bg2 px-2 py-0.5 rounded-full">
              {filteredNews.length} {t('readingDiscovery.news.countSuffix', { defaultValue: 'latest updates' })}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {(['ALL', 'L1', 'L2', 'L3'] as const).map((level) => (
              <Button
                key={level}
                onClick={() => setDifficulty(level)}
                variant="ghost"
                size="auto"
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[11px] font-black transition-all border",
                  difficultyFilter === level 
                    ? "bg-k-ink text-k-bg border-k-ink" 
                    : "bg-k-card text-k-sub border-k-line/20 hover:border-k-line"
                )}
              >
                {level === 'ALL' ? t('readingDiscovery.filters.all', { defaultValue: 'All' }) : 
                 level === 'L1' ? t('readingDiscovery.filters.l1', { defaultValue: 'Beginner' }) :
                 level === 'L2' ? t('readingDiscovery.filters.l2', { defaultValue: 'Intermediate' }) :
                 t('readingDiscovery.filters.l3', { defaultValue: 'Advanced' })}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-10 gap-y-10">
          {filteredNews.length > 0 ? (
            filteredNews.map((item) => {
              const source = getSourceInfo(item.sourceKey || '');
              return (
                <div 
                  key={item._id} 
                  className="group cursor-pointer flex gap-6 items-start pb-10 border-b border-k-line/5 last:border-0 last:pb-0"
                  onClick={() => navigate(`/reading/${item._id}`)}
                >
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest"
                        style={{ backgroundColor: `${source.color}15`, color: source.color }}
                      >
                        {item.sourceKey || 'Global'}
                      </div>
                      <span className="text-[11px] font-bold text-k-sub/60 flex items-center gap-1.5">
                        <Clock size={12} />
                        {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : t('readingDiscovery.news.justNow', { defaultValue: 'Just now' })}
                      </span>
                      <DesignChip tone="butter" size="sm" className="scale-75 origin-left">
                        {item.difficultyLevel === 'L1' ? 'A2' : item.difficultyLevel === 'L2' ? 'B2' : 'C1'}
                      </DesignChip>
                    </div>
                    
                    <h3 className="text-[19px] font-black text-k-ink group-hover:text-k-crimson transition-colors line-clamp-2 leading-[1.4] tracking-tight">
                      {item.title}
                    </h3>
                    
                    <p className="text-[13px] font-medium text-k-sub line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                      {item.summary || item.bodyText || t('readingDiscovery.news.readMorePlaceholder', { defaultValue: 'Click to read full article, get more highlights and Korean learning points.' })}
                    </p>

                    <div className="flex items-center gap-4 pt-1">
                      <span className="text-[11px] font-bold text-k-crimson opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                        {t('readingDiscovery.articles.readMore', { defaultValue: 'Read more' })} →
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 w-36 h-36 rounded-2xl overflow-hidden bg-k-bg2 border border-k-line/5 shadow-k-sh-sm group-hover:shadow-k-sh-lg transition-all transform group-hover:scale-[1.02] relative">
                    <div
                      className="h-full w-full flex flex-col items-center justify-center p-4 text-center transition-colors group-hover:bg-opacity-10"
                      style={{ background: `linear-gradient(135deg, ${source.color}08 0%, ${source.color}15 100%)` }}
                    >
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center font-k-serif text-[28px] font-medium border-2 mb-2 shadow-sm"
                        style={{ borderColor: `${source.color}30`, color: source.color, backgroundColor: 'var(--color-k-bg)' }}
                      >
                        {source.initial}
                      </div>
                      <div
                        className="text-[10px] font-black tracking-tighter opacity-60"
                        style={{ color: source.color }}
                      >
                        {source.label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-k-sub opacity-50 bg-k-bg2/30 rounded-3xl border border-dashed border-k-line">
               <Newspaper size={48} className="mb-4 opacity-20" />
               <p className="text-[14px] font-bold">
                 {isLoadingNews ? t('readingDiscovery.news.updating', { defaultValue: 'Updating news...' }) : t('readingDiscovery.news.empty', { defaultValue: 'No news available' })}
               </p>
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderEpubs = () => (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline">
          <span className="mr-2 font-k-serif text-[20px] font-medium text-k-crimson">庫</span>
          <span className="text-[16px] font-extrabold text-k-ink">{t('readingDiscovery.epubs.title', { defaultValue: 'My Library' })}</span>
        </div>
        <button 
          onClick={() => navigate('/reading/upload')}
          className="flex items-center gap-2 px-4 py-2 bg-k-bg2 rounded-xl text-[13px] font-bold text-k-ink hover:bg-k-line transition-all"
        >
          <Upload size={16} /> {t('readingDiscovery.epubs.upload', { defaultValue: 'Upload EPUB' })}
        </button>
      </div>

      {!user?.id ? (
        <div className="py-20 flex flex-col items-center text-center bg-k-bg2/30 rounded-3xl border border-dashed border-k-line">
          <div className="w-16 h-16 rounded-full bg-k-card flex items-center justify-center mb-4 shadow-sm">
            <BookMarked size={32} className="text-k-sub" />
          </div>
          <h3 className="text-[18px] font-bold text-k-ink mb-2">{t('readingDiscovery.epubs.privateLibrary', { defaultValue: 'Private Library' })}</h3>
          <p className="text-k-sub text-sm mb-6 max-w-[300px]">{t('readingDiscovery.epubs.loginPrompt', { defaultValue: 'Log in to manage your private library...' })}</p>
          <button 
            onClick={() => navigate('/auth')}
            className="px-6 py-2 bg-k-crimson text-k-bg rounded-full font-bold shadow-lg shadow-k-crimson/20 hover:scale-105 active:scale-95 transition-all"
          >
            {t('auth.login', { defaultValue: 'Log in' })}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {epubs.length > 0 ? (
            epubs.map((book: any) => (
              <div 
                key={book._id} 
                onClick={() => navigate(`/reading/library/${book.slug}`)}
                className="group cursor-pointer flex flex-col"
              >
                {/* Book Cover */}
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-4 shadow-k-sh-sm group-hover:shadow-k-sh-lg transition-all duration-500 group-hover:-translate-y-2 border border-k-line/5 bg-gradient-to-br from-k-bg2 to-k-line/20">
                   {book.coverImageUrl ? (
                     <img src={book.coverImageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                        <BookMarked size={40} className="text-k-sub/20 mb-3" />
                        <span className="text-[10px] font-black text-k-sub/30 uppercase tracking-widest leading-tight">
                          {book.title}
                        </span>
                     </div>
                   )}
                   {/* Progress Overlay */}
                   <div className="absolute inset-x-0 bottom-0 h-1 bg-k-ink/5 overflow-hidden">
                      <div 
                        className="h-full bg-k-crimson" 
                        style={{ width: `${book.progress || 0}%` }}
                      />
                   </div>
                   {/* Hover Overlay */}
                   <div className="absolute inset-0 bg-k-ink/0 group-hover:bg-k-ink/5 transition-colors" />
                </div>

                <div className="px-1">
                   <h4 className="text-[14px] font-black text-k-ink line-clamp-1 mb-0.5 group-hover:text-k-crimson transition-colors">
                     {book.title}
                   </h4>
                   <p className="text-[11px] font-bold text-k-sub opacity-60 flex items-center justify-between">
                     <span>{book.language || 'EPUB'}</span>
                     <span className="text-k-crimson/60">{Math.floor(book.progress || 0)}%</span>
                   </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-k-bg2/20 rounded-[40px] border border-dashed border-k-line/40">
               <div className="w-16 h-16 rounded-full bg-k-card flex items-center justify-center mb-6 shadow-k-sh-sm">
                 <BookMarked size={32} className="text-k-sub/30" />
               </div>
               <h3 className="text-[18px] font-black text-k-ink mb-2">{t('readingDiscovery.epubs.empty', { defaultValue: 'Library is empty' })}</h3>
               <p className="text-[13px] font-medium text-k-sub mb-8 opacity-60">{t('readingDiscovery.epubs.emptyPrompt', { defaultValue: 'Import your first EPUB...' })}</p>
               <button 
                 onClick={() => navigate('/reading/upload')}
                 className="px-8 py-3 bg-k-ink text-k-bg rounded-2xl text-[13px] font-black hover:bg-k-crimson transition-all shadow-k-sh-sm"
               >
                 {t('readingDiscovery.epubs.uploadNow', { defaultValue: 'Upload now' })}
               </button>
            </div>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="p-8 space-y-10 max-w-[1400px] mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="text-[11px] font-black text-k-crimson uppercase tracking-[0.2em] mb-1">
            Immersive Reading
          </div>
          <h1 className="text-[28px] font-black text-k-ink tracking-tighter">{t('readingDiscovery.title', { defaultValue: 'Immersive Reading' })}</h1>
        </div>
        
        <div className="flex bg-k-bg2/50 p-1 rounded-2xl border border-k-line/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-black transition-all",
                activeTab === tab.id 
                  ? "bg-k-card text-k-ink shadow-k-sh-sm border border-k-line/20" 
                  : "text-k-sub hover:text-k-ink"
              )}
            >
              <tab.icon size={16} className={activeTab === tab.id ? "text-k-crimson" : ""} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'all' && renderPictureBooks(4)}
        {activeTab === 'picture_books' && renderPictureBooks()}
        {(activeTab === 'all' || activeTab === 'news') && renderNews()}
        {(activeTab === 'all' || activeTab === 'epubs') && renderEpubs()}
      </div>

      {/* Loading Footer (if applicable) */}
      {(isLoadingBooks || isLoadingNews || isLoadingEpubs) && activeTab === 'all' && (
        <div className="pt-10 pb-20 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-k-bg2 rounded-full text-k-sub font-bold animate-pulse">
            <RefreshCw className="w-5 h-5 animate-spin" /> {t('readingDiscovery.news.loadingMore', { defaultValue: 'Loading more content...' })}
          </div>
        </div>
      )}
      {renderAllBooksModal()}
    </div>
  );

  function renderAllBooksModal() {
    return (
      <Sheet open={showAllBooks} onOpenChange={setShowAllBooks}>
        <SheetContent className="fixed inset-y-0 right-0 w-[85vw] max-w-[1200px] p-0 bg-k-bg border-l border-k-line overflow-hidden flex flex-col">
          <SheetTitle className="sr-only">{t('readingDiscovery.pictureBooks.catalogTitle', { defaultValue: 'All Books' })}</SheetTitle>
          
          <div className="shrink-0 h-20 px-8 flex items-center justify-between border-b border-k-line bg-k-card/50 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowAllBooks(false)}
                className="h-10 w-10 rounded-full hover:bg-k-line flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-k-crimson font-k-serif">
                   圖 · CATALOG
                </div>
                <div className="text-[18px] font-black text-k-ink">
                   {t('readingDiscovery.pictureBooks.catalogTitle', { defaultValue: 'All Books' })}
                </div>
              </div>
            </div>

            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-k-sub" size={16} />
              <input 
                type="text" 
                placeholder={t('readingDiscovery.pictureBooks.searchPlaceholder', { defaultValue: 'Search books...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-k-bg2/50 border border-k-line rounded-xl py-2 pl-10 pr-4 text-[13px] focus:outline-none focus:ring-1 focus:ring-k-crimson/30 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 scrollbar-fine">
            {Object.entries(categorizedBooks).sort().map(([level, groupBooks]) => (
              <div key={level} className="mb-12 last:mb-0">
                <div className="flex items-center gap-3 mb-6">
                  <DesignChip tone="crimson" size="md">{level}</DesignChip>
                  <div className="h-px flex-1 bg-gradient-to-r from-k-line to-transparent" />
                  <span className="text-[12px] font-bold text-k-sub">{groupBooks.length} {t('readingDiscovery.pictureBooks.countSuffix', { defaultValue: 'books' })}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {groupBooks.map(book => (
                    <div 
                      key={book._id}
                      onClick={() => {
                        setShowAllBooks(false);
                        navigate(`/reading/books/${book.slug}`);
                      }}
                      className="group cursor-pointer"
                    >
                      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-k-bg2 border border-k-line/10 shadow-k-sh-sm group-hover:shadow-k-sh-lg transition-all transform group-hover:-translate-y-1">
                        {book.coverImageUrl ? (
                          <img src={book.coverImageUrl} className="h-full w-full object-cover" alt="" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <BookOpen size={32} className="text-k-ink/10" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                           <span className="text-white text-[11px] font-bold">{t('readingDiscovery.articles.startReading', { defaultValue: 'Start Reading' })} →</span>
                        </div>
                      </div>
                      <div className="mt-3">
                         <div className="text-[14px] font-black text-k-ink truncate group-hover:text-k-crimson transition-colors">
                           {book.title}
                         </div>
                         <div className="text-[11px] font-bold text-k-sub mt-0.5">
                           Duhan Reading
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }
}

// Minimal RefreshCw icon if not imported
const RefreshCw = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);
