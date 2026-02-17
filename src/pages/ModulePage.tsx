import React, { useMemo, useEffect } from 'react';
import { Navigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { VocabModule } from '../features/vocab';
import ReadingModule from '../features/textbook/ReadingModule';
import ListeningModule from '../features/textbook/ListeningModule';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { LearningModuleType } from '../types';
import { useUserActions } from '../hooks/useUserActions';
import BackButton from '../components/ui/BackButton';
import { getLocalizedContent } from '../utils/languageUtils';
import { qRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { AppBreadcrumb } from '../components/common/AppBreadcrumb';

const useModuleState = (
  listParam: string | null,
  savedWordsData: any[] | undefined,
  mistakesData: any[] | undefined
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
  location: any
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
  navigate: any
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

const ModulePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, language } = useAuth();
  const { saveWord, recordMistake } = useUserActions();
  const {
    setActiveModule,
    setActiveCustomList,
    setActiveListType,
    selectedInstitute,
    selectedLevel,
    setSelectedInstitute,
    setSelectedLevel,
  } = useLearning();
  const { institutes } = useData();
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

  const institute = institutes.find(i => i.id === effectiveInstitute);
  const instituteName =
    (institute ? getLocalizedContent(institute, 'name', language) || institute.name : null) ||
    'Korean';
  const moduleLabel = useMemo(() => {
    if (currentModule === LearningModuleType.READING) {
      return t('courseDashboard.modules.reading', { defaultValue: 'Reading' });
    }
    if (currentModule === LearningModuleType.LISTENING) {
      return t('courseDashboard.modules.listening', { defaultValue: 'Listening' });
    }
    if (currentModule === LearningModuleType.VOCABULARY) {
      return t('courseDashboard.modules.vocabulary', { defaultValue: 'Vocabulary' });
    }
    if (currentModule === LearningModuleType.GRAMMAR) {
      return t('courseDashboard.modules.grammar', { defaultValue: 'Grammar' });
    }
    return t('module.title', { defaultValue: 'Module' });
  }, [currentModule, t]);

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

  if (!currentModule || (!isCourseRoute && (!selectedInstitute || !selectedLevel))) {
    const redirectPath = isCourseRoute && instituteId ? `/course/${instituteId}` : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  const courseBase = effectiveInstitute ? `/course/${effectiveInstitute}` : '/courses';

  if (
    currentModule === LearningModuleType.GRAMMAR ||
    (currentModule === LearningModuleType.VOCABULARY && !isCustomList)
  ) {
    const subPath = currentModule === LearningModuleType.GRAMMAR ? 'grammar' : 'vocab';
    return <Navigate to={`${courseBase}/${subPath}`} replace />;
  }

  const renderModule = () => {
    switch (currentModule) {
      case LearningModuleType.VOCABULARY:
        return (
          isCustomList && (
            <VocabModule
              course={currentCourse}
              instituteName={instituteName}
              language={language}
              levelContexts={{}}
              customWordList={derivedCustomList}
              customListType={derivedListType}
              onRecordMistake={recordMistake}
              onSaveWord={saveWord}
            />
          )
        );
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
      {renderModule()}
    </div>
  );
};

export default ModulePage;
