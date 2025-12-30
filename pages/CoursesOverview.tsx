import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// import { useData } from '../contexts/DataContext';
import { BookOpen, Lock, BarChart3, Search } from 'lucide-react';
import { Institute } from '../types';
import BackButton from '../components/ui/BackButton';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const CoursesOverview: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth(); // Keeping for future use or user validation

    // 1. Fetch Data using Convex
    const courses = useQuery(api.institutes.getAll);
    const isLoading = courses === undefined;

    const [selectedPublisher, setSelectedPublisher] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // 2. Extract Publishers
    const publishers = useMemo(() => {
        if (!courses) return [];

        const uniquePublishers = Array.from(new Set(
            courses
                .map((c: any) => c.publisher)
                .filter((p: any): p is string => !!p && p.trim() !== '')
        ));

        return [
            { id: 'ALL', label: '全部' },
            ...uniquePublishers.map((p: string) => ({ id: p, label: p }))
        ];
    }, [courses]);

    // 3. Filter Logic
    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        return courses.filter((course: any) => {
            // 3.1 Publisher Filter
            if (selectedPublisher !== 'ALL' && course.publisher !== selectedPublisher) {
                return false;
            }
            // 3.2 Search Filter (Title, Level, Publisher)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const titleMatch = course.name.toLowerCase().includes(query);
                const levelMatch = course.displayLevel?.toLowerCase().includes(query);
                const publisherMatch = course.publisher?.toLowerCase().includes(query);
                if (!titleMatch && !levelMatch && !publisherMatch) return false;
            }
            return true;
        });
    }, [courses, selectedPublisher, searchQuery]);

    return (
        <div className="w-full h-full p-6 md:p-10 relative">
            {/* Background Texture */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-50 pointer-events-none"></div>

            {/* --- Header --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="flex items-start gap-4">
                    <BackButton onClick={() => navigate('/dashboard')} />
                    <div>
                        <h1 className="font-display text-4xl font-black text-slate-900 mb-2 tracking-tight">
                            选择教材 📚
                        </h1>
                        <p className="text-slate-500 font-medium">
                            {isLoading ? '加载中...' : `共收录 ${courses?.length || 0} 本教材，选择一本开始学习`}
                        </p>
                    </div>
                </div>

                {/* Search Box */}
                <div className="relative w-full md:w-72 group">
                    <input
                        type="text"
                        placeholder="搜索教材名称..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-slate-900 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-white/80 backdrop-blur-sm placeholder:text-slate-400"
                    />
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-slate-900 transition-colors" />
                </div>
            </div>

            {/* --- Publisher Tabs --- */}
            {publishers.length > 1 && (
                <div className="mb-8 overflow-x-auto pb-4 scrollbar-hide">
                    <div className="inline-flex bg-white border-2 border-slate-900 rounded-full p-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        {publishers.map((pub: any) => (
                            <button
                                key={pub.id}
                                onClick={() => setSelectedPublisher(pub.id)}
                                className={`
                  px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all duration-200
                  ${selectedPublisher === pub.id
                                        ? 'bg-slate-900 text-white shadow-md'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                    }
                `}
                            >
                                {pub.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* --- Books Grid --- */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-12">
                {isLoading ? (
                    // Loading Skeletons
                    [1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="aspect-[3/4] bg-slate-100 rounded-[2rem] border-2 border-slate-200 animate-pulse"></div>
                    ))
                ) : filteredCourses.length > 0 ? (
                    filteredCourses.map((course: any) => {
                        const isLocked = false; // Add logic if needed
                        return (
                            <div
                                key={course._id || course.id} // Support both Convex _id and legacy id
                                onClick={() => !isLocked && navigate(`/course/${course.id || course.postgresId}`)} // Use legacy ID for routing compatibility if needed
                                className={`
                  group relative flex flex-col aspect-[3/4] bg-white 
                  rounded-[1.5rem] border-2 border-slate-900 
                  transition-all duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
                  ${isLocked
                                        ? 'opacity-80 cursor-not-allowed grayscale-[0.8]'
                                        : 'cursor-pointer hover:-translate-y-2 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                                    }
                `}
                            >
                                {/* --- Cover Area (65%) --- */}
                                <div className="h-[65%] w-full relative overflow-hidden border-b-2 border-slate-900 rounded-t-[1.5rem] bg-slate-50">
                                    {course.coverUrl ? (
                                        <img
                                            src={course.coverUrl}
                                            alt={course.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        // Default Cover
                                        <div
                                            className="w-full h-full flex flex-col items-center justify-center relative p-6 text-center"
                                            style={{ backgroundColor: course.themeColor || '#E0F2FE' }}
                                        >
                                            <BookOpen className="w-16 h-16 text-black/20 mb-2 group-hover:scale-110 transition-transform duration-300" />
                                            <span className="font-display font-black text-3xl text-black/10 absolute bottom-[-10px] right-[-10px] rotate-[-15deg] select-none">
                                                {course.name.substring(0, 2)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Level Badge */}
                                    {course.displayLevel && (
                                        <div className="absolute top-3 right-3 bg-white border-2 border-slate-900 px-2 py-0.5 rounded-lg text-[10px] font-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] z-20">
                                            {course.displayLevel}
                                        </div>
                                    )}

                                    {/* Lock Overlay */}
                                    {isLocked && (
                                        <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[2px] z-30">
                                            <div className="bg-[#FEE500] text-black px-4 py-2 rounded-xl font-bold border-2 border-black -rotate-6 shadow-lg flex items-center gap-2">
                                                <Lock className="w-4 h-4" /> 需订阅
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* --- Info Area (35%) --- */}
                                <div className="flex-1 p-4 flex flex-col justify-between">
                                    <div>
                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {course.publisher && (
                                                <span className="inline-block bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                                                    {course.publisher}
                                                </span>
                                            )}
                                            {course.volume && (
                                                <span className="inline-block bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded text-[9px] font-bold text-yellow-700">
                                                    {course.volume}
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3 className="font-bold text-sm text-slate-900 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                                            {course.name}
                                        </h3>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-auto pt-2">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1">
                                            <span className="flex items-center gap-0.5">
                                                <BarChart3 className="w-2.5 h-2.5" /> 进度
                                            </span>
                                            <span>0%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 border border-slate-200 rounded-full overflow-hidden">
                                            <div className="bg-slate-900 h-full w-0"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    // Empty State
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-2 border-slate-200">
                            <BookOpen className="w-8 h-8 opacity-30" />
                        </div>
                        <p className="font-medium">没有找到相关教材</p>
                        <p className="text-sm">请尝试其他关键词或联系管理员</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoursesOverview;
