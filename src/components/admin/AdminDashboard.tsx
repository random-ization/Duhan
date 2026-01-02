import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api as convexApi } from '../../../convex/_generated/api';
import {
    Users, BookOpen, GraduationCap, FileText,
    Loader2, TrendingUp, DollarSign, Zap, Activity,
    BarChart3, RefreshCw
} from 'lucide-react';

interface OverviewStats {
    users: number;
    institutes: number;
    // overview stats could return string for vocab limit indicator
    vocabulary: number | string;
    grammar: number;
    units: number;
    exams: number;
}

interface AiUsageStats {
    period: string;
    summary: {
        totalCalls: number;
        totalTokens: number;
        totalCost: number;
    };
    byFeature: Record<string, { calls: number; tokens: number; cost: number }>;
    daily: { date: string; calls: number; cost: number }[];
}

interface ActivitySummary {
    recent: any[];
    summary: Record<string, number>;
}

export const AdminDashboard: React.FC = () => {
    const overview = useQuery(convexApi.admin.getOverviewStats);
    const aiUsage = useQuery(convexApi.admin.getAiUsageStats, { days: 30 });
    const activity = useQuery(convexApi.admin.getRecentActivity, { limit: 50 });

    const loading = overview === undefined || aiUsage === undefined || activity === undefined;
    const refreshing = false; // Realtime updates via Convex

    /* Legacy fetch removed
    useEffect(() => {
        loadAllStats();
    }, []);

    const loadAllStats = async () => {
        setLoading(true);
        try {
            const [overviewRes, aiRes, activityRes] = await Promise.all([
                api.getOverviewStats(),
                api.getAiUsageStats(30),
                api.getRecentActivity(50)
            ]);

            if (overviewRes.success) setOverview(overviewRes.data);
            if (aiRes.success) setAiUsage(aiRes.data);
            if (activityRes.success) setActivity(activityRes.data);
        } catch (e) {
            console.error('Failed to load stats', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadAllStats();
        setRefreshing(false);
    };
    */
    const handleRefresh = () => { }; // No-op since it's realtime

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    const statCards = [
        { label: '用户总数', value: overview?.users ?? 0, icon: Users, color: 'bg-blue-100 text-blue-600' },
        { label: '教材数量', value: overview?.institutes ?? 0, icon: BookOpen, color: 'bg-purple-100 text-purple-600' },
        { label: '词汇量', value: overview?.vocabulary ?? 0, icon: FileText, color: 'bg-green-100 text-green-600' },
        { label: '语法点', value: overview?.grammar ?? 0, icon: GraduationCap, color: 'bg-orange-100 text-orange-600' },
        { label: '单元数', value: overview?.units ?? 0, icon: BarChart3, color: 'bg-pink-100 text-pink-600' },
        { label: 'TOPIK 考试', value: overview?.exams ?? 0, icon: Activity, color: 'bg-indigo-100 text-indigo-600' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">数据概览</h2>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-zinc-300 rounded-lg font-bold hover:bg-zinc-50 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    刷新
                </button>
            </div>

            {/* Overview Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {statCards.map((stat, i) => (
                    <div
                        key={i}
                        className="bg-white border-2 border-zinc-900 rounded-xl p-4 shadow-[3px_3px_0px_0px_#18181B]"
                    >
                        <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-black">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</div>
                        <div className="text-xs text-zinc-500 font-medium">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* AI Usage Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Cost Summary */}
                <div className="bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B]">
                    <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        <h3 className="font-black">AI 成本统计 (30天)</h3>
                    </div>

                    {aiUsage ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-zinc-50 rounded-lg p-3 text-center">
                                    <div className="text-xl font-black text-zinc-900">
                                        {aiUsage.summary.totalCalls.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-zinc-500">API 调用</div>
                                </div>
                                <div className="bg-zinc-50 rounded-lg p-3 text-center">
                                    <div className="text-xl font-black text-zinc-900">
                                        {(aiUsage.summary.totalTokens / 1000).toFixed(1)}K
                                    </div>
                                    <div className="text-xs text-zinc-500">Token 消耗</div>
                                </div>
                                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                                    <div className="text-xl font-black text-emerald-600">
                                        ${aiUsage.summary.totalCost.toFixed(4)}
                                    </div>
                                    <div className="text-xs text-zinc-500">总费用</div>
                                </div>
                            </div>

                            {/* By Feature */}
                            <div>
                                <div className="text-xs font-bold text-zinc-500 mb-2">按功能分布</div>
                                <div className="space-y-2">
                                    {Object.entries(aiUsage.byFeature).map(([feature, stats]: [string, any]) => (
                                        <div key={feature} className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{feature}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-zinc-400">{stats.calls} 次</span>
                                                <span className="text-emerald-600 font-bold">${stats.cost.toFixed(4)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-zinc-400 py-8">
                            <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">暂无 AI 使用记录</p>
                        </div>
                    )}
                </div>

                {/* Daily Usage Chart (Simple Bar) */}
                <div className="bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B]">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        <h3 className="font-black">每日 API 调用趋势</h3>
                    </div>

                    {aiUsage && aiUsage.daily.length > 0 ? (
                        <div className="h-48 flex items-end gap-1">
                            {aiUsage.daily.slice(-14).map((day, i) => {
                                const maxCalls = Math.max(...aiUsage.daily.map(d => d.calls), 1);
                                const height = (day.calls / maxCalls) * 100;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center">
                                        <div
                                            className="w-full bg-blue-400 rounded-t-sm hover:bg-blue-500 transition-colors"
                                            style={{ height: `${Math.max(height, 2)}%` }}
                                            title={`${day.date}: ${day.calls} 次, $${day.cost.toFixed(4)}`}
                                        />
                                        {i % 2 === 0 && (
                                            <div className="text-[9px] text-zinc-400 mt-1 -rotate-45 origin-top-left whitespace-nowrap">
                                                {day.date.slice(5)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-zinc-400">
                            <p className="text-sm">暂无数据</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Learning Activity Summary */}
            <div className="bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B]">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <h3 className="font-black">学习活动统计</h3>
                </div>

                {activity && Object.keys(activity.summary).length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(activity.summary).map(([type, count]) => (
                            <div key={type} className="text-center p-4 bg-zinc-50 rounded-lg">
                                <div className="text-2xl font-black">{count}</div>
                                <div className="text-xs text-zinc-500 uppercase">{type}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-zinc-400 py-8">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">暂无学习活动</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
