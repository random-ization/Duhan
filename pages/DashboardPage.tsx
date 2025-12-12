import React, { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { Institute, LevelConfig } from '../types';
import { getLabels } from '../utils/i18n';
import {
  BookOpen,
  Library,
  ArrowRight,
  GraduationCap,
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
    { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', icon: 'text-blue-500', hover: 'group-hover:border-blue-300' },
    { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', icon: 'text-indigo-500', hover: 'group-hover:border-indigo-300' },
    { bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-700', icon: 'text-violet-500', hover: 'group-hover:border-violet-300' },
    { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-500', hover: 'group-hover:border-emerald-300' },
    { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', icon: 'text-rose-500', hover: 'group-hover:border-rose-300' },
    { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', icon: 'text-amber-500', hover: 'group-hover:border-amber-300' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return themes[Math.abs(hash) % themes.length];
};

// 辅助函数：获取难度标签
const getDifficultyLabel = (level: number) => {
  if (level <= 2) return { text: 'Beginner', color: 'bg-green-100 text-green-700' };
  if (level <= 4) return { text: 'Intermediate', color: 'bg-yellow-100 text-yellow-700' };
  return { text: 'Advanced', color: 'bg-red-100 text-red-700' };
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
          // 简单的权限检查逻辑 (可扩展)
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

  // 3. 核心重构：扁平化所有教材列表
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

  // 将"上次学习"的教材排在最前面
  allTextbooks.sort((a, b) => (b.isLastActive ? 1 : 0) - (a.isLastActive ? 1 : 0));

  // --- 4. 渲染：书架视图 (Bookshelf View) ---
  return (
    <div className="max-w-[1200px] mx-auto pb-20 px-4 sm:px-6">

      {/* 顶部欢迎区 */}
      <div className="mb-10 mt-4">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <Library className="w-8 h-8 text-indigo-600" />
          {labels.selectInstitute || '我的书架'}
        </h1>
        <p className="text-slate-500 mt-2 text-lg">
          选择一本教材开始今天的学习吧。
        </p>
      </div>

      {/* 书籍网格 */}
      {allTextbooks.length === 0 ? (
        // 空状态
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <BookOpen className="w-8 h-8" />
          </div>
          <p className="text-slate-500 font-medium">暂无教材数据，请联系管理员添加。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allTextbooks.map((book) => {
            const difficulty = getDifficultyLabel(book.level);

            return (
              <button
                key={book.id}
                onClick={() => {
                  setInstitute(book.institute.id);
                  setLevel(book.level);
                }}
                className={`group relative flex flex-col h-full bg-white rounded-3xl border transition-all duration-300 text-left overflow-hidden
                  ${book.isLastActive
                    ? 'border-indigo-200 shadow-xl shadow-indigo-100 ring-2 ring-indigo-500 ring-offset-2'
                    : 'border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-slate-300'
                  }
                `}
              >
                {/* 书籍封面装饰区 */}
                <div className={`h-32 ${book.theme.bg} p-6 relative overflow-hidden`}>
                  {/* 背景装饰图案 */}
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full ${book.theme.bg} brightness-90 -mr-10 -mt-10 blur-2xl`}></div>
                  <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full ${book.theme.bg} brightness-90 -ml-10 -mb-10 blur-xl`}></div>

                  {/* 书籍元信息 */}
                  <div className="relative z-10 flex justify-between items-start">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white/80 backdrop-blur-sm ${difficulty.color} shadow-sm`}>
                      {difficulty.text}
                    </span>
                    {book.isLastActive && (
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-md animate-pulse">
                        <Clock className="w-3 h-3" /> 继续学习
                      </span>
                    )}
                  </div>

                  {/* 装饰图标 */}
                  <div className={`absolute -bottom-4 -right-4 opacity-10 transform rotate-12 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`}>
                    <GraduationCap className={`w-32 h-32 ${book.theme.text}`} />
                  </div>
                </div>

                {/* 书籍内容区 */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-slate-900 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {book.institute.name}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-800">Level {book.level}</span>
                      <span className="text-sm text-slate-500 font-medium">({book.unitsCount} 课)</span>
                    </div>
                  </div>

                  {/* 底部信息栏 */}
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <BookOpen className="w-4 h-4" />
                      <span>标准课程</span>
                    </div>
                    <div className={`flex items-center font-bold ${book.theme.text} opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300`}>
                      开始 <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </div>

                {/* 悬停时的光效 */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/20 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500"></div>
              </button>
            );
          })}
        </div>
      )}

      {/* 底部提示 */}
      <div className="mt-12 text-center">
        <p className="text-slate-400 text-sm">
          找不到想学的教材？
          <button className="text-indigo-600 font-bold hover:underline ml-1">联系我们添加</button>
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;
