import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
    Users, CreditCard, Activity, DollarSign,
    BookOpen, FileText, GraduationCap, Loader2, RefreshCw
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';

interface DashboardData {
    stats: {
        totalUsers: number;
        totalInstitutes: number;
        activeLearnersLast7Days: number;
        paidUsers: number;
        monthlyAiCost: number;
        vocabulary: number;
        grammar: number;
        units: number;
        exams: number;
    };
    charts: {
        userTrend: { date: string; count: number }[];
        activityHeatmap: { date: string; count: number }[];
    };
    aiUsage: {
        byFeature: Record<string, { calls: number; tokens: number; cost: number }>;
        daily: { date: string; calls: number; cost: number }[];
    };
}

export const DashboardView: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const response = await api.getAdminDashboardStats();
            if (response.success) {
                setData(response.data);
            }
        } catch (e) {
            console.error('Failed to load dashboard data', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20 text-zinc-400">
                <p>加载失败，请刷新重试</p>
            </div>
        );
    }

    const kpiCards = [
        {
            label: '总用户数',
            value: data.stats.totalUsers,
            icon: Users,
            color: 'bg-blue-500',
            bgColor: 'bg-blue-50'
        },
        {
            label: '付费用户',
            value: data.stats.paidUsers,
            icon: CreditCard,
            color: 'bg-emerald-500',
            bgColor: 'bg-emerald-50'
        },
        {
            label: '7日活跃',
            value: data.stats.activeLearnersLast7Days,
            icon: Activity,
            color: 'bg-purple-500',
            bgColor: 'bg-purple-50'
        },
        {
            label: '本月AI成本',
            value: `$${data.stats.monthlyAiCost.toFixed(4)}`,
            icon: DollarSign,
            color: 'bg-orange-500',
            bgColor: 'bg-orange-50',
            isString: true
        },
    ];

    // Generate heatmap data (GitHub style)
    const generateHeatmapGrid = () => {
        const activityMap = new Map(data.charts.activityHeatmap.map(d => [d.date, d.count]));
        const weeks: { date: string; count: number }[][] = [];
        const today = new Date();

        // Go back ~26 weeks (6 months)
        for (let w = 25; w >= 0; w--) {
            const week: { date: string; count: number }[] = [];
            for (let d = 0; d < 7; d++) {
                const date = new Date(today);
                date.setDate(date.getDate() - (w * 7 + (6 - d)));
                const dateStr = date.toISOString().split('T')[0];
                week.push({
                    date: dateStr,
                    count: activityMap.get(dateStr) || 0
                });
            }
            weeks.push(week);
        }
        return weeks;
    };

    const getHeatmapColor = (count: number) => {
        if (count === 0) return 'bg-zinc-100';
        if (count <= 2) return 'bg-emerald-200';
        if (count <= 5) return 'bg-emerald-300';
        if (count <= 10) return 'bg-emerald-400';
        return 'bg-emerald-500';
    };

    const heatmapWeeks = generateHeatmapGrid();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-zinc-900">数据看板</h2>
                    <p className="text-sm text-zinc-500">实时监控平台核心指标</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-zinc-900 rounded-lg font-bold hover:bg-zinc-50 shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    刷新
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((card, i) => (
                    <div
                        key={i}
                        className={`${card.bgColor} border-2 border-zinc-900 rounded-xl p-5 shadow-[3px_3px_0px_0px_#18181B]`}
                    >
                        <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
                            <card.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-3xl font-black text-zinc-900">
                            {card.isString ? card.value : (card.value as number).toLocaleString()}
                        </div>
                        <div className="text-sm text-zinc-600 font-medium mt-1">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Middle Section: Chart + Content Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Growth Chart (2/3) */}
                <div className="lg:col-span-2 bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B]">
                    <h3 className="font-black text-lg mb-4">📈 用户增长趋势 (30天)</h3>
                    {data.charts.userTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={data.charts.userTrend}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(val) => val.slice(5)}
                                />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#18181b',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }}
                                    labelFormatter={(val) => `日期: ${val}`}
                                    formatter={(val) => [`${val} 人`, '新增用户']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fill="url(#colorUsers)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-zinc-400">
                            暂无数据
                        </div>
                    )}
                </div>

                {/* Content Stats (1/3) */}
                <div className="bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B]">
                    <h3 className="font-black text-lg mb-4">📚 内容资产</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-5 h-5 text-indigo-500" />
                                <span className="font-medium">教材</span>
                            </div>
                            <span className="text-2xl font-black">{data.stats.totalInstitutes}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-blue-500" />
                                <span className="font-medium">词汇</span>
                            </div>
                            <span className="text-2xl font-black">{data.stats.vocabulary.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <GraduationCap className="w-5 h-5 text-purple-500" />
                                <span className="font-medium">语法</span>
                            </div>
                            <span className="text-2xl font-black">{data.stats.grammar}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Activity className="w-5 h-5 text-green-500" />
                                <span className="font-medium">TOPIK 考试</span>
                            </div>
                            <span className="text-2xl font-black">{data.stats.exams}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Heatmap (GitHub Style) */}
            <div className="bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B]">
                <h3 className="font-black text-lg mb-4">🔥 学习活跃度热力图 (6个月)</h3>
                <div className="overflow-x-auto">
                    <div className="flex gap-1 min-w-max">
                        {heatmapWeeks.map((week, wi) => (
                            <div key={wi} className="flex flex-col gap-1">
                                {week.map((day, di) => (
                                    <div
                                        key={di}
                                        className={`w-3 h-3 rounded-sm ${getHeatmapColor(day.count)} transition-colors hover:ring-2 hover:ring-zinc-400`}
                                        title={`${day.date}: ${day.count} 次活动`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4 text-xs text-zinc-500">
                    <span>少</span>
                    <div className="w-3 h-3 bg-zinc-100 rounded-sm" />
                    <div className="w-3 h-3 bg-emerald-200 rounded-sm" />
                    <div className="w-3 h-3 bg-emerald-300 rounded-sm" />
                    <div className="w-3 h-3 bg-emerald-400 rounded-sm" />
                    <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                    <span>多</span>
                </div>
            </div>

            {/* AI Usage Details */}
            {Object.keys(data.aiUsage.byFeature).length > 0 && (
                <div className="bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B]">
                    <h3 className="font-black text-lg mb-4">🤖 AI 使用明细</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(data.aiUsage.byFeature).map(([feature, stats]) => (
                            <div key={feature} className="p-4 bg-gradient-to-br from-zinc-50 to-zinc-100 rounded-lg">
                                <div className="font-bold text-zinc-700 mb-2">{feature}</div>
                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div>
                                        <div className="text-lg font-black">{stats.calls}</div>
                                        <div className="text-xs text-zinc-500">调用</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-black">{(stats.tokens / 1000).toFixed(1)}K</div>
                                        <div className="text-xs text-zinc-500">Token</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-emerald-600">${stats.cost.toFixed(4)}</div>
                                        <div className="text-xs text-zinc-500">费用</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardView;
