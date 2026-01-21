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
import { LearningModuleType, VocabularyItem, Mistake } from '../types';
import { useUserActions } from '../hooks/useUserActions';
import BackButton from '../components/ui/BackButton';
import { getLocalizedContent } from '../utils/languageUtils';
import { qRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';

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

  // Support both route patterns:
  // 1. /dashboard/:moduleParam (old pattern)
  // 2. /course/:instituteId/:moduleParam (new pattern)
  const { moduleParam, instituteId } = useParams<{ moduleParam: string; instituteId?: string }>();
  const [searchParams] = useSearchParams();
  const listParam = searchParams.get('list');

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

  const savedWordsData = useQuery(
    qRef<{ limit?: number }, SavedWordRow[]>('user:getSavedWords'),
    listParam === 'saved' ? { limit: 500 } : 'skip'
  );
  const mistakesData = useQuery(
    qRef<{ limit?: number }, MistakeRow[]>('user:getMistakes'),
    listParam === 'mistakes' ? { limit: 500 } : 'skip'
  );

  // Determine if we're using the new course route pattern
  const isCourseRoute = location.pathname.startsWith('/course/');

  // For course routes, extract module from the last path segment
  const effectiveModuleParam = useMemo(() => {
    if (isCourseRoute && instituteId) {
      const pathParts = location.pathname.split('/');
      return pathParts[pathParts.length - 1]; // vocab, reading, listening, grammar
    }
    return moduleParam;
  }, [isCourseRoute, instituteId, location.pathname, moduleParam]);

  // Sync instituteId from URL to LearningContext when using course routes
  useEffect(() => {
    if (isCourseRoute && instituteId && instituteId !== selectedInstitute) {
      setSelectedInstitute(instituteId);
      // Set default level to 1 if not already set
      if (!selectedLevel) {
        setSelectedLevel(1);
      }
    }
  }, [
    isCourseRoute,
    instituteId,
    selectedInstitute,
    selectedLevel,
    setSelectedInstitute,
    setSelectedLevel,
  ]);

  // Effective institute and level (prefer URL params for course routes)
  const effectiveInstitute = isCourseRoute && instituteId ? instituteId : selectedInstitute;
  const effectiveLevel = selectedLevel || 1;

  // Derive Module Type from URL
  const currentModule = useMemo(() => {
    const param = effectiveModuleParam?.toLowerCase();
    switch (param) {
      case 'vocabulary':
      case 'vocab':
        return LearningModuleType.VOCABULARY;
      case 'reading':
        return LearningModuleType.READING;
      case 'listening':
        return LearningModuleType.LISTENING;
      case 'grammar':
        return LearningModuleType.GRAMMAR;
      default:
        return null;
    }
  }, [effectiveModuleParam]);

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

  const derivedCustomList = useMemo(() => {
    if (listParam === 'saved') {
      return (savedWordsData ?? []).map(
        (w): VocabularyItem => ({
          korean: w.korean,
          english: w.english,
          exampleSentence: w.exampleSentence,
          exampleTranslation: w.exampleTranslation,
        })
      );
    }
    if (listParam === 'mistakes') {
      return (mistakesData ?? []).map(
        (m): Mistake => ({
          id: m.id,
          korean: m.korean,
          english: m.english,
          createdAt: m.createdAt,
        })
      );
    }
    return undefined;
  }, [listParam, savedWordsData, mistakesData]);

  const derivedListType = useMemo(() => {
    if (listParam === 'saved') return 'SAVED' as const;
    if (listParam === 'mistakes') return 'MISTAKES' as const;
    return undefined;
  }, [listParam]);

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

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Redirect if no valid module
  if (!currentModule) {
    // For course routes, go back to course dashboard
    if (isCourseRoute && instituteId) {
      return <Navigate to={`/course/${instituteId}`} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // For course routes, don't require selectedInstitute from context (we have it from URL)
  if (!isCourseRoute && (!selectedInstitute || !selectedLevel)) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleBack = () => {
    // Navigate back to appropriate dashboard
    if (isCourseRoute && instituteId) {
      navigate(`/course/${instituteId}`);
    } else {
      navigate('/dashboard/course');
    }
  };

  const institute = institutes.find(i => i.id === effectiveInstitute);
  const instituteName = institute
    ? getLocalizedContent(institute, 'name', language) || institute.name || 'Korean'
    : 'Korean';

  const isCustomList = listParam === 'saved' || listParam === 'mistakes';
  const courseBase = effectiveInstitute ? `/course/${effectiveInstitute}` : '/courses';

  if (currentModule === LearningModuleType.VOCABULARY && !isCustomList) {
    return <Navigate to={`${courseBase}/vocab`} replace />;
  }

  if (currentModule === LearningModuleType.GRAMMAR) {
    return <Navigate to={`${courseBase}/grammar`} replace />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <BackButton onClick={handleBack} />
      </div>
      {currentModule === LearningModuleType.VOCABULARY && isCustomList && (
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
      )}
      {currentModule === LearningModuleType.READING && (
        <ReadingModule
          courseId={effectiveInstitute || 'snu_1a'}
          unitIndex={effectiveLevel}
          unitTitle={t('module.unitTitle', { unit: effectiveLevel })}
          language={language}
          onBack={handleBack}
        />
      )}
      {currentModule === LearningModuleType.LISTENING && (
        <ListeningModule
          courseId={effectiveInstitute || 'snu_1a'}
          unitIndex={effectiveLevel}
          unitTitle={t('module.listeningUnitTitle', { unit: effectiveLevel })}
          language={language}
          onBack={handleBack}
        />
      )}
    </div>
  );
};

export default ModulePage;
