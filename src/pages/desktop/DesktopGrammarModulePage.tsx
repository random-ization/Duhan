import React, { Suspense, lazy } from 'react';
import { PanelRightOpen, X } from 'lucide-react';
import GrammarDirectorySidebar from '../../components/grammar/GrammarDirectorySidebar';
import GrammarDetailPane from '../../components/grammar/GrammarDetailPane';
import { Badge, Button } from '../../components/ui';
import { AppBreadcrumb } from '../../components/common/AppBreadcrumb';
import { Sheet, SheetClose, SheetContent, SheetOverlay, SheetPortal } from '../../components/ui/sheet';
import { GrammarPointData } from '../../types';

const GrammarAuxiliaryPane = lazy(() => import('../../components/grammar/GrammarAuxiliaryPane'));

interface DesktopGrammarModulePageProps {
  allCourseGrammar: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  desktopSelectedGrammarId: string | null;
  setHasManualUnitSelection: (b: boolean) => void;
  setSelectedUnit: (u: number) => void;
  setSelectedGrammarId: (id: string | null) => void;
  activeSelectedUnit: number;
  clampUnit: (u: number) => number;
  instituteName: string;
  instituteId: string;
  language: string;
  t: any;
  selectedStatus: any;
  statusLabel: string;
  statusClass: string;
  selectedProficiency: number;
  selectedTitle: string | null;
  desktopSelectedGrammar: GrammarPointData | null;
  handleToggleStatus: (id: string) => void;
  isGrammarLoading: boolean;
  isAiPanelOpen: boolean;
  setIsAiPanelOpen: (b: boolean) => void;
  grammarListWithUpdates: GrammarPointData[];
  currentIndex: number;
  handleNext: () => void;
  handlePrev: () => void;
  navigate: any;
}

export const DesktopGrammarModulePage: React.FC<DesktopGrammarModulePageProps> = ({
  allCourseGrammar,
  searchQuery,
  setSearchQuery,
  desktopSelectedGrammarId,
  setHasManualUnitSelection,
  setSelectedUnit,
  setSelectedGrammarId,
  activeSelectedUnit,
  clampUnit,
  instituteName,
  instituteId,
  language,
  t,
  selectedStatus,
  statusLabel,
  statusClass,
  selectedProficiency,
  selectedTitle,
  desktopSelectedGrammar,
  handleToggleStatus,
  isGrammarLoading,
  isAiPanelOpen,
  setIsAiPanelOpen,
  grammarListWithUpdates,
  currentIndex,
  handleNext,
  handlePrev,
  navigate,
}) => {
  return (
    <div className="h-full min-h-0 overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div
        className="h-full min-h-0 grid transition-[grid-template-columns] duration-300"
        style={{ gridTemplateColumns: '250px minmax(0,1fr)' }}
      >
        <GrammarDirectorySidebar
          courseGrammars={allCourseGrammar || []}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedGrammarId={desktopSelectedGrammarId || undefined}
          onSelectGrammar={(id, unitId) => {
            setHasManualUnitSelection(true);
            if (unitId !== activeSelectedUnit) setSelectedUnit(clampUnit(unitId));
            setSelectedGrammarId(id);
          }}
        />

        <section className="min-w-0 min-h-0 flex flex-col">
          <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <AppBreadcrumb
                  className="mb-0"
                  items={[
                    { label: t('nav.courses', { defaultValue: 'Courses' }), to: '/courses' },
                    {
                      label: instituteName || t('course.title', { defaultValue: 'Course' }),
                      to: `/course/${instituteId}`,
                    },
                    { label: t('nav.grammar', { defaultValue: 'Grammar' }) },
                  ]}
                />
                <p className="mt-2 truncate text-sm text-slate-600 dark:text-slate-400">
                  {selectedTitle ||
                    t('grammarDetail.selectPrompt', {
                      defaultValue: 'Select a grammar point to view details',
                    })}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={statusClass}>
                  {statusLabel}
                </Badge>
                <div className="hidden xl:block w-24 h-2 rounded-full bg-slate-200 overflow-hidden dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${selectedProficiency}%` }}
                  />
                </div>
                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  disabled={!desktopSelectedGrammar || isGrammarLoading}
                  onClick={() => {
                    if (desktopSelectedGrammar) {
                      void handleToggleStatus(desktopSelectedGrammar.id);
                    }
                  }}
                >
                  {selectedStatus === 'MASTERED'
                    ? t('grammarModule.unmarkMastery', { defaultValue: 'Mastered' })
                    : t('grammarModule.markMastery', { defaultValue: 'Mark learned' })}
                </Button>
                <Button
                  variant={isAiPanelOpen ? 'default' : 'outline'}
                  onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                  className="border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <PanelRightOpen className="h-4 w-4 mr-1.5" />
                  {isAiPanelOpen
                    ? t('grammarModule.aiPanelHide', { defaultValue: 'Hide AI' })
                    : t('grammarModule.aiPanelShow', { defaultValue: 'Show AI' })}
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => navigate('/courses')}
                >
                  {t('learningFlow.actions.switchMaterial', { defaultValue: 'Switch textbook' })}
                </Button>
              </div>
            </div>
          </header>

          <GrammarDetailPane
            grammar={desktopSelectedGrammar}
            onNext={handleNext}
            onPrev={handlePrev}
            hasNext={currentIndex >= 0 && currentIndex < grammarListWithUpdates.length - 1}
            hasPrev={currentIndex > 0}
          />
        </section>
      </div>

      <Sheet open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen}>
        <SheetPortal>
          <SheetOverlay className="bg-slate-950/32 backdrop-blur-[2px]" />
          <SheetContent
            unstyled
            className="fixed inset-y-3 right-3 z-50 flex w-[min(560px,calc(100vw-24px))] max-w-none flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                  <PanelRightOpen className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {t('grammarModule.aiTutorTitle', { defaultValue: 'AI Grammar Tutor' })}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedTitle ||
                      t('grammarModule.aiTutorReadingPanelDesc', {
                        defaultValue: 'Ask follow-up questions about the current grammar point.',
                      })}
                  </p>
                </div>
              </div>

              <SheetClose className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                <X className="h-4 w-4" />
              </SheetClose>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-400">
                    {t('loading', { defaultValue: 'Loading...' })}
                  </div>
                }
              >
                <GrammarAuxiliaryPane grammar={desktopSelectedGrammar} embedded />
              </Suspense>
            </div>
          </SheetContent>
        </SheetPortal>
      </Sheet>
    </div>
  );
};

export default DesktopGrammarModulePage;
