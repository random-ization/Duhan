export const toErrorMessage = (value: unknown): string => {
  if (value instanceof Error) return value.message || String(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
    return String(value);
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
};

export const toError = (value: unknown): Error => {
  if (value instanceof Error) return value;
  return new Error(toErrorMessage(value));
};
