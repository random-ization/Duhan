import React, { Suspense, lazy } from 'react';
import { Button } from '../../components/ui/button';
import { AppBreadcrumb } from '../../components/common/AppBreadcrumb';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../../components/ui';
import { VocabModuleSkeleton } from '../../components/common';
import type { LearningSessionSnapshot } from '../../features/vocab/components/VocabQuiz';
import type { VocabTestSessionSnapshot } from '../../features/vocab/components/VocabTest';
import type { FlashcardSessionSnapshot } from '../../features/vocab/components/FlashcardView';
import type { VocabularyItem, Institute, User, Language } from '../../types';
import type { LabelsBundle } from '../VocabBookPage';

const FlashcardView = lazy(() => import('../../features/vocab/components/FlashcardView'));
const VocabMatch = lazy(() => import('../../features/vocab/components/VocabMatch'));

// --- Types ---

export interface ExtendedVocabItem extends VocabularyItem {
  id: string;
  unit: number;
  mastered?: boolean;
  exampleTranslation?: string;
  // FSRS Fields
  state?: number;
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  reps?: number;
  learning_steps?: number;
  lapses?: number;
  last_review?: number | null;
}

export type ViewMode = 'flashcard' | 'match';
export type SessionMode = 'FLASHCARD' | 'LEARN' | 'TEST';

export interface ViewState {
  mode: ViewMode;
  cardIndex: number;
  isFlipped: boolean;
  flashcardComplete: boolean;
}

export interface ResumeCandidate {
  mode: SessionMode;
  sessionId: string;
  completed: number;
  remaining: number;
  total: number;
  progressPercent: number;
}

export interface DesktopVocabModulePageProps {
  labels: LabelsBundle;
  course: Institute | undefined;
  language: string;
  instituteId: string | undefined;
  selectedUnitId: number | 'ALL';
  availableUnits: number[];
  setSelectedUnitId: (id: number | 'ALL') => void;
  viewState: ViewState;
  setViewState: React.Dispatch<React.SetStateAction<ViewState>>;
  filteredWords: ExtendedVocabItem[];
  masteredIds: Set<string>;
  setMasteredIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  flashcardResumeSnapshot: FlashcardSessionSnapshot | null;
  latestFlashcardSnapshotRef: React.MutableRefObject<FlashcardSessionSnapshot | null>;
  persistLearningSnapshot: (
    mode: SessionMode,
    snapshot: FlashcardSessionSnapshot | LearningSessionSnapshot | VocabTestSessionSnapshot
  ) => Promise<void>;
  flushQueue: () => Promise<void>;
  completeSessionForMode: (mode: SessionMode) => Promise<void>;

  globalSettings: {
    flashcardAutoTTS: boolean;
    flashcardFront: 'KOREAN' | 'NATIVE';
    flashcardRatingMode: 'PASS_FAIL' | 'FOUR_BUTTONS';
  };
  updateGlobalSettings: (
    settings: Partial<DesktopVocabModulePageProps['globalSettings']>
  ) => Promise<void>;
  speakWord: (text: string) => void;
  toggleStar: (id: string) => void;
  starredIds: Set<string>;
  requestOpenSessionMode: (mode: SessionMode) => void;
  handleReview: (word: ExtendedVocabItem, result: boolean | number) => void;
  gameWords: Array<{
    id: string;
    korean: string;
    english: string;
    unit: number;
    partOfSpeech?: string;
    pos?: string;
  }>;
  learnOpen: boolean;
  latestLearnSnapshotRef: React.MutableRefObject<LearningSessionSnapshot | null>;
  setLearnOpen: (open: boolean) => void;
  learnResumeSnapshot: LearningSessionSnapshot | null;
  testOpen: boolean;
  latestTestSnapshotRef: React.MutableRefObject<VocabTestSessionSnapshot | null>;
  setTestOpen: (open: boolean) => void;
  testResumeSnapshot: VocabTestSessionSnapshot | null;
  resumeModePrompt: SessionMode | null;
  setResumeModePrompt: (mode: SessionMode | null) => void;
  resumeCandidate: ResumeCandidate | null;
  setResumeCandidate: (candidate: ResumeCandidate | null) => void;
  user: User | null;
  navigate: (path: string) => void;
  backPath: string;

