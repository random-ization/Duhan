import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Volume2,
  Languages,
  Type,
//   ChevronRight,
  Layout,
  Bookmark,
  Share2,
  Clock
} from 'lucide-react';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { cn } from '../../lib/utils';

type DesktopReadingArticleProps = {
  t: any;
  navigate: any;
  resolvedArticle: any;
  difficultyLabel: any;
  sourceDisplayLabel: string;
  increaseFontSize: () => void;
  toggleSpeak: () => void;
  speaking: boolean;
  onToggleTranslation: () => void;
  translationEnabled: boolean;
  fontSize: number;
  paragraphs: string[];
  translations: string[];
  wordCount: number;
  publishedDateLabel: string;
  readingSidebarContent: any;
  onWordClick: (word: string) => void;
  activeWord: string;
};

// function DRail({ kanji, title, action, children, pad = 14 }: { kanji?: string; title: string; action?: string; children: React.ReactNode; pad?: number }) {
//   return (
//     <div className="mb-8">
//       <div className="mb-4 flex items-center px-1">
//         {kanji && (
//           <span className="mr-2 font-k-serif text-[18px] font-medium text-k-crimson">
//             {kanji}
//           </span>
//         )}
//         <span className="text-[12px] font-black uppercase tracking-wider text-k-ink">
//           {title}
//         </span>
//         {action && (
//           <button className="ml-auto text-[10px] font-bold text-k-sub hover:text-k-crimson transition-colors">
//             {action}
//           </button>
//         )}
//       </div>
//       <div className="rounded-[24px] bg-k-card border border-k-line/5 shadow-k-sh-sm overflow-hidden" style={{ padding: pad }}>
//         {children}
//       </div>
//     </div>
//   );
// }

