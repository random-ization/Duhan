import React, { useMemo, useState } from 'react';

type TabKey = 'home' | 'courses' | 'topik' | 'videos' | 'podcasts';

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
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="w-11 h-11 rounded-[14px] border-2 border-slate-900 bg-white shadow-pop-sm grid place-items-center select-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition"
    >
      {children}
    </button>
  );
}

function Chip({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <span className="inline-flex items-center h-6 px-2.5 rounded-full border-2 border-slate-900 bg-slate-50 shadow-pop-sm text-xs font-extrabold text-slate-900">
      {children}
    </span>
  );
}

function PrimaryButton({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <button
      type="button"
      className="h-11 w-full rounded-xl border-2 border-indigo-500 bg-indigo-100 text-indigo-800 font-extrabold shadow-pop active:translate-x-1 active:translate-y-1 active:shadow-none transition"
    >
      {children}
    </button>
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
    <button
      type="button"
      className={`h-11 w-full rounded-xl border-2 border-slate-900 bg-white text-slate-900 font-extrabold shadow-pop active:translate-x-1 active:translate-y-1 active:shadow-none transition ${className}`}
    >
      {children}
    </button>
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
    <button
      type="button"
      onClick={() => onClick(tab)}
      className={`h-14 rounded-[22px] grid place-items-center gap-1 text-[11px] font-extrabold select-none transition ${
        active
          ? 'bg-indigo-50 text-indigo-600 outline outline-2 outline-indigo-500'
          : 'text-slate-300 active:bg-slate-50'
      }`}
    >
      <span className="w-[22px] h-[22px] grid place-items-center text-base leading-none">
        {icon}
      </span>
      {label}
    </button>
  );
}

