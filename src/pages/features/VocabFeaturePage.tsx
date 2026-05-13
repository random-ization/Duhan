import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Brain, 
  Layers, 
  ShieldCheck, 
  Zap, 
  BarChart, 
  Search, 
  CheckCircle2, 
  BookMarked,
  Sparkles,
  MousePointer2,
  Clock
} from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { PageShell, Card, HanjaSeal, KT, Chip } from '../../components/mobile/ksoft/ksoft';
import { motion } from 'framer-motion';
import { SEO as Seo } from '../../seo/SEO';
import { getRouteMeta } from '../../seo/publicRoutes';
import { useLocation } from 'react-router-dom';

const VocabFeaturePage: React.FC = () => {
  const { t } = useTranslation();
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
            <HanjaSeal c="詞" size={32} bg="#F2D27A" color="white" round={8} />
            <span className="hidden md:block text-[12px] font-black tracking-[0.3em] text-k-ink uppercase">K-Soft · Vocab Intelligence</span>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-40">
        {/* Hero Section */}
        <header className="max-w-7xl mx-auto px-6 mb-24 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 px-4 py-1.5 bg-[#F2D27A]/20 rounded-full mb-8"
          >
            <Brain className="text-k-ink" size={16} />
            <span className="text-[11px] font-black text-k-ink uppercase tracking-[0.2em]">FSRS Algorithm Driven</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[48px] md:text-[80px] font-black text-k-ink leading-[1.05] tracking-[-0.04em] mb-8"
          >
            不再遗忘，<br className="hidden md:block"/>
            用 <span className="text-k-crimson italic font-k-serif">科学</span> 驯服每一个单词
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-3xl mx-auto text-[18px] md:text-[22px] font-medium text-k-sub leading-relaxed opacity-80"
          >
            K-Soft 采用最先进的 FSRS 记忆算法。它能像人类大脑一样理解你的遗忘规律，在最关键的时刻提醒你复习，让记忆效率提升 300% 以上。
          </motion.p>
        </header>

        {/* Practice Modes Grid */}
        <section className="max-w-7xl mx-auto px-6 mb-32">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ModeCard 
              icon={<Layers size={24} />} 
              title="闪卡模式" 
              desc="快速过滤熟词，专注于那些真正需要攻克的难点。"
              color="#F2D27A"
            />
            <ModeCard 
              icon={<BookMarked size={24} />} 
              title="深度学习" 
              desc="结合例句、发音与语境，全方位吃透单词内涵。"
              color="#BFE0CF"
            />
            <ModeCard 
              icon={<CheckCircle2 size={24} />} 
              title="限时测试" 
              desc="模拟考场压力，在毫秒级反应中检验你的真实掌握度。"
              color="#F4C5C5"
            />
            <ModeCard 
              icon={<Sparkles size={24} />} 
              title="连连看模式" 
              desc="在游戏化的交互中，轻松巩固词义映射，适合碎片时间。"
              color="#3D4A6B"
              dark
            />
          </div>
        </section>

        {/* FSRS Visual Section */}
        <section className="max-w-7xl mx-auto px-6 mb-32">
          <div className="bg-k-ink rounded-[48px] p-12 md:p-20 text-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            <div className="relative z-10 grid md:grid-cols-2 gap-20 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full mb-6">
                  <BarChart size={14} className="text-k-crimson" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Memory Retention Stats</span>
                </div>
                <h2 className="text-[36px] md:text-[48px] font-black mb-8 leading-tight">FSRS 算法：<br/>懂你的遗忘，更懂你的努力</h2>
                <p className="text-[18px] opacity-60 leading-relaxed mb-10">
                  传统的艾宾浩斯曲线已经过时了。FSRS 算法根据你的每一次反馈动态调整复习间隔。对于简单的词，它会果断推迟；对于难词，它会精准覆盖。
                </p>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-[14px] font-bold">长期记忆保留率达 95% 以上</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-k-crimson" />
                    <span className="text-[14px] font-bold">平均每日节省 40% 的无效复习时间</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <Card tone="white" className="p-8 text-k-ink shadow-2xl">
                   <div className="flex justify-between items-end mb-8">
                      <div>
                        <div className="text-[11px] font-black text-k-sub uppercase mb-1">Current Word</div>
                        <div className="text-[24px] font-k-serif font-bold text-k-ink">기대하다</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-black text-k-sub uppercase mb-1">Memory Strength</div>
                        <div className="text-[20px] font-black text-k-crimson">82%</div>
                      </div>
                   </div>
                   <div className="h-32 flex items-end gap-2 mb-6">
                      {[30, 45, 60, 40, 75, 82].map((h, i) => (
                        <motion.div 
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          className="flex-1 bg-k-bg rounded-t-lg relative group"
                        >
                          <div className={`absolute inset-0 rounded-t-lg transition-opacity ${i === 5 ? 'bg-k-crimson' : 'bg-k-ink opacity-20'}`} />
                        </motion.div>
                      ))}
                   </div>
                   <div className="flex justify-between text-[10px] font-black text-k-sub">
                      <span>DAY 1</span>
                      <span>DAY 7</span>
                      <span>DAY 14</span>
                      <span>TODAY</span>
                   </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Feature List */}
        <section className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20">
          <div>
            <h3 className="text-[28px] font-black text-k-ink mb-10">不只是单词，更是语境</h3>
            <ul className="space-y-8">
              <ListItem 
                title="深度词典集成" 
                desc="内置 Naver / Daum 权威解释，点击即可查看详尽的释义与动词变位。"
              />
              <ListItem 
                title="真题例句关联" 
                desc="自动关联该单词在 TOPIK 历年真题中出现的句子，让你在实战中理解用法。"
              />
              <ListItem 
                title="点词入卡" 
                desc="在阅读或听力中发现生词？只需长按或点击，即可瞬间加入你的词汇本。"
              />
            </ul>
          </div>
          <div>
            <h3 className="text-[28px] font-black text-k-ink mb-10">管理你的词库</h3>
            <ul className="space-y-8">
              <ListItem 
                title="智能标签分类" 
                desc="根据教材、难度或个人兴趣自动打标签，支持自定义词册管理。"
              />
              <ListItem 
                title="全平台同步" 
                desc="在电脑上录入，在通勤路上复习。进度实时同步，学习永不间断。"
              />
              <ListItem 
                title="学习报表分析" 
                desc="清晰掌握你的词汇量增长曲线，看到自己的每一份进步。"
              />
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center mt-32">
          <h2 className="text-[32px] md:text-[56px] font-black text-k-ink mb-10">开始建立你的终身词库</h2>
          <button 
            onClick={() => navigate('/auth')}
            className="px-16 py-7 bg-k-ink text-white rounded-[24px] text-[18px] font-black shadow-pop-lg hover:scale-105 active:scale-95 transition-all"
          >
            立即免费开始
          </button>
        </section>
      </div>
    </PageShell>
  );
};

const ModeCard: React.FC<{ icon: React.ReactNode; title: string; desc: string; color: string; dark?: boolean }> = ({ icon, title, desc, color, dark }) => (
  <Card tone={color} className={`p-8 h-full border border-k-ink/5 transition-transform hover:-translate-y-2 ${dark ? 'text-white' : 'text-k-ink'}`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${dark ? 'bg-white/10' : 'bg-k-ink/5'}`}>{icon}</div>
    <h4 className="text-[20px] font-black mb-3">{title}</h4>
    <p className={`text-[14px] font-medium leading-relaxed ${dark ? 'opacity-60' : 'opacity-70'}`}>{desc}</p>
  </Card>
);

const ListItem: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <li className="flex gap-4">
    <CheckCircle2 size={20} className="text-k-crimson shrink-0 mt-1" />
    <div>
      <h4 className="text-[18px] font-black text-k-ink mb-1">{title}</h4>
      <p className="text-[14px] font-medium text-k-sub opacity-70 leading-relaxed">{desc}</p>
    </div>
  </li>
);

export default VocabFeaturePage;
