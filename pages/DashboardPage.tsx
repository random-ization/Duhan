import React, { useMemo, useState } from 'react';
import { Play, Zap, Disc, Trophy, GripVertical, BookMarked, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BentoCard } from '../components/dashboard/BentoCard';
import { StatBadge } from '../components/dashboard/StatBadge';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useApp } from '../contexts/AppContext'; // Import Layout Context
import { useData } from '../contexts/DataContext'; // Import Data Context for institute lookup
import LearnerSummaryCard from '../components/dashboard/LearnerSummaryCard';

// DnD Kit
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Assets - Locally hosted emoji images
const ASSETS = {
    wave: "/emojis/Waving_Hand.png",
    fire: "/emojis/Fire.png",
    gem: "/emojis/Gem_Stone.png",
    tiger: "/emojis/Tiger_Face.png",
    sparkles: "/emojis/Sparkles.png",
    book: "/emojis/Open_Book.png",
    trophy: "/emojis/Trophy.png",
    tv: "/emojis/Television.png",
    headphone: "/emojis/Headphone.png",
    memo: "/emojis/Memo.png"
};

// Sortable Item Wrapper
const SortableItem = ({ id, children, isEditing, className }: { id: string, children: React.ReactNode, isEditing: boolean, className?: string }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={`relative ${className} ${isEditing ? 'cursor-move' : ''}`} {...attributes} {...(isEditing ? listeners : {})}>
            {children}
            {isEditing && (
                <div className="absolute top-2 right-2 bg-white/80 p-1 rounded-full shadow-sm text-slate-400 z-50 pointer-events-none">
                    <GripVertical size={16} />
                </div>
            )}
            {/* Editing Overlay to prevent interactions while dragging */}
            {isEditing && <div className="absolute inset-0 z-40 bg-transparent" />}
        </div>
    );
};

