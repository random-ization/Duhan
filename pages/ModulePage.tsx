import React, { useMemo, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import VocabModule from '../components/vocab';
import ReadingModule from '../src/features/textbook/LegacyReadingModule';
import ListeningModule from '../components/ListeningModule';
import GrammarModule from '../components/GrammarModule';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { LearningModuleType, TextbookContent } from '../types';
import { getLabels } from '../utils/i18n';

const ModulePage: React.FC = () => {
  const { user, language, saveWord, recordMistake, saveAnnotation } = useAuth();
  const {
    setActiveModule,
    setActiveCustomList,
    setActiveListType,
    selectedInstitute,
    selectedLevel,
  } = useLearning();
  const { institutes, textbookContexts } = useData();
  const navigate = useNavigate();
  const { moduleParam } = useParams<{ moduleParam: string }>();
  const [searchParams] = useSearchParams();
  const labels = getLabels(language);

  // Derive Module Type from URL
  const currentModule = useMemo(() => {
    switch (moduleParam?.toLowerCase()) {
      case 'vocabulary': return LearningModuleType.VOCABULARY;
      case 'reading': return LearningModuleType.READING;
      case 'listening': return LearningModuleType.LISTENING;
      case 'grammar': return LearningModuleType.GRAMMAR;
      default: return null;
    }
  }, [moduleParam]);

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
    if (!selectedInstitute || !selectedLevel) return {};
    const prefix = `${selectedInstitute}-${selectedLevel}-`;
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
  }, [textbookContexts, selectedInstitute, selectedLevel]);

  const currentCourse = useMemo(() => ({
    instituteId: selectedInstitute || '',
    level: selectedLevel || 1,
    textbookUnit: 0
  }), [selectedInstitute, selectedLevel]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Redirect if no valid module or no selection
  if (!currentModule || !selectedInstitute || !selectedLevel) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleBack = () => {
    navigate('/dashboard/course');
  };

  // Derive List for immediate render (avoid flickering)
  const listParam = searchParams.get('list');
  let derivedCustomList = undefined;
  let derivedListType = undefined;
  if (listParam === 'saved') {
    derivedCustomList = user.savedWords;
    derivedListType = 'SAVED';
  } else if (listParam === 'mistakes') {
    derivedCustomList = user.mistakes;
    derivedListType = 'MISTAKES';
  }

  return (
    <div>
      <button
        onClick={handleBack}
        className="mb-4 text-sm text-slate-500 hover:text-indigo-600 flex items-center"
      >
        ← {labels.backCurr}
      </button>
      {currentModule === LearningModuleType.VOCABULARY && (
        <VocabModule
          course={currentCourse}
          instituteName={institutes.find(i => i.id === selectedInstitute)?.name || 'Korean'}
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
          course={currentCourse}
          instituteName={institutes.find(i => i.id === selectedInstitute)?.name || 'Korean'}
          onSaveWord={saveWord}
          onSaveAnnotation={saveAnnotation}
          savedWordKeys={(user.savedWords || []).map(w => w.korean)}
          annotations={user.annotations || []}
          language={language}
          levelContexts={currentLevelContexts}
        />
      )}
      {currentModule === LearningModuleType.LISTENING && (
        <ListeningModule
          course={currentCourse}
          instituteName={institutes.find(i => i.id === selectedInstitute)?.name || 'Korean'}
          onSaveAnnotation={saveAnnotation}
          annotations={user.annotations || []}
          language={language}
          levelContexts={currentLevelContexts}
        />
      )}
      {currentModule === LearningModuleType.GRAMMAR && (
        <GrammarModule
          course={currentCourse}
          instituteName={institutes.find(i => i.id === selectedInstitute)?.name || 'Korean'}
          language={language}
          levelContexts={currentLevelContexts}
        />
      )}
    </div>
  );
};

export default ModulePage;
