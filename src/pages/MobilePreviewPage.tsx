import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetOverlay, SheetPortal } from '../components/ui';
import { Button } from '../components/ui';
import { Input } from '../components/ui';

type TabKey = 'home' | 'courses' | 'topik' | 'videos' | 'podcasts';
type UiLang = 'en' | 'zh' | 'vi' | 'mn';

const COPY: Record<
  UiLang,
  {
    openMenu: string;
    openPanel: string;
    closePanel: string;
    searchPlaceholder: string;
    continueLearning: string;
    filter: string;
    vocabCardTitle: string;
    todayTask: string;
    minutes: string;
    progress: string;
    continueAction: string;
    later: string;
    videoCardTitle: string;
    subtitles: string;
    tapLookup: string;
    play: string;
    save: string;
    mobileEntryTitle: string;
    openPanelAction: string;
    featureCards: Array<{ title: string; sub: string; cta: string }>;
    nav: Record<TabKey, string>;
    sheetTitle: string;
    sheetItems: Array<{ title: string; sub: string; cta: string }>;
    done: string;
    cancel: string;
  }
> = {
  en: {
    openMenu: 'Open menu',
    openPanel: 'Open panel',
    closePanel: 'Close panel',
    searchPlaceholder: 'Search courses, videos, podcasts...',
    continueLearning: 'Continue learning',
    filter: 'Filter',
    vocabCardTitle: 'TOPIK Vocabulary - Top 50',
    todayTask: "Today's task",
    minutes: '8 min',
    progress: 'Progress 62%',
    continueAction: 'Continue',
    later: 'Later',
    videoCardTitle: 'Video: Real-speed listening drill',
    subtitles: 'Subtitles',
    tapLookup: 'Tap to lookup',
    play: 'Play',
    save: 'Save',
    mobileEntryTitle: 'Mobile-optimized entry points',
    openPanelAction: 'Open panel',
    featureCards: [
      { title: 'Unified Bottom Sheet', sub: 'Overlay / close / scroll lock / safe-area', cta: 'Preview' },
      { title: 'Bottom navigation (one-hand friendly)', sub: '44x44 hit target + clear active state', cta: 'Details' },
      { title: 'dvh fixes 100vh cut-off', sub: 'No clipping when iOS address bar expands/collapses', cta: 'OK' },
    ],
    nav: {
      home: 'Home',
      courses: 'Courses',
      topik: 'TOPIK',
      videos: 'Videos',
      podcasts: 'Podcasts',
    },
    sheetTitle: 'Filters / quick actions',
    sheetItems: [
      { title: 'Show incomplete only', sub: 'Reduce info noise', cta: 'Enable' },
      { title: 'Download offline content', sub: 'Learn on subway/elevator', cta: 'Manage' },
      { title: 'Subtitle panel style', sub: 'Better for thumb scrolling and tapping', cta: 'Preview' },
    ],
    done: 'Done',
    cancel: 'Cancel',
  },
  zh: {
    openMenu: '\u6253\u5f00\u83dc\u5355',
    openPanel: '\u6253\u5f00\u9762\u677f',
    closePanel: '\u5173\u95ed\u9762\u677f',
    searchPlaceholder: '\u641c\u7d22\u8bfe\u7a0b、\u89c6\u9891、\u64ad\u5ba2...',
    continueLearning: '\u7ee7\u7eed\u5b66\u4e60',
    filter: '\u7b5b\u9009',
    vocabCardTitle: 'TOPIK \u8bcd\u6c47 · \u9ad8\u9891 50',
    todayTask: '\u4eca\u65e5\u4efb\u52a1',
    minutes: '8 \u5206\u949f',
    progress: '\u8fdb\u5ea6 62%',
    continueAction: '\u7ee7\u7eed',
    later: '\u7a0d\u540e',
    videoCardTitle: '\u89c6\u9891：\u771f\u5b9e\u8bed\u901f\u542c\u529b\u8bad\u7ec3',
    subtitles: '\u5b57\u5e55',
    tapLookup: '\u53ef\u67e5\u8bcd',
    play: '\u64ad\u653e',
    save: '\u6536\u85cf',
    mobileEntryTitle: '\u4e3a\u79fb\u52a8\u7aef\u4f18\u5316\u7684\u529f\u80fd\u5165\u53e3',
    openPanelAction: '\u6253\u5f00\u9762\u677f',
    featureCards: [
      { title: '\u7edf\u4e00 Bottom Sheet', sub: '\u906e\u7f69/\u5173\u95ed/\u6eda\u52a8\u9501\u5b9a/safe-area', cta: '\u9884\u89c8' },
      { title: '\u5e95\u90e8\u5bfc\u822a（\u5355\u624b\u53cb\u597d）', sub: '44x44 \u547d\u4e2d\u533a + \u6e05\u6670\u9009\u4e2d\u6001', cta: '\u7ec6\u8282' },
      { title: 'dvh \u89e3\u51b3 100vh \u622a\u65ad', sub: 'iOS \u5730\u5740\u680f\u4f38\u7f29\u4e5f\u4e0d\u88c1\u5207', cta: 'OK' },
    ],
    nav: {
      home: '\u9996\u9875',
      courses: '\u8bfe\u7a0b',
      topik: 'TOPIK',
      videos: '\u89c6\u9891',
      podcasts: '\u64ad\u5ba2',
    },
    sheetTitle: '\u7b5b\u9009 / \u5feb\u6377\u64cd\u4f5c',
    sheetItems: [
      { title: '\u4ec5\u663e\u793a\u672a\u5b8c\u6210', sub: '\u51cf\u5c11\u4fe1\u606f\u566a\u97f3', cta: '\u5f00\u542f' },
      { title: '\u4e0b\u8f7d\u79bb\u7ebf\u5185\u5bb9', sub: '\u5730\u94c1/\u7535\u68af\u4e5f\u80fd\u5b66', cta: '\u7ba1\u7406' },
      { title: '\u5b57\u5e55\u9762\u677f\u6837\u5f0f', sub: '\u66f4\u9002\u5408\u62c7\u6307\u6eda\u52a8\u4e0e\u70b9\u51fb', cta: '\u9884\u89c8' },
    ],
    done: '\u5b8c\u6210',
    cancel: '\u53d6\u6d88',
  },
  vi: {
    openMenu: 'Mo menu',
    openPanel: 'Mo bang dieu khien',
    closePanel: 'Dong bang',
    searchPlaceholder: 'Tim khoa hoc, video, podcast...',
    continueLearning: 'Tiep tuc hoc',
    filter: 'Loc',
    vocabCardTitle: 'Tu vung TOPIK - Top 50',
    todayTask: 'Nhiem vu hom nay',
    minutes: '8 phut',
    progress: 'Tien do 62%',
    continueAction: 'Tiep tuc',
    later: 'De sau',
    videoCardTitle: 'Video: Luyen nghe toc do thuc',
    subtitles: 'Phu de',
    tapLookup: 'Cham de tra cuu',
    play: 'Phat',
    save: 'Luu',
    mobileEntryTitle: 'Muc tinh nang toi uu cho di dong',
    openPanelAction: 'Mo bang',
    featureCards: [
      { title: 'Bottom Sheet thong nhat', sub: 'Lop phu / dong / khoa cuon / safe-area', cta: 'Xem truoc' },
      { title: 'Dieu huong duoi (de dung mot tay)', sub: 'Vung bam 44x44 + trang thai chon ro rang', cta: 'Chi tiet' },
      { title: 'dvh xu ly loi cat 100vh', sub: 'Khong bi cat khi thanh dia chi iOS thay doi', cta: 'OK' },
    ],
    nav: {
      home: 'Trang chu',
      courses: 'Khoa hoc',
      topik: 'TOPIK',
      videos: 'Video',
      podcasts: 'Podcast',
    },
    sheetTitle: 'Bo loc / thao tac nhanh',
    sheetItems: [
      { title: 'Chi hien muc chua hoan thanh', sub: 'Giam nhieu thong tin', cta: 'Bat' },
      { title: 'Tai noi dung ngoai tuyen', sub: 'Hoc duoc tren tau dien ngam/thang may', cta: 'Quan ly' },
      { title: 'Kieu bang phu de', sub: 'Phu hop hon cho cuon va cham bang ngon tay cai', cta: 'Xem truoc' },
    ],
    done: 'Xong',
    cancel: 'Huy',
  },
  mn: {
    openMenu: 'Tses neeh',
    openPanel: 'Panel neeh',
    closePanel: 'Panel хаах',
    searchPlaceholder: 'Kurs, video, podcast хайх...',
    continueLearning: 'Suraltsaa urgeljluuleh',
    filter: 'Shuuh',
    vocabCardTitle: 'TOPIK ugiin san - Deed 50',
    todayTask: 'Unuudriin daalgavar',
    minutes: '8 minut',
    progress: 'Ahits 62%',
    continueAction: 'Urgeljluuleh',
    later: 'Daraa',
    videoCardTitle: 'Video: Bodit hurdnii sonsgolyn dasgal',
    subtitles: 'Hadmal',
    tapLookup: 'Daran ugiin utga harah',
    play: 'Togluulah',
    save: 'Hadgalah',
    mobileEntryTitle: 'Gar utast tohiruulsan funktsuud',
    openPanelAction: 'Panel neeh',
    featureCards: [
      { title: 'Negdsen Bottom Sheet', sub: 'Davharga / haah / scroll lock / safe-area', cta: 'Uridchilaaad uzeh' },
      { title: 'Doод navigation (neg garaar ashiglahad amar)', sub: '44x44 darah talbar + tod songogdson baidal', cta: 'Delgerengui' },
      { title: 'dvh нь 100vh tasraltig zasna', sub: 'iOS haygiin mur suнахad tasrahgui', cta: 'OK' },
    ],
    nav: {
      home: 'Nuur',
      courses: 'Kurs',
      topik: 'TOPIK',
      videos: 'Video',
      podcasts: 'Podcast',
    },
    sheetTitle: 'Shuult / turgen uildel',
    sheetItems: [
      { title: 'Duusaaguiг l haruulah', sub: 'Medeeleliin shuuгiag bagasgah', cta: 'Asaah' },
      { title: 'Offline контент татах', sub: 'Metro/liftd ch surah bolomj', cta: 'Udirdah' },
      { title: 'Hadmaliin paneliin zagvar', sub: 'Erхий huruugaar scroll, darahad iluu tohirno', cta: 'Uridchilaaad uzeh' },
    ],
    done: 'Duusgah',
    cancel: 'Tsutslah',
  },
};

