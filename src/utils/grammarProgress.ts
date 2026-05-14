import type { GrammarPointData } from '../types';

export type GrammarProgressStatus = NonNullable<GrammarPointData['status']>;

type GrammarProgressSelectable = Pick<
  GrammarPointData,
  'id' | 'unitId' | 'displayOrder' | 'title' | 'status'
>;

export function normalizeGrammarProgressStatus(value: unknown): GrammarProgressStatus {
  if (value === 'MASTERED' || value === 'LEARNING' || value === 'NEW') {
    return value;
  }
  return 'NEW';
}

export function isGrammarCompleted(status: unknown): boolean {
  return normalizeGrammarProgressStatus(status) === 'MASTERED';
}

export function sortGrammarProgressItems<T extends GrammarProgressSelectable>(
  grammarPoints: readonly T[]
): T[] {
  return [...grammarPoints].sort((left, right) => {
    const leftUnit = left.unitId ?? Number.MAX_SAFE_INTEGER;
    const rightUnit = right.unitId ?? Number.MAX_SAFE_INTEGER;
    if (leftUnit !== rightUnit) {
      return leftUnit - rightUnit;
    }

    const leftOrder = left.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.title.localeCompare(right.title);
  });
}

export function getNextGrammarSelection<T extends GrammarProgressSelectable>({
  grammarPoints,
  lastGrammarId,
}: {
  grammarPoints: readonly T[];
  lastGrammarId?: string | null;
}): T | null {
  const orderedPoints = sortGrammarProgressItems(grammarPoints);
  if (orderedPoints.length === 0) {
    return null;
  }

  const firstPendingPoint = orderedPoints.find(point => !isGrammarCompleted(point.status));
  if (firstPendingPoint) {
    return firstPendingPoint;
  }

  if (lastGrammarId) {
    const lastViewedPoint = orderedPoints.find(point => point.id === lastGrammarId);
    if (lastViewedPoint) {
      return lastViewedPoint;
    }
  }

  return orderedPoints[0];
}
