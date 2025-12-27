import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Flame, Clock, BookOpen, Target, Loader2 } from 'lucide-react';

interface SummaryStats {
    streak: number;
    todayMinutes: number;
    dailyGoal: number;
    wordsToReview: number;
}

export const LearnerSummaryCard: React.FC = () => {
    const [stats, setStats] = useState<SummaryStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const response = await api.getMyStats();
            if (response.success) {
                setStats({
                    streak: response.data.streak,
                    todayMinutes: response.data.todayMinutes,
                    dailyGoal: response.data.dailyGoal,
                    wordsToReview: response.data.wordsToReview
                });
            }
        } catch (e) {
            console.error('Failed to load summary stats', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white h-40 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin opacity-50" />
            </div>
        );
    }

    if (!stats) return null;

    const progressPercent = Math.min(100, (stats.todayMinutes / stats.dailyGoal) * 100);

    return (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">今日学习概览</h3>
                <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                    <Flame className="w-4 h-4 text-orange-300" />
                    <span className="font-bold">{stats.streak} 天连续</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-1 opacity-80">
                    <span>今日进度</span>
                    <span>{stats.todayMinutes} / {stats.dailyGoal} 分钟</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-lime-300 to-emerald-300 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4 opacity-70" />
                        <span className="text-2xl font-black">{stats.todayMinutes}</span>
                    </div>
                    <span className="text-xs opacity-70">分钟</span>
                </div>
                <div className="text-center border-x border-white/20">
                    <div className="flex items-center justify-center gap-1">
                        <BookOpen className="w-4 h-4 opacity-70" />
                        <span className="text-2xl font-black">{stats.wordsToReview}</span>
                    </div>
                    <span className="text-xs opacity-70">待复习</span>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                        <Target className="w-4 h-4 opacity-70" />
                        <span className="text-2xl font-black">{Math.round(progressPercent)}%</span>
                    </div>
                    <span className="text-xs opacity-70">目标完成</span>
                </div>
            </div>

            {progressPercent >= 100 && (
                <div className="mt-3 text-center bg-white/20 rounded-lg py-2 font-bold">
                    ✨ 今日目标已完成！
                </div>
            )}
        </div>
    );
};

export default LearnerSummaryCard;
