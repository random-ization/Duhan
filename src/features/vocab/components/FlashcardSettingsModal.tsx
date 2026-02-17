import React from 'react';
import { X } from 'lucide-react';
import { getLabels } from '../../../utils/i18n';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../../../components/ui';
import { Button } from '../../../components/ui';
import { Checkbox } from '../../../components/ui';
import { Radio } from '../../../components/ui';

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

  const vocabLabels = labels.vocab || {};

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay unstyled className="fixed inset-0 bg-black/50 z-[120]" />
        <DialogContent
          unstyled
          closeOnEscape={false}
          lockBodyScroll={false}
          className="fixed inset-0 z-[121] flex items-center justify-center p-4 pointer-events-none"
        >
          <div
            className="pointer-events-auto bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl relative z-10"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 id="settings-title" className="text-xl font-black text-foreground">
                ⚙️ {labels.settings}
              </h2>
              <Button
                variant="ghost"
                size="auto"
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Auto TTS */}
            <label className="flex items-center justify-between p-3 bg-muted rounded-xl cursor-pointer hover:bg-muted mb-3">
              <div>
                <span className="font-bold text-muted-foreground block" id="auto-tts-label">
                  🔊 {labels.autoTTS || vocabLabels.autoPlay || 'Auto play pronunciation'}
                </span>
              </div>
              <Checkbox
                checked={settings.autoTTS}
                onChange={e => onUpdate({ ...settings, autoTTS: e.target.checked })}
                className="w-5 h-5 accent-indigo-500"
                aria-labelledby="auto-tts-label"
              />
            </label>

            {/* Card Front */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                {labels.cardFront || vocabLabels.cardFront || 'Card front'}
              </label>
              <div className="space-y-2">
                <label
                  className={`flex items-center p-3 rounded-xl cursor-pointer ${
                    settings.cardFront === 'KOREAN'
                      ? 'bg-indigo-50 border-2 border-indigo-300'
                      : 'bg-muted border-2 border-transparent'
                  }`}
                >
                  <Radio
                    checked={settings.cardFront === 'KOREAN'}
                    onChange={() => onUpdate({ ...settings, cardFront: 'KOREAN' })}
                    className="mr-3"
                  />
                  <span className="font-medium">
                    🇰🇷 {vocabLabels.koreanFront || 'Korean on front'}
                  </span>
                </label>
                <label
                  className={`flex items-center p-3 rounded-xl cursor-pointer ${
                    settings.cardFront === 'NATIVE'
                      ? 'bg-indigo-50 border-2 border-indigo-300'
                      : 'bg-muted border-2 border-transparent'
                  }`}
                >
                  <Radio
                    checked={settings.cardFront === 'NATIVE'}
                    onChange={() => onUpdate({ ...settings, cardFront: 'NATIVE' })}
                    className="mr-3"
                  />
                  <span className="font-medium">
                    🇨🇳 {vocabLabels.meaningFront || 'Meaning on front'}
                  </span>
                </label>
              </div>
            </div>

            {/* Rating Mode */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                {vocabLabels.ratingMode || 'Rating mode'}
              </label>
              <div className="flex bg-muted p-1 rounded-lg">
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={() => onUpdate({ ...settings, ratingMode: 'PASS_FAIL' })}
                  className={`flex-1 px-3 py-2 text-sm font-bold rounded-md transition-all ${
                    settings.ratingMode === 'PASS_FAIL'
                      ? 'bg-card shadow text-indigo-600'
                      : 'text-muted-foreground hover:text-muted-foreground'
                  }`}
                >
                  ✓/✗ {vocabLabels.passFail || 'Pass / Fail'}
                </Button>
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={() => onUpdate({ ...settings, ratingMode: 'FOUR_BUTTONS' })}
                  className={`flex-1 px-3 py-2 text-sm font-bold rounded-md transition-all ${
                    settings.ratingMode === 'FOUR_BUTTONS'
                      ? 'bg-card shadow text-indigo-600'
                      : 'text-muted-foreground hover:text-muted-foreground'
                  }`}
                >
                  🎚️ {vocabLabels.fourButtons || '4 Buttons'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {settings.ratingMode === 'PASS_FAIL'
                  ? vocabLabels.passFailDesc || 'Simple mode: pass or fail'
                  : vocabLabels.fourButtonsDesc || 'Detailed mode: again / hard / good / easy'}
              </p>
            </div>

            <Button
              variant="ghost"
              size="auto"
              onClick={onClose}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-muted"
            >
              {labels.done || '完成'}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default FlashcardSettingsModal;
