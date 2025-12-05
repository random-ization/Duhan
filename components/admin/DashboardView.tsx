import React from 'react';
import { AdminStats, Language } from '../../types';
import { Users, BookOpen, FileText, Sparkles } from 'lucide-react';

interface DashboardViewProps {
  stats: AdminStats;
  language: Language;
}

const DashboardView: React.FC<DashboardViewProps> = ({ stats, language }) => {
  const labels = {
    en: {
      totalUsers: 'Total Users',
      totalTextbooks: 'Textbooks',
      totalExams: 'TOPIK Exams',
      activeLearners: 'Active Learners',
    },
    zh: {
      totalUsers: '总用户数',
      totalTextbooks: '教材数',
      totalExams: 'TOPIK考试',
      activeLearners: '活跃学习者',
    },
    vi: {
      totalUsers: 'Tổng người dùng',
      totalTextbooks: 'Sách giáo khoa',
      totalExams: 'Kỳ thi TOPIK',
      activeLearners: 'Người học tích cực',
    },
    mn: {
      totalUsers: 'Нийт хэрэглэгчид',
      totalTextbooks: 'Сурах бичиг',
      totalExams: 'TOPIK шалгалт',
      activeLearners: 'Идэвхтэй суралцагчид',
    },
  };

  const t = labels[language];

  const statCards = [
    {
      label: t.totalUsers,
      value: stats.totalUsers,
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
    },
    {
      label: t.totalTextbooks,
      value: stats.totalTextbooks,
      icon: BookOpen,
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100',
    },
    {
      label: t.totalExams,
      value: stats.totalTopikExams,
      icon: FileText,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
    },
    {
      label: t.activeLearners,
      value: stats.activeLearners,
      icon: Sparkles,
      gradient: 'from-amber-500 to-amber-600',
      bgGradient: 'from-amber-50 to-amber-100',
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {language === 'en'
          ? 'Admin Dashboard'
          : language === 'zh'
            ? '管理员仪表板'
            : language === 'vi'
              ? 'Bảng điều khiển quản trị'
              : 'Админ самбар'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`bg-gradient-to-br ${card.bgGradient} rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-lg flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {card.value.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-gray-600">{card.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardView;
