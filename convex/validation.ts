export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getPath = (value: unknown, path: readonly string[]): unknown => {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
};

export const readString = (value: unknown, path: readonly string[]): string | undefined => {
  const v = getPath(value, path);
  return typeof v === 'string' ? v : undefined;
};

export const readNumber = (value: unknown, path: readonly string[]): number | undefined => {
  const v = getPath(value, path);
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
};

export const parseJson = (text: string): unknown => JSON.parse(text) as unknown;
