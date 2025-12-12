import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { Institute, LevelConfig } from '../types';
import { getLabels } from '../utils/i18n';
import {
  Library,
  BookOpen,
  Star,
  Clock,
  Filter,
  ChevronDown
} from 'lucide-react';

const parseLevels = (levels: LevelConfig[] | number[]): LevelConfig[] => {
  if (!levels || levels.length === 0) return [];
  if (typeof levels[0] === 'number') {
    return (levels as number[]).map(l => ({ level: l, units: 10 }));
  }
  return levels as LevelConfig[];
};

// Fallback color scheme if no custom themeColor is provided
const getFallbackTheme = (name: string, coverUrl?: string) => {
  const themes = [
    { bg: '#e0f2fe', spine: '#1e3a8a', text: '#1e3a8a', accent: '#2563eb' }, // Blue
    { bg: '#e0e7ff', spine: '#312e81', text: '#312e81', accent: '#4f46e5' }, // Indigo
    { bg: '#d1fae5', spine: '#064e3b', text: '#064e3b', accent: '#059669' }, // Emerald
    { bg: '#ffe4e6', spine: '#881337', text: '#881337', accent: '#e11d48' }, // Rose
    { bg: '#fef3c7', spine: '#78350f', text: '#78350f', accent: '#d97706' }, // Amber
    { bg: '#ede9fe', spine: '#4c1d95', text: '#4c1d95', accent: '#7c3aed' }, // Violet
  ];

  // Use coverUrl as seed if available for variety
  const seed = coverUrl || name;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return themes[Math.abs(hash) % themes.length];
};

