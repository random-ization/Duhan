import React, { useMemo, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { VocabModule } from '../features/vocab';
import ReadingModule from '../features/textbook/ReadingModule';
import ListeningModule from '../features/textbook/ListeningModule';
import GrammarModule from '../components/GrammarModule';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { LearningModuleType, TextbookContent } from '../types';
import { getLabels } from '../utils/i18n';
import { useUserActions } from '../hooks/useUserActions';
import BackButton from '../components/ui/BackButton';

const ModulePage: React.FC = () => {
  const { user, language } = useAuth();
  const { saveWord, recordMistake, saveAnnotation } = useUserActions();
  const {
    setActiveModule,
    setActiveCustomList,
    setActiveListType,
    selectedInstitute,
    selectedLevel,
    setSelectedInstitute,
    setSelectedLevel,
  } = useLearning();
  const { institutes, textbookContexts } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  // Support both route patterns:
  // 1. /dashboard/:moduleParam (old pattern)
  // 2. /course/:instituteId/:moduleParam (new pattern)
  const { moduleParam, instituteId } = useParams<{ moduleParam: string; instituteId?: string }>();
  const [searchParams] = useSearchParams();
  const labels = getLabels(language);

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
  }, [isCourseRoute, instituteId, selectedInstitute, selectedLevel, setSelectedInstitute, setSelectedLevel]);

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
      case 'reading': return LearningModuleType.READING;
      case 'listening': return LearningModuleType.LISTENING;
      case 'grammar': return LearningModuleType.GRAMMAR;
      default: return null;
    }
  }, [effectiveModuleParam]);

  // Sync URL state to Context (for consistency across app)
  useEffect(() => {
    if (currentModule) {
      setActiveModule(currentModule);

      const listParam = searchParams.get('list');
      if (listParam === 'saved' && user?.savedWords) {
        setActiveCustomList(user.savedWords);
        setActiveListType('SAVED');
      } else if (listParam === 'mistakes' && user?.mistakes) {
        setActiveCustomList(user.mistakes);
        setActiveListType('MISTAKES');
      } else {
        setActiveCustomList(null);
        setActiveListType(null);
      }
    }
  }, [currentModule, searchParams, setActiveModule, setActiveCustomList, setActiveListType, user]);

  const currentLevelContexts = useMemo(() => {
    if (!effectiveInstitute || !effectiveLevel) return {};
    const prefix = `${effectiveInstitute}-${effectiveLevel}-`;
    const contexts: Record<number, TextbookContent> = {};

    Object.keys(textbookContexts).forEach(key => {
      if (key.startsWith(prefix)) {
        const unitStr = key.slice(prefix.length);
        const unit = parseInt(unitStr, 10);
        if (!isNaN(unit)) {
          contexts[unit] = textbookContexts[key];
        }
      }
    });
    return contexts;
  }, [textbookContexts, effectiveInstitute, effectiveLevel]);

  const currentCourse = useMemo(() => ({
    instituteId: effectiveInstitute || '',
    level: effectiveLevel,
    textbookUnit: 0
  }), [effectiveInstitute, effectiveLevel]);

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

  // Derive List for immediate render (avoid flickering)
  const listParam = searchParams.get('list');
  let derivedCustomList = undefined;
  let derivedListType = undefined;
  if (listParam === 'saved') {
    derivedCustomList = user.savedWords;
    derivedListType = 'SAVED' as const;
  } else if (listParam === 'mistakes') {
    derivedCustomList = user.mistakes;
    derivedListType = 'MISTAKES' as const;
  }

  const instituteName = institutes.find(i => i.id === effectiveInstitute)?.name || 'Korean';

  return (
    <div className="p-6">
      <div className="mb-6">
        <BackButton onClick={handleBack} />
      </div>
      {currentModule === LearningModuleType.VOCABULARY && (
        <VocabModule
          course={currentCourse}
          instituteName={instituteName}
          language={language}
          levelContexts={currentLevelContexts}
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
          unitTitle={`第${effectiveLevel}单元`}
          language={language}
          onBack={handleBack}
        />
      )}
      {currentModule === LearningModuleType.LISTENING && (
        <ListeningModule
          courseId={effectiveInstitute || 'snu_1a'}
          unitIndex={effectiveLevel}
          unitTitle={`第${effectiveLevel}单元 · 听力`}
          language={language}
          onBack={handleBack}
        />
      )}
      {currentModule === LearningModuleType.GRAMMAR && (
        <GrammarModule
          course={currentCourse}
          instituteName={instituteName}
          language={language}
          levelContexts={currentLevelContexts}
        />
      )}
    </div>
  );
};

export default ModulePage;
