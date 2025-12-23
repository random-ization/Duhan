import React, { useState } from 'react';
import { Bell, FolderHeart, Plus, PlusCircle, Folder, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NoteCard from '../components/notebook/NoteCard';
import { AnimatePresence, motion } from 'framer-motion';

export default function NotebookPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeFolder, setActiveFolder] = useState<string | null>(null);

    // Dynamic Data
    const totalWords = user?.savedWords?.length || 0;
    // Mock logic for demo purposes (can be replaced with real spaced-repetition logic later)
    const masteredCount = Math.floor(totalWords * 0.3);
    const dueToday = Math.min(12, totalWords);

    // If a folder is selected, show the list (Note: reusing the previous list logic/components could be good here, 
    // but for now I'll just keep the Lobby as requested. 
    // If the user wants to see the words, we can implement a "Folder Detail" view later or conditionally render here.)
    // For this step, I focus on the "Lobby" design requested.

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Memo.png" className="w-14 h-14" alt="memo" />
                <div>
                    <h1 className="text-4xl font-black font-display text-slate-900">单词仓库</h1>
                    <p className="text-slate-500 font-bold">你的知识储备库</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-100 p-4 rounded-2xl border-2 border-green-200 text-center">
                    <div className="text-3xl font-black text-green-700">{masteredCount}</div>
                    <div className="text-xs font-bold text-green-600 uppercase">已掌握</div>
                </div>
                <div className="bg-yellow-100 p-4 rounded-2xl border-2 border-yellow-200 text-center shadow-pop hover:-translate-y-1 transition">
                    <div className="text-3xl font-black text-yellow-700 flex items-center justify-center gap-2">
                        {dueToday} <Bell size={16} className="animate-bounce" />
                    </div>
                    <div className="text-xs font-bold text-yellow-600 uppercase">今日待复习</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 text-center">
                    <div className="text-3xl font-black text-slate-700">{totalWords}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase">总词汇量</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 text-center flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:text-indigo-600 transition group">
                    <PlusCircle size={24} className="mb-1 text-slate-300 group-hover:text-indigo-500" />
                    <div className="text-xs font-bold text-slate-400 uppercase group-hover:text-indigo-600">添加生词</div>
                </div>
            </div>

            {/* Folders */}
            <div>
                <h3 className="font-black text-xl mb-4 text-slate-800">单词本分类</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {/* Default Folder: My Words */}
                    <div className="bg-white p-5 rounded-[1.5rem] border-2 border-slate-900 shadow-pop cursor-pointer hover:-translate-y-2 transition group relative overflow-hidden">
                        <FolderHeart size={64} className="absolute -right-4 -bottom-4 text-slate-100 group-hover:text-indigo-50 transition transform rotate-12" />
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <h4 className="font-black text-xl text-slate-900">我的生词本</h4>
                                <p className="text-slate-500 text-xs font-bold mt-1">{totalWords} 个单词</p>
                            </div>
                            <div className="mt-4 flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            </div>
                        </div>
                    </div>

                    {/* TOPIK I Folder */}
                    <div className="bg-white p-5 rounded-[1.5rem] border-2 border-slate-900 shadow-sm hover:shadow-pop hover:-translate-y-2 transition cursor-pointer group relative overflow-hidden">
                        <Folder size={64} className="absolute -right-4 -bottom-4 text-slate-100 group-hover:text-indigo-50 transition transform rotate-12" />
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <h4 className="font-black text-xl text-slate-900">TOPIK I 核心词</h4>
                                <p className="text-slate-500 text-xs font-bold mt-1">800 个单词</p>
                            </div>
                            <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 w-[30%] h-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* Create New */}
                    <div className="bg-slate-50 border-2 border-slate-200 border-dashed rounded-[1.5rem] flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-white hover:border-indigo-400 transition min-h-[140px]">
                        <Plus className="text-slate-400 mb-2 group-hover:text-indigo-400" />
                        <span className="font-bold text-slate-400 text-sm group-hover:text-indigo-500">新建分类</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
