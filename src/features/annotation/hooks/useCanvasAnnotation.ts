import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { CanvasData } from '../components/CanvasLayer';
import { mRef, qRef } from '../../../utils/convexRefs';

interface UseCanvasAnnotationOptions {
  targetId: string;
  targetType: 'TEXTBOOK' | 'EXAM';
  pageIndex: number;
  debounceMs?: number; // \u9632\u6296\u5ef6\u8fdf，\u9ed8\u8ba4 1000ms
  autoSave?: boolean; // \u662f\u5426\u81ea\u52a8\u4fdd\u5b58，\u9ed8\u8ba4 true
}

interface UseCanvasAnnotationReturn {
  // \u6570\u636e
  canvasData: CanvasData | null;
  loading: boolean;
  saving: boolean;
  error: Error | null;

  // \u64cd\u4f5c
  handleCanvasChange: (data: CanvasData) => void;
  handleCanvasSave: (data: CanvasData) => void;
  refresh: () => Promise<void>;
}

/**
 * useCanvasAnnotation - \u753b\u677f\u7b14\u8bb0 Hook
 *
 * \u529f\u80fd：
 * - \u7ffb\u9875\u65f6\u81ea\u52a8\u83b7\u53d6\u5f53\u524d\u9875\u7684\u7b14\u8bb0\u6570\u636e
 * - \u652f\u6301\u9632\u6296\u4fdd\u5b58，\u907f\u514d\u9891\u7e41\u8bf7\u6c42
 * - \u81ea\u52a8\u4fdd\u5b58 / \u624b\u52a8\u4fdd\u5b58
 */
