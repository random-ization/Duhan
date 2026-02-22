import React from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Sparkles,
    Brain,
    Target,
    Clock,
    ArrowRight,
    Zap,
    Flame,
    BarChart3
} from 'lucide-react';

// --- Part 1: The "Review Words" Card for PracticeHubPage ---

export const ReviewWordsCardConcept = () => {
    return (
        <Card className="w-full h-full min-h-[180px] overflow-hidden relative group border-2 hover:border-indigo-500/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-900/20 opacity-50 group-hover:opacity-100 transition-opacity" />

            <CardHeader className="relative z-10 pb-2">
                <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl w-fit mb-2">
                        <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-bold">
                        12 Due
                    </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-2">
                    Review Words
                </CardTitle>
                <CardDescription className="font-medium text-slate-500 dark:text-slate-400">
                    Strengthen your long-term memory
                </CardDescription>
            </CardHeader>

            <CardContent className="relative z-10 pt-0">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>~5 mins</span>
                </div>
            </CardContent>

            <CardFooter className="relative z-10 pt-0">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 group-hover:translate-y-[-2px]">
                    Start Session <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </CardFooter>

            {/* Decorative blurred blob */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
        </Card>
    );
};

// --- Part 2: The Internal "Review Dashboard" ---

export const ReviewDashboardConcept = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-8 h-8 text-amber-500" />
                            Daily Review
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                            Keep your streak alive! You reviewed 45 words this week.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                            <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                            <span className="font-bold text-slate-700 dark:text-slate-200">12 Days</span>
                        </div>
                        <Button variant="outline" className="rounded-full">History</Button>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatsCard
                        icon={<Target className="text-emerald-500" />}
                        label="Accuracy"
                        value="94%"
                        subtext="+2% from last week"
                    />
                    <StatsCard
                        icon={<Zap className="text-indigo-500" />}
                        label="Words Learned"
                        value="843"
                        subtext="15 new this week"
                    />
                    <StatsCard
                        icon={<Clock className="text-rose-500" />}
                        label="Time Spent"
                        value="2.5h"
                        subtext="Total focus time"
                    />
                </div>

                {/* Main Review Modes */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Choose a Mode</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ModeCard
                            title="Quick Review"
                            description="10 words • 2 mins"
                            icon={<Zap className="w-8 h-8 text-amber-500" />}
                            color="bg-amber-50 dark:bg-amber-900/10"
                            borderColor="border-amber-200 dark:border-amber-800"
                            btnText="Start Quick"
                        />

                        <ModeCard
                            title="Deep Clean"
                            description="Clear all 32 due words"
                            icon={<Brain className="w-8 h-8 text-indigo-500" />}
                            color="bg-indigo-50 dark:bg-indigo-900/10"
                            borderColor="border-indigo-200 dark:border-indigo-800"
                            btnText="Start All"
                            recommended
                        />

                        <ModeCard
                            title="Weakest Words"
                            description="Focus on 5 difficult items"
                            icon={<Target className="w-8 h-8 text-rose-500" />}
                            color="bg-rose-50 dark:bg-rose-900/10"
                            borderColor="border-rose-200 dark:border-rose-800"
                            btnText="Improve"
                        />
                    </div>
                </div>

                {/* Recent Activity / Tabs */}
                <div className="pt-4">
                    <Tabs defaultValue="due" className="w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Word Queue</h2>
                            <TabsList>
                                <TabsTrigger value="due">Due Review</TabsTrigger>
                                <TabsTrigger value="learned">Recently Learned</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="due">
                            <Card>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                                                    {i}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-lg">안녕하세요</p>
                                                    <p className="text-sm text-slate-500">Hello</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                                Level 1
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 text-center border-t border-slate-100 dark:border-slate-800">
                                    <Button variant="ghost" className="text-slate-500">View all 32 words</Button>
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="learned">
                            <div className="p-8 text-center text-slate-500">
                                No recently learned words today.
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

function ModeCard({ title, description, icon, color, borderColor, btnText, recommended }: any) {
    return (
        <Card className={`relative overflow-hidden border-2 ${recommended ? 'border-indigo-500 dark:border-indigo-500 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'} transition-all`}>
            {recommended && (
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl">
                    RECOMMENDED
                </div>
            )}
            <CardContent className="p-6 flex flex-col h-full">
                <div className={`w-14 h-14 rounded-2xl ${color} border ${borderColor} flex items-center justify-center mb-4`}>
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
                <p className="text-slate-500 font-medium mb-6 flex-1">{description}</p>
                <Button className={`w-full ${recommended ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`} variant={recommended ? 'default' : 'secondary'}>
                    {btnText}
                </Button>
            </CardContent>
        </Card>
    )
}
