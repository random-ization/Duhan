import React from 'react';
import { Settings, X } from 'lucide-react';
import { ExtendedVocabularyItem } from '../types';
import { Language } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import FlashcardSettingsModal from './FlashcardSettingsModal';
import { Dialog, DialogContent, DialogPortal } from '../../../components/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../../components/ui';
import { Button } from '../../../components/ui';

interface FlashcardFullscreenOverlayProps {
  words: ExtendedVocabularyItem[];
  cardIndex: number;
  sessionStats: {
    correct: ExtendedVocabularyItem[];
    incorrect: ExtendedVocabularyItem[];
  };
  language: Language;
  showSettings: boolean;
  fullscreenMenuOpen: boolean;
  localSettings: {
    autoTTS: boolean;
    cardFront: 'KOREAN' | 'NATIVE';
    ratingMode: 'PASS_FAIL' | 'FOUR_BUTTONS';
  };
  flashcard: React.ReactNode;
  toolbar: React.ReactNode;
  onSetShowSettings: (show: boolean) => void;
  onSetFullscreenMenuOpen: (open: boolean) => void;
  onToggleFullscreen: () => void;
  onRequestNavigate?: (target: 'flashcard' | 'learn' | 'test' | 'match') => void;
  onUpdateSettings: (settings: any) => void;
}

const FlashcardFullscreenOverlay: React.FC<FlashcardFullscreenOverlayProps> = ({
  words,
  cardIndex,
  sessionStats,
  language,
  showSettings,
  fullscreenMenuOpen,
  localSettings,
  flashcard,
  toolbar,
  onSetShowSettings,
  onSetFullscreenMenuOpen,
  onToggleFullscreen,
  onRequestNavigate,
  onUpdateSettings,
}) => {
  const labels = getLabels(language);

  return (
    <Dialog open onOpenChange={open => !open && onToggleFullscreen()}>
      <DialogPortal>
        <DialogContent
          unstyled
          closeOnEscape={false}
          lockBodyScroll={false}
          className="fixed inset-0 z-[95] bg-card flex flex-col"
        >
          <FlashcardSettingsModal
            isOpen={showSettings}
            onClose={() => onSetShowSettings(false)}
            settings={localSettings}
            onUpdate={onUpdateSettings}
            labels={labels}
          />

          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <DropdownMenu open={fullscreenMenuOpen} onOpenChange={onSetFullscreenMenuOpen}>
                <div className="relative">
                  <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted font-bold text-muted-foreground">
                    📘 {labels.vocab?.flashcard || 'Flashcards'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    unstyled
                    className="absolute left-0 top-full mt-2 w-44 bg-card border-2 border-border rounded-xl shadow-lg overflow-hidden z-[96]"
                  >
                    {[
                      {
                        id: 'flashcard' as const,
                        label: labels.vocab?.flashcard || 'Flashcards',
                      },
                      {
                        id: 'learn' as const,
                        label: labels.learn || 'Learn',
                      },
                      {
                        id: 'test' as const,
                        label: labels.vocab?.quiz || 'Test',
                      },
                      { id: 'match' as const, label: labels.vocab?.match || 'Match' },
                    ].map(item => (
                      <Button
                        variant="ghost"
                        size="auto"
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSetFullscreenMenuOpen(false);
                          onToggleFullscreen();
                          onRequestNavigate?.(item.id);
                        }}
                        className="w-full text-left px-3 py-2 font-black text-sm text-muted-foreground hover:bg-muted"
                      >
                        {item.label}
                      </Button>
                    ))}
                  </DropdownMenuContent>
                </div>
              </DropdownMenu>
            </div>
            <div className="text-center">
              <div className="font-bold text-muted-foreground">
                {cardIndex + 1} / {words.length}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="auto"
                onClick={() => onSetShowSettings(true)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="auto"
                onClick={onToggleFullscreen}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Progress Counters */}
          <div className="flex items-center justify-between px-6 py-3">
            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 text-orange-600 font-bold text-sm">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              {sessionStats.incorrect.length}{' '}
              {labels.flashcardsOverlay?.stillLearning || 'Still learning'}
            </span>
            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-600 font-bold text-sm">
              {labels.flashcardsOverlay?.remembered || 'Remembered'} {sessionStats.correct.length}
              <span className="w-2 h-2 rounded-full bg-green-500" />
            </span>
          </div>

          {/* Card */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">{flashcard}</div>

          {/* Keyboard Hint */}
          <div className="text-center py-2 bg-indigo-50 text-indigo-600 text-sm font-medium">
            ⌨️ {labels.flashcardsOverlay?.keyboardHint || 'Keyboard'}:{' '}
            <kbd className="px-2 py-0.5 bg-card rounded border border-indigo-200 mx-1">
              {labels.flashcardsOverlay?.spaceKey || 'Space'}
            </kbd>{' '}
            {labels.flashcardsOverlay?.keyboardInstruction ||
              'Press space or click the card to flip'}
          </div>

          {/* Bottom Toolbar */}
          <div className="px-6 py-4 border-t border-border">{toolbar}</div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default FlashcardFullscreenOverlay;