function IconButton({
  children,
  ariaLabel,
  onClick,
}: Readonly<{
  children: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
}>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      aria-label={ariaLabel}
      onClick={onClick}
      className="w-11 h-11 rounded-[14px] border-2 border-foreground bg-card shadow-pop-sm grid place-items-center select-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition"
    >
      {children}
    </Button>
  );
}

function Chip({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <span className="inline-flex items-center h-6 px-2.5 rounded-full border-2 border-foreground bg-muted shadow-pop-sm text-xs font-extrabold text-foreground">
      {children}
    </span>
  );
}

function PrimaryButton({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      className="h-11 w-full rounded-xl border-2 border-indigo-500 dark:border-indigo-300/60 bg-indigo-100 dark:bg-indigo-400/15 text-indigo-800 dark:text-indigo-200 font-extrabold shadow-pop active:translate-x-1 active:translate-y-1 active:shadow-none transition"
    >
      {children}
    </Button>
  );
}

function SecondaryButton({
  children,
  className = '',
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      className={`h-11 w-full rounded-xl border-2 border-foreground bg-card text-foreground font-extrabold shadow-pop active:translate-x-1 active:translate-y-1 active:shadow-none transition ${className}`}
    >
      {children}
    </Button>
  );
}

function MobileBottomTab({
  tab,
  label,
  active,
  onClick,
}: Readonly<{
  tab: TabKey;
  label: string;
  active: boolean;
  onClick: (tab: TabKey) => void;
}>) {
  const icon = useMemo(() => {
    switch (tab) {
      case 'home':
        return '⌂';
      case 'courses':
        return '▦';
      case 'topik':
        return '✓';
      case 'videos':
        return '▶';
      case 'podcasts':
        return '♪';
    }
  }, [tab]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={() => onClick(tab)}
      className={`h-14 rounded-[22px] grid place-items-center gap-1 text-[11px] font-extrabold select-none transition ${
        active
          ? 'bg-indigo-50 dark:bg-indigo-400/15 text-indigo-600 dark:text-indigo-200 outline outline-2 outline-indigo-500 dark:outline-indigo-300/70'
          : 'text-muted-foreground active:bg-muted'
      }`}
    >
      <span className="w-[22px] h-[22px] grid place-items-center text-base leading-none">
        {icon}
      </span>
      {label}
    </Button>
  );
}

