import React, { useState } from 'react';
import VocabDashboard from '../../../components/admin/VocabDashboard';
import VocabImporter from '../../../components/admin/VocabImporter';
import { ReadingContentManager } from '../../components/admin/ReadingContentManager';
import { ListeningContentManager } from '../../components/admin/ListeningContentManager';
import { GrammarManager } from '../../components/admin/GrammarManager';
import { InstituteManager } from '../../components/admin/InstituteManager';
import { TopikManager } from '../../components/admin/TopikManager';
import { UserManagement } from '../../components/admin/UserManagement';
import { DashboardView } from '../../components/admin/DashboardView';
import LegalDocumentEditor from '../../../components/admin/LegalDocumentEditor';
import { Book, Database, LayoutDashboard, FileSpreadsheet, GraduationCap, Library, BarChart3, ClipboardCheck, Users, Headphones, FileText } from 'lucide-react';

const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'vocab' | 'reading' | 'listening' | 'grammar' | 'institute' | 'topik' | 'legal'>('dashboard');
    const [vocabSubTab, setVocabSubTab] = useState<'dashboard' | 'import'>('dashboard');

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-zinc-900 mb-1">管理后台</h1>
                <p className="text-zinc-500 font-medium">内容生产与数据库管理中心</p>
            </header>

            {/* Main Tabs */}
            <div className="flex gap-1 mb-6 border-b border-zinc-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${activeTab === 'dashboard'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <BarChart3 size={16} />
                    数据看板
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${activeTab === 'users'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <Users size={16} />
                    用户
                </button>
                <button
                    onClick={() => setActiveTab('institute')}
                    className={`px-4 py-2 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${activeTab === 'institute'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <Library size={16} />
                    教材
                </button>
                <button
                    onClick={() => setActiveTab('reading')}
                    className={`px-4 py-2 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${activeTab === 'reading'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <Book size={16} />
                    阅读
                </button>
                <button
                    onClick={() => setActiveTab('listening')}
                    className={`px-4 py-2 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${activeTab === 'listening'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <Headphones size={16} />
                    听力
                </button>
                <button
                    onClick={() => setActiveTab('grammar')}
                    className={`px-4 py-2 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${activeTab === 'grammar'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <GraduationCap size={16} />
                    语法
                </button>
                <button
                    onClick={() => setActiveTab('vocab')}
                    className={`px-4 py-2 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${activeTab === 'vocab'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <Database size={16} />
                    词汇
                </button>
                <button
                    onClick={() => setActiveTab('topik')}
                    className={`px-4 py-2 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${activeTab === 'topik'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <ClipboardCheck size={16} />
                    TOPIK
                </button>
                <button
                    onClick={() => setActiveTab('legal')}
                    className={`px-4 py-2 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${activeTab === 'legal'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <FileText size={16} />
                    法律
                </button>
            </div>

            {/* Content Area */}
            <div>
                {activeTab === 'dashboard' ? (
                    <DashboardView />
                ) : activeTab === 'users' ? (
                    <UserManagement />
                ) : activeTab === 'institute' ? (
                    <InstituteManager />
                ) : activeTab === 'reading' ? (
                    <ReadingContentManager />
                ) : activeTab === 'listening' ? (
                    <ListeningContentManager />
                ) : activeTab === 'grammar' ? (
                    <GrammarManager />
                ) : activeTab === 'topik' ? (
                    <TopikManager />
                ) : activeTab === 'legal' ? (
                    <LegalDocumentEditor language="zh" />
                ) : (
                    <div>
                        {/* Vocab Sub-tabs */}
                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => setVocabSubTab('dashboard')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold border-2 transition-all ${vocabSubTab === 'dashboard'
                                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,0.3)]'
                                    : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900'
                                    }`}
                            >
                                <LayoutDashboard className="w-5 h-5" />
                                资产大盘
                            </button>
                            <button
                                onClick={() => setVocabSubTab('import')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold border-2 transition-all ${vocabSubTab === 'import'
                                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,0.3)]'
                                    : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900'
                                    }`}
                            >
                                <FileSpreadsheet className="w-5 h-5" />
                                智能导入
                            </button>
                        </div>

                        {/* Vocab Content */}
                        <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-[6px_6px_0px_0px_#18181B] overflow-hidden min-h-[600px]">
                            {vocabSubTab === 'dashboard' ? <VocabDashboard /> : <VocabImporter />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;

