import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import { appendReturnToPath, resolveSafeReturnTo } from '../utils/navigation';

export type VocabBookRouteCategory = 'UNLEARNED' | 'DUE' | 'MASTERED';

const VOCAB_BOOK_PAGE_SIZE = 80;

type UseVocabBookRouteStateArgs = {
  searchParams: URLSearchParams;
};

type VocabBookQueryArgs = {
  includeMastered: true;
  search: string | undefined;
  savedByUserOnly: boolean;
  category: VocabBookRouteCategory;
  cursor: string | undefined;
  courseId: string | undefined;
  limit: number;
};

export type UseVocabBookRouteStateResult = {
  activeCategory: VocabBookRouteCategory;
  allCourses: boolean;
  courseId: string | undefined;
  isMobileListMode: boolean;
  listPath: string;
  mistakesPath: string;
  pageCursor: string | null;
  queryArgs: VocabBookQueryArgs;
  returnToPath: string;
  savedByUserOnly: boolean;
  searchQuery: string;
  setActiveCategory: Dispatch<SetStateAction<VocabBookRouteCategory>>;
  setPageCursor: Dispatch<SetStateAction<string | null>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
};

export function useVocabBookRouteState({
  searchParams,
}: UseVocabBookRouteStateArgs): UseVocabBookRouteStateResult {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<VocabBookRouteCategory>('DUE');
  const [pageCursor, setPageCursor] = useState<string | null>(null);

  const searchParamsKey = searchParams.toString();
  const trimmedSearch = searchQuery.trim();
  const allCourses = searchParams.get('all') === 'true';
  const courseId = searchParams.get('courseId') || undefined;
  const savedByUserOnly = !courseId && !allCourses;
  const returnToPath = resolveSafeReturnTo(searchParams.get('returnTo'), '/courses');
  const isMobileListMode = searchParams.get('mobileView') === 'list';

  const listPath = useMemo(() => {
    const nextParams = new URLSearchParams(searchParamsKey);
    nextParams.set('mobileView', 'list');
    const query = nextParams.toString();
    return query ? `/vocab-book?${query}` : '/vocab-book';
  }, [searchParamsKey]);

  const mistakesPath = useMemo(() => {
    return appendReturnToPath('/dashboard/vocabulary?list=mistakes', returnToPath);
  }, [returnToPath]);

  const queryArgs = useMemo<VocabBookQueryArgs>(
    () => ({
      includeMastered: true,
      search: trimmedSearch || undefined,
      savedByUserOnly,
      category: activeCategory,
      cursor: pageCursor || undefined,
      courseId,
      limit: VOCAB_BOOK_PAGE_SIZE,
    }),
    [activeCategory, courseId, pageCursor, savedByUserOnly, trimmedSearch]
  );

  return {
    activeCategory,
    allCourses,
    courseId,
    isMobileListMode,
    listPath,
    mistakesPath,
    pageCursor,
    queryArgs,
    returnToPath,
    savedByUserOnly,
    searchQuery,
    setActiveCategory,
    setPageCursor,
    setSearchQuery,
  };
}
