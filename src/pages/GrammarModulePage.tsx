import React, { Suspense, lazy, useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { GRAMMARS, INSTITUTES, mRef } from '../utils/convexRefs';

import { useQuery, useMutation } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { useOptionalLearningActions } from '../contexts/LearningContext';
import { GrammarPointData } from '../types';
import type { Id } from '../../convex/_generated/dataModel';
import { toErrorMessage } from '../utils/errors';
import MobileGrammarView from '../components/mobile/MobileGrammarView';
import DesktopGrammarModulePage from './desktop/DesktopGrammarModulePage';
import { useIsMobile } from '../hooks/useIsMobile';
import { useLayoutActions } from '../contexts/LayoutContext';
import { sanitizeGrammarDisplayText } from '../utils/grammarDisplaySanitizer';
import { getLocalizedContent } from '../utils/languageUtils';
import { resolveInstituteDefaultLevel } from '../utils/learningFlow';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../utils/browserStorage';

const AI_PANEL_STORAGE_KEY = 'grammar_ai_panel_open';

function normalizeStatus(value: unknown): GrammarPointData['status'] {
  if (value === 'MASTERED' || value === 'LEARNING' || value === 'NEW') return value;
  return 'NEW';
}

const GrammarModulePage: React.FC = () => {
  const { instituteId } = useParams<{ instituteId: string }>();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const navigate = useLocalizedNavigate();
  const { clearContextualSidebar } = useLayoutActions();
  const learningActions = useOptionalLearningActions();
  const focusUnitParam = Number(searchParams.get('focusUnit'));
  const initialSelectedUnit =
    Number.isFinite(focusUnitParam) && focusUnitParam > 0 ? Math.floor(focusUnitParam) : 1;

  const [selectedUnit, setSelectedUnit] = useState<number>(initialSelectedUnit);
  const [hasManualUnitSelection, setHasManualUnitSelection] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrammarId, setSelectedGrammarId] = useState<string | null>(null);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState<boolean>(() => {
    const raw = safeGetLocalStorageItem(AI_PANEL_STORAGE_KEY);
    return raw == null ? true : raw !== '0';
  });

  const { user, language } = useAuth();

  const instituteQuery = useQuery(INSTITUTES.get, instituteId ? { id: instituteId as any } : 'skip');
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

  const focusGrammarId = searchParams.get('focusGrammarId')?.trim() || null;
  const focusedUnitFromQuery = useMemo(() => {
    if (!focusGrammarId || !allCourseGrammar || allCourseGrammar.length === 0) {
      return null;
    }
    const target = allCourseGrammar.find(item => String(item.id) === focusGrammarId);
    if (!target) {
      return null;
    }
    return Math.max(1, Math.min(target.unitId, totalUnits));
  }, [focusGrammarId, allCourseGrammar, totalUnits]);

  const activeSelectedUnit = Math.max(
    1,
    Math.min(
      !hasManualUnitSelection && focusedUnitFromQuery != null ? focusedUnitFromQuery : selectedUnit,
      totalUnits
    )
  );

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
    if (!instituteId) return;
    learningActions?.setRecentMaterial('grammar', {
      instituteId,
      level: instituteQuery ? resolveInstituteDefaultLevel(instituteQuery) : 1,
      unit: activeSelectedUnit,
    });
  }, [activeSelectedUnit, instituteId, instituteQuery, learningActions]);

  useEffect(() => {
    safeSetLocalStorageItem(AI_PANEL_STORAGE_KEY, isAiPanelOpen ? '1' : '0');
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

  const resolvedSelectedGrammarId =
    selectedGrammarId || (!hasManualUnitSelection ? focusGrammarId : null);

  const selectedGrammar = useMemo<GrammarPointData | null>(() => {
    if (!resolvedSelectedGrammarId) return null;
    return grammarListWithUpdates.find(g => g.id === resolvedSelectedGrammarId) || null;
  }, [grammarListWithUpdates, resolvedSelectedGrammarId]);

  const desktopSelectedGrammarId =
    resolvedSelectedGrammarId || grammarListWithUpdates[0]?.id || null;

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
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="text-lg font-semibold text-slate-500 animate-pulse dark:text-slate-400">
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
          setHasManualUnitSelection(true);
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
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/30'
      : selectedStatus === 'LEARNING'
        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-400/30'
        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  return (
    <DesktopGrammarModulePage
      allCourseGrammar={allCourseGrammar || []}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      desktopSelectedGrammarId={desktopSelectedGrammarId}
      setHasManualUnitSelection={setHasManualUnitSelection}
      setSelectedUnit={setSelectedUnit}
      setSelectedGrammarId={setSelectedGrammarId}
      activeSelectedUnit={activeSelectedUnit}
      clampUnit={clampUnit}
      instituteName={instituteName}
      instituteId={instituteId || ''}
      language={language}
      t={t}
      selectedStatus={selectedStatus}
      statusLabel={statusLabel}
      statusClass={statusClass}
      selectedProficiency={selectedProficiency}
      selectedTitle={selectedTitle}
      desktopSelectedGrammar={desktopSelectedGrammar}
      handleToggleStatus={handleToggleStatus}
      isGrammarLoading={isGrammarLoading}
      isAiPanelOpen={isAiPanelOpen}
      setIsAiPanelOpen={setIsAiPanelOpen}
      grammarListWithUpdates={grammarListWithUpdates}
      currentIndex={currentIndex}
      handleNext={handleNext}
      handlePrev={handlePrev}
      navigate={navigate}
    />
  );
};

export default GrammarModulePage;

