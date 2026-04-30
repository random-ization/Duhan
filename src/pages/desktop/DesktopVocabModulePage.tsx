import React, { Suspense, lazy } from 'react';
import { Button } from '../../components/ui/button';
import { AppBreadcrumb } from '../../components/common/AppBreadcrumb';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from '../../components/ui';
import { VocabModuleSkeleton } from '../../components/common';

const FlashcardView = lazy(() => import('../../features/vocab/components/FlashcardView'));
const VocabQuiz = lazy(() => import('../../features/vocab/components/VocabQuiz'));
const VocabMatch = lazy(() => import('../../features/vocab/components/VocabMatch'));
const VocabTest = lazy(() => import('../../features/vocab/components/VocabTest'));

interface DesktopVocabModulePageProps {
  labels: any;
  course: any;
  language: string;
  instituteId: string | undefined;
  selectedUnitId: any;
  availableUnits: any[];
  setSelectedUnitId: (id: any) => void;
  viewState: any;
  setViewState: any;
  filteredWords: any[];
  masteredIds: any;
  setMasteredIds: any;
  flashcardResumeSnapshot: any;
  latestFlashcardSnapshotRef: any;
  persistLearningSnapshot: (mode: any, snapshot: any) => Promise<void>;
  flushQueue: () => Promise<void>;
  completeSessionForMode: (mode: any) => Promise<void>;

