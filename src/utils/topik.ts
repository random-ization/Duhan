export type TopikLevel = 1 | 2;

export function formatTopikLevelLabel(level: TopikLevel | number | null | undefined): 'I' | 'II' {
  return level === 1 ? 'I' : 'II';
}

export function formatTopikLabel(level: TopikLevel | number | null | undefined): string {
  return `TOPIK ${formatTopikLevelLabel(level)}`;
}
