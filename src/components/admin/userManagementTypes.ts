export type AdminUserAccountStatus = 'ACTIVE' | 'DISABLED';
export type AdminUserResolvedPlan = 'FREE' | 'PRO' | 'LIFETIME';
export type AdminUserSubscriptionStatus = 'FREE' | 'ACTIVE' | 'EXPIRED' | 'LIFETIME';
export type AdminUserRole = 'ADMIN' | 'STUDENT';
export type AdminUserKycStatus = 'NONE' | 'VERIFIED';
export type AdminUserEmailVerificationFilter = 'VERIFIED' | 'UNVERIFIED';
export type AdminUserActivityWindow = 'ACTIVE_7_DAYS' | 'INACTIVE_30_DAYS';
export type AdminUserSortBy =
  | 'NEWEST'
  | 'OLDEST'
  | 'LAST_ACTIVE_DESC'
  | 'LAST_LOGIN_DESC'
  | 'TOTAL_STUDY_DESC';
export type AdminManagedPlan = 'FREE' | 'PRO' | 'LIFETIME';
export type AdminBillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'LIFETIME';

export type AdminUserListFilters = {
  search?: string;
  role?: AdminUserRole;
  accountStatus?: AdminUserAccountStatus;
  plan?: AdminUserResolvedPlan;
  emailVerified?: AdminUserEmailVerificationFilter;
  kycStatus?: AdminUserKycStatus;
  activityWindow?: AdminUserActivityWindow;
  sortBy?: AdminUserSortBy;
};

export type AdminUserListItem = {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  role: AdminUserRole;
  accountStatus: AdminUserAccountStatus;
  resolvedPlan: AdminUserResolvedPlan;
  subscriptionType?: string;
  subscriptionExpiry?: string;
  subscriptionStatus: AdminUserSubscriptionStatus | string;
  emailVerified: boolean;
  kycStatus: AdminUserKycStatus;
  createdAt?: number;
  lastLoginAt?: number;
  lastActivityAt?: number;
  lastActivityType?: string;
  lastInstitute?: string;
  lastLevel?: number;
  lastUnit?: number;
  lastModule?: string;
  savedWordsCount: number;
  mistakesCount: number;
  totalStudyMinutes: number;
};

export type AdminActorSummary = {
  id: string;
  name?: string;
  email?: string;
} | null;

export type AdminUserDetail = {
  user: AdminUserListItem & {
    phoneRegion?: string;
    isRegionalPromoEligible?: boolean;
    disabledAt?: number;
    disabledReason?: string;
    disabledBy?: AdminActorSummary;
  };
  membership: {
    plan: AdminManagedPlan;
    subscriptionType: string | null;
    subscriptionStatus: AdminUserSubscriptionStatus | string;
    subscriptionExpiry: string | null;
    isViewerAccessible: boolean;
  };
  learning: {
    currentPointer: {
      instituteId: string | null;
      instituteName: string | null;
      level: number | null;
      unit: number | null;
      module: string | null;
    };
    vocab: {
      total: number;
      mastered: number;
      dueReviews: number;
      savedByUser: number;
    };
    grammar: {
      total: number;
      mastered: number;
    };
    courses: {
      totalCourses: number;
      totalCompletedUnits: number;
      recentCourseId: string | null;
      recentCourseName: string | null;
      recentCourseLastAccessAt: number | null;
    };
    notes: {
      totalPages: number;
      archivedPages: number;
      templates: number;
      queuedReviewCount: number;
    };
    annotations: {
      total: number;
    };
    exams: {
      totalAttempts: number;
      averageScore: number;
      latestAttemptAt: number | null;
    };
    typing: {
      totalRecords: number;
      bestWpm: number;
      averageAccuracy: number;
    };
    podcasts: {
      subscriptions: number;
      listeningSessions: number;
      latestPlayedAt: number | null;
    };
    ai: {
      callsLast30Days: number;
      totalTokensLast30Days: number;
      totalCostLast30Days: number;
    };
    badges: {
      total: number;
      new: number;
    };
  };
  recentActivity: Array<{
    id: string;
    activityType: string;
    duration: number;
    itemsStudied: number;
    createdAt: number;
  }>;
  recentExamAttempts: Array<{
    id: string;
    examId: string;
    examTitle: string;
    score: number;
    maxScore: number;
    correctCount: number;
    createdAt: number;
  }>;
  recentListeningHistory: Array<{
    id: string;
    episodeTitle: string;
    channelName: string;
    progress: number;
    duration: number;
    playedAt: number;
  }>;
  adminNotes: Array<{
    id: string;
    body: string;
    createdAt: number;
    updatedAt: number;
    author: AdminActorSummary;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    metadata: Record<string, string | number | boolean>;
    createdAt: number;
    actor: AdminActorSummary;
  }>;
};

export type AdminProfileFormState = {
  name: string;
  role: AdminUserRole;
  emailVerified: boolean;
  kycStatus: AdminUserKycStatus;
  plan: AdminManagedPlan;
  subscriptionType: AdminBillingCycle;
  subscriptionExpiry: string;
};
