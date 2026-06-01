import React from 'react';
import {
  ArrowLeft,
  FileText,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { PageShell, Card, HanjaSeal, Chip } from '../../components/mobile/ksoft/ksoft';
import { motion } from 'framer-motion';
import { SEO as Seo } from '../../seo/SEO';
import { getRouteMeta } from '../../seo/publicRoutes';
import { useLocation } from 'react-router-dom';

const ReadingFeaturePage: React.FC = () => {
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
            <HanjaSeal c="讀" size={32} bg="#3D4A6B" color="white" round={8} />
            <span className="hidden md:block text-[12px] font-black tracking-[0.3em] text-k-ink uppercase">
              K-Soft · Graded Reading
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
            className="inline-flex items-center gap-3 px-4 py-1.5 bg-[#3D4A6B]/10 rounded-full mb-8"
          >
            <GraduationCap className="text-[#3D4A6B]" size={16} />
            <span className="text-[11px] font-black text-[#3D4A6B] uppercase tracking-[0.2em]">
              Step-by-Step Mastery
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[48px] md:text-[80px] font-black text-k-ink leading-[1.05] tracking-[-0.04em] mb-8"
          >
            从零到精读，
            <br className="hidden md:block" />
            读懂 <span className="text-k-crimson italic font-k-serif">更广阔</span> 的韩语世界
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-3xl mx-auto text-[18px] md:text-[22px] font-medium text-k-sub leading-relaxed opacity-80"
          >
            阅读不应是查字典的苦旅。K-Soft 为你提供从 L1 到 L6 的科学分级素材，结合 AI
            实时解析与背景知识库，让你在享受阅读的同时，词汇量与语感飞速增长。
          </motion.p>
        </header>

        {/* Graded Library Interface Preview */}
        <section className="max-w-7xl mx-auto px-6 mb-32">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar: Level Selector */}
            <div className="w-full lg:w-64 space-y-3">
              <div className="text-[11px] font-black text-k-sub uppercase tracking-widest mb-4">
                Select Level
              </div>
              {[1, 2, 3, 4, 5, 6].map(lvl => (
                <div
                  key={lvl}
                  className={`p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all ${lvl === 3 ? 'bg-k-ink text-white shadow-lg' : 'bg-white text-k-ink hover:bg-k-bg border border-k-ink/5'}`}
                >
                  <span className="text-[14px] font-black uppercase">Level {lvl}</span>
                  <ChevronRight size={16} className={lvl === 3 ? 'text-k-butter' : 'opacity-20'} />
                </div>
              ))}
            </div>

            {/* Main Content: Article Preview */}
            <Card
              pad={0}
              className="flex-1 shadow-pop-lg overflow-hidden border border-k-ink/5 bg-white"
            >
              <div className="p-10 md:p-16">
                <div className="mb-10 flex items-center gap-4">
                  <Chip tone="crimson">LEVEL 3</Chip>
                  <span className="text-[14px] font-bold text-k-sub tracking-tight">
                    2024年5月12日 · 社会新闻
                  </span>
                </div>
                <h2 className="text-[32px] md:text-[42px] font-black text-k-ink mb-12 font-k-serif">
                  서울의 숲에서 열리는 특별한 음악회
                </h2>

                <div className="space-y-10 text-[18px] md:text-[21px] leading-[2.0] text-k-ink font-medium">
                  <div className="relative group">
                    <p>
                      이번 주말 서울의 숲에서는 시민들을 위한{' '}
                      <span className="bg-[#F2D27A]/30 px-1 border-b-2 border-[#F2D27A] cursor-pointer">
                        다채로운
                      </span>{' '}
                      야외 음악회가 열립니다.
                    </p>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      className="absolute left-0 -bottom-16 z-20 p-4 bg-white shadow-pop-lg rounded-xl border border-[#F2D27A] flex gap-4 pointer-events-none"
                    >
                      <div className="w-1 h-auto bg-[#F2D27A] rounded-full" />
                      <div>
                        <div className="text-[12px] font-black text-[#F2D27A] uppercase mb-1">
                          다채롭다 · 形容词
                        </div>
                        <div className="text-[15px] font-bold">多种多样的、丰富多彩的</div>
                      </div>
                    </motion.div>
                  </div>
                  <p className="opacity-40">
                    이번 음악회는 지역 사회의 화합을 위해 기획되었으며, 다양한 장르의 음악가들이
                    참여하여 관객들에게 잊지 못할 추억을 선사할 예정입니다...
                  </p>
                </div>

                <div className="mt-20 pt-10 border-t border-k-bg flex flex-wrap gap-12">
                  <div>
                    <div className="text-[11px] font-black text-k-sub uppercase mb-2">
                      Reading Time
                    </div>
                    <div className="text-[20px] font-black text-k-ink">4.2 min</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-k-sub uppercase mb-2">
                      New Vocab
                    </div>
                    <div className="text-[20px] font-black text-k-crimson">12 cards</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-k-sub uppercase mb-2">
                      Difficulty
                    </div>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${i <= 3 ? 'bg-[#F2D27A]' : 'bg-k-bg'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="max-w-7xl mx-auto px-6 space-y-32">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <FeatureTag icon={<Sparkles size={18} />} label="AI ANALYSIS" color="#F2C94C" />
              <h2 className="text-[32px] md:text-[48px] font-black text-k-ink mb-6 leading-tight">
                AI 智能提词：
                <br />
                哪里不会点哪里
              </h2>
              <p className="text-[18px] text-k-sub opacity-70 leading-relaxed mb-10">
                不再需要频繁切换查词软件。我们的 AI
                会自动扫描全文，提前为你预判并标注生词，通过一键翻译和深度例句解析，扫清阅读障碍。
              </p>
              <ul className="space-y-6">
                <FeatureItem
                  title="划词即翻译"
                  desc="双击任何单词、词组甚至整个句子，AI 瞬间为你提供最地道的解释与变位参考。"
                />
                <FeatureItem
                  title="背景知识百科"
                  desc="遇到特定的人名、地名或文化专有名词？AI 实时提供背景信息，助你深度理解内容。"
                />
                <FeatureItem
                  title="长难句一键剖析"
                  desc="遇到看不懂的超长句子？AI 自动划分成分，解析语法点，让句意一目了然。"
                />
              </ul>
            </div>
            <div className="relative group">
              <div className="absolute -inset-10 bg-[#3D4A6B]/5 rounded-[60px] blur-3xl" />
              <Card
                tone="#3D4A6B"
                className="relative shadow-2xl p-12 text-white overflow-hidden min-h-[400px] flex flex-col justify-center"
              >
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/5 blur-[80px] -mr-20 -mt-20" />
                <FileText size={48} className="text-[#F2D27A] mb-8" />
                <h3 className="text-[28px] font-black mb-4">从新闻到绘本</h3>
                <p className="text-[16px] opacity-60 leading-relaxed">
                  我们提供全方位的素材库：实时新闻、世界名著、韩国儿童绘本，满足从初学者到母语级水平的所有阅读需求。
                </p>
                <div className="mt-10 flex gap-4">
                  <Chip tone="muted">News</Chip>
                  <Chip tone="muted">Folklore</Chip>
                  <Chip tone="muted">Children&apos;s</Chip>
                </div>
              </Card>
            </div>
          </div>

          {/* Final CTA */}
          <div className="bg-k-ink rounded-[48px] p-12 md:p-24 text-center text-white">
            <h2 className="text-[32px] md:text-[56px] font-black mb-8 leading-tight tracking-tighter">
              开始你的第一篇韩语精读
            </h2>
            <p className="max-w-2xl mx-auto text-[18px] md:text-[21px] font-medium opacity-60 leading-relaxed mb-12">
              分级阅读不仅是为了词汇量，更是为了通过阅读了解韩国的社会与文化。加入
              K-Soft，享受阅读的乐趣。
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="px-16 py-7 bg-[#F2D27A] text-k-ink rounded-[24px] text-[18px] font-black shadow-pop-lg hover:scale-105 active:scale-95 transition-all"
            >
              免费体验分级阅读
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

export default ReadingFeaturePage;
