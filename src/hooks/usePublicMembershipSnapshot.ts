import { useCallback, useEffect, useState } from 'react';

import { User } from '../types';
import type { ViewerAccessSnapshot } from '../utils/entitlements';
import {
  callAuthenticatedConvexQuery,
  hasConvexAuthToken,
} from '../utils/publicConvexClient';

interface PublicMembershipSnapshot {
  user: User | null;
  viewerAccess: ViewerAccessSnapshot | null;
}

interface UsePublicMembershipSnapshotResult extends PublicMembershipSnapshot {
  hasStoredSession: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePublicMembershipSnapshot(): UsePublicMembershipSnapshotResult {
  const [hasStoredSession, setHasStoredSession] = useState(() => hasConvexAuthToken());
  const [snapshot, setSnapshot] = useState<PublicMembershipSnapshot>({
    user: null,
    viewerAccess: null,
  });
  const [loading, setLoading] = useState(() => hasConvexAuthToken());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const hasToken = hasConvexAuthToken();
    setHasStoredSession(hasToken);
    if (!hasToken) {
      setSnapshot({ user: null, viewerAccess: null });
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [user, viewerAccess] = await Promise.all([
        callAuthenticatedConvexQuery<Record<string, never>, User | null>('users:viewer', {}),
        callAuthenticatedConvexQuery<Record<string, never>, ViewerAccessSnapshot>(
          'entitlements:viewerAccess',
          {}
        ),
      ]);
      setSnapshot({ user, viewerAccess });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : String(requestError);
      setSnapshot({ user: null, viewerAccess: null });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...snapshot,
    hasStoredSession,
    loading,
    error,
    refresh,
  };
}
