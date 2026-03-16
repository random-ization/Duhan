import { getPathSegments, getPathWithoutLang } from '../utils/pathname';

export type MobileHeaderType = 'dashboard' | 'section' | 'detail';
export type MobileHeaderAction = 'none' | 'search' | 'filter' | 'more' | 'streak';

export interface RouteUiConfig {
  hasDesktopSidebar: boolean;
  hasBottomNav: boolean;
  hasHeader: boolean;
  hasFooter: boolean;
  headerType: MobileHeaderType;
  headerAction: MobileHeaderAction;
  headerTitle: string;
  headerTitleDefault?: string;
  allowHiddenChrome: boolean;
}

const DEFAULT_ROUTE_UI_CONFIG: RouteUiConfig = {
  hasDesktopSidebar: true,
  hasBottomNav: true,
  hasHeader: true,
  hasFooter: true,
  headerType: 'section',
  headerAction: 'none',
  headerTitle: 'common.appName',
  headerTitleDefault: 'Duhan',
  allowHiddenChrome: false,
};

const IMMERSIVE_VOCAB_ROUTES = new Set([
  'immerse',
  'listen',
  'dictation',
  'spelling',
  'export-pdf',
]);

const resolveByRoot: Record<string, (segments: string[]) => Partial<RouteUiConfig>> = {
  dashboard: segments => {
    if (segments.length === 1) {
      return {
        hasFooter: false,
        hasHeader: false,
        headerType: 'dashboard',
        headerAction: 'streak',
        headerTitle: 'nav.dashboard',
        headerTitleDefault: 'Dashboard',
      };
    }
    return {
      hasFooter: false,
      hasHeader: false,
      headerType: 'detail',
      headerAction: 'more',
      headerTitle: 'nav.dashboard',
      headerTitleDefault: 'Dashboard',
    };
  },
  courses: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'section',
    headerAction: 'search',
    headerTitle: 'nav.courses',
    headerTitleDefault: 'Courses',
  }),
  course: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'detail',
    headerAction: 'more',
    headerTitle: 'course.title',
    headerTitleDefault: 'Course',
  }),
  practice: () => ({
    hasFooter: false,
    headerType: 'section',
    headerAction: 'none',
    headerTitle: 'nav.practice',
    headerTitleDefault: 'Practice',
  }),
  media: () => ({
    hasFooter: false,
    headerType: 'section',
    headerAction: 'filter',
    headerTitle: 'nav.media',
    headerTitleDefault: 'Media',
  }),
  reading: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'section',
    headerAction: 'none',
    headerTitle: 'nav.reading',
    headerTitleDefault: 'Reading',
  }),
  topik: segments => {
    if (segments[1] === 'writing') {
      return {
        hasDesktopSidebar: false,
        hasBottomNav: false,
        hasHeader: false,
        hasFooter: false,
        headerType: 'detail',
        headerAction: 'none',
        headerTitle: 'dashboard.topik.writing',
        headerTitleDefault: 'TOPIK Writing',
        allowHiddenChrome: true,
      };
    }

    if (segments.length <= 1 || segments[1] === 'history') {
      return {
        hasFooter: false,
        hasHeader: false,
        headerType: 'section',
        headerAction: 'filter',
        headerTitle: 'nav.topik',
        headerTitleDefault: 'TOPIK',
      };
    }
    return {
      hasFooter: false,
      hasHeader: false,
      headerType: 'detail',
      headerAction: 'more',
      headerTitle: 'dashboard.topik.realExam',
      headerTitleDefault: 'TOPIK Exam',
      allowHiddenChrome: true,
    };
  },
  typing: () => ({
    hasDesktopSidebar: false,
    hasFooter: false,
    hasHeader: false,
    headerType: 'detail',
    headerAction: 'more',
    headerTitle: 'sidebar.typing',
    headerTitleDefault: 'Typing',
    allowHiddenChrome: true,
  }),
  'vocab-book': segments => ({
    hasFooter: false,
    headerType: IMMERSIVE_VOCAB_ROUTES.has(segments[1] || '') ? 'detail' : 'section',
    headerAction: IMMERSIVE_VOCAB_ROUTES.has(segments[1] || '') ? 'more' : 'filter',
    headerTitle: 'dashboard.vocab.title',
    headerTitleDefault: 'Vocab',
    hasDesktopSidebar: !IMMERSIVE_VOCAB_ROUTES.has(segments[1] || ''),
    hasBottomNav: !IMMERSIVE_VOCAB_ROUTES.has(segments[1] || ''),
    hasHeader: false,
    allowHiddenChrome: IMMERSIVE_VOCAB_ROUTES.has(segments[1] || ''),
  }),
  vocabbook: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'section',
    headerAction: 'filter',
    headerTitle: 'dashboard.vocab.title',
    headerTitleDefault: 'Vocab',
  }),
  podcasts: segments => {
    if (segments[1] === 'player') {
      return {
        hasDesktopSidebar: false,
        hasBottomNav: false,
        hasHeader: false,
        hasFooter: false,
        allowHiddenChrome: true,
      };
    }
    return {
      hasFooter: false,
      hasHeader: false,
      headerType: 'section',
      headerAction: 'filter',
      headerTitle: 'nav.podcasts',
      headerTitleDefault: 'Podcasts',
    };
  },
  videos: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'section',
    headerAction: 'filter',
    headerTitle: 'nav.videos',
    headerTitleDefault: 'Videos',
  }),
  video: () => ({
    hasDesktopSidebar: false,
    hasBottomNav: false,
    hasHeader: false,
    hasFooter: false,
    allowHiddenChrome: true,
  }),
  notebook: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'section',
    headerAction: 'search',
    headerTitle: 'nav.notebook',
    headerTitleDefault: 'Notebook',
  }),
  profile: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'section',
    headerAction: 'none',
    headerTitle: 'nav.profile',
    headerTitleDefault: 'Profile',
  }),
  dictionary: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'detail',
    headerAction: 'more',
    headerTitle: 'dashboard.dictionary.label',
    headerTitleDefault: 'Dictionary',
  }),
};

export function getRouteUiConfig(pathname: string): RouteUiConfig {
  const pathWithoutLang = getPathWithoutLang(pathname);
  const segments = getPathSegments(pathWithoutLang);
  const root = segments[0] || '';
  const resolver = resolveByRoot[root];
  const partial = resolver ? resolver(segments) : {};
  return {
    ...DEFAULT_ROUTE_UI_CONFIG,
    ...partial,
  };
}

export function canRouteHideChrome(pathname: string): boolean {
  return getRouteUiConfig(pathname).allowHiddenChrome;
}
