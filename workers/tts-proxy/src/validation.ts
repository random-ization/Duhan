export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const readString = (value: unknown, key: string): string | undefined => {
  if (!isRecord(value)) return undefined;
  const v = value[key];
  return typeof v === 'string' ? v : undefined;
};
