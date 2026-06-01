import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('semi-ghost route contracts', () => {
  it('keeps auth aliases as redirects to one canonical auth route family', () => {
    const content = readProjectFile('src/routes.tsx');

    expect(content).toContain('path="forgot-password"');
    expect(content).toContain('path="reset-password"');
    expect(content).toContain('path="verify-email"');
    expect(content).toContain('target="/auth/forgot-password"');
    expect(content).toContain('target="/auth/reset-password"');
    expect(content).toContain('target="/auth/verify-email"');
  });

  it('funnels legacy aliases through localized canonical destinations', () => {
    const content = readProjectFile('src/routes.tsx');

    expect(content).toContain('path="landing"');
    expect(content).toContain('target=""');
    expect(content).toContain('path="practice"');
    expect(content).toContain('target="/courses"');
    expect(content).toContain('path="vocabbook"');
    expect(content).toContain('target="/vocab-book"');
  });

  it('surfaces text import in the global command palette instead of leaving it route-hidden', () => {
    const content = readProjectFile('src/components/common/GlobalCommandPalette.tsx');

    expect(content).toContain("id: 'text-import'");
    expect(content).toContain("path: '/learning/text-import'");
  });

  it('registers the sentence learning route used by imported content sentences', () => {
    const routesContent = readProjectFile('src/routes.tsx');
    const textImportContent = readProjectFile('src/pages/learning/TextImportPage.tsx');

    expect(routesContent).toContain('path="learning/sentence/:sentenceId"');
    expect(textImportContent).toContain('handleOpenSentence');
    expect(textImportContent).toContain('navigate(`/learning/sentence/${sentence._id}`)');
  });

  it('removes the dead mobile podcast subscriptions subpage branch now that the hub owns subscriptions', () => {
    const pageContent = readProjectFile('src/pages/PodcastHubPage.tsx');
    const mobileContent = readProjectFile('src/components/mobile/MobilePodcastHubPage.tsx');

    expect(pageContent).not.toContain("endsWith('/subscriptions')");
    expect(mobileContent).not.toContain("view === 'subscriptions'");
    expect(mobileContent).not.toContain(
      "type MobilePodcastDashboardView = 'home' | 'subscriptions'"
    );
  });

  it('collapses topik history into the main topik page state instead of a separate page route', () => {
    const routesContent = readProjectFile('src/routes.tsx');
    const topikPageContent = readProjectFile('src/pages/TopikPage.tsx');
    const mobileTopikContent = readProjectFile('src/components/mobile/MobileTopikPage.tsx');
    const topikModuleContent = readProjectFile('src/components/topik/index.tsx');

    expect(routesContent).toContain('path="topik/history"');
    expect(routesContent).toContain('target="/topik"');
    expect(routesContent).toContain("extraSearchParams={{ view: 'history' }}");
    expect(topikPageContent).toContain("appendReturnToPath('/topik?view=history'");
    expect(mobileTopikContent).toContain("appendReturnToPath('/topik?view=history'");
    expect(topikModuleContent).toContain('path = `/topik?view=${TOPIK_HISTORY_VIEW}`');
  });

  it('keeps vocabbook compatibility centralized in pathname normalization instead of scattered UI checks', () => {
    const pathnameContent = readProjectFile('src/utils/pathname.ts');
    const routeConfigContent = readProjectFile('src/config/routes.config.ts');
    const mobileHeaderContent = readProjectFile('src/components/mobile/MobileHeader.tsx');
    const mobileBottomNavContent = readProjectFile('src/components/mobile/MobileBottomNav.tsx');

    expect(pathnameContent).toContain("vocabbook: 'vocab-book'");
    expect(routeConfigContent).not.toContain('vocabbook: () =>');
    expect(mobileHeaderContent).not.toContain("pathWithoutLang.startsWith('/vocabbook')");
    expect(mobileBottomNavContent).not.toContain("pathWithoutLang.startsWith('/vocabbook')");
  });

  it('keeps practice compatibility centralized in pathname normalization instead of route chrome config', () => {
    const pathnameContent = readProjectFile('src/utils/pathname.ts');
    const routeConfigContent = readProjectFile('src/config/routes.config.ts');

    expect(pathnameContent).toContain("practice: 'courses'");
    expect(routeConfigContent).not.toContain('practice: () =>');
  });

  it('treats subscription as a compatibility alias to pricing instead of a parallel page', () => {
    const routesContent = readProjectFile('src/routes.tsx');
    const mobileBottomNavContent = readProjectFile('src/components/mobile/MobileBottomNav.tsx');

    expect(routesContent).toContain('path="subscription"');
    expect(routesContent).toContain('target="/pricing"');
    expect(mobileBottomNavContent).not.toContain("pathWithoutLang.startsWith('/subscription')");
  });

  it('keeps /dashboard as the unified daily cockpit while course detail remains a deep route', () => {
    const dashboardShellContent = readProjectFile('src/pages/DashboardPage.tsx');
    const routesContent = readProjectFile('src/routes.tsx');
    const sidebarContent = readProjectFile('src/components/layout/DesktopSidebar.tsx');
    const courseDetailPageContent = readProjectFile('src/pages/CourseDetailPage.tsx');

    expect(dashboardShellContent).toContain("import('./desktop/DesktopDashboardPage')");
    expect(dashboardShellContent).not.toContain("import('./desktop/DesktopCourseDetailPage')");
    expect(routesContent).toContain('<Route path="dashboard" element={<DashboardPage />} />');
    expect(routesContent).toContain(
      '<Route path="dashboard/course" element={<CourseDetailPage />} />'
    );
    expect(sidebarContent).toContain("const todayPath = toPath('/dashboard')");
    expect(courseDetailPageContent).toContain("import('./desktop/DesktopCourseDetailPage')");
  });

  it('keeps the weekly report schema free of loose validators', () => {
    const schemaContent = readProjectFile('convex/schema.ts');
    const weeklyReportsStart = schemaContent.indexOf('weekly_reports: defineTable');
    const weeklyReportsEnd = schemaContent.indexOf('kiwi_user_dictionary: defineTable');
    const weeklyReportsSchema = schemaContent.slice(weeklyReportsStart, weeklyReportsEnd);

    expect(weeklyReportsStart).toBeGreaterThan(-1);
    expect(weeklyReportsEnd).toBeGreaterThan(weeklyReportsStart);
    expect(weeklyReportsSchema).not.toContain('v.any()');
  });

  it('keeps the imported-content study state query available for continuation surfaces', () => {
    const importedContent = readProjectFile('convex/importedContent.ts');
    const convexRefs = readProjectFile('src/utils/convexRefs.ts');

    expect(importedContent).toContain('export const listStudyStates');
    expect(importedContent).toContain('savedSentenceCount');
    expect(importedContent).toContain('user_reading_progress');
    expect(importedContent).toContain('completedSentenceCount');
    expect(importedContent).toContain('nextSentenceId');
    expect(convexRefs).toContain('listStudyStates');
  });

  it('promotes sentence explanation from the desktop dashboard, not only from text import', () => {
    const courseDashboard = readProjectFile('src/pages/desktop/DesktopCourseDetailPage.tsx');

    expect(courseDashboard).toContain('/learning/text-import');
    expect(courseDashboard).toContain('AI 句子解释');
    expect(courseDashboard).toContain('最近导入');
  });

  it('persists diagnosis rationale and saved asset summaries into daily and weekly loops', () => {
    const dailyShared = readProjectFile('convex/dailyTask/shared.ts');
    const dailyIndex = readProjectFile('convex/dailyTask/index.ts');
    const weeklyReport = readProjectFile('convex/weeklyReport.ts');
    const weeklyPage = readProjectFile('src/pages/dashboard/WeeklyReportPage.tsx');

    expect(dailyShared).toContain('rationale?: string');
    expect(dailyShared).toContain('diagnosisSummary');
    expect(dailyShared).toContain('importedContinuation');
    expect(dailyIndex).toContain('getWritingErrorsByKagas');
    expect(dailyIndex).toContain('listStudyStates');
    expect(weeklyReport).toContain('assetSummary');
    expect(weeklyReport).toContain('applyWeeklyFocusToTodayPlan');
    expect(weeklyReport).toContain('tasks: reorderedTasks');
    expect(weeklyReport).toContain('strategy');
    expect(weeklyReport).toContain('adjustments');
    expect(weeklyPage).toContain('句子资产');
    expect(weeklyPage).toContain('语法资产');
    expect(weeklyPage).toContain('一键写回 Dashboard');
    expect(weeklyPage).toContain('回写策略');
    expect(weeklyPage).toContain('查看 Dashboard');
  });

  it('respects explicit empty sentence vocabulary selections instead of saving all generated words', () => {
    const saveAssets = readProjectFile('convex/sentenceExplainer/save.ts');

    expect(saveAssets).toContain('args.selectedWords !== undefined');
    expect(saveAssets).toContain('args.selectedGrammar !== undefined');
  });

  it('exposes sentence vocabulary-card undo for generated imported-content cards', () => {
    const saveAssets = readProjectFile('convex/sentenceExplainer/save.ts');
    const convexRefs = readProjectFile('src/utils/convexRefs.ts');
    const sentencePage = readProjectFile('src/pages/learning/SentenceLearningPage.tsx');

    expect(saveAssets).toContain('removeSavedVocabularyAsset');
    expect(saveAssets).toContain('by_user_word');
    expect(convexRefs).toContain('removeSavedVocabularyAsset');
    expect(sentencePage).toContain('已生成卡片');
    expect(sentencePage).toContain('复习状态 {card.reviewStatus}');
  });

  it('registers an AI asset quality review queue with approve and reject actions', () => {
    const routes = readProjectFile('src/routes.tsx');
    const convexRefs = readProjectFile('src/utils/convexRefs.ts');
    const qualityModule = readProjectFile('convex/sentenceExplainer/quality.ts');
    const reviewDashboard = readProjectFile('src/pages/PracticeHubPage.tsx');

    expect(routes).toContain('learning/asset-quality');
    expect(convexRefs).toContain('getQualityReviewQueue');
    expect(convexRefs).toContain('getQualityReviewStats');
    expect(convexRefs).toContain('reviewQualityItem');
    expect(convexRefs).toContain('bulkReviewQualityItems');
    expect(qualityModule).toContain('getQualityReviewQueue');
    expect(qualityModule).toContain('getQualityReviewStats');
    expect(qualityModule).toContain('reviewQualityItem');
    expect(qualityModule).toContain('bulkReviewQualityItems');
    expect(qualityModule).toContain('reason: v.optional');
    expect(qualityModule).toContain('human_reviewed');
    expect(qualityModule).toContain('rejected');
    expect(reviewDashboard).toContain('/learning/asset-quality');
  });

  it('records inline AI asset review corrections without loose schema fields', () => {
    const schema = readProjectFile('convex/schema.ts');
    const qualityModule = readProjectFile('convex/sentenceExplainer/quality.ts');
    const qualityPage = readProjectFile('src/pages/learning/AssetQualityReviewPage.tsx');

    expect(schema).toContain('SentenceQualityCorrectionHistoryValidator');
    expect(schema).toContain(
      "field: v.union(v.literal('naturalTranslation'), v.literal('summary'))"
    );
    expect(schema).toContain('correctionHistory: v.optional');
    expect(schema).toContain('reviewedBy: v.optional(v.id');
    expect(qualityModule).toContain('correctionHistory');
    expect(qualityModule).toContain('reviewNote');
    expect(qualityModule).toContain('naturalTranslation');
    expect(qualityPage).toContain('Natural translation correction');
    expect(qualityPage).toContain('Summary correction');
    expect(qualityPage).toContain('Review note');
    expect(qualityPage).toContain('Approve current list');
    expect(qualityPage).toContain('Low confidence first');
    expect(qualityPage).toContain('Prompt ${item.promptVersion');
    expect(qualityPage).toContain('Quality workload');
    expect(qualityPage).toContain('byPromptProvider');
  });
});