export default function MobilePreviewPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  return (
    <div className={`min-h-[100dvh] ${isSheetOpen ? 'overflow-hidden' : ''}`}>
      <div className="sticky top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-2 bg-gradient-to-b from-background/95 via-background/85 to-background/0 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <IconButton ariaLabel="Open menu">☰</IconButton>
          <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
            <div className="w-9 h-9 rounded-xl border-2 border-slate-900 bg-white shadow-pop-sm grid place-items-center font-display">
              D
            </div>
            <div className="font-black text-lg text-slate-900 tracking-tight truncate">DuHan</div>
          </div>
          <IconButton ariaLabel="Open panel" onClick={() => setIsSheetOpen(true)}>
            ⋯
          </IconButton>
        </div>

        <div className="mt-3 h-11 rounded-full border-2 border-slate-900 bg-white shadow-pop-sm flex items-center gap-2 px-3">
          <span className="text-slate-400 font-black">⌕</span>
          <input
            placeholder="搜索课程、视频、播客…"
            className="flex-1 bg-transparent outline-none text-sm font-medium"
          />
        </div>
      </div>

      <main className="px-4 pb-[calc(env(safe-area-inset-bottom)+120px)] pt-3">
        <section className="mt-3">
          <div className="flex items-baseline justify-between gap-3 px-0.5">
            <h2 className="m-0 text-sm font-black tracking-tight text-slate-900">继续学习</h2>
            <button
              type="button"
              onClick={() => setIsSheetOpen(true)}
              className="px-2.5 py-2 rounded-xl font-extrabold text-[13px] text-slate-700 active:bg-slate-100 transition"
            >
              筛选
            </button>
          </div>

          <div className="mt-2.5 grid gap-3">
            <div className="rounded-[24px] border-2 border-slate-900 bg-white shadow-pop-card overflow-hidden">
              <div className="p-4">
                <div className="text-base font-black tracking-tight text-slate-900 leading-tight">
                  TOPIK 词汇 · 高频 50
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Chip>今日任务</Chip>
                  <Chip>8 分钟</Chip>
                  <Chip>进度 62%</Chip>
                </div>
              </div>
              <div className="px-4 pb-4 flex gap-2.5">
                <PrimaryButton>继续</PrimaryButton>
                <SecondaryButton>稍后</SecondaryButton>
              </div>
            </div>

            <div className="rounded-[24px] border-2 border-slate-900 bg-white shadow-pop-card overflow-hidden">
              <div className="p-4">
                <div className="text-base font-black tracking-tight text-slate-900 leading-tight">
                  视频：真实语速听力训练
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Chip>字幕</Chip>
                  <Chip>可查词</Chip>
                  <Chip>12:40</Chip>
                </div>
              </div>
              <div className="px-4 pb-4 flex gap-2.5">
                <PrimaryButton>播放</PrimaryButton>
                <SecondaryButton className="bg-lime-300">收藏</SecondaryButton>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-baseline justify-between gap-3 px-0.5">
            <h2 className="m-0 text-sm font-black tracking-tight text-slate-900">
              为移动端优化的功能入口
            </h2>
            <button
              type="button"
              onClick={() => setIsSheetOpen(true)}
              className="px-2.5 py-2 rounded-xl font-extrabold text-[13px] text-slate-700 active:bg-slate-100 transition"
            >
              打开面板
            </button>
          </div>

          <div className="mt-2.5 grid gap-2.5">
            {[
              { title: '统一 Bottom Sheet', sub: '遮罩/关闭/滚动锁定/safe-area', cta: '预览' },
              { title: '底部导航（单手友好）', sub: '44×44 命中区 + 清晰选中态', cta: '细节' },
              { title: 'dvh 解决 100vh 截断', sub: 'iOS 地址栏伸缩也不裁切', cta: 'OK' },
            ].map(item => (
              <div
                key={item.title}
                className="rounded-[18px] border-2 border-slate-900 bg-white shadow-pop p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-black tracking-tight text-slate-900 truncate">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{item.sub}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSheetOpen(true)}
                  className="h-9 px-3 rounded-full border-2 border-slate-900 bg-white shadow-pop-sm text-xs font-extrabold active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition"
                >
                  {item.cta}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <nav className="fixed md:hidden left-4 right-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-50 h-[76px] rounded-[2rem] bg-white border-2 border-slate-900 shadow-2xl px-2 grid grid-cols-5 items-center">
        <MobileBottomTab
          tab="home"
          label="首页"
          active={activeTab === 'home'}
          onClick={setActiveTab}
        />
        <MobileBottomTab
          tab="courses"
          label="课程"
          active={activeTab === 'courses'}
          onClick={setActiveTab}
        />
        <MobileBottomTab
          tab="topik"
          label="TOPIK"
          active={activeTab === 'topik'}
          onClick={setActiveTab}
        />
        <MobileBottomTab
          tab="videos"
          label="视频"
          active={activeTab === 'videos'}
          onClick={setActiveTab}
        />
        <MobileBottomTab
          tab="podcasts"
          label="播客"
          active={activeTab === 'podcasts'}
          onClick={setActiveTab}
        />
      </nav>

      <button
        type="button"
        aria-label="Close panel overlay"
        className={`fixed inset-0 z-[80] bg-slate-900/35 transition-opacity ${
          isSheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSheetOpen(false)}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] transition-transform duration-300 ease-out ${
          isSheetOpen ? 'translate-y-0' : 'translate-y-[105%]'
        }`}
      >
        <div className="bg-[#FDFBF7] border-2 border-slate-900 rounded-[26px] overflow-hidden shadow-[0_-14px_40px_rgba(0,0,0,0.18)] max-h-[78dvh] flex flex-col">
          <div className="bg-white border-b-2 border-slate-200 px-3 py-3 flex items-center justify-between gap-2">
            <div className="text-[15px] font-black tracking-tight text-slate-900">
              筛选 / 快捷操作
            </div>
            <IconButton ariaLabel="Close panel" onClick={() => setIsSheetOpen(false)}>
              ✕
            </IconButton>
          </div>
          <div className="p-3 overflow-y-auto">
            {[
              { title: '仅显示未完成', sub: '减少信息噪音', cta: '开启' },
              { title: '下载离线内容', sub: '地铁/电梯也能学', cta: '管理' },
              { title: '字幕面板样式', sub: '更适合拇指滚动与点击', cta: '预览' },
            ].map(item => (
              <div
                key={item.title}
                className="rounded-[18px] border-2 border-slate-900 bg-white shadow-pop p-3 flex items-center justify-between gap-3 mb-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-black tracking-tight text-slate-900 truncate">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{item.sub}</div>
                </div>
                <button
                  type="button"
                  className="h-9 px-3 rounded-full border-2 border-slate-900 bg-white shadow-pop-sm text-xs font-extrabold active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition"
                >
                  {item.cta}
                </button>
              </div>
            ))}

            <div className="mt-3 grid gap-2">
              <PrimaryButton>完成</PrimaryButton>
              <SecondaryButton>取消</SecondaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
