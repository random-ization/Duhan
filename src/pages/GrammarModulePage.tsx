import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useQuery, useMutation } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import UnitSidebar from '../components/grammar/UnitSidebar';
import GrammarFeed from '../components/grammar/GrammarFeed';
import GrammarDetailSheet from '../components/grammar/GrammarDetailSheet';
import { GrammarPointData } from '../types';
import type { Id } from '../../convex/_generated/dataModel';
import { toErrorMessage } from '../utils/errors';
import { GRAMMARS, INSTITUTES } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import MobileGrammarView from '../components/mobile/MobileGrammarView';
import { useIsMobile } from '../hooks/useIsMobile';
import { Button, Input } from '../components/ui';
import { AppBreadcrumb } from '../components/common/AppBreadcrumb';

const GrammarModulePage: React.FC = () => {
  const { instituteId } = useParams<{ instituteId: string }>();
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const isMobile = useIsMobile();

  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrammar, setSelectedGrammar] = useState<GrammarPointData | null>(null);

  const { user } = useAuth();

  const instituteQuery = useQuery(INSTITUTES.get, instituteId ? { id: instituteId } : 'skip');
  const instituteName = instituteQuery?.name || instituteId || '';

  const totalUnits = instituteQuery?.totalUnits || 30;

  const normalizeStatus = (value: unknown): GrammarPointData['status'] => {
    if (value === 'NEW' || value === 'LEARNING' || value === 'MASTERED') return value;
    return 'NEW';
  };

  // Convex Integration
  const grammarListQuery = useQuery(
    GRAMMARS.getUnitGrammar,
    instituteId ? { courseId: instituteId, unitId: selectedUnit } : 'skip'
  );
  const updateStatusMutation = useMutation(GRAMMARS.updateStatus);

  // Derive loading state and grammarList directly from query
  const isGrammarLoading = grammarListQuery === undefined;
  const grammarList = useMemo<GrammarPointData[]>(() => {
    if (!grammarListQuery) return [];
    return grammarListQuery.map(g => ({ ...g, status: normalizeStatus(g.status) }));
  }, [grammarListQuery]);

  // Local optimistic updates for proficiency
  const [localUpdates, setLocalUpdates] = useState<
    Map<string, { proficiency?: number; status?: GrammarPointData['status'] }>
  >(new Map());

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
  const handleProficiencyUpdate = (
    grammarId: string,
    proficiency: number,
    status: GrammarPointData['status']
  ) => {
    // Update local optimistic state
    setLocalUpdates(prev => {
      const next = new Map(prev);
      next.set(grammarId, { proficiency, status });
      return next;
    });

    if (selectedGrammar?.id === grammarId) {
      setSelectedGrammar(prev => (prev ? { ...prev, proficiency, status } : null));
    }
  };

  const handleToggleStatus = async (grammarId: string) => {
    if (!user) return;

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
      setSelectedGrammar(prev => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      await updateStatusMutation({
        grammarId: grammarId as unknown as Id<'grammar_points'>,
        status: newStatus,
      });
    } catch (error) {
      console.error('Failed to toggle status:', toErrorMessage(error));
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
    return grammarListWithUpdates.filter(
      p => p.title.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q)
    );
  }, [grammarListWithUpdates, searchQuery]);

  // Generate unit list for sidebar
  const unitList = useMemo(() => {
    return Array.from({ length: totalUnits }, (_, i) =>
      t('grammarModule.unitLabel', { defaultValue: 'Unit {{count}}', count: i + 1 })
    );
  }, [totalUnits, t]);

  if (instituteQuery === undefined) {
    return (
      <div className="min-h-screen bg-muted bg-[radial-gradient(#CBD5E1_1.5px,transparent_1.5px)] bg-[length:24px_24px] dark:bg-[radial-gradient(hsl(var(--border))_1.5px,transparent_1.5px)] dark:bg-[length:24px_24px] flex items-center justify-center">
        <div className="text-xl font-bold text-muted-foreground animate-pulse">
          {t('loading', { defaultValue: 'Loading...' })}
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileGrammarView
        selectedUnit={selectedUnit}
        totalUnits={totalUnits}
        onSelectUnit={u => {
          setSelectedUnit(u);
          setSelectedGrammar(null); // Clear selection on unit change
        }}
        grammarPoints={isGrammarLoading ? [] : displayedPoints}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGrammar={selectedGrammar}
        onSelectGrammar={setSelectedGrammar}
        onToggleStatus={handleToggleStatus}
        isLoading={isGrammarLoading}
        onProficiencyUpdate={handleProficiencyUpdate}
        instituteId={instituteId || ''}
      />
    );
  }

  return (
    <div className="text-foreground h-full flex overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
        {/* Header */}
        <header className="flex justify-between items-center bg-card border-2 border-foreground dark:border-border rounded-xl px-6 py-3 shadow-[4px_4px_0px_0px_#0f172a] dark:shadow-[4px_4px_0px_0px_rgba(148,163,184,0.26)] shrink-0 z-20">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="auto"
              className="w-8 h-8 rounded-lg border-2 border-foreground dark:border-border hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <AppBreadcrumb
                className="mb-1"
                items={[
                  { label: 'Courses', to: '/courses' },
                  { label: instituteName || 'Course', to: `/course/${instituteId}` },
                  { label: 'Grammar' },
                ]}
              />
              <h1 className="font-black text-xl italic tracking-tight">
                {instituteName}
                <span className="not-italic text-sm font-bold text-muted-foreground ml-2">
                  {t('grammarModule.title', { defaultValue: 'Grammar Training' })}
                </span>
              </h1>
            </div>
          </div>

          <div className="relative group w-80">
            <Input
              type="text"
              placeholder={t('grammarModule.searchPlaceholder', {
                defaultValue: 'Search grammar points...',
              })}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full !h-auto !px-4 !py-2 !border-2 !border-foreground dark:!border-border !rounded-lg font-bold text-sm focus-visible:!shadow-[2px_2px_0px_0px_#0f172a] dark:focus-visible:!shadow-[2px_2px_0px_0px_rgba(148,163,184,0.26)] transition-all !bg-muted focus-visible:!bg-card !shadow-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              🔍
            </span>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Left Sidebar - Unit Selector */}
          <UnitSidebar
            units={unitList}
            selectedUnit={t('grammarModule.unitLabel', {
              defaultValue: 'Unit {{count}}',
              count: selectedUnit,
            })}
            onSelectUnit={unitStr => {
              if (!unitStr) return;
              // Parse "Unit X: ..." to get the unit number
              const unitRegex = /Unit (\d+)/;
              const match = unitRegex.exec(unitStr);
              if (match) {
                setSelectedUnit(Number.parseInt(match[1], 10));
                setSelectedGrammar(null); // Clear selection when changing units
              }
            }}
          />

          {/* Center Feed */}
          <GrammarFeed
            grammarPoints={isGrammarLoading ? [] : displayedPoints}
            isLoading={isGrammarLoading}
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
