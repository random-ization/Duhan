import { useEffect } from 'react';

type UseOutsideDismissOptions = Readonly<{
  enabled: boolean;
  onDismiss: () => void;
  ignoreSelectors?: readonly string[];
}>;

export function useOutsideDismiss({
  enabled,
  onDismiss,
  ignoreSelectors = [],
}: UseOutsideDismissOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (ignoreSelectors.some(selector => target.closest(selector))) return;
      onDismiss();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, ignoreSelectors, onDismiss]);
}
