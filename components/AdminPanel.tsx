import React, { useState } from 'react';
import { BarChart3, Users, Book, GraduationCap, FileText } from 'lucide-react';
import { AdminPanelProps } from './admin/types';
import { getLabels } from '../utils/i18n';

// 引入拆分后的子组件
import DashboardView from './admin/DashboardView';
import UserManagement from './admin/UserManagement';
import ContentEditor from './admin/ContentEditor';
import ExamEditor from './admin/ExamEditor';
import LegalDocumentEditor from './admin/LegalDocumentEditor';

const AdminPanel: React.FC<AdminPanelProps> = props => {
  const {
    language,
    stats,
    users,
    onUpdateUser,
    onDeleteUser,
    institutes,
    onAddInstitute,
    onDeleteInstitute, // 确保这个 prop 传递给了 ContentEditor
    onUpdateInstitutes, // 确保这个 prop 传递给了 ContentEditor
    onUpdateInstitute,
    textbookContexts,
    onSaveContext,
    topikExams,
    onAddTopikExam,
    onUpdateTopikExam,
    onDeleteTopikExam,
  } = props;

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'users' | 'curriculum' | 'topik' | 'legal'
  >('dashboard');
  const labels = getLabels(language);

  // 侧边栏导航项配置
  const navItems = [
    { id: 'dashboard', label: labels.dashboardTab, icon: BarChart3 },
    { id: 'users', label: labels.usersTab, icon: Users },
    { id: 'curriculum', label: labels.curriculumTab, icon: Book },
    { id: 'topik', label: labels.topik, icon: GraduationCap },
    { id: 'legal', label: labels.legal, icon: FileText },
  ] as const;

  return (
    <div className="flex h-[calc(100vh-100px)] bg-slate-50 gap-6">
      {/* Navigation Sidebar */}
      <div className="w-48 flex flex-col gap-2 shrink-0">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center transition-colors ${isActive
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-500 hover:bg-white hover:text-indigo-600'
                }`}
            >
              <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto h-full">
        {activeTab === 'dashboard' && <DashboardView stats={stats} language={language} />}

        {activeTab === 'users' && (
          <UserManagement
            users={users}
            onUpdateUser={onUpdateUser}
            onDeleteUser={onDeleteUser}
            language={language}
          />
        )}

        {activeTab === 'curriculum' && (
          <ContentEditor
            institutes={institutes}
            onAddInstitute={onAddInstitute}
            onUpdateInstitute={onUpdateInstitute}
            onDeleteInstitute={onDeleteInstitute}
            // 注意：如果 ContentEditor 需要 onUpdateInstitutes，请确保在 types 中定义并传递
            // 目前 ContentEditor 主要使用 onAdd/onDelete 和选择
            textbookContexts={textbookContexts}
            onSaveContext={onSaveContext}
            language={language}
          />
        )}

        {activeTab === 'topik' && (
          <ExamEditor
            topikExams={topikExams}
            onAddTopikExam={onAddTopikExam}
            onUpdateTopikExam={onUpdateTopikExam}
            onDeleteTopikExam={onDeleteTopikExam}
            language={language}
          />
        )}

        {activeTab === 'legal' && <LegalDocumentEditor language={language} />}
      </div>
    </div>
  );
};

export default AdminPanel;
