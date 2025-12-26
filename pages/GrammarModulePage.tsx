import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { api } from '../services/api';
import UnitSidebar from '../components/grammar/UnitSidebar';
import GrammarFeed from '../components/grammar/GrammarFeed';
import GrammarDetailSheet from '../components/grammar/GrammarDetailSheet';
import { GrammarPointData, UnitGrammarData } from '../types';

const GrammarModulePage: React.FC = () => {
    const { instituteId } = useParams<{ instituteId: string }>();
    const navigate = useNavigate();

    const [groupedData, setGroupedData] = useState<UnitGrammarData>({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGrammar, setSelectedGrammar] = useState<GrammarPointData | null>(null);
    const [instituteName, setInstituteName] = useState('');

    useEffect(() => {
        loadGrammarPoints();
        setInstituteName(decodeURIComponent(instituteId || ''));
    }, [instituteId]);

    const loadGrammarPoints = async () => {
        if (!instituteId) return;
        setIsLoading(true);
        try {
            const data = await api.getGrammarPoints(instituteId);
            setGroupedData(data);
            // Auto-select first unit
            const units = Object.keys(data);
            if (units.length > 0 && !selectedUnit) {
                setSelectedUnit(units[0]);
            }
        } catch (error) {
            console.error('Failed to load grammar points:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async (grammarId: string) => {
        try {
            const updated = await api.toggleGrammarStatus(grammarId);

            setGroupedData(prev => {
                const newData = { ...prev };
                Object.keys(newData).forEach(unitKey => {
                    newData[unitKey] = newData[unitKey].map(point =>
                        point.id === grammarId ? { ...point, status: updated.status } : point
                    );
                });
                return newData;
            });

            if (selectedGrammar?.id === grammarId) {
                setSelectedGrammar(prev => prev ? { ...prev, status: updated.status as any } : null);
            }
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    // Derived State
    const displayedPoints = useMemo(() => {
        let points: GrammarPointData[] = [];

        if (selectedUnit) {
            points = groupedData[selectedUnit] || [];
        } else {
            Object.values(groupedData).forEach(unitPoints => {
                points.push(...unitPoints);
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            points = points.filter(p =>
                p.title.toLowerCase().includes(q) ||
                p.summary.toLowerCase().includes(q)
            );
        }

        return points;
    }, [groupedData, selectedUnit, searchQuery]);

    const unitList = Object.keys(groupedData).sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true });
    });

    if (isLoading) {
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
                    {/* Left Sidebar */}
                    <UnitSidebar
                        units={unitList}
                        selectedUnit={selectedUnit}
                        onSelectUnit={setSelectedUnit}
                    />

                    {/* Center Feed */}
                    <GrammarFeed
                        grammarPoints={displayedPoints}
                        selectedUnit={selectedUnit}
                        onSelect={setSelectedGrammar}
                        onToggleStatus={handleToggleStatus}
                    />

                    {/* Right Detail Panel (Always Visible) */}
                    <GrammarDetailSheet
                        grammar={selectedGrammar}
                        onClose={() => setSelectedGrammar(null)}
                    />
                </div>
            </div>
        </div>
    );
};

export default GrammarModulePage;
