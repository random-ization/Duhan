import { getPathSegments, getPathWithoutLang } from '../utils/pathname';

export type MobileHeaderType = 'dashboard' | 'section' | 'detail';
export type MobileHeaderAction = 'none' | 'search' | 'filter' | 'more' | 'streak';
export type MobilePageMode = 'hub' | 'workspace' | 'immersive' | 'account';

export interface RouteUiConfig {
  hasDesktopSidebar: boolean;
  hasBottomNav: boolean;
  hasHeader: boolean;
  hasFooter: boolean;
  usePatternBackground: boolean;
  useDesktopContainerPadding: boolean;
  useDesktopMaxWidth: boolean;
  lockMainScroll: boolean;
  headerType: MobileHeaderType;
  headerAction: MobileHeaderAction;
  headerTitle: string;
  headerTitleDefault?: string;
  allowHiddenChrome: boolean;
  mobilePageMode: MobilePageMode;
}

const DEFAULT_ROUTE_UI_CONFIG: RouteUiConfig = {
  hasDesktopSidebar: true,
  hasBottomNav: true,
  hasHeader: true,
  hasFooter: true,
  usePatternBackground: true,
  useDesktopContainerPadding: true,
  useDesktopMaxWidth: true,
  lockMainScroll: false,
  headerType: 'section',
  headerAction: 'none',
  headerTitle: 'common.appName',
  headerTitleDefault: 'Duhan',
  allowHiddenChrome: false,
  mobilePageMode: 'workspace',
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
        useDesktopContainerPadding: false,
        useDesktopMaxWidth: false,
        headerType: 'dashboard',
        headerAction: 'streak',
        headerTitle: 'nav.dashboard',
        headerTitleDefault: 'Dashboard',
        mobilePageMode: 'hub',
      };
    }
    return {
      hasFooter: false,
      hasHeader: false,
      headerType: 'detail',
      headerAction: 'more',
      headerTitle: 'nav.dashboard',
      headerTitleDefault: 'Dashboard',
      mobilePageMode: 'workspace',
    };
  },
  courses: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'section',
    headerAction: 'search',
    headerTitle: 'nav.courses',
    headerTitleDefault: 'Courses',
    mobilePageMode: 'hub',
  }),
  course: segments => {
    const moduleSegment = segments[2];
    const isImmersiveWorkspace = moduleSegment === 'grammar' || moduleSegment === 'reading';
    return {
      hasFooter: false,
      hasHeader: false,
      usePatternBackground: !isImmersiveWorkspace,
      useDesktopContainerPadding: false,
      useDesktopMaxWidth: false,
      lockMainScroll: isImmersiveWorkspace,
      headerType: 'detail',
      headerAction: 'more',
      headerTitle: 'course.title',
      headerTitleDefault: 'Course',
      mobilePageMode: isImmersiveWorkspace ? 'immersive' : 'workspace',
    };
  },
  practice: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'section',
    headerAction: 'none',
    headerTitle: 'nav.practice',
    headerTitleDefault: 'Practice',
    mobilePageMode: 'hub',
  }),
  media: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'section',
    headerAction: 'filter',
    headerTitle: 'nav.media',
    headerTitleDefault: 'Media',
    mobilePageMode: 'hub',
  }),
  reading: segments => {
    const isReadingDetail = segments.length > 1;
    const isPictureBookReader = segments[1] === 'books';
    return {
      hasFooter: false,
      hasHeader: false,
      hasBottomNav: !isPictureBookReader,
      usePatternBackground: !isReadingDetail,
      useDesktopContainerPadding: !isReadingDetail,
      useDesktopMaxWidth: !isReadingDetail,
      lockMainScroll: isPictureBookReader,
      headerType: 'section',
      headerAction: 'none',
      headerTitle: 'nav.reading',
      headerTitleDefault: 'Reading',
      allowHiddenChrome: isPictureBookReader,
      mobilePageMode: isPictureBookReader ? 'immersive' : isReadingDetail ? 'workspace' : 'hub',
    };
  },
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
        mobilePageMode: 'immersive',
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
        mobilePageMode: 'workspace',
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
      mobilePageMode: 'immersive',
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
    mobilePageMode: 'immersive',
  }),
  'vocab-book': segments => {
    const isImmersive = IMMERSIVE_VOCAB_ROUTES.has(segments[1] || '');
    return {
      hasFooter: false,
      headerType: isImmersive ? 'detail' : 'section',
      headerAction: isImmersive ? 'more' : 'filter',
      headerTitle: 'dashboard.vocab.title',
      headerTitleDefault: 'Vocab',
      hasDesktopSidebar: !isImmersive,
      hasBottomNav: !isImmersive,
      hasHeader: false,
      usePatternBackground: false,
      useDesktopContainerPadding: false,
      useDesktopMaxWidth: false,
      allowHiddenChrome: isImmersive,
      mobilePageMode: isImmersive ? 'immersive' : 'workspace',
    };
  },
  vocabbook: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'section',
    headerAction: 'filter',
    headerTitle: 'dashboard.vocab.title',
    headerTitleDefault: 'Vocab',
    mobilePageMode: 'workspace',
  }),
  podcasts: segments => {
    if (segments[1] === 'player') {
      return {
        hasDesktopSidebar: false,
        hasBottomNav: false,
        hasHeader: false,
        hasFooter: false,
        allowHiddenChrome: true,
        mobilePageMode: 'immersive',
      };
    }
    return {
      hasFooter: false,
      hasHeader: false,
      headerType: 'section',
      headerAction: 'filter',
      headerTitle: 'nav.podcasts',
      headerTitleDefault: 'Podcasts',
      mobilePageMode: 'hub',
    };
  },
  videos: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'section',
    headerAction: 'filter',
    headerTitle: 'nav.videos',
    headerTitleDefault: 'Videos',
    mobilePageMode: 'hub',
  }),
  video: () => ({
    hasDesktopSidebar: false,
    hasBottomNav: false,
    hasHeader: false,
    hasFooter: false,
    allowHiddenChrome: true,
    mobilePageMode: 'immersive',
  }),
  notebook: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'section',
    headerAction: 'search',
    headerTitle: 'nav.notebook',
    headerTitleDefault: 'Notebook',
    mobilePageMode: 'workspace',
  }),
  profile: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'section',
    headerAction: 'none',
    headerTitle: 'nav.profile',
    headerTitleDefault: 'Profile',
    mobilePageMode: 'account',
  }),
  dictionary: () => ({
    hasFooter: false,
    hasHeader: false,
    headerType: 'detail',
    headerAction: 'more',
    headerTitle: 'dashboard.dictionary.label',
    headerTitleDefault: 'Dictionary',
    mobilePageMode: 'workspace',
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