export default function DesktopReadingArticlePage({
  t,
  navigate,
  resolvedArticle,
  difficultyLabel,
  sourceDisplayLabel,
  increaseFontSize,
  toggleSpeak,
  speaking,
  onToggleTranslation,
  translationEnabled,
  fontSize,
  paragraphs,
  translations,
  wordCount,
  publishedDateLabel,
  readingSidebarContent,
  onWordClick,
  activeWord,
}: DesktopReadingArticleProps) {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollProgress(scrolled);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const title = resolvedArticle?.title || '';
  const level = difficultyLabel(resolvedArticle?.difficultyLevel || 'L1', t);
  const category = resolvedArticle?.section || 'Reading';
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="min-h-screen bg-k-bg font-sans selection:bg-k-butter selection:text-k-ink pb-20">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-[100] h-16 bg-k-bg/80 backdrop-blur-xl border-b border-k-line flex items-center px-8 gap-6 animate-in slide-in-from-top-4">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-[13px] font-black text-k-sub hover:text-k-ink transition-colors"
        >
          <div className="w-8 h-8 rounded-full border border-k-line flex items-center justify-center group-hover:bg-k-ink group-hover:text-k-bg transition-all">
            <ArrowLeft size={16} />
          </div>
          <span>{t('common.back', { defaultValue: 'Back' })}</span>
        </button>

        <div className="h-4 w-px bg-k-line" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-0.5">
            <div className="text-[10px] font-black uppercase tracking-widest text-k-crimson font-k-serif">READING · ARTICLE</div>
            <DesignChip tone="butter" size="sm">{level}</DesignChip>
          </div>
          <div className="text-[14px] font-black text-k-ink truncate">{title}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSpeak}
            className={cn(
              "h-10 px-4 rounded-xl flex items-center gap-2 text-[12px] font-extrabold transition-all",
              speaking ? "bg-k-crimson text-white" : "hover:bg-k-line text-k-ink"
            )}
          >
            <Volume2 size={16} /> {speaking ? t('readingArticle.controls.speaking', { defaultValue: 'Speaking...' }) : t('readingArticle.controls.speak', { defaultValue: 'Speak' })}
          </button>
          <button
            onClick={onToggleTranslation}
            className={cn(
              "h-10 px-4 rounded-xl flex items-center gap-2 text-[12px] font-extrabold transition-all",
              translationEnabled ? "bg-k-ink text-white" : "hover:bg-k-line text-k-ink"
            )}
          >
            <Languages size={16} /> {translationEnabled ? t('readingArticle.controls.hideTranslation', { defaultValue: 'Hide translation' }) : t('readingArticle.controls.showTranslation', { defaultValue: 'Show translation' })}
          </button>
          <button
            onClick={increaseFontSize}
            className="h-10 w-10 rounded-xl hover:bg-k-line flex items-center justify-center text-k-ink transition-colors"
          >
            <Type size={18} />
          </button>
          <div className="w-px h-4 bg-k-line mx-2" />
          <button className="h-10 w-10 rounded-xl hover:bg-k-line flex items-center justify-center text-k-ink transition-colors">
            <Bookmark size={18} />
          </button>
        </div>

        {/* Scroll Progress Bar */}
        <div className="absolute bottom-[-1px] left-0 h-[2px] bg-k-crimson transition-all duration-150" style={{ width: `${scrollProgress}%` }} />
      </header>

      <main className="max-w-[1280px] mx-auto px-8 py-12 grid grid-cols-[1fr_340px] gap-12">
        {/* Main Content */}
        <article className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="relative aspect-[21/9] rounded-[32px] overflow-hidden mb-12 shadow-k-sh-lg border border-k-line/5 bg-k-card">
            {resolvedArticle?.imageUrl ? (
              <img src={resolvedArticle.imageUrl} className="w-full h-full object-cover opacity-80" alt="" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-k-pink/40 to-k-butter/40" />
            )}
            <div className="absolute inset-0 grid place-items-center opacity-10 font-k-serif text-[120px]">新</div>
            <div className="absolute inset-0 bg-black/5" />
            <div className="absolute bottom-8 left-10 right-10">
              <div className="flex items-center gap-3 mb-3">
                <DesignChip tone="ink" size="sm" className="bg-k-ink/80 text-white border-none backdrop-blur-md">
                  {category} · {readTime} min
                </DesignChip>
                <span className="text-[11px] font-bold text-white/80 flex items-center gap-1.5 backdrop-blur-md bg-black/20 px-2 py-0.5 rounded-lg">
                  <Clock size={12} /> {publishedDateLabel}
                </span>
              </div>
              <h1 className="font-k-serif text-[36px] font-medium leading-[1.2] text-k-ink tracking-tight bg-white/10 backdrop-blur-sm p-4 rounded-2xl inline-block">
                {title}
              </h1>
            </div>
          </div>

          <div className="bg-k-card/30 rounded-[40px] p-12 border border-k-line/5 shadow-k-sh-sm">
            <div className="flex items-center gap-2 mb-10 text-[11px] font-black text-k-sub uppercase tracking-[2px]">
              <Layout size={14} className="text-k-crimson" /> {t('readingArticle.startReading', { defaultValue: 'START READING' })}
            </div>

            <div className="space-y-8">
              {paragraphs.map((p, i) => (
                <div key={i} className="space-y-3">
                  <p
                    className="font-k-serif leading-[2.1] tracking-[0.2px] text-k-ink"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {p.split(/(\s+)/).map((segment, idx) => {
                      if (/^\s+$/.test(segment)) return segment;

                      // Clean word for lookup (remove punctuation)
                      const cleanWord = segment.replace(/[.,!?;:()[\]{}"']/g, '');
                      const isActive = activeWord === cleanWord;

                      return (
                        <span
                          key={idx}
                          onClick={() => onWordClick(cleanWord)}
                          className={cn(
                            "cursor-pointer rounded-md px-0.5 transition-all hover:bg-k-butter/40",
                            isActive ? "bg-k-butter font-bold shadow-sm" : ""
                          )}
                        >
                          {segment}
                        </span>
                      );
                    })}
                  </p>
                  {translationEnabled && translations[i] && (
                    <p className="text-[15px] font-medium text-k-sub bg-k-bg2/50 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
                      {translations[i]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-16 pt-8 border-t border-k-line flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-k-bg2 flex items-center justify-center text-k-sub">
                  <Share2 size={18} />
                </div>
                <span className="text-[12px] font-bold text-k-sub">
                  {sourceDisplayLabel} · {wordCount} {t('readingArticle.meta.wordCount', { defaultValue: 'words' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-k-sub mr-2">阅读进度 {Math.round(scrollProgress)}%</span>
                <button className="px-6 py-2.5 bg-k-ink text-k-bg rounded-xl text-[13px] font-black hover:bg-k-crimson transition-all">
                  {t('readingArticle.markAsRead', { defaultValue: 'Mark as Read' })}
                </button>
              </div>
            </div>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="sticky top-28 h-fit animate-in fade-in slide-in-from-right-8 duration-700 delay-150">
          {readingSidebarContent}

          <div className="mt-8 p-6 rounded-[24px] bg-k-ink text-k-bg shadow-k-sh-lg flex flex-col gap-4">
            <div className="text-[11px] font-black uppercase tracking-widest text-k-butter">AI 学习助手</div>
            <p className="text-[12px] font-medium leading-relaxed opacity-80">
              对这篇文章有任何疑问？点击单词可查看 AI 释义，或在侧边栏开启深度解析。
            </p>
            <button className="w-full h-10 bg-k-bg text-k-ink rounded-xl text-[12px] font-black hover:bg-k-butter transition-all">
              开启 AI 深度解析
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
