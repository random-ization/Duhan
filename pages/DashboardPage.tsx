import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { LearningModuleType } from '../types';
import { Library } from 'lucide-react';
import { getLabels } from '../utils/i18n';

interface DashboardPageProps {
  canAccessContent: (content: any) => boolean;
  onShowUpgradePrompt: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ canAccessContent, onShowUpgradePrompt }) => {
  const { user, language, clearMistakes } = useAuth();
  const {
    selectedInstitute,
    setInstitute,
    selectedLevel,
    setLevel,
    setActiveModule,
    setActiveCustomList,
    setActiveListType,
  } = useLearning();
  const { institutes, textbookContexts } = useData();
  const navigate = useNavigate();
  const labels = getLabels(language);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (selectedInstitute && selectedLevel) {
    return (
      <Dashboard
        user={user}
        institute={institutes.find(i => i.id === selectedInstitute)}
        level={selectedLevel}
        language={language}
        onChangeCourse={() => {
          setInstitute('');
          setLevel(0);
        }}
        onOpenVocabBook={() => {
          setActiveCustomList(user.savedWords);
          setActiveListType('SAVED');
          setActiveModule(LearningModuleType.VOCABULARY);
          navigate('/module');
        }}
        onOpenMistakeBook={() => {
          setActiveCustomList(user.mistakes);
          setActiveListType('MISTAKES');
          setActiveModule(LearningModuleType.VOCABULARY);
          navigate('/module');
        }}
        onClearMistakes={clearMistakes}
        onStartModule={mod => {
          // Check if content requires payment
          const contextKey = `${selectedInstitute}-${selectedLevel}-1`;
          const content = textbookContexts[contextKey];

          if (content && !canAccessContent(content)) {
            onShowUpgradePrompt();
            return;
          }

          setActiveModule(mod);
          navigate('/module');
        }}
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
              onClick={() => setInstitute(inst.id)}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all text-left group"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Library className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
                {inst.name}
              </h3>
              <p className="text-sm text-slate-600">{labels.clickToSelect}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Select level view
  return (
    <div>
      <button
        onClick={() => setInstitute('')}
        className="mb-6 text-sm text-slate-500 hover:text-indigo-600 flex items-center"
      >
        ← {labels.backInstitute}
      </button>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">{labels.selectLevel}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(lvl => (
          <button
            key={lvl}
            onClick={() => setLevel(lvl)}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all text-center group"
          >
            <div className="text-3xl font-bold text-indigo-600 mb-2 group-hover:scale-110 transition-transform">
              {lvl}
            </div>
            <div className="text-sm text-slate-600">{labels[`level${lvl}`] || `Level ${lvl}`}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
