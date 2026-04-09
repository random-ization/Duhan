// Reading Library Types
export interface EpubLibraryBook {
  _id: string;
  ownerUserId: string;
  slug: string;
  title: string;
  author: string;
  description?: string;
  language: string;
  coverObjectKey?: string;
  coverSignedUrlCache?: string;
  epubObjectKey: string;
  status:
    | 'DRAFT_UPLOADED'
    | 'PROCESSING'
    | 'READY_FOR_REVIEW'
    | 'IN_REVIEW'
    | 'PUBLISHED'
    | 'REJECTED'
    | 'PROCESSING_FAILED';
  visibility: 'OWNER_ONLY' | 'PUBLIC';
  accessMode: 'FREE_PREVIEW_PLUS_PRO';
  shareEnabled?: boolean;
  sharedAt?: number;
  chapterCount: number;
  wordCount: number;
  sampleChapterCount: number;
  toc?: Array<{
    title: string;
    href: string;
    level: number;
    children?: any[];
  }>;
  tags?: string[];
  submittedAt?: number;
  reviewedAt?: number;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: number;
  updatedAt: number;

  // Computed properties
  canEdit?: boolean;
  canSubmitForReview?: boolean;
  canRead?: boolean;
  isOwner?: boolean;
  canShare?: boolean;
}

export interface EpubLibraryChapter {
  _id: string;
  bookId: string;
  chapterIndex: number;
  title: string;
  href: string;
  htmlSanitized: string;
  plainText: string;
  paragraphs?: string[];
  wordCount: number;
  createdAt: number;
}

export interface EpubLibraryProgress {
  _id: string;
  userId: string;
  bookId: string;
  chapterIndex: number;
  blockId?: string;
  scrollTop: number;
  completionPercent: number;
  lastReadAt: number;
  createdAt: number;
  updatedAt: number;
}

export type EpubUploadStatus =
  | 'DRAFT_UPLOADED'
  | 'PROCESSING'
  | 'READY_FOR_REVIEW'
  | 'IN_REVIEW'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'PROCESSING_FAILED';

export interface EpubAccessState {
  canReadFull: boolean;
  availableChapters: number;
  totalChapters: number;
  isPreviewLimited: boolean;
  previewChapterLimit: number;
}

export interface BookDetailResponse {
  book: EpubLibraryBook & {
    chapters: Array<{
      id: string;
      index: number;
      title: string;
      wordCount: number;
    }>;
  };
  isOwner: boolean;
  isSharedAccess?: boolean;
  userProgress: EpubLibraryProgress | null;
  accessState: EpubAccessState;
}

export interface ChapterReaderResponse {
  chapter: EpubLibraryChapter & {
    content: string;
    plainText: string;
  };
  bookInfo: {
    title: string;
    author: string;
    totalChapters: number;
    currentChapterIndex: number;
  };
}

export interface PublicShelfResponse {
  books: EpubLibraryBook[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface UploadDraftRequest {
  title: string;
  author: string;
  description?: string;
  language: string;
  tags?: string[];
  epubObjectKey: string;
}

export interface UploadDraftResponse {
  bookId: string;
  slug: string;
}

export interface EpubValidationResult {
  valid: boolean;
  chapters: number;
  metadata: {
    title?: string;
    author?: string;
    language?: string;
  };
}

// Admin types
export interface AdminBookListResponse {
  books: Array<
    EpubLibraryBook & {
      owner: {
        id: string;
        name?: string;
        email?: string;
      };
      chapterCount: number;
      firstChapter: EpubLibraryChapter | null;
    }
  >;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface AdminBookDetailResponse {
  book: EpubLibraryBook;
  owner: {
    id: string;
    name?: string;
    email?: string;
  };
  chapters: Array<{
    id: string;
    index: number;
    title: string;
    wordCount: number;
    preview: string;
  }>;
}

export interface AdminStats {
  total: number;
  byStatus: {
    DRAFT_UPLOADED: number;
    PROCESSING: number;
    READY_FOR_REVIEW: number;
    IN_REVIEW: number;
    PUBLISHED: number;
    REJECTED: number;
    PROCESSING_FAILED: number;
  };
  byVisibility: {
    OWNER_ONLY: number;
    PUBLIC: number;
  };
  totalWords: number;
  totalChapters: number;
}

// UI State Types
export interface ReadingLibraryUIState {
  activeTab: 'public' | 'my-uploads';
  selectedBook: EpubLibraryBook | null;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  isReading: boolean;
  currentChapter: number;
  readerSettings: {
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    theme: 'light' | 'dark' | 'sepia';
    lineHeight: 'compact' | 'normal' | 'relaxed';
  };
}

export interface EpubUploadFormData {
  title: string;
  author: string;
  description: string;
  language: string;
  tags: string[];
  file: File | null;
}

export interface ChapterNavigation {
  previousChapter: number | null;
  nextChapter: number | null;
  isFirstChapter: boolean;
  isLastChapter: boolean;
}

// Annotation types for EPUB
export interface EpubAnnotation {
  _id: string;
  userId: string;
  scopeType: 'EPUB_BOOK' | 'EPUB_CHAPTER';
  scopeId: string;
  blockId?: string;
  note?: string;
  color: string | null;
  highlight: {
    start: number;
    end: number;
    text: string;
  } | null;
  createdAt: number;
  updatedAt: number;
}
