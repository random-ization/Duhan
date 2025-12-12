import React, { useMemo } from 'react';
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
  GraduationCap,
  Star,
  Clock
} from 'lucide-react';

// 辅助函数：解析等级配置
const parseLevels = (levels: LevelConfig[] | number[]): LevelConfig[] => {
  if (!levels || levels.length === 0) return [];
  if (typeof levels[0] === 'number') {
    return (levels as number[]).map(l => ({ level: l, units: 10 }));
  }
  return levels as LevelConfig[];
};

// 辅助函数：根据学校名称生成确定性的主题色
const getThemeColor = (name: string) => {
  const themes = [
    {
      bg: 'bg-blue-100',
      spine: 'bg-blue-300',
      text: 'text-blue-900',
      accent: 'bg-blue-600',
    },
    {
      bg: 'bg-indigo-100',
      spine: 'bg-indigo-300',
      text: 'text-indigo-900',
      accent: 'bg-indigo-600',
    },
    {
      bg: 'bg-emerald-100',
      spine: 'bg-emerald-300',
      text: 'text-emerald-900',
      accent: 'bg-emerald-600',
    },
    {
      bg: 'bg-rose-100',
      spine: 'bg-rose-300',
      text: 'text-rose-900',
      accent: 'bg-rose-600',
    },
    {
      bg: 'bg-amber-100',
      spine: 'bg-amber-300',
      text: 'text-amber-900',
      accent: 'bg-amber-600',
    },
    {
      bg: 'bg-violet-100',
      spine: 'bg-violet-300',
      text: 'text-violet-900',
      accent: 'bg-violet-600',
    },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
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

  // 1. 如果未登录，重定向
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 2. 如果已经选中了具体课程，渲染详细 Dashboard
  if (selectedInstitute && selectedLevel) {
    return (
      <Dashboard
        user={user}
        institute={institutes.find(i => i.id === selectedInstitute)}
        level={selectedLevel}
        language={language}
        onChangeCourse={() => {
          setInstitute('');
          setLevel(0);
        }}
        onOpenVocabBook={() => {
          navigate('/dashboard/vocabulary?list=saved');
        }}
        onOpenMistakeBook={() => {
          navigate('/dashboard/vocabulary?list=mistakes');
        }}
        onClearMistakes={clearMistakes}
        onStartModule={mod => {
          const contextKey = `${selectedInstitute}-${selectedLevel}-1`;
          const content = textbookContexts[contextKey];

          if (content && !canAccessContent(content)) {
            onShowUpgradePrompt();
            return;
          }
          navigate(`/dashboard/${mod.toLowerCase()}`);
        }}
      />
    );
  }

  // 3. 核心数据准备
  const allTextbooks = institutes.flatMap(inst => {
    const levels = parseLevels(inst.levels);
    return levels.map(lvl => ({
      id: `${inst.id}-${lvl.level}`,
      institute: inst,
      level: lvl.level,
      unitsCount: lvl.units,
      theme: getThemeColor(inst.name),
      isLastActive: user.lastInstitute === inst.id && user.lastLevel === lvl.level
    }));
  });

  allTextbooks.sort((a, b) => (b.isLastActive ? 1 : 0) - (a.isLastActive ? 1 : 0));

  // --- 4. 渲染：书架视图 (Bookshelf View) ---
  return (
    <div className="max-w-[1200px] mx-auto pb-20 px-4 sm:px-6">

      {/* 顶部欢迎区 */}
      <div className="mb-12 mt-8 text-center">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-3 font-serif">
          <Library className="w-10 h-10 text-indigo-600" />
          {labels.selectInstitute || '我的书架'}
        </h1>
        <p className="text-slate-500 mt-3 text-lg font-medium">
          请选择一本教材，开始您的韩语学习之旅
        </p>
      </div>

      {/* 书籍网格 */}
      {allTextbooks.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
            <BookOpen className="w-10 h-10" />
          </div>
          <p className="text-slate-500 font-medium text-lg">书架空空如也，请联系管理员添加教材。</p>
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
                  ${book.theme.bg}
                  border-r-4 border-b-4 border-black/5
                `}
              >
                {/* 1. 书脊效果 (始终显示，提供立体感) */}
                <div className={`absolute left-0 top-0 bottom-0 w-3 ${book.theme.spine} z-30 shadow-inner opacity-80`}></div>
                <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-white/30 z-30"></div>

                {/* 2. 封面图片 (如果有) */}
                {(book.institute as any).coverUrl ? (
                  <img
                    src={(book.institute as any).coverUrl}
                    alt={book.institute.name}
                    className="absolute inset-0 w-full h-full object-cover z-20"
                  />
                ) : (
                  /* 3. 默认 CSS 封面 (如果没有图片) */
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none z-10"></div>

                    <div className="relative z-10 h-full flex flex-col p-6 pl-8">
                      <div className="border-b-2 border-black/10 pb-3 mb-4">
                        <h3 className={`text-lg font-bold ${book.theme.text} uppercase tracking-wider leading-tight`}>
                          {book.institute.name}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 opacity-70 mt-1 uppercase tracking-widest">
                          Korean Language Institute
                        </p>
                      </div>

                      <div className="flex-1 flex flex-col justify-center items-center relative">
                        <div className="absolute w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full border border-white/50"></div>
                        </div>

                        <span className={`text-8xl font-black ${book.theme.text} drop-shadow-sm relative z-10 font-serif`}>
                          {book.level}
                        </span>
                        <span className="text-xs font-bold bg-white/60 px-3 py-1 rounded-full backdrop-blur-sm mt-[-10px] relative z-20 uppercase tracking-widest text-slate-700 shadow-sm">
                          Level
                        </span>
                      </div>

                      <div className="mt-auto pt-4 border-t border-white/40 flex justify-between items-end opacity-80">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-600">STANDARD</span>
                          <span className="text-[10px] font-bold text-slate-600">TEXTBOOK</span>
                        </div>
                        <GraduationCap className={`w-8 h-8 ${book.theme.text} opacity-50`} />
                      </div>
                    </div>
                  </>
                )}

                {/* 上次学习的标签 (贴在封面顶层) */}
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
                    <div className={`w-16 h-16 ${book.theme.accent} absolute top-[-32px] right-[-32px] rotate-45`}></div>
                    <div className="absolute top-1 right-1 text-white text-[10px] font-bold rotate-45">NEW</div>
                  </div>
                )}

              </div>

              {/* 阴影底座 */}
              <div className="w-[90%] h-4 bg-black/10 blur-md rounded-[100%] mt-[-5px] transition-all duration-300 group-hover:w-[95%] group-hover:bg-black/20 group-hover:blur-lg group-hover:translate-y-2"></div>

              {/* 书籍标题 */}
              <div className="mt-4 text-center">
                <h4 className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
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
