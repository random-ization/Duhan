import React, { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { BookOpen, GraduationCap } from 'lucide-react';
import { getLabels } from '../utils/i18n';

interface DashboardPageProps {
  canAccessContent: (content: any) => boolean;
  onShowUpgradePrompt: () => void;
}

// 获取等级标签
const getLevelTag = (level: number): { label: string; color: string } | null => {
  if (level <= 2) return { label: '初级', color: 'bg-green-100 text-green-700' };
  if (level <= 4) return { label: '中级', color: 'bg-amber-100 text-amber-700' };
  if (level <= 6) return { label: '高级', color: 'bg-red-100 text-red-700' };
  return null;
};

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

  // 生成扁平化的课本列表
  const textbooks = useMemo(() => {
    const books: { instituteId: string; instituteName: string; level: number }[] = [];

    institutes.forEach(inst => {
      // 处理 levels 可能是数组或 LevelConfig[] 的情况
      const levelNumbers = Array.isArray(inst.levels)
        ? inst.levels.map(l => typeof l === 'number' ? l : l.level)
        : [1, 2, 3, 4, 5, 6]; // 默认 6 级

      levelNumbers.forEach(level => {
        books.push({
          instituteId: inst.id,
          instituteName: inst.name,
          level,
        });
      });
    });

    return books;
  }, [institutes]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 已选择课本 - 显示单元列表视图
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
          // Check if content requires payment
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

  // ========== 选择课本视图 (一步选书) ==========
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-indigo-600" />
          {labels.selectTextbook || '选择教材'}
        </h2>
        <p className="text-slate-500">
          {labels.selectTextbookDesc || '点击下方教材开始学习'}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {textbooks.map((book) => {
          const levelTag = getLevelTag(book.level);

          return (
            <button
              key={`${book.instituteId}-${book.level}`}
              onClick={() => {
                setInstitute(book.instituteId);
                setLevel(book.level);
              }}
              className="group bg-white p-5 rounded-xl shadow-sm border border-slate-200 
                         hover:shadow-lg hover:border-indigo-400 hover:-translate-y-1
                         transition-all duration-200 text-left relative overflow-hidden"
            >
              {/* 等级标签 */}
              {levelTag && (
                <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${levelTag.color}`}>
                  {levelTag.label}
                </span>
              )}

              {/* 图标 */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 
                              flex items-center justify-center mb-4 
                              group-hover:from-indigo-500 group-hover:to-purple-500 transition-all">
                <GraduationCap className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
              </div>

              {/* 标题 */}
              <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-indigo-600 transition-colors">
                {book.instituteName} {book.level}
              </h3>

              {/* 副标题 */}
              <p className="text-xs text-slate-400">
                {book.level <= 2 ? 'Beginner' : book.level <= 4 ? 'Intermediate' : 'Advanced'}
              </p>

              {/* Hover 提示 */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 
                              transform translate-y-full group-hover:translate-y-0 transition-transform" />
            </button>
          );
        })}
      </div>

      {/* 空状态 */}
      {textbooks.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>{labels.noTextbooks || '暂无可用教材'}</p>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
