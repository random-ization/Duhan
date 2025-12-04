import React, { useMemo } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Home from './components/Home';
import VocabModule from './components/VocabModule';
import ReadingModule from './components/ReadingModule';
import ListeningModule from './components/ListeningModule';
import GrammarModule from './components/GrammarModule';
import AdminPanel from './components/AdminPanel';
import Dashboard from './components/Dashboard';
import TopikModule from './components/TopikModule';
import { LearningModuleType } from './types';
import { getLabels } from './utils/i18n-new';
import { useApp } from './contexts/AppContext';
import { Library } from 'lucide-react';
import { Loading } from './components/common/Loading';

function App() {
  const {
    user,
    loading,
    login,
    logout,
    language,
    setLanguage,
    page,
    setPage,
    selectedInstitute,
    setSelectedInstitute,
    selectedLevel,
    setSelectedLevel,
    activeModule,
    setActiveModule,
    activeCustomList,
    setActiveCustomList,
    activeListType,
    setActiveListType,
    institutes,
    textbookContexts,
    topikExams,
    addInstitute,
    deleteInstitute,
    saveTextbookContext,
    saveTopikExam,
    deleteTopikExam,
    saveWord,
    recordMistake,
    clearMistakes,
    saveAnnotation,
    saveExamAttempt,
  } = useApp();

  const labels = getLabels(language);

  const currentLevelContexts = useMemo(() => {
    if (!selectedInstitute || !selectedLevel) return {};
    const prefix = `${selectedInstitute}-${selectedLevel}-`;
    const contexts: Record<number, any> = {};

    Object.keys(textbookContexts).forEach(key => {
      if (key.startsWith(prefix)) {
        const unit = parseInt(key.split('-')[2]);
        if (!isNaN(unit)) {
          contexts[unit] = textbookContexts[key];
        }
      }
    });
    return contexts;
  }, [textbookContexts, selectedInstitute, selectedLevel]);

  if (loading) return <Loading fullScreen size="lg" text="Loading..." />;

  const renderContent = () => {
    if (!user) return <Auth onLogin={login} language={language} />;

    if (page === 'admin' && user.role === 'ADMIN') {
      return (
        <AdminPanel
          institutes={institutes}
          onUpdateInstitutes={() => {}}
          onAddInstitute={addInstitute}
          onDeleteInstitute={deleteInstitute}
          textbookContexts={textbookContexts}
          onSaveContext={saveTextbookContext}
          language={language}
          users={[user]}
          onUpdateUser={() => {}}
          onDeleteUser={() => {}}
          stats={{
            totalUsers: 1,
            activeUsers: 1,
            premiumUsers: 0,
            totalRevenue: 0,
            contentCoverage: 0,
          }}
          topikExams={topikExams}
          onAddTopikExam={saveTopikExam}
          onUpdateTopikExam={saveTopikExam}
          onDeleteTopikExam={deleteTopikExam}
        />
      );
    }

    if (page === 'home') {
      return <Home user={user} onNavigate={setPage} language={language} />;
    }

    if (page === 'profile') {
      return <div className="text-center p-8">Profile settings coming soon.</div>;
    }

    if (page === 'topik') {
      return (
        <TopikModule
          exams={topikExams}
          language={language}
          history={user.examHistory || []}
          onSaveHistory={saveExamAttempt}
          annotations={user.annotations || []}
          onSaveAnnotation={saveAnnotation}
        />
      );
    }

    if (activeModule) {
      return (
        <div>
          <button
            onClick={() => {
              setActiveModule(null);
              setActiveCustomList(null);
              setActiveListType(null);
            }}
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
    }

    if (page === 'dashboard') {
      if (selectedInstitute && selectedLevel) {
        return (
          <Dashboard
            user={user}
            institute={institutes.find(i => i.id === selectedInstitute)}
            level={selectedLevel}
            language={language}
            onChangeCourse={() => {
              setSelectedInstitute('');
              setSelectedLevel(0);
            }}
            onOpenVocabBook={() => {
              setActiveCustomList(user.savedWords);
              setActiveListType('SAVED');
              setActiveModule(LearningModuleType.VOCABULARY);
            }}
            onOpenMistakeBook={() => {
              setActiveCustomList(user.mistakes);
              setActiveListType('MISTAKES');
              setActiveModule(LearningModuleType.VOCABULARY);
            }}
            onClearMistakes={clearMistakes}
            onStartModule={mod => setActiveModule(mod)}
          />
        );
      }
      if (!selectedInstitute) {
        return (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">{labels.selectInstitute}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {institutes.map(inst => (
                <button
                  key={inst.id}
                  onClick={() => setSelectedInstitute(inst.id)}
                  className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Library className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{inst.name}</h3>
                  <p className="text-slate-500 mt-2 text-sm">Levels 1-6</p>
                </button>
              ))}
            </div>
          </div>
        );
      }
      if (!selectedLevel) {
        return (
          <div>
            <button
              onClick={() => setSelectedInstitute('')}
              className="mb-4 text-sm text-slate-500"
            >
              ← {labels.backInst}
            </button>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">{labels.selectLevel}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className="bg-white py-8 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-center"
                >
                  <span className="block text-3xl font-bold text-slate-800 mb-1">{lvl}</span>
                  <span className="text-sm text-slate-500 uppercase tracking-wider">
                    {labels.bookLevel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      }
    }

    return (
      <div className="text-center mt-20">
        <p>{labels.noCourseSelected}</p>
      </div>
    );
  };

  return (
    <Layout
      user={user}
      onLogout={logout}
      currentPage={page}
      onNavigate={p => {
        setPage(p);
        setActiveModule(null);
        setActiveCustomList(null);
        setActiveListType(null);
      }}
      language={language}
      onLanguageChange={setLanguage}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
