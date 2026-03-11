import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useQuery, useMutation } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import GrammarDirectorySidebar from '../components/grammar/GrammarDirectorySidebar';
import GrammarDetailPane from '../components/grammar/GrammarDetailPane';
import GrammarAuxiliaryPane from '../components/grammar/GrammarAuxiliaryPane';
import { GrammarPointData } from '../types';
import type { Id } from '../../convex/_generated/dataModel';
import { toErrorMessage } from '../utils/errors';
import { GRAMMARS, INSTITUTES, mRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import MobileGrammarView from '../components/mobile/MobileGrammarView';
import { useIsMobile } from '../hooks/useIsMobile';
import { Button } from '../components/ui';
import { AppBreadcrumb } from '../components/common/AppBreadcrumb';

const GrammarModulePage: React.FC = () => {
  const { instituteId } = useParams<{ instituteId: string }>();
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const isMobile = useIsMobile();

  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrammarId, setSelectedGrammarId] = useState<string | null>(null);

  const { user } = useAuth();

  const instituteQuery = useQuery(INSTITUTES.get, instituteId ? { id: instituteId } : 'skip');
  const allCourseGrammar = useQuery(
    GRAMMARS.getByCourse,
    instituteId ? { courseId: instituteId } : 'skip'
  );
  const instituteName = instituteQuery?.name || instituteId || '';

  const totalUnits = useMemo(() => {
    if (Array.isArray(allCourseGrammar) && allCourseGrammar.length > 0) {
      return Math.max(1, ...allCourseGrammar.map(item => item.unitId));
    }
    return 10;
  }, [allCourseGrammar]);
  const activeSelectedUnit = Math.max(1, Math.min(selectedUnit, totalUnits));
  const clampUnit = useCallback(
    (unit: number) => Math.max(1, Math.min(unit, totalUnits)),
    [totalUnits]
  );

  const normalizeStatus = (value: unknown): GrammarPointData['status'] => {
    if (value === 'NEW' || value === 'LEARNING' || value === 'MASTERED') return value;
    return 'NEW';
  };

  // Convex Integration
  const grammarListQuery = useQuery(
    GRAMMARS.getUnitGrammar,
    instituteId ? { courseId: instituteId, unitId: activeSelectedUnit } : 'skip'
  );
  const updateStatusMutation = useMutation(GRAMMARS.updateStatus);
  const updateLearningProgressMutation = useMutation(
    mRef<
      { lastInstitute?: string; lastLevel?: number; lastUnit?: number; lastModule?: string },
      unknown
    >('user:updateLearningProgress')
  );

  useEffect(() => {
    if (!instituteId) return;
    void updateLearningProgressMutation({
      lastInstitute: instituteId,
      lastUnit: activeSelectedUnit,
      lastModule: 'GRAMMAR',
    });
  }, [updateLearningProgressMutation, instituteId, activeSelectedUnit]);

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

  const selectedGrammar = useMemo<GrammarPointData | null>(() => {
    if (!selectedGrammarId) return null;
    return grammarListWithUpdates.find(g => g.id === selectedGrammarId) || null;
  }, [grammarListWithUpdates, selectedGrammarId]);

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

  const currentIndex = useMemo(() => {
    if (!selectedGrammarId || !grammarListWithUpdates) return -1;
    return grammarListWithUpdates.findIndex(g => g.id === selectedGrammarId);
  }, [selectedGrammarId, grammarListWithUpdates]);

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < grammarListWithUpdates.length - 1) {
      setSelectedGrammarId(grammarListWithUpdates[currentIndex + 1].id);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedGrammarId(grammarListWithUpdates[currentIndex - 1].id);
    }
  };

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
        selectedUnit={activeSelectedUnit}
        totalUnits={totalUnits}
        onSelectUnit={u => {
          setSelectedUnit(clampUnit(u));
          setSelectedGrammarId(null);
        }}
        grammarPoints={isGrammarLoading ? [] : displayedPoints}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGrammar={selectedGrammar}
        onSelectGrammar={grammar => setSelectedGrammarId(grammar?.id ?? null)}
        onToggleStatus={handleToggleStatus}
        isLoading={isGrammarLoading}
        onProficiencyUpdate={handleProficiencyUpdate}
        instituteId={instituteId || ''}
      />
    );
  }

  return (
    <div className="text-foreground h-screen flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 dotted-bg font-sans">
      <header className="shrink-0 p-4 border-b-2 border-slate-900 dark:border-border bg-white dark:bg-card flex justify-between items-center z-20 relative shadow-[0px_4px_0px_0px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="auto"
            className="w-8 h-8 rounded-lg border-2 border-slate-900 dark:border-border shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_rgba(148,163,184,0.26)] hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all active:translate-y-[2px] active:translate-x-[2px] active:shadow-none bg-white dark:bg-card text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <AppBreadcrumb
              className="mb-0"
              items={[
                { label: 'Courses', to: '/courses' },
                { label: instituteName || 'Course', to: `/course/${instituteId}` },
                { label: 'Grammar' },
              ]}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative z-10 w-full max-w-[1600px] mx-auto">
        <GrammarDirectorySidebar
          courseGrammars={allCourseGrammar || []}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedGrammarId={selectedGrammarId || undefined}
          onSelectGrammar={(id, unitId) => {
            if (unitId !== activeSelectedUnit) setSelectedUnit(clampUnit(unitId));
            setSelectedGrammarId(id);
          }}
        />

        <GrammarDetailPane
          grammar={selectedGrammar}
          onNext={handleNext}
          onPrev={handlePrev}
          hasNext={currentIndex >= 0 && currentIndex < grammarListWithUpdates.length - 1}
          hasPrev={currentIndex > 0}
        />

        <GrammarAuxiliaryPane grammar={selectedGrammar} onToggleStatus={handleToggleStatus} />
      </div>
    </div>
  );
};

export default GrammarModulePage;
