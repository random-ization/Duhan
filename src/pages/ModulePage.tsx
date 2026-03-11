import React, { useMemo, useEffect } from 'react';
import { Navigate, useParams, useSearchParams, useLocation, type Location } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { VocabModule } from '../features/vocab';
import ReadingModule from '../features/textbook/ReadingModule';
import ListeningModule from '../features/textbook/ListeningModule';
import { useAuth } from '../contexts/AuthContext';
import { useLearningActions, useLearningSelection } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { LearningModuleType } from '../types';
import { useUserActions } from '../hooks/useUserActions';
import BackButton from '../components/ui/BackButton';
import { getLocalizedContent } from '../utils/languageUtils';
import { qRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { AppBreadcrumb } from '../components/common/AppBreadcrumb';

type SavedWordRow = {
  id: string;
  korean: string;
  english: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  createdAt: number;
};

type MistakeRow = {
  id: string;
  korean: string;
  english: string;
  context?: string;
  createdAt: number;
};

type LocalizedNavigate = ReturnType<typeof useLocalizedNavigate>;
type TranslateFn = ReturnType<typeof useTranslation>['t'];
type AppLanguage = ReturnType<typeof useAuth>['language'];
type InstituteLookup = { id: string; name: string; [key: string]: unknown };
type CustomWordList = ReturnType<typeof useModuleState>['derivedCustomList'];
type CustomListType = ReturnType<typeof useModuleState>['derivedListType'];

const useModuleState = (
  listParam: string | null,
  savedWordsData: SavedWordRow[] | undefined,
  mistakesData: MistakeRow[] | undefined
) => {
  const derivedCustomList = useMemo(() => {
    if (listParam === 'saved') {
      return (savedWordsData ?? []).map(w => ({
        korean: w.korean,
        english: w.english,
        exampleSentence: w.exampleSentence,
        exampleTranslation: w.exampleTranslation,
      }));
    }
    if (listParam === 'mistakes') {
      return (mistakesData ?? []).map(m => ({
        id: m.id,
        korean: m.korean,
        english: m.english,
        createdAt: m.createdAt,
      }));
    }
    return undefined;
  }, [listParam, savedWordsData, mistakesData]);

  const derivedListType = useMemo(() => {
    if (listParam === 'saved') return 'SAVED' as const;
    if (listParam === 'mistakes') return 'MISTAKES' as const;
    return undefined;
  }, [listParam]);

  return { derivedCustomList, derivedListType };
};

const useRouteInfo = (
  moduleParam: string | undefined,
  instituteId: string | undefined,
  location: Location
) => {
  const isCourseRoute = useMemo(
    () => Boolean(instituteId) && location.pathname.includes('/course/'),
    [instituteId, location.pathname]
  );

  const effectiveModuleParam = useMemo(() => {
    if (isCourseRoute && instituteId) {
      return location.pathname.split('/').at(-1);
    }
    return moduleParam;
  }, [isCourseRoute, instituteId, location.pathname, moduleParam]);

  return { isCourseRoute, effectiveModuleParam };
};

const useModuleNavigation = (
  isCourseRoute: boolean,
  instituteId: string | undefined,
  navigate: LocalizedNavigate
) => {
  const handleBack = () => {
    navigate(isCourseRoute && instituteId ? `/course/${instituteId}` : '/dashboard/course');
  };
  return { handleBack };
};

const useModuleType = (effectiveModuleParam: string | undefined) => {
  return useMemo(() => {
    const param = effectiveModuleParam?.toLowerCase();
    const mapping: Record<string, LearningModuleType> = {
      vocabulary: LearningModuleType.VOCABULARY,
      vocab: LearningModuleType.VOCABULARY,
      reading: LearningModuleType.READING,
      listening: LearningModuleType.LISTENING,
      grammar: LearningModuleType.GRAMMAR,
    };
    return param ? mapping[param] || null : null;
  }, [effectiveModuleParam]);
};

const useModuleData = (listParam: string | null) => {
  const savedWordsData = useQuery(
    qRef<{ limit?: number }, SavedWordRow[]>('user:getSavedWords'),
    listParam === 'saved' ? { limit: 500 } : 'skip'
  );
  const mistakesData = useQuery(
    qRef<{ limit?: number }, MistakeRow[]>('user:getMistakes'),
    listParam === 'mistakes' ? { limit: 500 } : 'skip'
  );
  return { savedWordsData, mistakesData };
};

const resolveInstituteName = ({
  institutes,
  institutesLoading,
  effectiveInstitute,
  language,
  t,
}: {
  institutes: InstituteLookup[] | undefined;
  institutesLoading: boolean;
  effectiveInstitute: string | undefined;
  language: AppLanguage;
  t: TranslateFn;
}): string => {
  if (institutesLoading && effectiveInstitute) {
    return t('common.loading', { defaultValue: 'Loading...' });
  }
  const institute = institutes?.find(i => i.id === effectiveInstitute);
  if (!institute) return 'Korean';
  return getLocalizedContent(institute, 'name', language) || institute.name;
};

const resolveModuleLabel = (currentModule: LearningModuleType | null, t: TranslateFn): string => {
  switch (currentModule) {
    case LearningModuleType.READING:
      return t('courseDashboard.modules.reading', { defaultValue: 'Reading' });
    case LearningModuleType.LISTENING:
      return t('courseDashboard.modules.listening', { defaultValue: 'Listening' });
    case LearningModuleType.VOCABULARY:
      return t('courseDashboard.modules.vocabulary', { defaultValue: 'Vocabulary' });
    case LearningModuleType.GRAMMAR:
      return t('courseDashboard.modules.grammar', { defaultValue: 'Grammar' });
    default:
      return t('module.title', { defaultValue: 'Module' });
  }
};

const shouldRedirectForMissingSelection = ({
  currentModule,
  isCourseRoute,
  selectedInstitute,
  selectedLevel,
}: {
  currentModule: LearningModuleType | null;
  isCourseRoute: boolean;
  selectedInstitute: string | null;
  selectedLevel: number | null;
}): boolean => {
  if (!currentModule) return true;
  if (isCourseRoute) return false;
  return !selectedInstitute || !selectedLevel;
};

const getModuleRedirectSubPath = (
  currentModule: LearningModuleType | null,
  isCustomList: boolean
): 'grammar' | 'vocab' | null => {
  if (currentModule === LearningModuleType.GRAMMAR) return 'grammar';
  if (currentModule === LearningModuleType.VOCABULARY && !isCustomList) return 'vocab';
  return null;
};

const renderModuleContent = ({
  currentModule,
  isCustomList,
  currentCourse,
  instituteName,
  language,
  derivedCustomList,
  derivedListType,
  onRecordMistake,
  onSaveWord,
  effectiveInstitute,
  effectiveLevel,
  t,
  handleBack,
}: {
  currentModule: LearningModuleType | null;
  isCustomList: boolean;
  currentCourse: { instituteId: string; level: number; textbookUnit: number };
  instituteName: string;
  language: AppLanguage;
  derivedCustomList: CustomWordList;
  derivedListType: CustomListType;
  onRecordMistake: ReturnType<typeof useUserActions>['recordMistake'];
  onSaveWord: ReturnType<typeof useUserActions>['saveWord'];
  effectiveInstitute: string;
  effectiveLevel: number;
  t: TranslateFn;
  handleBack: () => void;
}) => {
  switch (currentModule) {
    case LearningModuleType.VOCABULARY:
      return isCustomList ? (
        <VocabModule
          course={currentCourse}
          instituteName={instituteName}
          language={language}
          levelContexts={{}}
          customWordList={derivedCustomList}
          customListType={derivedListType}
          onRecordMistake={onRecordMistake}
          onSaveWord={onSaveWord}
        />
      ) : null;
    case LearningModuleType.READING:
      return (
        <ReadingModule
          courseId={effectiveInstitute}
          unitIndex={effectiveLevel}
          unitTitle={t('module.unitTitle', { unit: effectiveLevel })}
          language={language}
          onBack={handleBack}
        />
      );
    case LearningModuleType.LISTENING:
      return (
        <ListeningModule
          courseId={effectiveInstitute}
          unitIndex={effectiveLevel}
          unitTitle={t('module.listeningUnitTitle', { unit: effectiveLevel })}
          language={language}
          onBack={handleBack}
        />
      );
    default:
      return null;
  }
};

const ModulePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, language } = useAuth();
  const { saveWord, recordMistake } = useUserActions();
  const { selectedInstitute, selectedLevel } = useLearningSelection();
  const {
    setActiveModule,
    setActiveCustomList,
    setActiveListType,
    setSelectedInstitute,
    setSelectedLevel,
  } = useLearningActions();
  const { institutes, isLoading: institutesLoading } = useData();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { moduleParam, instituteId } = useParams<{ moduleParam: string; instituteId?: string }>();
  const [searchParams] = useSearchParams();
  const listParam = searchParams.get('list');
  const { isCourseRoute, effectiveModuleParam } = useRouteInfo(moduleParam, instituteId, location);
  const { handleBack } = useModuleNavigation(isCourseRoute, instituteId, navigate);
  const { savedWordsData, mistakesData } = useModuleData(listParam);

  // Sync instituteId from URL to LearningContext when using course routes
  useEffect(() => {
    if (isCourseRoute && instituteId && instituteId !== selectedInstitute) {
      setSelectedInstitute(instituteId);
      if (!selectedLevel) setSelectedLevel(1);
    }
  }, [
    isCourseRoute,
    instituteId,
    selectedInstitute,
    selectedLevel,
    setSelectedInstitute,
    setSelectedLevel,
  ]);

  const effectiveInstitute = isCourseRoute && instituteId ? instituteId : selectedInstitute;
  const effectiveLevel = selectedLevel || 1;
  const currentModule = useModuleType(effectiveModuleParam);

  // Sync URL state to Context (for consistency across app)
  useEffect(() => {
    if (currentModule) {
      setActiveModule(currentModule);
    }
  }, [currentModule, setActiveModule]);

  const currentCourse = useMemo(
    () => ({
      instituteId: effectiveInstitute || '',
      level: effectiveLevel,
      textbookUnit: 0,
    }),
    [effectiveInstitute, effectiveLevel]
  );

  const instituteName = resolveInstituteName({
    institutes: institutes as InstituteLookup[] | undefined,
    institutesLoading,
    effectiveInstitute,
    language,
    t,
  });
  const moduleLabel = resolveModuleLabel(currentModule, t);

  const isCustomList = listParam === 'saved' || listParam === 'mistakes';

  const { derivedCustomList, derivedListType } = useModuleState(
    listParam,
    savedWordsData,
    mistakesData
  );

  useEffect(() => {
    if (!currentModule) return;
    if (derivedCustomList && derivedListType) {
      setActiveCustomList(derivedCustomList);
      setActiveListType(derivedListType);
    } else {
      setActiveCustomList(null);
      setActiveListType(null);
    }
  }, [currentModule, derivedCustomList, derivedListType, setActiveCustomList, setActiveListType]);

  if (!user) return <Navigate to="/" replace />;

  if (
    shouldRedirectForMissingSelection({
      currentModule,
      isCourseRoute,
      selectedInstitute,
      selectedLevel,
    })
  ) {
    const redirectPath = isCourseRoute && instituteId ? `/course/${instituteId}` : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  const courseBase = effectiveInstitute ? `/course/${effectiveInstitute}` : '/courses';
  const subPath = getModuleRedirectSubPath(currentModule, isCustomList);

  if (subPath) {
    return <Navigate to={`${courseBase}/${subPath}`} replace />;
  }
  const moduleContent = renderModuleContent({
    currentModule,
    isCustomList,
    currentCourse,
    instituteName,
    language,
    derivedCustomList,
    derivedListType,
    onRecordMistake: recordMistake,
    onSaveWord: saveWord,
    effectiveInstitute: effectiveInstitute || '',
    effectiveLevel,
    t,
    handleBack,
  });

  return (
    <div className="p-6">
      <AppBreadcrumb
        className="mb-4"
        items={[
          { label: t('coursesOverview.pageTitle', { defaultValue: 'Courses' }), to: '/courses' },
          { label: instituteName, to: courseBase },
          { label: moduleLabel },
        ]}
      />
      <div className="mb-6">
        <BackButton onClick={handleBack} />
      </div>
      {moduleContent}
    </div>
  );
};

export default ModulePage;
