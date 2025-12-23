import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Book, BookOpen, Headphones, Sparkles,
    ChevronLeft, Bookmark, AlertCircle, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';

export default function CourseDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedInstitute, selectedLevel } = useLearning();
    const { institutes } = useData();

    // Find current institute info
    const currentInstitute = institutes.find(i => i.id === selectedInstitute);
    const instituteName = currentInstitute?.name || 'Selected Course';

    const modules = [
        {
            ignore: false,
            id: 'vocabulary',
            label: '词汇学习',
            desc: '单词卡片、测验和拼写练习。',
            icon: Book,
            color: 'text-green-600',
            bg: 'bg-green-50',
            border: 'border-green-100',
            iconBg: 'bg-green-100',
            path: '/dashboard/vocabulary'
        },
        {
            ignore: false,
            id: 'reading',
            label: '阅读训练',
            desc: '包含即时翻译和标注功能的文章。',
            icon: BookOpen,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            iconBg: 'bg-blue-100',
            path: '/dashboard/reading'
        },
        {
            ignore: false,
            id: 'listening',
            label: '听力训练',
            desc: '带有交互式脚本的音频练习。',
            icon: Headphones,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'border-purple-100',
            iconBg: 'bg-purple-100',
            path: '/dashboard/listening'
        },
        {
            ignore: false,
            id: 'grammar',
            label: '语法解析',
            desc: 'AI 智能分析的语法点和例句。',
            icon: Sparkles,
            color: 'text-yellow-600',
            bg: 'bg-yellow-50',
            border: 'border-yellow-100',
            iconBg: 'bg-yellow-100',
            path: '/dashboard/grammar'
        }
    ];

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-10">
                <button
                    onClick={() => navigate('/courses')}
                    className="flex items-center text-slate-400 hover:text-indigo-600 transition-colors mb-2 text-sm font-bold"
                >
                    <ChevronLeft size={16} className="mr-1" />
                    切换课程
                </button>
                <h1 className="text-3xl font-black text-slate-800 flex items-baseline gap-3">
                    {instituteName} <span className="text-indigo-600">Level {selectedLevel || 1}</span>
                </h1>
                <p className="text-slate-500 font-medium mt-1">Continue where you left off in your curriculum.</p>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {modules.map((m) => {
                    const Icon = m.icon;
                    return (
                        <div
                            key={m.id}
                            onClick={() => navigate(m.path)}
                            className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-pop hover:border-indigo-500 hover:-translate-y-1 transition cursor-pointer group h-64 flex flex-col justify-between relative overflow-hidden"
                        >
                            <div>
                                <div className={`w-14 h-14 ${m.iconBg} rounded-2xl flex items-center justify-center mb-6`}>
                                    <Icon className={`w-7 h-7 ${m.color}`} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{m.label}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{m.desc}</p>
                            </div>
                            <div className="flex items-center text-sm font-bold text-slate-300 group-hover:text-indigo-600 transition-colors">
                                开始学习 <ChevronRight size={16} className="ml-1" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Review Section */}
            <h2 className="text-xl font-black text-slate-800 mb-6">复习与练习</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Notebook Card */}
                <div
                    onClick={() => navigate('/notebook')}
                    className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-300 transition cursor-pointer flex items-center justify-between group"
                >
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                            <Book size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg font-bold text-slate-900">生词本</h3>
                                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {user?.savedWords?.length || 0} items
                                </span>
                            </div>
                            <p className="text-slate-500 text-sm">复习您手动保存的单词。</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition">
                        <ChevronRight size={20} />
                    </div>
                </div>

                {/* Mistakes Card */}
                <div
                    onClick={() => navigate('/dashboard/vocabulary?list=mistakes')}
                    className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 hover:border-red-300 transition cursor-pointer flex items-center justify-between group"
                >
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                            <AlertCircle size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg font-bold text-slate-900">错题本</h3>
                                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {(user?.mistakes || []).length} items
                                </span>
                            </div>
                            <p className="text-slate-500 text-sm">练习您答错的单词。</p>
                        </div>
                    </div>
                    <button className="px-6 py-2 bg-slate-100 text-slate-400 font-bold rounded-xl text-sm group-hover:bg-indigo-600 group-hover:text-white transition flex items-center gap-2">
                        开始复习
                    </button>
                </div>

            </div>
        </div>
    );
}
