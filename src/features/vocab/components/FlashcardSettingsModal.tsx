import React from 'react';
import { X } from 'lucide-react';
import { getLabels } from '../../../utils/i18n';

interface SettingsState {
    autoTTS: boolean;
    cardFront: 'KOREAN' | 'NATIVE';
    ratingMode: 'PASS_FAIL' | 'FOUR_BUTTONS';
}

interface FlashcardSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: SettingsState;
    onUpdate: (settings: SettingsState) => void;
    labels: ReturnType<typeof getLabels>;
}

const FlashcardSettingsModal: React.FC<FlashcardSettingsModalProps> = ({
    isOpen,
    onClose,
    settings,
    onUpdate,
    labels,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 w-full h-full cursor-default"
                onClick={onClose}
                aria-label="Close settings"
            />
            <div
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative z-10"
                aria-modal="true"
                aria-labelledby="settings-title"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 id="settings-title" className="text-xl font-black text-slate-900">
                        ⚙️ {labels.settings}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Auto TTS */}
                <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 mb-3">
                    <div>
                        <span className="font-bold text-slate-700 block" id="auto-tts-label">
                            🔊 {labels.autoTTS}
                        </span>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.autoTTS}
                        onChange={e => onUpdate({ ...settings, autoTTS: e.target.checked })}
                        className="w-5 h-5 accent-indigo-500"
                        aria-labelledby="auto-tts-label"
                    />
                </label>

                {/* Card Front */}
                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {labels.cardFront}
                    </label>
                    <div className="space-y-2">
                        <label
                            className={`flex items-center p-3 rounded-xl cursor-pointer ${settings.cardFront === 'KOREAN'
                                    ? 'bg-indigo-50 border-2 border-indigo-300'
                                    : 'bg-slate-50 border-2 border-transparent'
                                }`}
                        >
                            <input
                                type="radio"
                                checked={settings.cardFront === 'KOREAN'}
                                onChange={() => onUpdate({ ...settings, cardFront: 'KOREAN' })}
                                className="mr-3"
                            />
                            <span className="font-medium">🇰🇷 {labels.koreanFront}</span>
                        </label>
                        <label
                            className={`flex items-center p-3 rounded-xl cursor-pointer ${settings.cardFront === 'NATIVE'
                                    ? 'bg-indigo-50 border-2 border-indigo-300'
                                    : 'bg-slate-50 border-2 border-transparent'
                                }`}
                        >
                            <input
                                type="radio"
                                checked={settings.cardFront === 'NATIVE'}
                                onChange={() => onUpdate({ ...settings, cardFront: 'NATIVE' })}
                                className="mr-3"
                            />
                            <span className="font-medium">🇨🇳 {labels.nativeFront}</span>
                        </label>
                    </div>
                </div>

                {/* Rating Mode */}
                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {labels.ratingMode || '评分模式'}
                    </label>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => onUpdate({ ...settings, ratingMode: 'PASS_FAIL' })}
                            className={`flex-1 px-3 py-2 text-sm font-bold rounded-md transition-all ${settings.ratingMode === 'PASS_FAIL'
                                    ? 'bg-white shadow text-indigo-600'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            ✓/✗ {labels.passFail || '对/错'}
                        </button>
                        <button
                            onClick={() => onUpdate({ ...settings, ratingMode: 'FOUR_BUTTONS' })}
                            className={`flex-1 px-3 py-2 text-sm font-bold rounded-md transition-all ${settings.ratingMode === 'FOUR_BUTTONS'
                                    ? 'bg-white shadow text-indigo-600'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            🎚️ {labels.fourButtons || '4级'}
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        {settings.ratingMode === 'PASS_FAIL'
                            ? labels.passFailDesc || '简单模式：对或错'
                            : labels.fourButtonsDesc || '详细模式：忘记/困难/正常/轻松'}
                    </p>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800"
                >
                    {labels.done || '完成'}
                </button>
            </div>
        </div>
    );
};

export default FlashcardSettingsModal;
