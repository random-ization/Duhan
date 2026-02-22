import React, { useState } from 'react';
import VocabDashboard from '../../components/admin/VocabDashboard';
import VocabImporter from '../../components/admin/VocabImporter';
import GrammarImporter from '../../components/admin/GrammarImporter';
import ReadingImporter from '../../components/admin/ReadingImporter';
import TopikImporter from '../../components/admin/TopikImporter';
import TopikWritingImporter from '../../components/admin/TopikWritingImporter';
import NewsPipelinePanel from '../../components/admin/NewsPipelinePanel';
import { ReadingContentManager } from '../../components/admin/ReadingContentManager';
import { ListeningContentManager } from '../../components/admin/ListeningContentManager';
import { GrammarManager } from '../../components/admin/GrammarManager';
import { InstituteManager } from '../../components/admin/InstituteManager';
import { TopikManager } from '../../components/admin/TopikManager';
import { UserManagement } from '../../components/admin/UserManagement';
import { AdminDashboard } from '../../components/admin/AdminDashboard';
import LegalDocumentEditor from '../../components/admin/LegalDocumentEditor';
import VideoManager from '../../components/admin/VideoManager';
import { TypingManager } from './TypingManager';
import {
  Book,
  Database,
  LayoutDashboard,
  FileSpreadsheet,
  GraduationCap,
  Library,
  BarChart3,
  ClipboardCheck,
  Users,
  Headphones,
  FileText,
  Video,
  Activity,
  BookOpen,
  Type,
} from 'lucide-react';

// --- Sub-components for Tabs ---

interface SubTabProps {
  activeSubTab: string;
  onSubTabChange: (tab: any) => void;
  items: { id: string; label: string; icon: React.ReactNode }[];
  children: React.ReactNode;
}

const SubTabLayout: React.FC<SubTabProps> = ({ activeSubTab, onSubTabChange, items, children }) => (
  <div>
    <div className="flex gap-4 mb-6">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onSubTabChange(item.id)}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold border-2 transition-all ${
            activeSubTab === item.id
              ? 'bg-zinc-900 border-zinc-900 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,0.3)]'
              : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
    <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-[6px_6px_0px_0px_#18181B] overflow-hidden min-h-[600px]">
      {children}
    </div>
  </div>
);

const ReadingTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'manage' | 'import' | 'news'>('manage');
  return (
    <SubTabLayout
      activeSubTab={subTab}
      onSubTabChange={setSubTab}
      items={[
        { id: 'manage', label: '阅读管理', icon: <Book className="w-5 h-5" /> },
        { id: 'import', label: '批量导入', icon: <FileSpreadsheet className="w-5 h-5" /> },
        { id: 'news', label: '新闻数据源', icon: <Activity className="w-5 h-5" /> },
      ]}
    >
      {subTab === 'manage' && <ReadingContentManager />}
      {subTab === 'import' && <ReadingImporter />}
      {subTab === 'news' && <NewsPipelinePanel />}
    </SubTabLayout>
  );
};

const GrammarTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'manage' | 'import'>('manage');
  return (
    <SubTabLayout
      activeSubTab={subTab}
      onSubTabChange={setSubTab}
      items={[
        { id: 'manage', label: '语法管理', icon: <BookOpen className="w-5 h-5" /> },
        { id: 'import', label: '批量导入', icon: <FileSpreadsheet className="w-5 h-5" /> },
      ]}
    >
      {subTab === 'manage' ? <GrammarManager /> : <GrammarImporter />}
    </SubTabLayout>
  );
};

const TopikTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'manage' | 'import' | 'writing'>('manage');
  return (
    <SubTabLayout
      activeSubTab={subTab}
      onSubTabChange={setSubTab}
      items={[
        { id: 'manage', label: '试卷管理', icon: <ClipboardCheck className="w-5 h-5" /> },
        { id: 'import', label: '批量导入', icon: <FileSpreadsheet className="w-5 h-5" /> },
        { id: 'writing', label: '写作上传', icon: <FileText className="w-5 h-5" /> },
      ]}
    >
      {subTab === 'manage' && <TopikManager />}
      {subTab === 'import' && <TopikImporter />}
      {subTab === 'writing' && <TopikWritingImporter />}
    </SubTabLayout>
  );
};

const VocabTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'dashboard' | 'import'>('dashboard');
  return (
    <SubTabLayout
      activeSubTab={subTab}
      onSubTabChange={setSubTab}
      items={[
        { id: 'dashboard', label: '资产大盘', icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: 'import', label: '智能导入', icon: <FileSpreadsheet className="w-5 h-5" /> },
      ]}
    >
      {subTab === 'dashboard' ? <VocabDashboard /> : <VocabImporter />}
    </SubTabLayout>
  );
};

type AdminTab =
  | 'dashboard'
  | 'users'
  | 'vocab'
  | 'reading'
  | 'listening'
  | 'grammar'
  | 'institute'
  | 'topik'
  | 'legal'
  | 'video'
  | 'diagnostics'
  | 'typing';

interface TabButtonProps {
  id: AdminTab;
  activeTab: AdminTab;
  onClick: (id: AdminTab) => void;
  icon: React.ElementType;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ id, activeTab, onClick, icon: Icon, label }) => {
  const active = activeTab === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
        active
          ? 'border-zinc-900 text-zinc-900'
          : 'border-transparent text-zinc-400 hover:text-zinc-600'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
};

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'dashboard', label: '数据看板', icon: BarChart3 },
    { id: 'users', label: '用户', icon: Users },
    { id: 'institute', label: '教材', icon: Library },
    { id: 'reading', label: '阅读', icon: Book },
    { id: 'listening', label: '听力', icon: Headphones },
    { id: 'grammar', label: '语法', icon: GraduationCap },
    { id: 'vocab', label: '词汇', icon: Database },
    { id: 'topik', label: 'TOPIK', icon: ClipboardCheck },
    { id: 'legal', label: '法律', icon: FileText },
    { id: 'video', label: '视频', icon: Video },
    { id: 'diagnostics', label: '诊断', icon: Activity },
    { id: 'typing', label: '打字', icon: Type },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <UserManagement />;
      case 'institute':
        return <InstituteManager />;
      case 'reading':
        return <ReadingTab />;
      case 'listening':
        return <ListeningContentManager />;
      case 'grammar':
        return <GrammarTab />;
      case 'vocab':
        return <VocabTab />;
      case 'topik':
        return <TopikTab />;
      case 'legal':
        return <LegalDocumentEditor />;
      case 'video':
        return <VideoManager />;
      case 'typing':
        return <TypingManager />;
      case 'diagnostics':
        return (
          <div className="bg-white p-8 rounded-2xl border-2 border-zinc-900 shadow-[6px_6px_0px_0px_#18181B]">
            <h2 className="text-xl font-bold mb-4">系统诊断</h2>
            <p className="text-zinc-500">诊断模块正在开发中...</p>
          </div>
        );
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-zinc-900 mb-1">管理后台</h1>
        <p className="text-zinc-500 font-medium">内容生产与数据库管理中心</p>
      </header>

      {/* Main Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-200 overflow-x-auto">
        {tabs.map(tab => (
          <TabButton
            key={tab.id}
            id={tab.id}
            activeTab={activeTab}
            onClick={setActiveTab}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </div>

      {/* Content Area */}
      <div>{renderContent()}</div>
    </div>
  );
};

export default AdminPage;
