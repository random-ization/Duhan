import React from 'react';
import {
  ArrowLeft,
  Play,
  FastForward,
  Zap,
  Mic2,
  Search,
  Tv,
  Podcast,
  MessageSquare,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { PageShell, Card, HanjaSeal, Chip } from '../../components/mobile/ksoft/ksoft';
import { motion } from 'framer-motion';
import { SEO as Seo } from '../../seo/SEO';
import { getRouteMeta } from '../../seo/publicRoutes';
import { useLocation } from 'react-router-dom';

const ListeningFeaturePage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const meta = getRouteMeta(location.pathname);

  return (
    <PageShell bg="#FCFAF8">
      <Seo
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        noIndex={false}
      />
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-white/70 backdrop-blur-xl border-b border-k-ink/5">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-2 px-4 py-2 rounded-full bg-k-ink text-white hover:bg-k-crimson transition-all"
          >
            <ArrowLeft size={18} />
            <span className="text-[13px] font-black uppercase tracking-wider">Back</span>
          </button>
          <div className="flex items-center gap-4">
            <HanjaSeal c="映" size={32} bg="#F4C5C5" color="white" round={8} />
            <span className="hidden md:block text-[12px] font-black tracking-[0.3em] text-k-ink uppercase">
              K-Soft · Immersive Listening
            </span>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-40">
        {/* Hero Section */}
        <header className="max-w-7xl mx-auto px-6 mb-24 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 px-4 py-1.5 bg-[#F4C5C5]/20 rounded-full mb-8"
          >
            <Zap className="text-k-crimson" size={16} />
            <span className="text-[11px] font-black text-k-crimson uppercase tracking-[0.2em]">
              Active Immersion System
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[48px] md:text-[80px] font-black text-k-ink leading-[1.05] tracking-[-0.04em] mb-8"
          >
            把影视播客，
            <br className="hidden md:block" />
            变成你的 <span className="text-k-crimson italic font-k-serif">全职私教</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-3xl mx-auto text-[18px] md:text-[22px] font-medium text-k-sub leading-relaxed opacity-80"
          >
            告别枯燥的教材音频。在 K-Soft，你可以在真实的韩剧片段、Spotify
            播客和综艺节目中学习。变速精听、双语对照、点词入卡，让每一分钟的沉浸都有所收获。
          </motion.p>
        </header>

        {/* Media Player Interface Preview */}
        <section className="max-w-7xl mx-auto px-6 mb-32">
          <Card
            pad={0}
            className="relative shadow-pop-lg overflow-hidden border border-k-ink/5 bg-k-ink text-white"
          >
            <div className="flex flex-col md:flex-row h-[600px] md:h-[700px]">
              {/* Left: Video/Audio Preview */}
              <div className="flex-1 bg-black relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                <img
                  src="https://images.unsplash.com/photo-1541870230286-84424cc648b3?auto=format&fit=crop&q=80&w=1200"
                  alt="Video Preview"
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-k-crimson flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 transition-all">
                    <Play size={32} fill="white" />
                  </div>
                </div>
                {/* Overlay Subtitles */}
                <div className="absolute bottom-12 left-0 right-0 z-20 text-center px-10">
                  <div className="text-[20px] md:text-[28px] font-bold mb-3 tracking-tight">
                    &quot;요즘 날씨가 너무 <span className="text-[#F2D27A]">화창해서</span> 기분이
                    좋아요.&quot;
                  </div>
                  <div className="text-[16px] md:text-[18px] opacity-60 font-medium italic">
                    &quot;因为最近天气太晴朗了，心情很好。&quot;
                  </div>
                </div>
              </div>

              {/* Right: Interactive Script & Controls */}
              <div className="w-full md:w-[400px] bg-k-ink p-8 flex flex-col border-l border-white/5">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex gap-4">
                    <Chip tone="muted">0.8x</Chip>
                    <Chip tone="crimson">1.0x</Chip>
                    <Chip tone="muted">1.2x</Chip>
                  </div>
                  <div className="flex gap-2">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                      <Search size={16} />
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                      <Podcast size={16} />
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 opacity-40">
                    <div className="text-[11px] font-black opacity-30 mb-1">00:15</div>
                    <p className="text-[14px]">남: 주말에 뭐 할 거예요?</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/10 border-l-4 border-k-crimson">
                    <div className="text-[11px] font-black text-k-crimson mb-2">
                      00:18 · ACTIVE SEGMENT
                    </div>
                    <p className="text-[16px] leading-relaxed font-bold">
                      여: 저는 친구랑 <span className="bg-k-crimson/30 px-1 rounded">경복궁</span>에
                      가려고요.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 opacity-40">
                    <div className="text-[11px] font-black opacity-30 mb-1">00:22</div>
                    <p className="text-[14px]">남: 우와, 저도 가고 싶네요.</p>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/10">
                  <div className="text-[11px] font-black opacity-30 uppercase tracking-[0.2em] mb-4">
                    Vocabulary in Clip
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Chip tone="muted">주말 (周末)</Chip>
                    <Chip tone="muted">친구 (朋友)</Chip>
                    <Chip tone="muted">가다 (去)</Chip>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Feature Highlights */}
        <section className="max-w-7xl mx-auto px-6 space-y-32">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <FeatureTag
                icon={<FastForward size={18} />}
                label="PRECISION CONTROL"
                color="#2D9CDB"
              />
              <h2 className="text-[32px] md:text-[48px] font-black text-k-ink mb-6">
                驯服每一个发音细节
              </h2>
              <p className="text-[18px] text-k-sub opacity-70 leading-relaxed mb-10">
                听力进步的秘诀在于“听清”。我们的播放器专为语言学习设计，不仅提供极致的变速，更支持点击脚本直接重读。
              </p>
              <ul className="space-y-6">
                <FeatureItem
                  title="0.5x – 1.5x 无级变速"
                  desc="无论是初级慢速磨耳朵，还是高级挑战考场干扰，都能游刃有余。"
                />
                <FeatureItem
                  title="句子级循环复读"
                  desc="遇到听不懂的连读？一键开启单句循环，直到你的耳朵形成记忆。"
                />
                <FeatureItem
                  title="AB 区间练习"
                  desc="自定义循环区间，针对特定段落进行地毯式精听训练。"
                />
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Card tone="#FDFCFB" className="p-8 border border-k-ink/5">
                <Tv size={32} className="text-k-crimson mb-4" />
                <h4 className="text-[18px] font-black mb-2">影视片段</h4>
                <p className="text-[13px] opacity-60 font-medium">
                  从韩剧到综艺，海量真实场景素材，让学习不再枯燥。
                </p>
              </Card>
              <Card tone="#FDFCFB" className="p-8 border border-k-ink/5">
                <Podcast size={32} className="text-blue-500 mb-4" />
                <h4 className="text-[18px] font-black mb-2">播客电台</h4>
                <p className="text-[13px] opacity-60 font-medium">
                  深度集成 Spotify 优质韩语播客，覆盖新闻、文化与日常。
                </p>
              </Card>
              <Card tone="#FDFCFB" className="p-8 border border-k-ink/5">
                <Mic2 size={32} className="text-green-500 mb-4" />
                <h4 className="text-[18px] font-black mb-2">AI 转录</h4>
                <p className="text-[13px] opacity-60 font-medium">
                  实时语音转文本，精准标注语流变化，让声音“看得见”。
                </p>
              </Card>
              <Card tone="#FDFCFB" className="p-8 border border-k-ink/5">
                <MessageSquare size={32} className="text-[#F2D27A] mb-4" />
                <h4 className="text-[18px] font-black mb-2">同步脚本</h4>
                <p className="text-[13px] opacity-60 font-medium">
                  中韩双语字幕实时对照，支持一键切换隐藏，辅助盲听。
                </p>
              </Card>
            </div>
          </div>

          <div className="bg-k-bg2 rounded-[48px] p-12 md:p-24 text-center">
            <Sparkles className="text-k-crimson mx-auto mb-8" size={48} />
            <h2 className="text-[32px] md:text-[56px] font-black text-k-ink mb-8 leading-tight">
              沉浸式学习，
              <br />
              让韩语成为你的本能
            </h2>
            <p className="max-w-2xl mx-auto text-[18px] md:text-[21px] font-medium text-k-sub opacity-70 leading-relaxed mb-12">
              不再是为了听而听。在 K-Soft，每一段音频都是一个学习闭环：听力输入、生词识别、FSRS
              巩固，助你突破听力瓶颈。
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="px-16 py-7 bg-k-crimson text-white rounded-[24px] text-[18px] font-black shadow-pop-lg hover:scale-105 active:scale-95 transition-all"
            >
              立即开启沉浸之旅
            </button>
          </div>
        </section>
      </div>
    </PageShell>
  );
};

const FeatureTag: React.FC<{ icon: React.ReactNode; label: string; color: string }> = ({
  icon,
  label,
  color,
}) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}15`, color }}>
      {icon}
    </div>
    <span className="text-[13px] font-black tracking-[0.2em] uppercase" style={{ color }}>
      {label}
    </span>
  </div>
);

const FeatureItem: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <li className="flex gap-4">
    <CheckCircle2 size={20} className="text-k-crimson shrink-0 mt-1" />
    <div>
      <h4 className="text-[18px] font-black text-k-ink mb-1">{title}</h4>
      <p className="text-[14px] font-medium text-k-sub opacity-70 leading-relaxed">{desc}</p>
    </div>
  </li>
);

export default ListeningFeaturePage;