  resolveCourseBreadcrumbLabel: (
    course: Institute | undefined,
    language: string,
    instituteId: string | undefined
  ) => string;
  getLabel: (labels: LabelsBundle, path: readonly string[]) => string | undefined;
  restartFromResumePrompt: () => Promise<void>;
  continueFromResumePrompt: () => void;
  pendingUnitSwitch: number | 'ALL' | null;
  setPendingUnitSwitch: (unit: number | 'ALL' | null) => void;
  confirmUnitSwitchWithSave: () => Promise<void>;
  renderEmptyContent: () => React.ReactNode;
  renderTopBar: () => React.ReactNode;
  renderModeTabs: () => React.ReactNode;
  renderOverlays: () => React.ReactNode;
}

export default function DesktopVocabModulePage({
  labels,
  course,
  language,
  instituteId,
  selectedUnitId,
  availableUnits,
  setSelectedUnitId,
  viewState,
  setViewState,
  filteredWords,
  masteredIds,
  setMasteredIds,
  flashcardResumeSnapshot,
  latestFlashcardSnapshotRef,
  persistLearningSnapshot,
  flushQueue,
  completeSessionForMode,
  globalSettings,
  updateGlobalSettings,
  speakWord,
  toggleStar,
  starredIds,
  requestOpenSessionMode,
  handleReview,
  gameWords,
  learnOpen: _learnOpen,
  latestLearnSnapshotRef: _latestLearnSnapshotRef,
  setLearnOpen,
  learnResumeSnapshot: _learnResumeSnapshot,
  testOpen: _testOpen,
  latestTestSnapshotRef: _latestTestSnapshotRef,
  setTestOpen: _setTestOpen,
  testResumeSnapshot: _testResumeSnapshot,
  resumeModePrompt,
  setResumeModePrompt,
  resumeCandidate,
  setResumeCandidate,
  user: _user,
  navigate: _navigate,
  backPath: _backPath,

  resolveCourseBreadcrumbLabel,
  getLabel,
  restartFromResumePrompt,
  continueFromResumePrompt,
  pendingUnitSwitch,
  setPendingUnitSwitch,
  confirmUnitSwitchWithSave,
  renderEmptyContent,
  renderTopBar,
  renderModeTabs,
  renderOverlays,
}: DesktopVocabModulePageProps) {
  const renderFlashcardDeck = () => (
    <Suspense fallback={<VocabModuleSkeleton />}>
      <FlashcardView
        key={`${instituteId}:${selectedUnitId}`}
        words={filteredWords}
        language={language as Language}
        courseId={instituteId}
        progressKey={`${instituteId}:${selectedUnitId}`}
        resumeSnapshot={flashcardResumeSnapshot}
        onSessionSnapshot={snapshot => {
          latestFlashcardSnapshotRef.current = snapshot;
          void persistLearningSnapshot('FLASHCARD', snapshot);
        }}
        settings={{
          flashcard: {
            batchSize: 200,
            random: false,
            autoTTS: globalSettings.flashcardAutoTTS,
            cardFront: globalSettings.flashcardFront,
            ratingMode: globalSettings.flashcardRatingMode,
          },
          learn: {
            batchSize: 20,
            random: true,
            ratingMode: 'PASS_FAIL',
            types: { multipleChoice: true, writing: true },
            answers: { korean: true, native: true },
          },
        }}
        onComplete={stats => {
          void flushQueue();
          void completeSessionForMode('FLASHCARD');
          setViewState((prev: ViewState) => ({ ...prev, flashcardComplete: true }));
          const newMastered = new Set(masteredIds);
          stats.correct.forEach(w => newMastered.add(w.id));
          setMasteredIds(newMastered);
        }}
        onSaveWord={word => {
          if (!starredIds.has(word.id)) {
            toggleStar(word.id);
          }
        }}
        onRequestNavigate={target => {
          if (target === 'learn') {
            requestOpenSessionMode('LEARN');
            return;
          }
          if (target === 'test') {
            requestOpenSessionMode('TEST');
            return;
          }
          if (target === 'flashcard') {
            requestOpenSessionMode('FLASHCARD');
            return;
          }
          setViewState((prev: ViewState) => ({ ...prev, mode: target as ViewMode }));
        }}
        onSpeak={speakWord}
        onCardReview={handleReview}
        onUpdateFlashcardSettings={nextSettings => {
          void updateGlobalSettings({
            flashcardAutoTTS: nextSettings.autoTTS,
            flashcardFront: nextSettings.cardFront,
            flashcardRatingMode: nextSettings.ratingMode,
          });
        }}
      />
    </Suspense>
  );

  const renderFlashcardContent = () => (
    <div className="w-full flex flex-col items-center gap-6">
      {!viewState.flashcardComplete ? (
        renderFlashcardDeck()
      ) : (
        <div className="w-full max-w-2xl bg-k-card border border-k-divider rounded-[2.5rem] p-10 flex flex-col items-center shadow-xl text-center my-16 animate-in fade-in-50 zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-k-mint-deep/10 text-k-mint-deep rounded-full flex items-center justify-center text-5xl mb-8 border border-k-mint-deep/20">
            ✓
          </div>
          <h2 className="text-4xl font-extrabold text-k-ink mb-3 tracking-tight">
            {labels.sessionComplete || 'Session Complete!'}
          </h2>
          <p className="text-k-sub font-bold text-lg mb-4">
            {filteredWords.length} {labels.wordsUnit || 'words'}{' '}
            {labels.vocab?.reviewed || 'reviewed'}
          </p>
          <div className="flex gap-3 mb-10">
            <span className="px-5 py-2 bg-k-mint-deep/10 text-k-mint-deep rounded-full text-sm font-extrabold border border-k-mint-deep/20">
              ✓ {labels.vocab?.remembered || 'Remembered'} {masteredIds.size}
            </span>
            <span className="px-5 py-2 bg-k-pink-deep/10 text-k-pink-deep rounded-full text-sm font-extrabold border border-k-pink-deep/20">
              ✕ {labels.vocab?.forgot || 'Forgot'} {filteredWords.length - masteredIds.size}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setLearnOpen(true)}
              className="px-8 py-4 bg-k-card border border-k-divider text-k-ink font-extrabold rounded-2xl shadow-sm hover:border-k-crimson hover:text-k-crimson transition-all"
            >
              🧠 {labels.learn || 'Learn'}
            </Button>
            {typeof selectedUnitId === 'number' &&
              availableUnits.indexOf(selectedUnitId) < availableUnits.length - 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    const currentIdx = availableUnits.indexOf(selectedUnitId);
                    if (currentIdx < availableUnits.length - 1) {
                      setSelectedUnitId(availableUnits[currentIdx + 1]);
                    }
                  }}
                  className="px-8 py-4 bg-k-mint-deep text-white font-extrabold rounded-2xl shadow-md hover:bg-k-mint-deep/90 transition-all"
                >
                  {labels.common?.next || 'Next Unit'} →
                </Button>
              )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => {
              setViewState((prev: ViewState) => ({
                ...prev,
                cardIndex: 0,
                flashcardComplete: false,
              }));
              setMasteredIds(new Set());
            }}
            className="mt-8 text-sm text-k-sub hover:text-k-crimson font-bold underline underline-offset-8 transition-colors"
          >
            {labels.vocab?.restartSession || 'Restart session'}
          </Button>
        </div>
      )}
    </div>
  );

  const renderMatchContent = () => (
    <div className="w-full max-w-4xl">
      <Suspense fallback={<VocabModuleSkeleton />}>
        <VocabMatch
          key={`match-${selectedUnitId}-${gameWords.length}`}
          words={gameWords}
          onComplete={(time: number, moves: number) =>
            console.log('Match completed:', { time, moves })
          }
        />
      </Suspense>
    </div>
  );

  const renderContent = () => {
    if (filteredWords.length === 0) return renderEmptyContent();

    return (
      <>
        {viewState.mode === 'flashcard' ? renderFlashcardContent() : null}
        {viewState.mode === 'match' ? renderMatchContent() : null}
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-6 bg-k-bg font-sans">
      <div className="w-full max-w-5xl mb-8">
        <AppBreadcrumb
          className="mb-6 opacity-70"
          items={[
            { label: labels.coursesOverview?.pageTitle || 'Courses', to: '/courses' },
            {
              label: resolveCourseBreadcrumbLabel(course, language, instituteId),
              to: instituteId ? `/course/${instituteId}` : '/courses',
            },
            { label: labels.vocab?.flashcard || 'Vocab' },
          ]}
        />
        {renderTopBar()}
        {renderModeTabs()}
      </div>

      <div className="w-full max-w-5xl flex flex-col items-center">{renderContent()}</div>

      {renderOverlays()}

      <Dialog
        open={resumeModePrompt !== null}
        onOpenChange={open => {
          if (!open) {
            setResumeModePrompt(null);
            setResumeCandidate(null);
          }
        }}
      >
        <DialogPortal>
          <DialogOverlay
            unstyled
            className="fixed inset-0 z-50 bg-black/45"
            onClick={() => {
              setResumeModePrompt(null);
              setResumeCandidate(null);
            }}
          />
          <DialogContent
            unstyled
            closeOnEscape={false}
            lockBodyScroll={false}
            className="fixed inset-0 z-[51] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-3xl rounded-[1.6rem] border-2 border-foreground bg-card shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-6 sm:p-7">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h3 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                    {getLabel(labels, ['vocab', 'resumePrompt', 'welcome']) ||
                      "Welcome back to today's session!"}
                  </h3>
                  <p className="mt-1 text-3xl sm:text-4xl font-black text-foreground/90 tracking-tight">
                    {getLabel(labels, ['vocab', 'resumePrompt', 'ready']) || 'Ready to continue?'}
                  </p>
                </div>
                <div className="relative w-12 h-12 shrink-0" aria-hidden="true">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/25" />
                  <div className="absolute inset-1 rounded-full border-4 border-transparent border-t-blue-500 border-r-cyan-400" />
                  <div className="absolute top-1 right-0 w-2 h-2 rounded-full bg-cyan-400" />
                  <div className="absolute bottom-1 left-0 w-2 h-2 rounded-full bg-blue-600" />
                </div>
              </div>

              <div className="mt-7">
                <div className="text-xl sm:text-2xl font-black text-foreground">
                  {getLabel(labels, ['vocab', 'resumePrompt', 'overallProgress']) ||
                    'Overall session progress:'}
                  <span className="text-emerald-600 ml-2">
                    {resumeCandidate?.progressPercent ?? 0}%
                  </span>
                </div>
                <div className="mt-3 w-full h-5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, resumeCandidate?.progressPercent ?? 0))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-[1.1rem] bg-emerald-100/70 border border-emerald-200 p-5">
                  <div className="text-xl sm:text-2xl font-black text-foreground">
                    {getLabel(labels, ['vocab', 'resumePrompt', 'completed']) ||
                      'Completed questions'}
                  </div>
                  <div className="mt-3 text-6xl leading-none font-black text-emerald-700">
                    {resumeCandidate?.completed ?? 0}
                  </div>
                </div>
                <div className="rounded-[1.1rem] bg-slate-100 border border-slate-200 p-5">
                  <div className="text-xl sm:text-2xl font-black text-foreground">
                    {getLabel(labels, ['vocab', 'resumePrompt', 'remaining']) ||
                      'Remaining before next check'}
                  </div>
                  <div className="mt-3 text-6xl leading-none font-black text-slate-500">
                    {resumeCandidate?.remaining ?? 0}
                  </div>
                </div>
              </div>

              <div className="mt-7 pt-5 border-t border-border flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    void restartFromResumePrompt();
                  }}
                  className="px-6 py-3 rounded-xl border-2 border-border text-slate-500 font-black text-xl hover:bg-muted"
                >
                  {getLabel(labels, ['vocab', 'resumePrompt', 'restart']) ||
                    'Restart learning mode'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={continueFromResumePrompt}
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-black text-xl hover:from-blue-700 hover:to-indigo-600"
                >
                  {getLabel(labels, ['vocab', 'resumePrompt', 'continue']) || 'Continue practice'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog
        open={pendingUnitSwitch !== null}
        onOpenChange={open => {
          if (!open) setPendingUnitSwitch(null);
        }}
      >
        <DialogPortal>
          <DialogOverlay
            unstyled
            className="fixed inset-0 z-50 bg-black/45"
            onClick={() => setPendingUnitSwitch(null)}
          />
          <DialogContent
            unstyled
            closeOnEscape={false}
            lockBodyScroll={false}
            className="fixed inset-0 z-[51] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md rounded-2xl border-2 border-foreground bg-card shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] p-6">
              <h3 className="text-xl font-black text-foreground mb-2">Switch unit?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Your current learning session is in progress. Save your progress before switching to
                another unit.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => setPendingUnitSwitch(null)}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-border text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    void confirmUnitSwitchWithSave();
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700"
                >
                  Save and switch
                </Button>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .card-content { transform-origin: center center; }
      `}</style>
    </div>
  );
}