export const useCanvasAnnotation = (
  options: UseCanvasAnnotationOptions
): UseCanvasAnnotationReturn => {
  const { targetId, targetType, pageIndex, debounceMs = 1000, autoSave = true } = options;

  // \u72b6\u6001
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // \u9632\u6296\u5b9a\u65f6\u5668
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // \u4fdd\u5b58\u5f85\u4fdd\u5b58\u7684\u6570\u636e（\u7528\u4e8e\u9632\u6296）
  const pendingDataRef = useRef<CanvasData | null>(null);

  // Convex hooks
  // We use useQuery for fetching. Since it's reactive, we might not need manual fetch?
  // But the component logic expects manual control via 'refresh' and 'fetchAnnotation'.
  // And 'pageIndex' changes.
  // The legacy hook managed 'canvasData' in local state.
  // Ideally with Convex, we just use the query result directly.
  // But to keep existing signature, we might wrap it.

  // Actually, let's use the query directly.
  const canvasQuery = useQuery(
    qRef<
      { targetId: string; targetType: 'TEXTBOOK' | 'EXAM'; pageIndex: number },
      { data?: CanvasData } | null
    >('canvas:getCanvas'),
    { targetId, targetType, pageIndex }
  );

  const saveMutation = useMutation(
    mRef<
      { targetId: string; targetType: 'TEXTBOOK' | 'EXAM'; pageIndex: number; data: CanvasData },
      { success: boolean }
    >('canvas:saveCanvas')
  );

  // Sync Query to State (to maintain interface consistency if needed, or refactor)
  // The exiting hook exposes 'canvasData' state which can be updated optimistically via 'handleCanvasChange'.
  // If we rely purely on useQuery, local drawing updates might visually lag if we don't use local state.
  // 'handleCanvasChange' updates local 'canvasData'.
  // So 'canvasData' should be initialized from query, but then independent until save?
  // Logic:
  // 1. On mount or page change, load from DB -> setCanvasData.
  // 2. User draws -> handleCanvasChange -> updates canvasData (local) + debounced save.

  useEffect(() => {
    if (canvasQuery !== undefined) {
      // Only update if we are not currently saving/editing?
      // Or better: initialized once per pageIndex.
      // Actually, if we just drew something, we don't want the query to overwrite it immediately unless it's a remote update?
      // Simple approach: When pageIndex changes, we wait for query to load, then setCanvasData.
      // But useQuery updates automatically.
      // Let's rely on the query's 'data' as the source for INITIAL load.
      // But we need to track if we've loaded for THIS pageIndex.
    }
  }, [canvasQuery, pageIndex]); // This is tricky with React State vs Convex Realtime.

  // Let's modify the flow:
  // 'canvasData' is the source of truth for the Canvas component.
  // We load it from Convex when 'targetId/pageIndex' changes.

  const loadedRef = useRef<string | null>(null); // Track key of loaded data "id-type-page"

  useEffect(() => {
    const key = `${targetId}-${targetType}-${pageIndex}`;
    if (loadedRef.current !== key && canvasQuery !== undefined) {
      setLoading(false); // Query finished loading (or is undefined if loading)
      if (canvasQuery) {
        setCanvasData(canvasQuery.data ?? null);
      } else {
        setCanvasData(null);
      }
      loadedRef.current = key;
    } else if (canvasQuery === undefined) {
      setLoading(true); // Loading...
    }
  }, [canvasQuery, targetId, targetType, pageIndex]);

  // Override fetchAnnotation to just rely on the effect above or manually refetch?
  // useQuery is auto. 'refresh' might not be needed or just no-op.
  const fetchAnnotation = useCallback(async () => {
    // No-op with Convex, it's realtime.
  }, []);

  // \u4fdd\u5b58\u7b14\u8bb0\u6570\u636e（\u5b9e\u9645\u6267\u884c）
  const doSave = useCallback(
    async (data: CanvasData) => {
      if (!targetId) return;

      setSaving(true);
      setError(null);

      try {
        await saveMutation({
          targetId,
          targetType,
          pageIndex,
          data,
        });
        console.log('[useCanvasAnnotation] Saved successfully');
      } catch (err) {
        console.error('Failed to save canvas annotation:', err);
        setError(err instanceof Error ? err : new Error('Failed to save annotation'));
      } finally {
        setSaving(false);
      }
    },
    [targetId, targetType, pageIndex, saveMutation]
  );

  // \u9632\u6296\u4fdd\u5b58
  const debouncedSave = useCallback(
    (data: CanvasData) => {
      pendingDataRef.current = data;

      // \u6e05\u9664\u4e4b\u524d\u7684\u5b9a\u65f6\u5668
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // \u8bbe\u7f6e\u65b0\u7684\u5b9a\u65f6\u5668
      debounceTimerRef.current = setTimeout(() => {
        if (pendingDataRef.current) {
          doSave(pendingDataRef.current);
          pendingDataRef.current = null;
        }
      }, debounceMs);
    },
    [doSave, debounceMs]
  );

  // \u5904\u7406\u753b\u677f\u53d8\u5316（\u81ea\u52a8\u4fdd\u5b58\u65f6\u4f7f\u7528\u9632\u6296）
  const handleCanvasChange = useCallback(
    (data: CanvasData) => {
      setCanvasData(data);

      if (autoSave) {
        debouncedSave(data);
      }
    },
    [autoSave, debouncedSave]
  );

  // \u624b\u52a8\u4fdd\u5b58（\u7acb\u5373\u6267\u884c，\u4e0d\u9632\u6296）
  const handleCanvasSave = useCallback(
    (data: CanvasData) => {
      // \u6e05\u9664\u5f85\u6267\u884c\u7684\u9632\u6296\u4fdd\u5b58
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      pendingDataRef.current = null;

      // \u7acb\u5373\u4fdd\u5b58
      doSave(data);
    },
    [doSave]
  );

  // \u5237\u65b0\u6570\u636e
  const refresh = useCallback(async () => {
    await fetchAnnotation();
  }, [fetchAnnotation]);

  // \u7ffb\u9875\u65f6\u81ea\u52a8\u83b7\u53d6\u6570\u636e - Managed by UseQuery Effect now

  // \u7ec4\u4ef6\u5378\u8f7d\u65f6\u6e05\u7406\u5b9a\u65f6\u5668，\u5e76\u4fdd\u5b58\u672a\u4fdd\u5b58\u7684\u6570\u636e
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // \u4fdd\u5b58\u5f85\u4fdd\u5b58\u7684\u6570\u636e
      if (pendingDataRef.current) {
        doSave(pendingDataRef.current);
      }
    };
  }, [doSave]);

  return {
    canvasData,
    loading,
    saving,
    error,
    handleCanvasChange,
    handleCanvasSave,
    refresh,
  };
};

export default useCanvasAnnotation;