export default function MobilePreviewPage() {
  const { i18n } = useTranslation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const lang = ((i18n.language || 'en').split('-')[0] as UiLang) || 'en';
  const copy = COPY[lang] || COPY.en;

  return (
    <div className={`min-h-[100dvh] ${isSheetOpen ? 'overflow-hidden' : ''}`}>
      <div className="sticky top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 bg-gradient-to-b from-background/95 via-background/85 to-background/0 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <IconButton ariaLabel={copy.openMenu}>☰</IconButton>
          <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
            <div className="w-9 h-9 rounded-xl border-2 border-foreground bg-card shadow-pop-sm grid place-items-center font-display">
              D
            </div>
            <div className="font-black text-lg text-foreground tracking-tight truncate">DuHan</div>
          </div>
          <IconButton ariaLabel={copy.openPanel} onClick={() => setIsSheetOpen(true)}>
            ⋯
          </IconButton>
        </div>

        <div className="mt-3 h-11 rounded-full border-2 border-foreground bg-card shadow-pop-sm flex items-center gap-2 px-3">
          <span className="text-muted-foreground font-black">⌕</span>
          <Input
            placeholder={copy.searchPlaceholder}
            className="h-auto flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-medium"
          />
        </div>
      </div>

      <main className="px-4 pb-[calc(env(safe-area-inset-bottom)+120px)] pt-3">
        <section className="mt-3">
          <div className="flex items-baseline justify-between gap-3 px-0.5">
            <h2 className="m-0 text-sm font-black tracking-tight text-foreground">
              {copy.continueLearning}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setIsSheetOpen(true)}
              className="px-2.5 py-2 rounded-xl font-extrabold text-[13px] text-muted-foreground active:bg-muted transition"
            >
              {copy.filter}
            </Button>
          </div>

          <div className="mt-2.5 grid gap-3">
            <div className="rounded-[24px] border-2 border-foreground bg-card shadow-pop-card overflow-hidden">
              <div className="p-4">
                <div className="text-base font-black tracking-tight text-foreground leading-tight">
                  {copy.vocabCardTitle}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Chip>{copy.todayTask}</Chip>
                  <Chip>{copy.minutes}</Chip>
                  <Chip>{copy.progress}</Chip>
                </div>
              </div>
              <div className="px-4 pb-4 flex gap-2.5">
                <PrimaryButton>{copy.continueAction}</PrimaryButton>
                <SecondaryButton>{copy.later}</SecondaryButton>
              </div>
            </div>

            <div className="rounded-[24px] border-2 border-foreground bg-card shadow-pop-card overflow-hidden">
              <div className="p-4">
                <div className="text-base font-black tracking-tight text-foreground leading-tight">
                  {copy.videoCardTitle}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Chip>{copy.subtitles}</Chip>
                  <Chip>{copy.tapLookup}</Chip>
                  <Chip>12:40</Chip>
                </div>
              </div>
              <div className="px-4 pb-4 flex gap-2.5">
                <PrimaryButton>{copy.play}</PrimaryButton>
                <SecondaryButton className="bg-lime-300 dark:bg-lime-400/80">
                  {copy.save}
                </SecondaryButton>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-baseline justify-between gap-3 px-0.5">
            <h2 className="m-0 text-sm font-black tracking-tight text-foreground">
              {copy.mobileEntryTitle}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setIsSheetOpen(true)}
              className="px-2.5 py-2 rounded-xl font-extrabold text-[13px] text-muted-foreground active:bg-muted transition"
            >
              {copy.openPanelAction}
            </Button>
          </div>

          <div className="mt-2.5 grid gap-2.5">
            {copy.featureCards.map(item => (
              <div
                key={item.title}
                className="rounded-[18px] border-2 border-foreground bg-card shadow-pop p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-black tracking-tight text-foreground truncate">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs font-bold text-muted-foreground">{item.sub}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => setIsSheetOpen(true)}
                  className="h-9 px-3 rounded-full border-2 border-foreground bg-card shadow-pop-sm text-xs font-extrabold active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition"
                >
                  {item.cta}
                </Button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <nav className="fixed md:hidden left-4 right-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-50 h-[76px] rounded-[2rem] bg-card border-2 border-foreground shadow-2xl px-2 grid grid-cols-5 items-center">
        <MobileBottomTab
          tab="home"
          label={copy.nav.home}
          active={activeTab === 'home'}
          onClick={setActiveTab}
        />
        <MobileBottomTab
          tab="courses"
          label={copy.nav.courses}
          active={activeTab === 'courses'}
          onClick={setActiveTab}
        />
        <MobileBottomTab
          tab="topik"
          label={copy.nav.topik}
          active={activeTab === 'topik'}
          onClick={setActiveTab}
        />
        <MobileBottomTab
          tab="videos"
          label={copy.nav.videos}
          active={activeTab === 'videos'}
          onClick={setActiveTab}
        />
        <MobileBottomTab
          tab="podcasts"
          label={copy.nav.podcasts}
          active={activeTab === 'podcasts'}
          onClick={setActiveTab}
        />
      </nav>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetPortal>
          <SheetOverlay
            unstyled
            forceMount
            className="fixed inset-0 z-[80] bg-primary/35 transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
          />
          <SheetContent
            unstyled
            forceMount
            closeOnEscape={false}
            lockBodyScroll={false}
            className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] transition-transform duration-300 ease-out data-[state=open]:translate-y-0 data-[state=closed]:translate-y-[105%] data-[state=closed]:pointer-events-none"
          >
            <div className="bg-[#FDFBF7] border-2 border-foreground rounded-[26px] overflow-hidden shadow-[0_-14px_40px_rgba(0,0,0,0.18)] max-h-[78dvh] flex flex-col">
              <div className="bg-card border-b-2 border-border px-3 py-3 flex items-center justify-between gap-2">
                <div className="text-[15px] font-black tracking-tight text-foreground">
                  {copy.sheetTitle}
                </div>
                <IconButton ariaLabel={copy.closePanel} onClick={() => setIsSheetOpen(false)}>
                  ✕
                </IconButton>
              </div>
              <div className="p-3 overflow-y-auto">
                {copy.sheetItems.map(item => (
                  <div
                    key={item.title}
                    className="rounded-[18px] border-2 border-foreground bg-card shadow-pop p-3 flex items-center justify-between gap-3 mb-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-black tracking-tight text-foreground truncate">
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs font-bold text-muted-foreground">{item.sub}</div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      className="h-9 px-3 rounded-full border-2 border-foreground bg-card shadow-pop-sm text-xs font-extrabold active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition"
                    >
                      {item.cta}
                    </Button>
                  </div>
                ))}

                <div className="mt-3 grid gap-2">
                  <PrimaryButton>{copy.done}</PrimaryButton>
                  <SecondaryButton>{copy.cancel}</SecondaryButton>
                </div>
              </div>
            </div>
          </SheetContent>
        </SheetPortal>
      </Sheet>
    </div>
  );
}