  globalSettings: any;
  updateGlobalSettings: (settings: any) => Promise<void>;
  speakWord: (text: string) => void;
  toggleStar: (id: string) => void;
  starredIds: Set<string>;
  requestOpenSessionMode: (mode: any) => void;
  handleReview: any;
  gameWords: any[];
  learnOpen: boolean;
  latestLearnSnapshotRef: any;
  setLearnOpen: (open: boolean) => void;
  learnResumeSnapshot: any;
  testOpen: boolean;
  latestTestSnapshotRef: any;
  setTestOpen: (open: boolean) => void;
  testResumeSnapshot: any;
  resumeModePrompt: any;
  setResumeModePrompt: any;
  resumeCandidate: any;
  setResumeCandidate: any;
  user: any;
  navigate: any;
  backPath: string;
  BACKGROUND_STYLE: any;
  resolveCourseBreadcrumbLabel: any;
  getLabel: any;
  restartFromResumePrompt: () => Promise<void>;
  continueFromResumePrompt: () => void;
  pendingUnitSwitch: any;
  setPendingUnitSwitch: any;
  confirmUnitSwitchWithSave: () => Promise<void>;
  renderEmptyContent: () => React.ReactNode;
  renderTopBar: () => React.ReactNode;
  renderModeTabs: () => React.ReactNode;
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
  learnOpen,
  latestLearnSnapshotRef,
  setLearnOpen,
  learnResumeSnapshot,
  testOpen,
  latestTestSnapshotRef,
  setTestOpen,
  testResumeSnapshot,
  resumeModePrompt,
  setResumeModePrompt,
  resumeCandidate,
  setResumeCandidate,
  user,
  navigate,
  backPath,
  BACKGROUND_STYLE,
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
}: DesktopVocabModulePageProps) {

  const renderFlashcardDeck = () => (
    <Suspense fallback={<VocabModuleSkeleton />}>
      <FlashcardView
        key={`${instituteId}:${selectedUnitId}:${flashcardResumeSnapshot?.timestamp ?? 'fresh'}`}
        words={filteredWords}
        language={language as any}

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
          setViewState((prev: any) => ({ ...prev, flashcardComplete: true }));
          const newMastered = new Set(masteredIds);
          stats.correct.forEach((w: any) => newMastered.add(w.id));
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
          setViewState((prev: any) => ({ ...prev, mode: target as any }));
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
        <div className="w-full max-w-xl bg-card border-2 border-foreground rounded-[2rem] p-8 flex flex-col items-center shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] text-center my-12 animate-in fade-in-50 duration-300">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-400/20 text-green-600 dark:text-green-300 rounded-full flex items-center justify-center text-4xl mb-6 border-2 border-green-600 dark:border-green-400/40">
            ✓
          </div>
          <h2 className="text-3xl font-black text-foreground mb-2">
            {labels.sessionComplete || 'Session Complete!'}
          </h2>
          <p className="text-muted-foreground mb-2">
            {filteredWords.length} {labels.wordsUnit || 'words'}{' '}
            {labels.vocab?.reviewed || 'reviewed'}
          </p>
          <div className="flex gap-2 mb-8">
            <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-400/14 dark:text-green-200 rounded-full text-sm font-bold">
              ✓ {labels.vocab?.remembered || 'Remembered'} {masteredIds.size}
            </span>
            <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-400/14 dark:text-red-200 rounded-full text-sm font-bold">
              ✕ {labels.vocab?.forgot || 'Forgot'} {filteredWords.length - masteredIds.size}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setLearnOpen(true)}
              className="px-6 py-3 bg-card border-2 border-foreground text-foreground font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 transition-all"
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
                  className="px-6 py-3 bg-green-500 dark:bg-green-400/80 border-2 border-green-600 dark:border-green-300/35 text-primary-foreground font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(22,163,74,1)] dark:shadow-[4px_4px_0px_0px_rgba(74,222,128,0.28)] hover:-translate-y-1 transition-all"
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
              setViewState((prev: any) => ({ ...prev, cardIndex: 0, flashcardComplete: false }));
              setMasteredIds(new Set());
            }}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground font-bold underline underline-offset-4"
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
          onComplete={(time: any, moves: any) => console.log('Match completed:', { time, moves })}
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

  const renderOverlays = () => (
    <>
      <Dialog
        open={learnOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (latestLearnSnapshotRef.current) {
              void persistLearningSnapshot('LEARN', latestLearnSnapshotRef.current);
            }
            void flushQueue();
            setLearnOpen(false);
          }
        }}
      >
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
          <DialogContent className="fixed inset-0 z-[51] flex items-center justify-center pointer-events-none p-0">
            <div className="pointer-events-auto w-full h-full bg-background flex flex-col">
              <div className="p-4 sm:p-6 flex-1 overflow-auto">
                <Suspense fallback={<VocabModuleSkeleton />}>
                  <VocabQuiz
                    key={`learn-${selectedUnitId}-${gameWords.length}`}
                    words={gameWords}
                    courseId={instituteId}
                    onComplete={() => {
                      void flushQueue();
                      void completeSessionForMode('LEARN');
                    }}
                    hasNextUnit={
                      typeof selectedUnitId === 'number' &&
                      availableUnits.indexOf(selectedUnitId) < availableUnits.length - 1
                    }
                    onNextUnit={() => {
                      if (typeof selectedUnitId === 'number') {
                        const currentIdx = availableUnits.indexOf(selectedUnitId);
                        if (currentIdx < availableUnits.length - 1) {
                          setSelectedUnitId(availableUnits[currentIdx + 1]);
                        }
                      }
                    }}
                    currentUnitLabel={
                      selectedUnitId === 'ALL'
                        ? labels.vocab?.allUnits || 'All Units'
                        : `${labels.vocab?.unit || 'Unit'} ${selectedUnitId}`
                    }
                    userId={user?.id}
                    language={language as any}

                    variant="learn"
                    resumeSnapshot={learnResumeSnapshot}
                    onSessionSnapshot={snapshot => {
                      latestLearnSnapshotRef.current = snapshot;
                      void persistLearningSnapshot('LEARN', snapshot);
                    }}
                  />
                </Suspense>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>


      <Dialog
        open={testOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (latestTestSnapshotRef.current) {
              void persistLearningSnapshot('TEST', latestTestSnapshotRef.current);
            }
            void flushQueue();
            setTestOpen(false);
          }
        }}
      >
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
          <DialogContent className="fixed inset-0 z-[51] flex items-center justify-center pointer-events-none p-0">
            <div className="pointer-events-auto w-full h-full bg-background flex flex-col">
              <div className="p-4 sm:p-6 flex-1 overflow-auto">
                <Suspense fallback={<VocabModuleSkeleton />}>
                  <VocabTest
                    key={`test-${selectedUnitId}-${gameWords.length}`}
                    words={gameWords as any}
                    language={language as any}
                    scopeTitle={
                      selectedUnitId === 'ALL'
                        ? labels.vocab?.allUnits || 'All Units'
                        : `${labels.vocab?.unit || 'Unit'} ${selectedUnitId}`
                    }
                    resumeSnapshot={testResumeSnapshot}
                    onSessionSnapshot={snapshot => {
                      latestTestSnapshotRef.current = snapshot;
                      void persistLearningSnapshot('TEST', snapshot);
                    }}
                  />

                </Suspense>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col items-center py-6 px-4" style={BACKGROUND_STYLE}>
      <div className="w-full max-w-4xl mb-6">
        <AppBreadcrumb
          className="mb-4"
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

      {renderContent()}

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