interface DashboardPageProps {
  canAccessContent: (content: any) => boolean;
  onShowUpgradePrompt: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ canAccessContent, onShowUpgradePrompt }) => {
  const { user, language, clearMistakes } = useAuth();
  const {
    selectedInstitute,
    setInstitute,
    selectedLevel,
    setLevel,
  } = useLearning();
  const { institutes, textbookContexts } = useData();
  const navigate = useNavigate();
  const labels = getLabels(language);

  const [filterInstituteId, setFilterInstituteId] = useState<string>('ALL');

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (selectedInstitute && selectedLevel) {
    return (
      <Dashboard
        user={user}
        institute={institutes.find(i => i.id === selectedInstitute)}
        level={selectedLevel}
        language={language}
        onChangeCourse={() => { setInstitute(''); setLevel(0); }}
        onOpenVocabBook={() => navigate('/dashboard/vocabulary?list=saved')}
        onOpenMistakeBook={() => navigate('/dashboard/vocabulary?list=mistakes')}
        onClearMistakes={clearMistakes}
        onStartModule={mod => {
          const contextKey = `${selectedInstitute}-${selectedLevel}-1`;
          const content = textbookContexts[contextKey];
          if (content && !canAccessContent(content)) { onShowUpgradePrompt(); return; }
          navigate(`/dashboard/${mod.toLowerCase()}`);
        }}
      />
    );
  }

  const allTextbooks = useMemo(() => {
    const all = institutes.flatMap(inst => {
      const levels = parseLevels(inst.levels);

      let spineColor, bgColor, textColor, accentColor;

      if ((inst as any).themeColor) {
        spineColor = (inst as any).themeColor;
        bgColor = `${(inst as any).themeColor}20`;
        textColor = (inst as any).themeColor;
        accentColor = (inst as any).themeColor;
      } else {
        const fallback = getFallbackTheme(inst.name, (inst as any).coverUrl);
        spineColor = fallback.spine;
        bgColor = fallback.bg;
        textColor = fallback.text;
        accentColor = fallback.accent;
      }

      return levels.map(lvl => ({
        id: `${inst.id}-${lvl.level}`,
        institute: inst,
        level: lvl.level,
        unitsCount: lvl.units,
        style: {
          spine: spineColor,
          bg: bgColor,
          text: textColor,
          accent: accentColor
        },
        isLastActive: user.lastInstitute === inst.id && user.lastLevel === lvl.level
      }));
    });

    if (filterInstituteId === 'ALL') {
      return all.sort((a, b) => (b.isLastActive ? 1 : 0) - (a.isLastActive ? 1 : 0));
    } else {
      return all.filter(book => book.institute.id === filterInstituteId);
    }
  }, [institutes, user.lastInstitute, user.lastLevel, filterInstituteId]);

  return (
    <div className="max-w-[1200px] mx-auto pb-20 px-4 sm:px-6">

      <div className="flex flex-col md:flex-row justify-between items-end mb-12 mt-8 gap-6">
        <div className="text-center md:text-left w-full md:w-auto">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center md:justify-start gap-3 font-serif">
            <Library className="w-8 h-8 text-indigo-600" />
            {labels.selectInstitute || '我的书架'}
          </h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">
            请选择一本教材，开始您的韩语学习之旅
          </p>
        </div>

        {/* 筛选按钮区域 */}
        <div className="relative group w-full md:w-auto z-20">
          {/* 悬停提示 (Tooltip) - 调整到下方，防止被顶部导航遮挡 */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl z-30">
            {language === 'zh' ? '按语学院筛选' : 'Filter by Institute'}
            {/* 小三角 (指向上面) */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800"></div>
          </div>

          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </div>
          <select
            value={filterInstituteId}
            onChange={(e) => setFilterInstituteId(e.target.value)}
            className="appearance-none w-full md:w-[200px] pl-10 pr-10 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
          >
            <option value="ALL">{language === 'zh' ? '全部语学院' : 'All Institutes'}</option>
            {institutes.map(inst => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </div>
        </div>
      </div>

      {allTextbooks.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
            <BookOpen className="w-10 h-10" />
          </div>
          <p className="text-slate-500 font-medium text-lg">
            {filterInstituteId !== 'ALL' ? '该语学院暂无教材数据。' : '书架空空如也，请联系管理员添加教材。'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12 px-4">
          {allTextbooks.map((book) => (
            <button
              key={book.id}
              onClick={() => {
                setInstitute(book.institute.id);
                setLevel(book.level);
              }}
              className="group relative flex flex-col items-center perspective-1000 outline-none"
            >
              {/* 书籍主体容器 */}
              <div
                className={`
                  relative w-full aspect-[3/4] 
                  rounded-r-lg rounded-l-sm 
                  shadow-lg group-hover:shadow-2xl 
                  transition-all duration-300 ease-out 
                  transform group-hover:-translate-y-3 group-hover:-translate-x-1 group-hover:rotate-y-[-5deg]
                  overflow-hidden
                  border-r-4 border-b-4 border-black/5
                `}
                style={{ backgroundColor: book.style.bg }}
              >
                {/* 1. 书脊效果 (加深颜色，增强立体感) */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-4 z-30 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.2)] opacity-90"
                  style={{ backgroundColor: book.style.spine }}
                ></div>
                <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-white/20 z-30"></div>

                {/* 2. 封面图片 (如果有) */}
                {(book.institute as any).coverUrl ? (
                  <img
                    src={(book.institute as any).coverUrl}
                    alt={book.institute.name}
                    className="absolute inset-0 w-full h-full object-cover z-20"
                  />
                ) : (
                  /* 3. 默认 CSS 极简封面 (无图片时显示) */
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none z-10"></div>

                    <div className="relative z-10 h-full flex flex-col justify-center items-center p-6 pl-10 text-center">
                      <h3
                        className="text-2xl font-black uppercase tracking-wider leading-snug font-serif break-words w-full drop-shadow-sm"
                        style={{ color: book.style.text }}
                      >
                        {book.institute.name}
                      </h3>
                      <div className="mt-4 w-12 h-1 rounded-full opacity-20" style={{ backgroundColor: book.style.text }}></div>
                    </div>
                  </>
                )}

                {/* 上次学习的标签 */}
                {book.isLastActive && (
                  <div className="absolute top-4 right-4 z-40 animate-bounce">
                    <div className="bg-white text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md border border-indigo-100 flex items-center gap-1 transform rotate-3">
                      <Clock className="w-3 h-3" />
                      继续
                    </div>
                  </div>
                )}

                {/* 新书标签 */}
                {!(book.institute as any).coverUrl && book.level === 1 && (
                  <div className="absolute top-0 right-0 z-20">
                    <div
                      className="absolute top-[-32px] right-[-32px] rotate-45 w-16 h-16"
                      style={{ backgroundColor: book.style.accent }}
                    ></div>
                    <div className="absolute top-1 right-1 text-white text-[10px] font-bold rotate-45">NEW</div>
                  </div>
                )}

              </div>

              {/* 阴影底座 */}
              <div className="w-[90%] h-4 bg-black/10 blur-md rounded-[100%] mt-[-5px] transition-all duration-300 group-hover:w-[95%] group-hover:bg-black/20 group-hover:blur-lg group-hover:translate-y-2"></div>

              {/* 书籍标题 */}
              <div className="mt-4 text-center">
                <h4 className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {book.institute.name}
                </h4>
                <p className="text-sm text-slate-400 font-medium">第 {book.level} 册</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-20 text-center border-t border-slate-200 pt-8">
        <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
          <Star className="w-4 h-4" />
          <span>找不到想学的教材？</span>
          <button className="text-indigo-600 font-bold hover:underline">联系我们添加</button>
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;
