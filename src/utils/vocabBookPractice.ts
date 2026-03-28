export type VocabBookPracticeCategory = 'ALL' | 'UNLEARNED' | 'DUE' | 'MASTERED';

type ProgressLike = {
  status?: string | null;
  state?: number | null;
};

export function normalizeVocabBookPracticeCategory(
  rawCategory: string | null | undefined
): VocabBookPracticeCategory {
  const normalized = (rawCategory || '').trim().toUpperCase();
  if (
    normalized === 'ALL' ||
    normalized === 'UNLEARNED' ||
    normalized === 'DUE' ||
    normalized === 'MASTERED'
  ) {
    return normalized;
  }
  return 'DUE';
}

export function matchesVocabBookPracticeCategory(
  progress: ProgressLike,
  category: VocabBookPracticeCategory
): boolean {
  if (category === 'ALL') return true;
  const isMastered = progress.status === 'MASTERED';
  const isUnlearned = progress.state === 0 || progress.status === 'NEW';
  if (isMastered) return category === 'MASTERED';
  if (isUnlearned) return category === 'UNLEARNED';
  return category === 'DUE';
}
