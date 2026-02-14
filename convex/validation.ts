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

export const normalizeFiniteNumberMap = (value: unknown): Record<string, number> => {
  if (!isRecord(value)) {
    throw new Error('INVALID_MAP_FORMAT');
  }

  const normalized: Record<string, number> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (key.trim() === '') {
      throw new Error('INVALID_MAP_KEY');
    }
    if (typeof entryValue !== 'number' || !Number.isFinite(entryValue)) {
      throw new Error('INVALID_MAP_VALUE');
    }
    normalized[key] = entryValue;
  }
  return normalized;
};

export const normalizeAnswerMap = (value: unknown): Record<string, number> => {
  const normalized = normalizeFiniteNumberMap(value);

  for (const [questionKey, answer] of Object.entries(normalized)) {
    const questionNumber = Number(questionKey);
    if (!Number.isInteger(questionNumber) || questionNumber < 0) {
      throw new Error('INVALID_ANSWER_KEY');
    }
    if (!Number.isInteger(answer) || answer < 0) {
      throw new Error('INVALID_ANSWER_VALUE');
    }
  }

  return normalized;
};
