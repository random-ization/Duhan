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

// Extracted constant for background style
const LOADING_BACKGROUND_STYLE = {
    backgroundImage: 'radial-gradient(#CBD5E1 1.5px, transparent 1.5px)',
    backgroundSize: '24px 24px'
} as const;

const GrammarModulePage: React.FC = () => {
    const { instituteId } = useParams<{ instituteId: string }>();
    const navigate = useNavigate();

    const [selectedUnit, setSelectedUnit] = useState<number>(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGrammar, setSelectedGrammar] = useState<GrammarPointData | null>(null);
    const [instituteName, setInstituteName] = useState('');
    const [totalUnits, setTotalUnits] = useState<number>(10); // Default to 10 units

    const { user } = useAuth();

    // Convex Integration
    const grammarListQuery = useQuery(api.grammars.getUnitGrammar,
        instituteId ? { courseId: instituteId, unitId: selectedUnit } : "skip"
    );
    const updateStatusMutation = useMutation(api.grammars.updateStatus);

    // Derive loading state and grammarList directly from query
    const isLoading = grammarListQuery === undefined;
    const grammarList = useMemo<GrammarPointData[]>(() => {
        if (!grammarListQuery) return [];
        return grammarListQuery.map(g => ({
            ...g,
            status: g.status as any
        }));
    }, [grammarListQuery]);

    // Local optimistic updates for proficiency
    const [localUpdates, setLocalUpdates] = useState<Map<string, { proficiency?: number; status?: string }>>(new Map());

    // Merge query data with local optimistic updates
    const grammarListWithUpdates = useMemo(() => {
        return grammarList.map(g => {
            const update = localUpdates.get(g.id);
            if (update) {
                return { ...g, ...update };
            }
            return g;
        });
    }, [grammarList, localUpdates]);

    // Handle proficiency update (Optimistic UI)
    const handleProficiencyUpdate = (grammarId: string, proficiency: number, status: string) => {
        // Update local optimistic state
        setLocalUpdates(prev => {
            const next = new Map(prev);
            next.set(grammarId, { proficiency, status });
            return next;
        });
        
        if (selectedGrammar?.id === grammarId) {
            setSelectedGrammar(prev =>
                prev ? { ...prev, proficiency, status: status as any } : null
            );
        }
    };

    const handleToggleStatus = async (grammarId: string) => {
        if (!user?.id) return;

        // Determine new status (toggle logic)
        const current = grammarListWithUpdates.find(g => g.id === grammarId);
        const newStatus = current?.status === 'MASTERED' ? 'LEARNING' : 'MASTERED';

        // Optimistic update
        setLocalUpdates(prev => {
            const next = new Map(prev);
            next.set(grammarId, { ...prev.get(grammarId), status: newStatus });
            return next;
        });

        if (selectedGrammar?.id === grammarId) {
            setSelectedGrammar(prev => prev ? { ...prev, status: newStatus as any } : null);
        }

        try {
            await updateStatusMutation({
                grammarId: grammarId as any,
                status: newStatus
            });
        } catch (error) {
            console.error('Failed to toggle status:', error);
            // Revert optimistic update on error
            setLocalUpdates(prev => {
                const next = new Map(prev);
                next.delete(grammarId);
                return next;
            });
        }
    };

    // Filtered points based on search
    const displayedPoints = useMemo(() => {
        if (!searchQuery.trim()) return grammarListWithUpdates;
        const q = searchQuery.toLowerCase();
        return grammarListWithUpdates.filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.summary.toLowerCase().includes(q)
        );
    }, [grammarListWithUpdates, searchQuery]);

    // Generate unit list for sidebar
    const unitList = useMemo(() => {
        return Array.from({ length: totalUnits }, (_, i) => `Unit ${i + 1}: 第${i + 1}课`);
    }, [totalUnits]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center" style={LOADING_BACKGROUND_STYLE}>
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
