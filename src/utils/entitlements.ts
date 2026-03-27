import type { TopikExam, TextbookContent } from '../types';

export type EntitlementPlan = 'FREE' | 'PRO' | 'LIFETIME';

export type ViewerAccessSnapshot = {
  plan: EntitlementPlan;
  isPremium: boolean;
  windowStart: number;
  limits: {
    courseFreeUnits: number;
    aiCreditsDaily: number | null;
    vocabNewWordsDaily: number | null;
    vocabTestDaily: number | null;
    mediaPlayDaily: number | null;
  };
  remaining: {
    aiCreditsDaily: number | null;
    vocabNewWordsDaily: number | null;
    vocabTestDaily: number | null;
    mediaPlayDaily: number | null;
  };
  flags: {
    pdfExport: boolean;
    mediaSpeedControl: boolean;
    historyAnalytics: boolean;
  };
};

export type EntitlementErrorData = {
  code?: string;
  reason?: string;
  feature?: string;
  upgradeSource?: string;
  remaining?: number | null;
};

export function getEntitlementErrorData(error: unknown): EntitlementErrorData | null {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return null;
  }

  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== 'object') {
    return null;
  }

  const candidate = data as Record<string, unknown>;
  return {
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    reason: typeof candidate.reason === 'string' ? candidate.reason : undefined,
    feature: typeof candidate.feature === 'string' ? candidate.feature : undefined,
    upgradeSource:
      typeof candidate.upgradeSource === 'string' ? candidate.upgradeSource : undefined,
    remaining:
      typeof candidate.remaining === 'number' || candidate.remaining === null
        ? (candidate.remaining as number | null)
        : undefined,
  };
}

export function isPremiumPlan(plan: EntitlementPlan | null | undefined): boolean {
  return plan === 'PRO' || plan === 'LIFETIME';
}

export function canAccessTopikExam(
  exam: Pick<TopikExam, 'accessLevel' | 'isPaid'>,
  snapshot: ViewerAccessSnapshot | null | undefined
): boolean {
  if (exam.accessLevel === 'FREE_SAMPLE') return true;
  if (exam.accessLevel === 'PRO') return Boolean(snapshot?.isPremium);
  if (exam.isPaid) return Boolean(snapshot?.isPremium);
  return true;
}

export function canAccessLegacyContent(
  content: Pick<TextbookContent, 'isPaid'>,
  snapshot: ViewerAccessSnapshot | null | undefined
): boolean {
  if (!content.isPaid) return true;
  return Boolean(snapshot?.isPremium);
}
