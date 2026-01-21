import React, { useState, useMemo, useCallback } from 'react';
import { X, Settings as SettingsIcon } from 'lucide-react';
import { VocabSettings } from '../types';
import { Language } from '../../../types';
import { getLabels } from '../../../utils/i18n';

interface VocabSettingsModalProps {
  isOpen: boolean;
  settings: VocabSettings;
  language: Language;
  initialTab?: 'FLASHCARD' | 'LEARN';
  onClose: () => void;
  onUpdate: (newSettings: VocabSettings) => void;
}

const Switch = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
}) => (
  <div className="flex items-center justify-between py-3">
    {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
    <button
      onClick={onChange}
      className={`w-12 h-7 flex items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-indigo-600' : 'bg-slate-300'
      }`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const VocabSettingsModal: React.FC<VocabSettingsModalProps> = React.memo(
  ({ isOpen, settings, language, initialTab = 'FLASHCARD', onClose, onUpdate }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const [activeTab, setActiveTab] = useState<'FLASHCARD' | 'LEARN'>(initialTab);
    const [localSettings, setLocalSettings] = useState<VocabSettings>(settings);

    const handleSave = useCallback(() => {
      onUpdate(localSettings);
      onClose();
    }, [localSettings, onUpdate, onClose]);

    const toggleLearnType = useCallback((type: 'multipleChoice' | 'writing') => {
      setLocalSettings(prev => {
        const newTypes = { ...prev.learn.types, [type]: !prev.learn.types[type] };
        // Ensure at least one type is selected
        if (!newTypes.multipleChoice && !newTypes.writing) return prev;
        return { ...prev, learn: { ...prev.learn, types: newTypes } };
      });
    }, []);

    const toggleLearnAnswer = useCallback((lang: 'korean' | 'native') => {
      setLocalSettings(prev => {
        const newAnswers = { ...prev.learn.answers, [lang]: !prev.learn.answers[lang] };
        // Ensure at least one answer type is selected
        if (!newAnswers.korean && !newAnswers.native) return prev;
        return { ...prev, learn: { ...prev.learn, answers: newAnswers } };
      });
    }, []);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-lg text-slate-800 flex items-center">
              <SettingsIcon className="w-5 h-5 mr-2 text-indigo-600" />
              {labels.settings}
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('FLASHCARD')}
              className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${
                activeTab === 'FLASHCARD'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {labels.flashcards}
            </button>
            <button
              onClick={() => setActiveTab('LEARN')}
              className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${
                activeTab === 'LEARN'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {labels.learn}
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto">
            {activeTab === 'FLASHCARD' && (
              <div className="space-y-6">
                {/* Flashcard Settings */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    {labels.flashcards}
                  </label>

                  <Switch
                    label={labels.shuffle}
                    checked={localSettings.flashcard.random}
                    onChange={() =>
                      setLocalSettings(s => ({
                        ...s,
                        flashcard: { ...s.flashcard, random: !s.flashcard.random },
                      }))
                    }
                  />
                  <Switch
                    label={labels.autoTTS}
                    checked={localSettings.flashcard.autoTTS}
                    onChange={() =>
                      setLocalSettings(s => ({
                        ...s,
                        flashcard: { ...s.flashcard, autoTTS: !s.flashcard.autoTTS },
                      }))
                    }
                  />

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">{labels.cardFront}</span>
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                          onClick={() =>
                            setLocalSettings(s => ({
                              ...s,
                              flashcard: { ...s.flashcard, cardFront: 'KOREAN' },
                            }))
                          }
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                            localSettings.flashcard.cardFront === 'KOREAN'
                              ? 'bg-white shadow text-indigo-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {labels.korean}
                        </button>
                        <button
                          onClick={() =>
                            setLocalSettings(s => ({
                              ...s,
                              flashcard: { ...s.flashcard, cardFront: 'NATIVE' },
                            }))
                          }
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                            localSettings.flashcard.cardFront === 'NATIVE'
                              ? 'bg-white shadow text-indigo-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {labels.native}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {labels.batchSize}
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={localSettings.flashcard.batchSize}
                      onChange={e =>
                        setLocalSettings(s => ({
                          ...s,
                          flashcard: { ...s.flashcard, batchSize: parseInt(e.target.value) },
                        }))
                      }
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>5</span>
                      <span className="font-bold text-indigo-600">
                        {localSettings.flashcard.batchSize}
                      </span>
                      <span>50</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'LEARN' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    {labels.learn}
                  </label>

                  <Switch
                    label={labels.shuffle}
                    checked={localSettings.learn.random}
                    onChange={() =>
                      setLocalSettings(s => ({
                        ...s,
                        learn: { ...s.learn, random: !s.learn.random },
                      }))
                    }
                  />

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {labels.batchSize}
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={localSettings.learn.batchSize}
                      onChange={e =>
                        setLocalSettings(s => ({
                          ...s,
                          learn: { ...s.learn, batchSize: parseInt(e.target.value) },
                        }))
                      }
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>5</span>
                      <span className="font-bold text-indigo-600">
                        {localSettings.learn.batchSize}
                      </span>
                      <span>50</span>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Rating Mode Selection (FSRS) */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    {labels.ratingMode || '评分模式'}
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() =>
                        setLocalSettings(s => ({
                          ...s,
                          learn: { ...s.learn, ratingMode: 'PASS_FAIL' },
                        }))
                      }
                      className={`flex-1 px-3 py-2 text-sm font-bold rounded-md transition-all ${
                        localSettings.learn.ratingMode === 'PASS_FAIL'
                          ? 'bg-white shadow text-indigo-600'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      ✓/✗ {labels.passFail || '对/错'}
                    </button>
                    <button
                      onClick={() =>
                        setLocalSettings(s => ({
                          ...s,
                          learn: { ...s.learn, ratingMode: 'FOUR_BUTTONS' },
                        }))
                      }
                      className={`flex-1 px-3 py-2 text-sm font-bold rounded-md transition-all ${
                        localSettings.learn.ratingMode === 'FOUR_BUTTONS'
                          ? 'bg-white shadow text-indigo-600'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      🎚️ {labels.fourButtons || '4级评分'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {localSettings.learn.ratingMode === 'PASS_FAIL'
                      ? labels.passFailDesc || '简单模式：对或错'
                      : labels.fourButtonsDesc || '详细模式：忘记/困难/正常/轻松'}
                  </p>
                </div>

                <hr className="border-slate-100" />

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    {labels.questionTypes}
                  </label>
                  <Switch
                    label={labels.multipleChoice}
                    checked={localSettings.learn.types.multipleChoice}
                    onChange={() => toggleLearnType('multipleChoice')}
                  />
                  <Switch
                    label={labels.writtenQuestion}
                    checked={localSettings.learn.types.writing}
                    onChange={() => toggleLearnType('writing')}
                  />
                </div>

                <hr className="border-slate-100" />

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    {labels.answers}
                  </label>
                  <Switch
                    label={labels.korean}
                    checked={localSettings.learn.answers.korean}
                    onChange={() => toggleLearnAnswer('korean')}
                  />
                  <Switch
                    label={labels.native}
                    checked={localSettings.learn.answers.native}
                    onChange={() => toggleLearnAnswer('native')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <button
              onClick={handleSave}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              {labels.done}
            </button>
          </div>
        </div>
      </div>
    );
  }
);
VocabSettingsModal.displayName = 'VocabSettingsModal';

export default VocabSettingsModal;
