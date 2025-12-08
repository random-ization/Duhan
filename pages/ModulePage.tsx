import React, { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import VocabModule from '../components/vocab';
import ReadingModule from '../components/ReadingModule';
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
    activeModule,
    setActiveModule,
    activeCustomList,
    setActiveCustomList,
    activeListType,
    setActiveListType,
    selectedInstitute,
    selectedLevel,
  } = useLearning();
  const { institutes, textbookContexts } = useData();
  const navigate = useNavigate();
  const labels = getLabels(language);

  const currentLevelContexts = useMemo(() => {
    if (!selectedInstitute || !selectedLevel) return {};
    const prefix = `${selectedInstitute}-${selectedLevel}-`;
    const contexts: Record<number, TextbookContent> = {};

    Object.keys(textbookContexts).forEach(key => {
      if (key.startsWith(prefix)) {
        // Robust parsing: slice off the prefix to get the unit number
        // This handles Institute IDs that contain dashes (e.g. UUIDs)
        const unitStr = key.slice(prefix.length);
        const unit = parseInt(unitStr, 10);

        if (!isNaN(unit)) {
          contexts[unit] = textbookContexts[key];
        }
      }
    });
    return contexts;
  }, [textbookContexts, selectedInstitute, selectedLevel]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!activeModule) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleBack = () => {
    setActiveModule(null);
    setActiveCustomList(null);
    setActiveListType(null);
    navigate('/dashboard');
  };

  return (
    <div>
      <button
        onClick={handleBack}
        className="mb-4 text-sm text-slate-500 hover:text-indigo-600 flex items-center"
      >
        ← {labels.backCurr}
      </button>
      {activeModule === LearningModuleType.VOCABULARY && (
        <VocabModule
          course={{ instituteId: selectedInstitute, level: selectedLevel, textbookUnit: 0 }}
          instituteName={institutes.find(i => i.id === selectedInstitute)?.name || 'Korean'}
          language={language}
          levelContexts={currentLevelContexts}
          customWordList={activeCustomList || undefined}
          customListType={activeListType || undefined}
          onRecordMistake={recordMistake}
          onSaveWord={saveWord}
        />
      )}
      {activeModule === LearningModuleType.READING && (
        <ReadingModule
          course={{ instituteId: selectedInstitute, level: selectedLevel, textbookUnit: 0 }}
          instituteName={institutes.find(i => i.id === selectedInstitute)?.name || 'Korean'}
          onSaveWord={saveWord}
          onSaveAnnotation={saveAnnotation}
          savedWordKeys={user.savedWords.map(w => w.korean)}
          annotations={user.annotations}
          language={language}
          levelContexts={currentLevelContexts}
        />
      )}
      {activeModule === LearningModuleType.LISTENING && (
        <ListeningModule
          course={{ instituteId: selectedInstitute, level: selectedLevel, textbookUnit: 0 }}
          instituteName={institutes.find(i => i.id === selectedInstitute)?.name || 'Korean'}
          onSaveAnnotation={saveAnnotation}
          annotations={user.annotations}
          language={language}
          levelContexts={currentLevelContexts}
        />
      )}
      {activeModule === LearningModuleType.GRAMMAR && (
        <GrammarModule
          course={{ instituteId: selectedInstitute, level: selectedLevel, textbookUnit: 0 }}
          instituteName={institutes.find(i => i.id === selectedInstitute)?.name || 'Korean'}
          language={language}
          levelContexts={currentLevelContexts}
        />
      )}
    </div>
  );
};

export default ModulePage;