export default function DashboardPage({ canAccessContent, onShowUpgradePrompt }: any) {
    const { user } = useAuth();
    const { selectedInstitute, selectedLevel } = useLearning();
    const { isEditing, cardOrder, updateCardOrder } = useApp(); // Layout Context
    const { institutes } = useData(); // Get institutes data
    const navigate = useNavigate();

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 } // Prevent accidental drags
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Calculate stats
    const streak = user?.statistics?.dayStreak || 0;
    const xp = (user?.wordsLearned || 0) * 10 + (user?.examsTaken || 0) * 50;
    const wordsToReview = user?.savedWords?.length || 0;

    // Calculate Progress (Mock for now, or based on lastUnit)
    const currentUnit = user?.lastUnit || 1;
    const totalUnits = 10; // Mock total
    const progressPercent = Math.min(100, Math.round((currentUnit / totalUnits) * 100));

    // Determine top score
    const topScore = useMemo(() => {
        if (!user?.examHistory || user.examHistory.length === 0) return 0;
        return Math.max(...user.examHistory.map(e => e.score));
    }, [user]);

    // Lookup institute name
    const instituteName = useMemo(() => {
        if (!selectedInstitute) return '教材';
        const inst = institutes.find(i => i.id === selectedInstitute);
        return inst ? inst.name : selectedInstitute;
    }, [selectedInstitute, institutes]);

    // Render Card Content based on ID
    const renderCard = (id: string) => {
        switch (id) {
            case 'summary':
                return <LearnerSummaryCard />;
            case 'tiger':
                return (
                    <BentoCard className="flex flex-col items-center justify-center text-center h-full" bgClass="bg-[#FFD233]" borderClass="border-white ring-4 ring-slate-900">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(black 1px, transparent 1px)", backgroundSize: "10px 10px" }}></div>
                        <img src={ASSETS.tiger} className="w-36 h-36 drop-shadow-xl animate-float group-hover:scale-110 transition duration-500" alt="tiger coach" />
                        <div className="relative z-10 mt-4 bg-white border-2 border-slate-900 px-4 py-3 rounded-2xl shadow-sm transform -rotate-2 group-hover:rotate-0 transition">
                            <p className="font-bold text-slate-900 text-sm">"别放弃！再坚持5分钟！"</p>
                        </div>
                        <button className="mt-4 bg-slate-900 text-white px-6 py-2 rounded-full font-bold text-sm hover:scale-105 transition shadow-lg border-2 border-black">
                            开始小测验
                        </button>
                    </BentoCard>
                );
            case 'daily-phrase':
                return (
                    <BentoCard borderClass="border-indigo-50" className="h-full">
                        <div className="flex justify-between items-start relative z-10 h-full">
                            <div>
                                <div className="text-xs font-black text-indigo-500 uppercase mb-2 tracking-wider flex items-center gap-2">
                                    <img src={ASSETS.sparkles} className="w-4 h-4" alt="sparkles" /> 每日一句
                                </div>
                                <h2 className="text-4xl font-black text-slate-900 leading-tight">"시작이 반이다"</h2>
                                <p className="text-slate-500 font-bold mt-2 text-lg">千里之行，始于足下。</p>
                            </div>
                            <button className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-[4px_4px_0px_0px_black] border-2 border-black hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_black] transition-all">
                                <Play size={28} fill="currentColor" />
                            </button>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full opacity-50 border-2 border-indigo-100"></div>
                    </BentoCard>
                );
            case 'textbook':
                return (
                    <BentoCard onClickPath="/courses" bgClass="bg-blue-50" borderClass="border-slate-900" className="h-full">
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <h3 className="font-black text-2xl text-slate-900 leading-tight">
                                    {instituteName}<br />
                                    {selectedLevel ? `Level ${selectedLevel}` : 'Select Level'}
                                </h3>
                                <div className="bg-white border-2 border-blue-200 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold">进行中</div>
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between text-xs font-bold text-blue-400 mb-1">
                                    <span>第 {currentUnit} 章</span>
                                    <span>{progressPercent}%</span>
                                </div>
                                <div className="w-full bg-white h-3 rounded-full border-2 border-blue-100 overflow-hidden">
                                    <div className="bg-blue-500 h-full border-r-2 border-blue-600" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <img src={ASSETS.book} className="absolute -right-4 -bottom-4 w-28 h-28 opacity-90 group-hover:scale-110 group-hover:rotate-6 transition duration-300" alt="books" />
                    </BentoCard>
                );
            case 'topik':
                return (
                    <BentoCard onClickPath="/topik" bgClass="bg-yellow-50" borderClass="border-slate-900" className="h-full">
                        <div className="relative z-10">
                            <h3 className="font-black text-2xl text-slate-900">TOPIK<br />模拟考</h3>
                            <div className="mt-2 inline-block bg-white px-3 py-1 rounded-lg text-xs font-bold text-yellow-600 shadow-sm border-2 border-yellow-100">
                                最高分: <span className="text-slate-900">{topScore}</span>
                            </div>
                        </div>
                        <img src={ASSETS.trophy} className="absolute -right-2 -bottom-2 w-28 h-28 group-hover:scale-110 group-hover:-rotate-6 transition duration-300" alt="trophy" />
                    </BentoCard>
                );
            case 'youtube':
                return (
                    <BentoCard onClickPath="/youtube" bgClass="bg-red-50" borderClass="border-slate-900" className="h-full">
                        <div className="relative z-10">
                            <h3 className="font-black text-2xl text-slate-900">沉浸<br />视频</h3>
                            <div className="mt-2 inline-block bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold border-2 border-red-700 shadow-sm">
                                New Updates
                            </div>
                        </div>
                        <img src={ASSETS.tv} className="absolute -right-4 -bottom-4 w-28 h-28 group-hover:scale-110 group-hover:rotate-3 transition duration-300" alt="tv" />
                    </BentoCard>
                );
            case 'podcast':
                return (
                    <BentoCard onClickPath="/podcasts" bgClass="bg-slate-900" borderClass="border-slate-900" className="text-white h-full">
                        <div className="absolute right-[-20px] bottom-[-20px] opacity-20 group-hover:opacity-40 transition duration-700 group-hover:rotate-45">
                            <Disc size={120} />
                        </div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="inline-block bg-purple-500 text-white border-2 border-purple-300 text-[10px] font-black px-2 py-0.5 rounded-md uppercase transform -rotate-2">Podcast</div>
                                <h3 className="font-bold text-lg mt-2 leading-tight">Iyagi Series<br />Real Talk</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1 h-3 items-end">
                                    <div className="w-1 bg-green-400 h-full animate-pulse"></div>
                                    <div className="w-1 bg-green-400 h-2/3 animate-pulse"></div>
                                    <div className="w-1 bg-green-400 h-full animate-pulse"></div>
                                </div>
                                <span className="text-xs font-mono text-green-400">Listen Now</span>
                            </div>
                        </div>
                    </BentoCard>
                );
            case 'memory':
                return (
                    <BentoCard onClickPath="/notebook" className="flex items-center justify-between h-full" borderClass="border-slate-900">
                        <div className="z-10">
                            <h3 className="font-black text-xl text-slate-900">单词记忆挑战</h3>
                            <p className="text-slate-500 font-bold text-sm mt-1">Review your saved words!</p>
                        </div>
                        <div className="flex items-center gap-4 z-10">
                            <div className="text-right">
                                <div className="text-3xl font-black text-slate-900">{wordsToReview}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Words Saved</div>
                            </div>
                            <button className="bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-[4px_4px_0px_0px_black] border-2 border-black hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_black] transition-all">
                                <Zap size={24} fill="currentColor" />
                            </button>
                        </div>
                        <img src={ASSETS.memo} className="absolute -left-2 -bottom-6 w-24 h-24 opacity-10 rotate-12" alt="memo" />
                    </BentoCard>
                );
            case 'vocab':
                return (
                    <BentoCard onClickPath="/vocab-book" bgClass="bg-indigo-50" borderClass="border-slate-900" className="h-full">
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <BookMarked size={80} className="text-indigo-600 rotate-12" />
                        </div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="inline-block bg-indigo-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase mb-2">生词本</div>
                                <h3 className="font-black text-xl text-slate-900 leading-tight">我的生词</h3>
                                <p className="text-slate-500 font-bold text-sm mt-1">收藏的单词和释义</p>
                            </div>
                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                                {wordsToReview} 个生词
                            </div>
                        </div>
                    </BentoCard>
                );
            case 'notes':
                return (
                    <BentoCard onClickPath="/notebook" bgClass="bg-amber-50" borderClass="border-slate-900" className="h-full">
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <FileText size={80} className="text-amber-600 rotate-12" />
                        </div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="inline-block bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase mb-2">笔记本</div>
                                <h3 className="font-black text-xl text-slate-900 leading-tight">学习笔记</h3>
                                <p className="text-slate-500 font-bold text-sm mt-1">错题记录和学习心得</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[9px] font-bold text-red-600">错</div>
                                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[9px] font-bold text-emerald-600">记</div>
                            </div>
                        </div>
                    </BentoCard>
                );
            default:
                return null;
        }
    };

    // Card styling mapping (for spans)
    const getCardStyle = (id: string) => {
        switch (id) {
            case 'tiger':
                // Orig: md:col-span-1 row-span-2
                return 'md:col-span-1 md:row-span-2';
            case 'daily-phrase':
                // Orig: md:col-span-2 row-span-1
                return 'md:col-span-2';
            case 'memory':
                // Orig: md:col-span-2
                return 'md:col-span-2';
            default:
                // Default 1x1
                return 'md:col-span-1';
        }
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = cardOrder.indexOf(active.id);
            const newIndex = cardOrder.indexOf(over.id);
            updateCardOrder(arrayMove(cardOrder, oldIndex, newIndex));
        }
    };

    return (
        <div className="space-y-10 pb-20">

            {/* 1. Header */}
            <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="relative pl-4">
                    <img src={ASSETS.wave} className="absolute -top-6 -left-10 w-14 h-14 animate-float" alt="waving hand" />
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        下午好, {user?.name || 'Friend'}!
                    </h1>
                    <p className="text-slate-500 font-bold mt-1">准备好击败今天的 Boss 了吗？</p>
                </div>

                <div className="flex gap-4">
                    <StatBadge icon={ASSETS.fire} label="连续打卡" value={`${streak} 天 🔥`} colorClass="bg-orange-100 border-orange-200" borderClass="border-slate-900" />
                    <StatBadge icon={ASSETS.gem} label="经验值" value={`${xp.toLocaleString()} XP`} colorClass="bg-blue-100 border-blue-200" borderClass="border-slate-900" />
                </div>
            </header>

            {/* 2. Sortable Grid */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={cardOrder}
                    strategy={rectSortingStrategy}
                >
                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[220px] transition-all ${isEditing ? 'scale-[0.98] ring-4 ring-indigo-500/20 rounded-3xl p-4 bg-slate-50' : ''}`}>
                        {cardOrder.map((id) => (
                            <SortableItem key={id} id={id} isEditing={isEditing} className={getCardStyle(id)}>
                                {renderCard(id)}
                            </SortableItem>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
