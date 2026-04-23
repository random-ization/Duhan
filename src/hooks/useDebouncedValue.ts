import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debounced;
}
