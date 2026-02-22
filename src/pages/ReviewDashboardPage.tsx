import React, { useState } from 'react';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Sparkles,
    Brain,
    Target,
    Clock,
    Flame,
    ArrowLeft,
    Zap,
    BarChart3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { useQuery } from 'convex/react';
import { VOCAB, qRef, NoArgs } from '@/utils/convexRefs';

export default function ReviewDashboardPage() {
    const navigate = useLocalizedNavigate();
    const { t } = useTranslation();
    const [now] = useState(() => Date.now());

    // Reuse the existing query for now to differentiate "due" items
    const vocabBook = useQuery(VOCAB.getVocabBook, { includeMastered: true, limit: 300 }) || [];
    const userStats = useQuery(qRef<NoArgs, { streak: number } & Record<string, unknown>>('userStats:getStats'));
    const streak = userStats?.streak ?? 0;

    const dueItems = vocabBook.filter(
        item =>
            item.progress.status !== 'MASTERED' &&
            !!item.progress.nextReviewAt &&
            item.progress.nextReviewAt <= now
    );

    const learnedCount = vocabBook.filter(i => i.progress.status !== 'NEW').length;
    // Mock logic for accuracy/time for now
    const accuracy = 94;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans pb-24">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (window.innerWidth < 768) {
                                    navigate('/practice');
                                } else {
                                    navigate('/dashboard?view=practice');
                                }
                            }}
                            className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-8 h-8 text-amber-500" />
                                {t('reviewPage.dashboard.title', { defaultValue: 'Daily Review' })}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                {t('reviewPage.dashboard.subtitle', { count: dueItems.length, defaultValue: `Keep your streak alive! You have ${dueItems.length} words due.` })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                            <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                            <span className="font-bold text-slate-700 dark:text-slate-200">{t('reviewPage.dashboard.streakDays', { days: streak, defaultValue: `${streak} Days` })}</span>
                        </div>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatsCard
                        icon={<Target className="text-emerald-500" />}
                        label={t('reviewPage.stats.accuracy', { defaultValue: 'Accuracy' })}
                        value={`${accuracy}%`}
                        subtext={t('reviewPage.stats.accuracy_sub', { defaultValue: '+2% from last week' })}
                    />
                    <StatsCard
                        icon={<Zap className="text-indigo-500" />}
                        label={t('reviewPage.stats.learned', { defaultValue: 'Words Learned' })}
                        value={learnedCount}
                        subtext={t('reviewPage.stats.learned_sub', { defaultValue: 'Total active words' })}
                    />
                    <StatsCard
                        icon={<Clock className="text-rose-500" />}
                        label={t('reviewPage.stats.due', { defaultValue: 'Due Now' })}
                        value={dueItems.length}
                        subtext={t('reviewPage.stats.due_sub', { defaultValue: 'Ready to review' })}
                    />
                </div>

                {/* Main Review Modes */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('reviewPage.modes.title', { defaultValue: 'Choose a Mode' })}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ModeCard
                            title={t('reviewPage.modes.quick.title', { defaultValue: 'Quick Review' })}
                            description={t('reviewPage.modes.quick.desc', { defaultValue: '10 random due words • 2 mins' })}
                            icon={<Zap className="w-8 h-8 text-amber-500" />}
                            color="bg-amber-50 dark:bg-amber-900/10"
                            borderColor="border-amber-200 dark:border-amber-800"
                            btnText={t('reviewPage.modes.quick.btn', { defaultValue: 'Start Quick' })}
                            onClick={() => navigate('/review/quiz?mode=quick')}
                        />

                        <ModeCard
                            title={t('reviewPage.modes.full.title', { defaultValue: 'Full Review' })}
                            description={t('reviewPage.modes.full.desc', { count: dueItems.length, defaultValue: `Clear all ${dueItems.length} due words` })}
                            icon={<Brain className="w-8 h-8 text-indigo-500" />}
                            color="bg-indigo-50 dark:bg-indigo-900/10"
                            borderColor="border-indigo-200 dark:border-indigo-800"
                            btnText={t('reviewPage.modes.full.btn', { defaultValue: 'Start All' })}
                            recommended
                            recommendedText={t('reviewPage.modes.recommended', { defaultValue: 'RECOMMENDED' })}
                            onClick={() => navigate('/review/quiz?mode=full')}
                        />

                        <ModeCard
                            title={t('reviewPage.modes.weak.title', { defaultValue: 'Weakest Words' })}
                            description={t('reviewPage.modes.weak.desc', { defaultValue: 'Focus on difficult items' })}
                            icon={<Target className="w-8 h-8 text-rose-500" />}
                            color="bg-rose-50 dark:bg-rose-900/10"
                            borderColor="border-rose-200 dark:border-rose-800"
                            btnText={t('reviewPage.modes.weak.btn', { defaultValue: 'Improve' })}
                            onClick={() => navigate('/review/quiz?mode=weak')}
                        />
                    </div>
                </div>

                {/* Recent Activity / Tabs */}
                <div className="pt-4">
                    <Tabs defaultValue="due" className="w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('reviewPage.queue.title', { defaultValue: 'Word Queue' })}</h2>
                            <TabsList>
                                <TabsTrigger value="due">{t('reviewPage.queue.due', { defaultValue: 'Due Review' })}</TabsTrigger>
                                <TabsTrigger value="learned">{t('reviewPage.queue.mastered', { defaultValue: 'Mastered' })}</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="due">
                            <Card>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
                                    {dueItems.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500">
                                            {t('reviewPage.queue.empty_due', { defaultValue: 'No words due for review! Good job.' })}
                                        </div>
                                    ) : (
                                        dueItems.map((item) => (
                                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                                                        {item.word.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white text-lg">{item.word}</p>
                                                        <p className="text-sm text-slate-500">{item.meaning}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                                    Due
                                                </Badge>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="learned">
                            <div className="p-8 text-center text-slate-500">
                                {t('reviewPage.queue.empty_mastered', { defaultValue: 'List of mastered words will appear here.' })}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};

// --- Helpers ---

function StatsCard({ icon, label, value, subtext }: any) {
    return (
        <Card className="border shadow-sm">
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
                    </div>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-emerald-600">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    {subtext}
                </div>
            </CardContent>
        </Card>
    )
}

function ModeCard({ title, description, icon, color, borderColor, btnText, recommended, onClick, ...props }: any) {
    return (
        <Card className={`relative overflow-hidden border-2 ${recommended ? 'border-indigo-500 dark:border-indigo-500 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'} transition-all`}>
            {recommended && (
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl">
                    {props.recommendedText || 'RECOMMENDED'}
                </div>
            )}
            <CardContent className="p-6 flex flex-col h-full">
                <div className={`w-14 h-14 rounded-2xl ${color} border ${borderColor} flex items-center justify-center mb-4`}>
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
                <p className="text-slate-500 font-medium mb-6 flex-1">{description}</p>
                <Button onClick={onClick} className={`w-full ${recommended ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`} variant={recommended ? 'default' : 'secondary'}>
                    {btnText}
                </Button>
            </CardContent>
        </Card>
    )
}
