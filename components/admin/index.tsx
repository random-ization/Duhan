import React, { useState } from 'react';
import {
  Institute,
  Language,
  TextbookContextMap,
  User,
  AdminStats,
  TextbookContent,
  TopikExam,
} from '../../types';
import DashboardView from './DashboardView';
import UserManagement from './UserManagement';
import ContentEditor from './ContentEditor';
import ExamEditor from './ExamEditor';
import { LayoutDashboard, Users, BookOpen, FileText } from 'lucide-react';

interface AdminPanelProps {
  institutes: Institute[];
  onUpdateInstitutes: (institutes: Institute[]) => void;
  onAddInstitute: (name: string) => void;
  onDeleteInstitute: (id: string) => void;
  textbookContexts: TextbookContextMap;
  onSaveContext: (key: string, content: TextbookContent) => void;
  language: Language;
  users: User[];
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
  stats: AdminStats;
  topikExams: TopikExam[];
  onUpdateTopikExam: (exam: TopikExam) => void;
  onAddTopikExam: (exam: TopikExam) => void;
  onDeleteTopikExam: (id: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  institutes,
  onUpdateInstitutes,
  onAddInstitute,
  onDeleteInstitute,
  textbookContexts,
  onSaveContext,
  language,
  users,
  onUpdateUser,
  onDeleteUser,
  stats,
  topikExams,
  onUpdateTopikExam,
  onAddTopikExam,
  onDeleteTopikExam,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'curriculum' | 'topik'>(
    'dashboard'
  );

  const tabs = [
    {
      id: 'dashboard' as const,
      label: { en: 'Dashboard', zh: '仪表板', vi: 'Bảng điều khiển', mn: 'Самбар' },
      icon: LayoutDashboard,
    },
    {
      id: 'users' as const,
      label: { en: 'Users', zh: '用户', vi: 'Người dùng', mn: 'Хэрэглэгчид' },
      icon: Users,
    },
    {
      id: 'curriculum' as const,
      label: { en: 'Curriculum', zh: '课程', vi: 'Giáo trình', mn: 'Хөтөлбөр' },
      icon: BookOpen,
    },
    {
      id: 'topik' as const,
      label: { en: 'TOPIK Exams', zh: 'TOPIK考试', vi: 'Kỳ thi TOPIK', mn: 'TOPIK шалгалт' },
      icon: FileText,
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">
            {language === 'en'
              ? 'Admin Panel'
              : language === 'zh'
                ? '管理面板'
                : language === 'vi'
                  ? 'Bảng quản trị'
                  : 'Админ самбар'}
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label[language]}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && <DashboardView stats={stats} language={language} />}
        {activeTab === 'users' && (
          <UserManagement
            users={users}
            language={language}
            onUpdateUser={onUpdateUser}
            onDeleteUser={onDeleteUser}
          />
        )}
        {activeTab === 'curriculum' && (
          <ContentEditor
            institutes={institutes}
            textbookContexts={textbookContexts}
            language={language}
            onSaveContext={onSaveContext}
          />
        )}
        {activeTab === 'topik' && (
          <ExamEditor
            topikExams={topikExams}
            language={language}
            onUpdateTopikExam={onUpdateTopikExam}
            onAddTopikExam={onAddTopikExam}
            onDeleteTopikExam={onDeleteTopikExam}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
