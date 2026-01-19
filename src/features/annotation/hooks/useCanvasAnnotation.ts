import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { CanvasData } from '../components/CanvasLayer';
import { mRef, qRef } from '../../../utils/convexRefs';

interface UseCanvasAnnotationOptions {
  targetId: string;
  targetType: 'TEXTBOOK' | 'EXAM';
  pageIndex: number;
  debounceMs?: number; // 防抖延迟，默认 1000ms
  autoSave?: boolean; // 是否自动保存，默认 true
}

interface UseCanvasAnnotationReturn {
  // 数据
  canvasData: CanvasData | null;
  loading: boolean;
  saving: boolean;
  error: Error | null;

  // 操作
  handleCanvasChange: (data: CanvasData) => void;
  handleCanvasSave: (data: CanvasData) => void;
  refresh: () => Promise<void>;
}

/**
 * useCanvasAnnotation - 画板笔记 Hook
 *
 * 功能：
 * - 翻页时自动获取当前页的笔记数据
 * - 支持防抖保存，避免频繁请求
 * - 自动保存 / 手动保存
 */
export const useCanvasAnnotation = (
  options: UseCanvasAnnotationOptions
): UseCanvasAnnotationReturn => {
  const { targetId, targetType, pageIndex, debounceMs = 1000, autoSave = true } = options;

  // 状态
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 防抖定时器
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 保存待保存的数据（用于防抖）
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

  // 保存笔记数据（实际执行）
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

  // 防抖保存
  const debouncedSave = useCallback(
    (data: CanvasData) => {
      pendingDataRef.current = data;

      // 清除之前的定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 设置新的定时器
      debounceTimerRef.current = setTimeout(() => {
        if (pendingDataRef.current) {
          doSave(pendingDataRef.current);
          pendingDataRef.current = null;
        }
      }, debounceMs);
    },
    [doSave, debounceMs]
  );

  // 处理画板变化（自动保存时使用防抖）
  const handleCanvasChange = useCallback(
    (data: CanvasData) => {
      setCanvasData(data);

      if (autoSave) {
        debouncedSave(data);
      }
    },
    [autoSave, debouncedSave]
  );

  // 手动保存（立即执行，不防抖）
  const handleCanvasSave = useCallback(
    (data: CanvasData) => {
      // 清除待执行的防抖保存
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      pendingDataRef.current = null;

      // 立即保存
      doSave(data);
    },
    [doSave]
  );

  // 刷新数据
  const refresh = useCallback(async () => {
    await fetchAnnotation();
  }, [fetchAnnotation]);

  // 翻页时自动获取数据 - Managed by UseQuery Effect now
  /*
    useEffect(() => {
        fetchAnnotation();
    }, [fetchAnnotation]);
    */

  // 组件卸载时清理定时器，并保存未保存的数据
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // 保存待保存的数据
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
