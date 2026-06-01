import React from 'react';
import {
  ArrowLeft,
  Sparkles,
  Clock,
  BookOpen,
  CheckCircle2,
  BarChart3,
  Headphones,
  Zap,
  Target,
  MessageSquareQuote,
  Trophy,
} from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { PageShell, Card, HanjaSeal, Chip } from '../../components/mobile/ksoft/ksoft';
import { motion } from 'framer-motion';
import { SEO as Seo } from '../../seo/SEO';
import { getRouteMeta } from '../../seo/publicRoutes';
import { useLocation } from 'react-router-dom';

const TopikFeaturePage: React.FC = () => {
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
            <HanjaSeal c="能" size={32} bg="var(--color-k-crimson)" color="white" round={8} />
            <span className="hidden md:block text-[12px] font-black tracking-[0.3em] text-k-ink uppercase">
              K-Soft · TOPIK Mastery
            </span>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-40">
        {/* Wide Hero Section */}
        <header className="max-w-7xl mx-auto px-6 mb-24 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 px-4 py-1.5 bg-k-crimson/10 rounded-full mb-8"
          >
            <Zap className="text-k-crimson" size={16} />
            <span className="text-[11px] font-black text-k-crimson uppercase tracking-[0.2em]">
              Desktop Pro Experience
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[48px] md:text-[80px] font-black text-k-ink leading-[1.05] tracking-[-0.04em] mb-8"
          >
            专业级 <span className="text-k-crimson italic font-k-serif">TOPIK</span> 备考系统
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-3xl mx-auto text-[18px] md:text-[22px] font-medium text-k-sub leading-relaxed opacity-80"
          >
            专为大屏优化的考场模拟环境。不仅是真题，更是集成了{' '}
            <span className="text-k-ink font-bold">AI 实时诊断、全维听力控制</span> 与{' '}
            <span className="text-k-ink font-bold">写作提分实验室</span> 的一站式备考工作台。
          </motion.p>
        </header>

        {/* Desktop Interface Preview - The "Anti-Mobile" Visual */}
        <section className="max-w-7xl mx-auto px-6 mb-32">
          <Card
            pad={0}
            className="relative shadow-pop-lg overflow-hidden border border-k-ink/5 bg-white"
          >
            {/* Mock Dashboard Header */}
            <div className="h-12 bg-k-bg border-b border-k-ink/5 flex items-center px-6 justify-between">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-k-crimson/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-k-crimson/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-k-crimson/20" />
              </div>
              <div className="text-[10px] font-black tracking-widest text-k-sub uppercase">
                TOPIK II · Exam Environment
              </div>
              <div className="flex items-center gap-3">
                <Clock size={12} className="text-k-crimson" />
                <span className="text-[11px] font-black text-k-ink">102:45</span>
              </div>
            </div>

            <div className="flex h-[500px] md:h-[650px]">
              {/* Left Side: Question Area */}
              <div className="flex-1 p-10 overflow-y-auto border-r border-k-ink/5 bg-[#FDFCFB]">
                <div className="max-w-2xl mx-auto">
                  <div className="mb-8 flex items-center gap-3">
                    <span className="bg-k-ink text-white px-3 py-1 rounded-lg text-[12px] font-black">
                      第 35~38 题
                    </span>
                    <span className="text-k-sub text-[13px] font-bold">
                      [阅读] 请选择最符合文章主旨的一项。
                    </span>
                  </div>
                  <div className="space-y-6 text-[18px] leading-[1.8] text-k-ink font-medium">
                    <p>
                      환경 보호를 위한 정부의 정책이{' '}
                      <span className="bg-[#F2D27A]/30 px-1 border-b-2 border-[#F2D27A]">
                        본격적으로
                      </span>{' '}
                      시행되면서 기업들은 탄소 배出량을 줄이기 위한 기술 개발에 박차를 가하고 있다.
                    </p>
                    <p className="opacity-50">
                      전문가들은 이러한 변화가 단순히 규제에 대응하는 것을 넘어, 새로운 시장
                      경쟁력을 확보하는 계기가 될 것이라고 전망하고 있다...
                    </p>
                  </div>
                  <div className="mt-12 space-y-3">
                    {[
                      '정부는 탄소 배출량을 규제해야 한다.',
                      '기업들은 기술 개발을 통해 경쟁력을 키워야 한다.',
                      '환경 보호를 위해 정부와 기업의 협력이 필요하다.',
                      '정부의 환경 정책이 기업의 기술 개발을 촉진하고 있다.',
                    ].map((opt, i) => (
                      <div
                        key={i}
                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${i === 3 ? 'border-k-crimson bg-k-crimson/5' : 'border-k-ink/5 bg-white hover:border-k-ink/20'}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-black ${i === 3 ? 'bg-k-crimson border-k-crimson text-white' : 'border-k-ink/10 text-k-sub'}`}
                        >
                          {i + 1}
                        </div>
                        <span
                          className={`text-[15px] font-bold ${i === 3 ? 'text-k-ink' : 'text-k-sub'}`}
                        >
                          {opt}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side: AI Panel */}
              <div className="w-[380px] bg-white p-8 space-y-8 hidden lg:block">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="text-k-crimson" size={20} />
                    <h3 className="text-[14px] font-black uppercase tracking-widest text-k-ink">
                      AI Assistant
                    </h3>
                  </div>
                  <Card tone="k-bg" pad={20} className="border border-k-ink/5 shadow-sm">
                    <div className="text-[12px] font-black text-k-sub mb-3">实时单词分析</div>
                    <div className="space-y-4">
                      <div className="p-3 bg-white rounded-xl border border-k-ink/5">
                        <div className="text-[13px] font-black text-k-ink">본격적으로</div>
                        <div className="text-[11px] text-k-sub font-bold mt-1">正式地、真正地</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-k-ink/5">
                        <div className="text-[13px] font-black text-k-ink">박차를 가하다</div>
                        <div className="text-[11px] text-k-sub font-bold mt-1">加油、加快速度</div>
                      </div>
                    </div>
                  </Card>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="text-k-ink" size={20} />
                    <h3 className="text-[14px] font-black uppercase tracking-widest text-k-ink">
                      Progress Tracker
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[11px] font-black text-k-sub">EXPECTED SCORE</span>
                      <span className="text-[28px] font-k-serif text-k-crimson leading-none">
                        84<span className="text-[14px] ml-1">/100</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-k-bg rounded-full overflow-hidden">
                      <div className="h-full w-[84%] bg-k-crimson" />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-k-ink/5">
                  <div className="text-[11px] font-black text-k-sub uppercase tracking-widest mb-4">
                    Exam History
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-k-bg transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Trophy size={16} className="text-k-butter" />
                        <span className="text-[12px] font-black text-k-ink">第 87 回 TOPIK II</span>
                      </div>
                      <span className="text-[11px] font-bold text-k-crimson">242 pts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Three Pillars Section */}
        <div className="max-w-7xl mx-auto px-6 space-y-32">
          {/* 1. TOPIK Reading */}
          <section className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <FeatureTag icon={<BookOpen size={18} />} label="TOPIK READING" color="#2D9CDB" />
              <h2 className="text-[36px] md:text-[52px] font-black text-k-ink mb-6 leading-tight">
                全真阅读环境：
                <br />
                像专业考试一样刷题
              </h2>
              <ul className="space-y-8 mt-12">
                <FeatureItem
                  title="真题全库 1:1 还原"
                  desc="收录近 10 年历年真题，从界面排版到计时逻辑，完美还原 CBT 计算机考试环境。"
                />
                <FeatureItem
                  title="智能长难句拆解"
                  desc="AI 自动识别文中的复杂语法结构，一键拆解句子成分，让你秒懂文章深层含义。"
                />
                <FeatureItem
                  title="考点专项突破"
                  desc="不仅是练习。系统自动识别你的薄弱题型（如主旨、排序），智能推荐专项强化练习。"
                />
              </ul>
            </div>
            <div className="bg-k-bg rounded-[40px] p-12 border-2 border-k-ink/5 flex items-center justify-center">
              <div className="relative">
                <div className="absolute -inset-4 bg-k-crimson/5 rounded-[32px] blur-2xl" />
                <BookOpen size={180} className="text-k-ink relative opacity-10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-44 bg-white rounded-xl shadow-pop border border-k-ink/5 p-4 space-y-3">
                    <div className="h-2 w-full bg-k-bg rounded-full" />
                    <div className="h-2 w-2/3 bg-k-bg rounded-full" />
                    <div className="h-2 w-full bg-k-crimson/20 rounded-full" />
                    <div className="h-2 w-full bg-k-bg rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. TOPIK Listening */}
          <section className="grid md:grid-cols-2 gap-20 items-center">
            <div className="order-2 md:order-1 bg-k-ink rounded-[40px] p-12 overflow-hidden relative min-h-[400px] flex items-center justify-center">
              <div
                className="absolute top-0 left-0 w-full h-full opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <div className="relative z-10 flex flex-col items-center">
                <div className="flex gap-4 mb-8">
                  {[0.8, 1.0, 1.2, 1.5].map(v => (
                    <div
                      key={v}
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-[11px] font-black ${v === 1.0 ? 'bg-k-crimson border-k-crimson text-white shadow-lg' : 'border-white/20 text-white/40'}`}
                    >
                      {v}x
                    </div>
                  ))}
                </div>
                <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: ['0%', '100%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="h-full bg-k-crimson"
                  />
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <FeatureTag icon={<Headphones size={18} />} label="TOPIK LISTENING" color="#EB5757" />
              <h2 className="text-[36px] md:text-[52px] font-black text-k-ink mb-6 leading-tight">
                变速精听工作台：
                <br />
                驯服每一个发音
              </h2>
              <ul className="space-y-8 mt-12">
                <FeatureItem
                  title="无级变速控制"
                  desc="支持 0.5x 到 1.5x 变速播放。在 0.8x 下精准磨耳朵，在 1.2x 下挑战考场干扰，适应任何语速。"
                />
                <FeatureItem
                  title="音形同步脚本"
                  desc="听力原文随音频实时滚动，支持关键词高亮。点击原文即刻查词，真正做到听懂每一个单词。"
                />
                <FeatureItem
                  title="句子循环复读"
                  desc="一键开启当前句循环复读。针对听不清的连读、变音进行地毯式练习，直到完全听清为止。"
                />
              </ul>
            </div>
          </section>

          {/* 3. AI AI AI Section */}
          <section className="bg-k-crimson rounded-[48px] p-12 md:p-24 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/10 blur-[120px] -mr-48 -mt-48" />
            <div className="relative z-10">
              <FeatureTag icon={<Sparkles size={18} />} label="AI INTELLIGENCE" color="#F2D27A" />
              <div className="grid md:grid-cols-2 gap-16">
                <div>
                  <h2 className="text-[36px] md:text-[56px] font-black mb-8 leading-tight">
                    不仅是 AI，
                    <br />
                    更是你的考官
                  </h2>
                  <p className="text-[18px] opacity-80 leading-relaxed font-medium mb-12">
                    我们通过深度学习技术，将韩语考官的评分逻辑注入系统。为你提供不仅仅是简单的对错，而是深度的诊断。
                  </p>
                  <div className="space-y-8">
                    <div className="flex gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                        <MessageSquareQuote className="text-k-butter" size={28} />
                      </div>
                      <div>
                        <h4 className="text-[22px] font-black mb-2">四维写作批改</h4>
                        <p className="text-[15px] opacity-60 leading-relaxed">
                          针对 TOPIK 54
                          题长作文，从语法、词汇、结构、逻辑四个维度给出精准改进建议，助你突破写作瓶颈。
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                        <Target className="text-k-butter" size={28} />
                      </div>
                      <div>
                        <h4 className="text-[22px] font-black mb-2">全真分值预测</h4>
                        <p className="text-[15px] opacity-60 leading-relaxed">
                          基于你的每日练习数据与模考成绩，实时预测你的 TOPIK
                          等级概率，精准锁定备考盲区。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="relative w-full max-w-sm">
                    <div className="absolute -inset-10 bg-k-butter/20 blur-[60px] rounded-full animate-pulse" />
                    <Card tone="white" className="relative shadow-2xl p-10 text-k-ink">
                      <div className="flex justify-between items-center mb-8">
                        <span className="text-[12px] font-black uppercase tracking-widest text-k-sub">
                          AI Prediction
                        </span>
                        <Chip tone="crimson">PRO FEATURE</Chip>
                      </div>
                      <div className="space-y-8">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-[14px] font-bold">Overall Level</span>
                            <span className="text-[14px] font-black text-k-crimson">
                              TOPIK II · L5
                            </span>
                          </div>
                          <div className="h-3 w-full bg-k-bg rounded-full overflow-hidden">
                            <div className="h-full w-[82%] bg-k-crimson" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-k-bg rounded-2xl text-center">
                            <div className="text-[24px] font-k-serif font-bold">87</div>
                            <div className="text-[10px] font-black text-k-sub uppercase">
                              Reading
                            </div>
                          </div>
                          <div className="p-4 bg-k-bg rounded-2xl text-center">
                            <div className="text-[24px] font-k-serif font-bold">76</div>
                            <div className="text-[10px] font-black text-k-sub uppercase">
                              Listening
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="text-center pb-20">
            <h2 className="text-[32px] md:text-[64px] font-black text-k-ink mb-10 tracking-tighter">
              准备好在桌面端开启高效备考了吗？
            </h2>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <button
                onClick={() => navigate('/auth')}
                className="px-16 py-7 bg-k-crimson text-white rounded-[24px] text-[20px] font-black shadow-pop-lg hover:scale-105 active:scale-95 transition-all"
              >
                立即免费模考
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="px-16 py-7 bg-k-ink text-white rounded-[24px] text-[20px] font-black shadow-pop-lg hover:scale-105 active:scale-95 transition-all"
              >
                查看 Pro 计划
              </button>
            </div>
          </section>
        </div>
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
  <li className="flex gap-6">
    <div className="mt-1 w-6 h-6 rounded-full bg-k-crimson/10 flex items-center justify-center shrink-0">
      <CheckCircle2 size={16} className="text-k-crimson" />
    </div>
    <div>
      <h4 className="text-[20px] md:text-[24px] font-black text-k-ink mb-2">{title}</h4>
      <p className="text-[15px] md:text-[16px] font-medium text-k-sub opacity-70 leading-relaxed">
        {desc}
      </p>
    </div>
  </li>
);

export default TopikFeaturePage;
