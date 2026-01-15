import { useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

export const useActivityLogger = () => {
    const { user } = useAuth();
    const logActivityMutation = useMutation(api.user.logActivity);

    const logActivity = useCallback(
        async (
            activityType: 'VOCAB' | 'READING' | 'LISTENING' | 'GRAMMAR' | 'EXAM',
            duration?: number,
            itemsStudied?: number,
            metadata?: any
        ) => {
            if (!user) return;
            try {
                await logActivityMutation({
                    activityType,
                    duration,
                    itemsStudied,
                    metadata
                });
            } catch (e) {
                console.error('Failed to log activity', e);
            }
        },
        [user, logActivityMutation]
    );

    return { logActivity };
};
