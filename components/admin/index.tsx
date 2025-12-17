import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Institute,
  Language,
  TextbookContextMap,
  User,
  AdminStats,
  TextbookContent,
  TopikExam,
  LevelConfig,
} from '../../types';
import DashboardView from './DashboardView';
import UserManagement from './UserManagement';
import ContentEditor from './ContentEditor';
import ExamEditor from './ExamEditor';
import LegalDocumentEditor from './LegalDocumentEditor';
import { LayoutDashboard, Users, BookOpen, FileText, Scale } from 'lucide-react';

import { AdminPanelProps } from './types';

const AdminPanel: React.FC<AdminPanelProps> = ({
  institutes,
  onUpdateInstitutes,
  onAddInstitute,
  onUpdateInstitute,
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
  const { tab } = useParams<{ tab?: string }>();
  const activeTab = (tab || 'dashboard') as 'dashboard' | 'users' | 'curriculum' | 'topik' | 'legal';

  const tabs = [
    {
      id: 'dashboard' as const,
      path: '/admin',
      label: { en: 'Dashboard', zh: '仪表板', vi: 'Bảng điều khiển', mn: 'Самбар' },
      icon: LayoutDashboard,
    },
    {
      id: 'users' as const,
      path: '/admin/users',
      label: { en: 'Users', zh: '用户', vi: 'Người dùng', mn: 'Хэрэглэгчид' },
      icon: Users,
    },
    {
      id: 'curriculum' as const,
      path: '/admin/curriculum',
      label: { en: 'Curriculum', zh: '课程', vi: 'Giáo trình', mn: 'Хөтөлбөр' },
      icon: BookOpen,
    },
    {
      id: 'topik' as const,
      path: '/admin/topik',
      label: { en: 'TOPIK Exams', zh: 'TOPIK考试', vi: 'Kỳ thi TOPIK', mn: 'TOPIK шалгалт' },
      icon: FileText,
    },
    {
      id: 'legal' as const,
      path: '/admin/legal',
      label: { en: 'Legal', zh: '法律条款', vi: 'Pháp lý', mn: 'Хууль эрх зүй' },
      icon: Scale,
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
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <Link
                key={t.id}
                to={t.path}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{t.label[language]}</span>
              </Link>
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
            onAddInstitute={onAddInstitute}
            onUpdateInstitute={onUpdateInstitute}
            onDeleteInstitute={onDeleteInstitute}
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
        {activeTab === 'legal' && (
          <LegalDocumentEditor language={language} />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
