import React, {
  Suspense,
  lazy,
  useState,
  useMemo,
  useEffect,
  useCallback,
  useDeferredValue,
} from 'react';
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
import { useIsMobile } from '../hooks/useIsMobile';
import { useLayoutActions } from '../contexts/LayoutContext';
import { sanitizeGrammarDisplayText } from '../utils/grammarDisplaySanitizer';
import { getLocalizedContent } from '../utils/languageUtils';
import { resolveInstituteDefaultLevel } from '../utils/learningFlow';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../utils/browserStorage';
import { getNextGrammarSelection, normalizeGrammarProgressStatus } from '../utils/grammarProgress';

const AI_PRACTICE_DIALOG_STORAGE_KEY = 'grammar_ai_practice_dialog_open';
const MobileGrammarView = lazy(() => import('../components/mobile/MobileGrammarView'));
const DesktopGrammarModulePage = lazy(() => import('./desktop/DesktopGrammarModulePage'));

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
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedGrammarId, setSelectedGrammarId] = useState<string | null>(null);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState<boolean>(() => {
    const raw = safeGetLocalStorageItem(AI_PRACTICE_DIALOG_STORAGE_KEY);
    return raw == null ? false : raw !== '0';
  });
  const [dismissedRecommendedSelectionKey, setDismissedRecommendedSelectionKey] = useState<
    string | null
  >(null);

  const { user, language } = useAuth();

  const instituteQuery = useQuery(INSTITUTES.get, instituteId ? { id: instituteId } : 'skip');
  const allCourseGrammar = useQuery(
    GRAMMARS.getByCourse,
    instituteId ? { courseId: instituteId, language } : 'skip'
  );

  const totalUnits = useMemo(() => {
    if (Array.isArray(allCourseGrammar) && allCourseGrammar.length > 0) {
      return Math.max(1, ...allCourseGrammar.map(item => item.unitId));
    }
    return 10;
  }, [allCourseGrammar]);

  const normalizedAllCourseGrammar = useMemo<GrammarPointData[]>(
    () =>
      (allCourseGrammar || []).map(item => ({
        id: String(item.id),
        title: item.title,
        titleEn: item.titleEn,
        titleZh: item.titleZh,
        titleVi: item.titleVi,
        titleMn: item.titleMn,
        unitId: item.unitId,
        summary: item.summary,
        summaryZh: item.summary,
        type: 'GRAMMAR',
        explanation: item.summary,
        examples: [],
        status: normalizeGrammarProgressStatus(item.status),
      })),
    [allCourseGrammar]
  );

  const focusGrammarId = searchParams.get('focusGrammarId')?.trim() || null;
  const recommendedSelectionKey = `${instituteId || ''}:${focusGrammarId || 'recommended'}`;
  const hasDismissedRecommendedSelection =
    dismissedRecommendedSelectionKey === recommendedSelectionKey;
  const savedGrammarId =
    user?.lastModule === 'GRAMMAR' && user.lastInstitute === instituteId
      ? user.lastGrammarId
      : null;
  const recommendedGrammar = useMemo(
    () =>
      getNextGrammarSelection({
        grammarPoints: normalizedAllCourseGrammar,
        lastGrammarId: savedGrammarId,
      }),
    [normalizedAllCourseGrammar, savedGrammarId]
  );

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
      !hasManualUnitSelection && focusedUnitFromQuery != null
        ? focusedUnitFromQuery
        : !hasManualUnitSelection && !focusGrammarId && !hasDismissedRecommendedSelection
          ? (recommendedGrammar?.unitId ?? selectedUnit)
          : selectedUnit,
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
      {
        lastInstitute?: string;
        lastLevel?: number;
        lastUnit?: number;
        lastModule?: string;
        lastGrammarId?: string;
      },
      unknown
    >('user:updateLearningProgress')
  );

  useEffect(() => {
    if (!instituteId) return;
    learningActions?.setRecentMaterial('grammar', {
      instituteId,
      level: instituteQuery ? resolveInstituteDefaultLevel(instituteQuery) : 1,
      unit: activeSelectedUnit,
    });
  }, [activeSelectedUnit, instituteId, instituteQuery, learningActions]);

  useEffect(() => {
    safeSetLocalStorageItem(AI_PRACTICE_DIALOG_STORAGE_KEY, isAiPanelOpen ? '1' : '0');
  }, [isAiPanelOpen]);

  const isGrammarLoading = grammarListQuery === undefined;

  const grammarList = useMemo<GrammarPointData[]>(() => {
    if (!grammarListQuery) return [];
    return grammarListQuery.map(g => ({ ...g, status: normalizeGrammarProgressStatus(g.status) }));
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

  useEffect(() => {
    if (!instituteId) return;
    const progressGrammarId =
      selectedGrammarId ??
      focusGrammarId ??
      (!hasDismissedRecommendedSelection ? recommendedGrammar?.id : null);
    void updateLearningProgressMutation({
      lastInstitute: instituteId,
      lastUnit: activeSelectedUnit,
      lastModule: 'GRAMMAR',
      ...(progressGrammarId ? { lastGrammarId: progressGrammarId } : {}),
    });
  }, [
    activeSelectedUnit,
    focusGrammarId,
    hasDismissedRecommendedSelection,
    instituteId,
    recommendedGrammar?.id,
    selectedGrammarId,
    updateLearningProgressMutation,
  ]);

  const resolvedSelectedGrammarId =
    selectedGrammarId ||
    (!hasManualUnitSelection ? focusGrammarId : null) ||
    (!hasManualUnitSelection && !focusGrammarId && !hasDismissedRecommendedSelection
      ? recommendedGrammar?.id || null
      : null);

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
    const searchTerm = deferredSearchQuery.trim().toLowerCase();
    if (!searchTerm) return grammarListWithUpdates;
    return grammarListWithUpdates.filter(point => {
      const title = sanitizeGrammarDisplayText(
        getLocalizedContent(point, 'title', language) || point.title
      ).toLowerCase();
      const summary = sanitizeGrammarDisplayText(
        getLocalizedContent(point, 'summary', language) || point.summary || ''
      ).toLowerCase();
      return title.includes(searchTerm) || summary.includes(searchTerm);
    });
  }, [deferredSearchQuery, grammarListWithUpdates, language]);

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
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
            <div className="text-lg font-semibold text-slate-500 animate-pulse dark:text-slate-400">
              {t('loading', { defaultValue: 'Loading...' })}
            </div>
          </div>
        }
      >
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
          onSelectGrammar={grammar => {
            if (grammar) {
              setDismissedRecommendedSelectionKey(null);
              setSelectedGrammarId(grammar.id);
              return;
            }
            setDismissedRecommendedSelectionKey(recommendedSelectionKey);
            setSelectedGrammarId(null);
          }}
          onToggleStatus={handleToggleStatus}
          isLoading={isGrammarLoading}
          onProficiencyUpdate={handleProficiencyUpdate}
          instituteId={instituteId || ''}
        />
      </Suspense>
    );
  }

  const selectedTitle =
    desktopSelectedGrammar &&
    sanitizeGrammarDisplayText(
      getLocalizedContent(desktopSelectedGrammar, 'title', language) || desktopSelectedGrammar.title
    );

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
          <div className="text-lg font-semibold text-slate-500 animate-pulse dark:text-slate-400">
            {t('loading', { defaultValue: 'Loading...' })}
          </div>
        </div>
      }
    >
      <DesktopGrammarModulePage
        allCourseGrammar={normalizedAllCourseGrammar}
        desktopSelectedGrammarId={desktopSelectedGrammarId}
        setHasManualUnitSelection={setHasManualUnitSelection}
        setSelectedUnit={setSelectedUnit}
        setSelectedGrammarId={setSelectedGrammarId}
        activeSelectedUnit={activeSelectedUnit}
        clampUnit={clampUnit}
        language={language}
        selectedTitle={selectedTitle}
        desktopSelectedGrammar={desktopSelectedGrammar}
        isGrammarLoading={isGrammarLoading}
        isAiPanelOpen={isAiPanelOpen}
        setIsAiPanelOpen={setIsAiPanelOpen}
        navigate={navigate}
      />
    </Suspense>
  );
};

export default GrammarModulePage;
