import React, { useState } from 'react';
import VocabDashboard from '../../../components/admin/VocabDashboard';
import VocabImporter from '../../../components/admin/VocabImporter';
import { ReadingContentManager } from '../../components/admin/ReadingContentManager';
import { GrammarManager } from '../../components/admin/GrammarManager';
import { InstituteManager } from '../../components/admin/InstituteManager';
import { DashboardView } from '../../components/admin/DashboardView';
import { Book, Database, ArrowLeft, LayoutDashboard, FileSpreadsheet, GraduationCap, Library, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'vocab' | 'reading' | 'grammar' | 'institute'>('dashboard');
    const [vocabSubTab, setVocabSubTab] = useState<'dashboard' | 'import'>('dashboard');
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-8">
            <header className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-white border-2 border-zinc-900 rounded-lg flex items-center justify-center hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 shadow-[3px_3px_0px_0px_#18181B] active:shadow-none transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-zinc-900 mb-1">管理后台</h1>
                        <p className="text-zinc-500 font-medium">内容生产与数据库管理中心</p>
                    </div>
                </div>
            </header>

            {/* Main Tabs */}
            <div className="flex gap-4 mb-6 border-b-2 border-zinc-200 pb-1">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-6 py-3 font-black text-lg flex items-center gap-2 border-b-4 transition-all ${activeTab === 'dashboard'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <BarChart3 size={20} />
                    数据看板
                </button>
                <button
                    onClick={() => setActiveTab('institute')}
                    className={`px-6 py-3 font-black text-lg flex items-center gap-2 border-b-4 transition-all ${activeTab === 'institute'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <Library size={20} />
                    教材管理
                </button>
                <button
                    onClick={() => setActiveTab('reading')}
                    className={`px-6 py-3 font-black text-lg flex items-center gap-2 border-b-4 transition-all ${activeTab === 'reading'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <Book size={20} />
                    阅读文章管理
                </button>
                <button
                    onClick={() => setActiveTab('grammar')}
                    className={`px-6 py-3 font-black text-lg flex items-center gap-2 border-b-4 transition-all ${activeTab === 'grammar'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <GraduationCap size={20} />
                    语法管理
                </button>
                <button
                    onClick={() => setActiveTab('vocab')}
                    className={`px-6 py-3 font-black text-lg flex items-center gap-2 border-b-4 transition-all ${activeTab === 'vocab'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                >
                    <Database size={20} />
                    词汇数据库
                </button>
            </div>

            {/* Content Area */}
            <div>
                {activeTab === 'dashboard' ? (
                    <DashboardView />
                ) : activeTab === 'institute' ? (
                    <InstituteManager />
                ) : activeTab === 'reading' ? (
                    <ReadingContentManager />
                ) : activeTab === 'grammar' ? (
                    <GrammarManager />
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

