import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
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
import MobileGrammarView from '../components/mobile/MobileGrammarView';
import { useIsMobile } from '../hooks/useIsMobile';
import { Badge, Button } from '../components/ui';
import { AppBreadcrumb } from '../components/common/AppBreadcrumb';
import { useLayoutActions } from '../contexts/LayoutContext';
import { sanitizeGrammarDisplayText } from '../utils/grammarDisplaySanitizer';
import { getLocalizedContent } from '../utils/languageUtils';

const AI_PANEL_STORAGE_KEY = 'grammar_ai_panel_open';

function normalizeStatus(value: unknown): GrammarPointData['status'] {
  if (value === 'MASTERED' || value === 'LEARNING' || value === 'NEW') return value;
  return 'NEW';
}

const GrammarModulePage: React.FC = () => {
  const { instituteId } = useParams<{ instituteId: string }>();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { clearContextualSidebar } = useLayoutActions();

  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrammarId, setSelectedGrammarId] = useState<string | null>(null);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const raw = window.localStorage.getItem(AI_PANEL_STORAGE_KEY);
    return raw == null ? true : raw !== '0';
  });

  const { user, language } = useAuth();

  const instituteQuery = useQuery(INSTITUTES.get, instituteId ? { id: instituteId } : 'skip');
  const allCourseGrammar = useQuery(
    GRAMMARS.getByCourse,
    instituteId ? { courseId: instituteId, language } : 'skip'
  );

  const instituteName =
    (instituteQuery && getLocalizedContent(instituteQuery, 'name', language)) ||
    instituteQuery?.name ||
    instituteId ||
    '';

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

  const grammarListQuery = useQuery(
    GRAMMARS.getUnitGrammar,
    instituteId ? { courseId: instituteId, unitId: activeSelectedUnit, language } : 'skip'
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AI_PANEL_STORAGE_KEY, isAiPanelOpen ? '1' : '0');
  }, [isAiPanelOpen]);

  const isGrammarLoading = grammarListQuery === undefined;

  const grammarList = useMemo<GrammarPointData[]>(() => {
    if (!grammarListQuery) return [];
    return grammarListQuery.map(g => ({ ...g, status: normalizeStatus(g.status) }));
  }, [grammarListQuery]);

  const [localUpdates, setLocalUpdates] = useState<
    Map<string, { proficiency?: number; status?: GrammarPointData['status'] }>
  >(new Map());

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

  const desktopSelectedGrammarId = selectedGrammarId || grammarListWithUpdates[0]?.id || null;

  const desktopSelectedGrammar = useMemo<GrammarPointData | null>(() => {
    if (!desktopSelectedGrammarId) return null;
    return grammarListWithUpdates.find(g => g.id === desktopSelectedGrammarId) || null;
  }, [desktopSelectedGrammarId, grammarListWithUpdates]);

  const handleProficiencyUpdate = (
    grammarId: string,
    proficiency: number,
    status: GrammarPointData['status']
  ) => {
    setLocalUpdates(prev => {
      const next = new Map(prev);
      next.set(grammarId, { proficiency, status });
      return next;
    });
  };

  const handleToggleStatus = useCallback(
    async (grammarId: string) => {
      if (!user) return;

      const current = grammarListWithUpdates.find(g => g.id === grammarId);
      const newStatus = current?.status === 'MASTERED' ? 'LEARNING' : 'MASTERED';

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
        setLocalUpdates(prev => {
          const next = new Map(prev);
          next.delete(grammarId);
          return next;
        });
      }
    },
    [grammarListWithUpdates, updateStatusMutation, user]
  );

  const displayedPoints = useMemo(() => {
    if (!searchQuery.trim()) return grammarListWithUpdates;
    const q = searchQuery.toLowerCase();
    return grammarListWithUpdates.filter(point => {
      const title = sanitizeGrammarDisplayText(
        getLocalizedContent(point, 'title', language) || point.title
      ).toLowerCase();
      const summary = sanitizeGrammarDisplayText(
        getLocalizedContent(point, 'summary', language) || point.summary || ''
      ).toLowerCase();
      return title.includes(q) || summary.includes(q);
    });
  }, [grammarListWithUpdates, language, searchQuery]);

  const currentIndex = useMemo(() => {
    if (!desktopSelectedGrammarId || !grammarListWithUpdates) return -1;
    return grammarListWithUpdates.findIndex(g => g.id === desktopSelectedGrammarId);
  }, [desktopSelectedGrammarId, grammarListWithUpdates]);

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

  useEffect(() => {
    clearContextualSidebar();
  }, [clearContextualSidebar]);

  if (instituteQuery === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-lg font-semibold text-slate-500 animate-pulse">
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

  const selectedStatus = normalizeStatus(desktopSelectedGrammar?.status);
  const selectedProficiency =
    desktopSelectedGrammar?.proficiency ?? (selectedStatus === 'MASTERED' ? 100 : 0);
  const selectedTitle =
    desktopSelectedGrammar &&
    sanitizeGrammarDisplayText(
      getLocalizedContent(desktopSelectedGrammar, 'title', language) || desktopSelectedGrammar.title
    );

  const statusLabel =
    selectedStatus === 'MASTERED'
      ? t('grammarModule.statusMastered', { defaultValue: 'Mastered' })
      : selectedStatus === 'LEARNING'
        ? t('grammarModule.statusLearning', { defaultValue: 'Learning' })
        : t('grammarModule.statusNew', { defaultValue: 'New' });

  const statusClass =
    selectedStatus === 'MASTERED'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : selectedStatus === 'LEARNING'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';

  const gridStyle = isAiPanelOpen
    ? { gridTemplateColumns: '250px minmax(0,1fr) 320px' }
    : { gridTemplateColumns: '250px minmax(0,1fr)' };

  return (
    <div className="h-full min-h-0 overflow-hidden bg-slate-100 text-slate-900">
      <div
        className="h-full min-h-0 grid transition-[grid-template-columns] duration-300"
        style={gridStyle}
      >
        <GrammarDirectorySidebar
          courseGrammars={allCourseGrammar || []}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedGrammarId={desktopSelectedGrammarId || undefined}
          onSelectGrammar={(id, unitId) => {
            if (unitId !== activeSelectedUnit) setSelectedUnit(clampUnit(unitId));
            setSelectedGrammarId(id);
          }}
        />

        <section className="min-w-0 min-h-0 flex flex-col">
          <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <AppBreadcrumb
                  className="mb-0"
                  items={[
                    { label: t('nav.courses', { defaultValue: 'Courses' }), to: '/courses' },
                    {
                      label: instituteName || t('course.title', { defaultValue: 'Course' }),
                      to: `/course/${instituteId}`,
                    },
                    { label: t('nav.grammar', { defaultValue: 'Grammar' }) },
                  ]}
                />
                <p className="mt-2 truncate text-sm text-slate-600">
                  {selectedTitle ||
                    t('grammarDetail.selectPrompt', {
                      defaultValue: 'Select a grammar point to view details',
                    })}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={statusClass}>
                  {statusLabel}
                </Badge>
                <div className="hidden xl:block w-24 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${selectedProficiency}%` }}
                  />
                </div>
                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-700"
                  disabled={!desktopSelectedGrammar || isGrammarLoading}
                  onClick={() => {
                    if (desktopSelectedGrammar) {
                      void handleToggleStatus(desktopSelectedGrammar.id);
                    }
                  }}
                >
                  {selectedStatus === 'MASTERED'
                    ? t('grammarModule.unmarkMastery', { defaultValue: 'Mastered' })
                    : t('grammarModule.markMastery', { defaultValue: 'Mark learned' })}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAiPanelOpen(prev => !prev)}
                  className="border-slate-200 text-slate-700"
                >
                  {isAiPanelOpen ? (
                    <>
                      <PanelRightClose className="h-4 w-4 mr-1.5" />
                      {t('grammarModule.aiPanelHide', { defaultValue: 'Hide AI' })}
                    </>
                  ) : (
                    <>
                      <PanelRightOpen className="h-4 w-4 mr-1.5" />
                      {t('grammarModule.aiPanelShow', { defaultValue: 'Show AI' })}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </header>

          <GrammarDetailPane
            grammar={desktopSelectedGrammar}
            onNext={handleNext}
            onPrev={handlePrev}
            hasNext={currentIndex >= 0 && currentIndex < grammarListWithUpdates.length - 1}
            hasPrev={currentIndex > 0}
          />
        </section>

        {isAiPanelOpen ? <GrammarAuxiliaryPane grammar={desktopSelectedGrammar} /> : null}
      </div>
    </div>
  );
};

export default GrammarModulePage;
