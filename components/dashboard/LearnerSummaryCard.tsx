import React, { useState, useEffect } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Flame, Clock, BookOpen, Target, Loader2 } from 'lucide-react';
import { BentoCard } from './BentoCard';

interface SummaryStats {
    streak: number;
    todayMinutes: number;
    dailyGoal: number;
    dailyProgress: number;
    wordsToReview: number;
}

export const LearnerSummaryCard: React.FC = () => {
    // Convex Integration
    const userStats = useQuery(api.userStats.getStats);

    const stats = userStats ? {
        streak: userStats.streak,
        todayMinutes: userStats.dailyMinutes,
        dailyGoal: userStats.dailyGoal,
        dailyProgress: userStats.dailyProgress,
        wordsToReview: userStats.todayActivities.wordsLearned
    } : null;

    /* Legacy fetch removed
    const loadStats = async () => { ... }
    */

    if (loading) {
        return (
            <BentoCard bgClass="bg-indigo-50" className="flex items-center justify-center min-h-[220px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </BentoCard>
        );
    }

    if (!stats) {
        return (
            <BentoCard bgClass="bg-red-50" className="flex items-center justify-center min-h-[220px]">
                <div className="text-center">
                    <p className="font-bold text-red-500">无法加载数据</p>
                    <p className="text-xs text-red-400 mt-1">请刷新重试</p>
                </div>
            </BentoCard>
        );
    }

    const progressPercent = stats.dailyProgress;

    return (
        <BentoCard bgClass="bg-indigo-50" className="flex flex-col justify-between h-full bg-indigo-50" borderClass="border-slate-900" >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <div className="text-xs font-black text-indigo-500 uppercase tracking-wider mb-1">Overview</div>
                    <h3 className="font-black text-2xl text-slate-900 leading-none">今日概览</h3>
                </div>
                <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border-2 border-slate-900 shadow-sm">
                    <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                    <span className="font-bold text-slate-900 text-sm">{stats.streak} 天</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>今日进度</span>
                    <span>{stats.todayMinutes} / {stats.dailyGoal} min</span>
                </div>
                <div className="h-4 bg-white rounded-full border-2 border-slate-900 overflow-hidden relative">
                    <div
                        className="h-full bg-indigo-500 rounded-r-none transition-all duration-500 border-r-2 border-slate-900"
                        style={{ width: `${progressPercent}%` }}
                    />
                    {/* Pattern Overlay */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "4px 4px" }} />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mt-auto">
                <div className="text-center bg-white rounded-xl py-2 border-2 border-slate-900 shadow-sm">
                    <div className="text-2xl font-black text-slate-900 leading-none mb-1">{stats.todayMinutes}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">分钟</div>
                </div>
                <div className="text-center bg-white rounded-xl py-2 border-2 border-slate-900 shadow-sm">
                    <div className="text-2xl font-black text-slate-900 leading-none mb-1">{stats.wordsToReview}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">待复习</div>
                </div>
                <div className={`text-center rounded-xl py-2 border-2 border-slate-900 shadow-sm ${progressPercent >= 100 ? 'bg-indigo-500 text-white' : 'bg-white text-slate-900'}`}>
                    <div className="text-2xl font-black leading-none mb-1">{Math.round(progressPercent)}%</div>
                    <div className={`text-[10px] font-bold uppercase ${progressPercent >= 100 ? 'text-indigo-200' : 'text-slate-400'}`}>达成</div>
                </div>
            </div>
        </BentoCard>
    );
};

export default LearnerSummaryCard;
