import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "../contexts/AuthContext";
import UnitSidebar from '../components/grammar/UnitSidebar';
import GrammarFeed from '../components/grammar/GrammarFeed';
import GrammarDetailSheet from '../components/grammar/GrammarDetailSheet';
import { GrammarPointData } from '../types';

const GrammarModulePage: React.FC = () => {
    const { instituteId } = useParams<{ instituteId: string }>();
    const navigate = useNavigate();

    const [grammarList, setGrammarList] = useState<GrammarPointData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUnit, setSelectedUnit] = useState<number>(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGrammar, setSelectedGrammar] = useState<GrammarPointData | null>(null);
    const [instituteName, setInstituteName] = useState('');
    const [totalUnits, setTotalUnits] = useState<number>(10); // Default to 10 units

    const { user } = useAuth();

    // Convex Integration
    const grammarListQuery = useQuery(api.grammars.getUnitGrammar,
        instituteId ? { courseId: instituteId, unitId: selectedUnit, userId: user?.id } : "skip"
    );
    const updateStatusMutation = useMutation(api.grammars.updateStatus);

    useEffect(() => {
        if (grammarListQuery) {
            setGrammarList(grammarListQuery.map(g => ({
                ...g,
                // Ensure type compatibility with frontend interface if needed
                status: g.status as any
            })));
            setIsLoading(false);
        }
    }, [grammarListQuery]);

    // Handle proficiency update (Optimistic UI handled by mutation result if needed, but local state works too)
    const handleProficiencyUpdate = (grammarId: string, proficiency: number, status: string) => {
        // Update local state for immediate feedback
        setGrammarList(prev =>
            prev.map(point =>
                point.id === grammarId
                    ? { ...point, proficiency, status: status as any }
                    : point
            )
        );
        if (selectedGrammar?.id === grammarId) {
            setSelectedGrammar(prev =>
                prev ? { ...prev, proficiency, status: status as any } : null
            );
        }
    };

    const handleToggleStatus = async (grammarId: string) => {
        if (!user?.id) return;

        // Determine new status (toggle logic)
        const current = grammarList.find(g => g.id === grammarId);
        const newStatus = current?.status === 'MASTERED' ? 'LEARNING' : 'MASTERED';

        try {
            await updateStatusMutation({
                userId: user.id,
                grammarId: grammarId as any,
                status: newStatus
            });

            // Update local state
            setGrammarList(prev =>
                prev.map(point =>
                    point.id === grammarId ? { ...point, status: newStatus as any } : point
                )
            );

            if (selectedGrammar?.id === grammarId) {
                setSelectedGrammar(prev => prev ? { ...prev, status: newStatus as any } : null);
            }
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    // Filtered points based on search
    const displayedPoints = useMemo(() => {
        if (!searchQuery.trim()) return grammarList;
        const q = searchQuery.toLowerCase();
        return grammarList.filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.summary.toLowerCase().includes(q)
        );
    }, [grammarList, searchQuery]);

    // Generate unit list for sidebar
    const unitList = useMemo(() => {
        return Array.from({ length: totalUnits }, (_, i) => `Unit ${i + 1}: 第${i + 1}课`);
    }, [totalUnits]);

    if (isLoading && grammarList.length === 0) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center" style={{
                backgroundImage: 'radial-gradient(#CBD5E1 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px'
            }}>
                <div className="text-xl font-bold text-slate-400 animate-pulse">加载中...</div>
            </div>
        );
    }

    return (
        <div className="text-slate-900 h-full flex overflow-hidden">
            <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
                {/* Header */}
                <header className="flex justify-between items-center bg-white border-2 border-slate-900 rounded-xl px-6 py-3 shadow-[4px_4px_0px_0px_#0f172a] shrink-0 z-20">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-8 h-8 rounded-lg border-2 border-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="font-black text-xl italic tracking-tight">
                                {instituteName}
                                <span className="not-italic text-sm font-bold text-slate-500 ml-2">语法专项训练</span>
                            </h1>
                        </div>
                    </div>

                    <div className="relative group w-80">
                        <input
                            type="text"
                            placeholder="搜索语法点..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-slate-900 rounded-lg font-bold text-sm focus:shadow-[2px_2px_0px_0px_#0f172a] outline-none transition-all bg-slate-50 focus:bg-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* Left Sidebar - Unit Selector */}
                    <UnitSidebar
                        units={unitList}
                        selectedUnit={`Unit ${selectedUnit}: 第${selectedUnit}课`}
                        onSelectUnit={(unitStr) => {
                            // Parse "Unit X: ..." to get the unit number
                            const match = unitStr.match(/Unit (\d+)/);
                            if (match) {
                                setSelectedUnit(parseInt(match[1], 10));
                                setSelectedGrammar(null); // Clear selection when changing units
                            }
                        }}
                    />

                    {/* Center Feed */}
                    <GrammarFeed
                        grammarPoints={displayedPoints}
                        selectedUnit={`Unit ${selectedUnit}`}
                        onSelect={setSelectedGrammar}
                        onToggleStatus={handleToggleStatus}
                    />

                    {/* Right Detail Panel */}
                    <GrammarDetailSheet
                        grammar={selectedGrammar}
                        onClose={() => setSelectedGrammar(null)}
                        onProficiencyUpdate={handleProficiencyUpdate}
                    />
                </div>
            </div>
        </div>
    );
};

export default GrammarModulePage;
