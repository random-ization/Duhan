/**
 * React Query hooks for data fetching with caching
 * Eliminates redundant loading states when navigating between pages
 */
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

// ============================================
// Dashboard Stats Query
// ============================================
export function useDashboardStats() {
    return useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: async () => {
            const response = await api.getUserStats();
            return response;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// ============================================
// Unit Data Query (Reading/Listening content)
// ============================================
export function useUnitData(courseId: string, unitIndex: number) {
    return useQuery({
        queryKey: ['unit', courseId, unitIndex],
        queryFn: async () => {
            const response = await api.getUnitLearningData(courseId, unitIndex);
            if (!response.success) {
                throw new Error('Failed to fetch unit data');
            }
            return response.data;
        },
        staleTime: Infinity, // Course content rarely changes
        enabled: !!courseId && unitIndex > 0,
    });
}

// ============================================
// Listening Unit Query
// ============================================
export function useListeningUnit(courseId: string, unitIndex: number) {
    return useQuery({
        queryKey: ['listening', courseId, unitIndex],
        queryFn: async () => {
            try {
                const response = await api.getListeningUnit(courseId, unitIndex);
                if (!response.success) {
                    return null;
                }
                return response.data;
            } catch (err: any) {
                // 404 means no content yet - return null, not error
                if (err?.message?.includes('404') || err?.status === 404) {
                    return null;
                }
                throw err;
            }
        },
        staleTime: Infinity, // Listening content rarely changes
        enabled: !!courseId && unitIndex > 0,
    });
}

// ============================================
// Video List Query
// ============================================
export function useVideoList(level?: string) {
    return useQuery({
        queryKey: ['videos', level],
        queryFn: async () => {
            const response = await api.video.list(level || undefined);
            if (!response.success) {
                throw new Error('Failed to fetch videos');
            }
            return response.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// ============================================
// Video Detail Query
// ============================================
export function useVideoDetail(id: string) {
    return useQuery({
        queryKey: ['video', id],
        queryFn: async () => {
            const response = await api.video.get(id);
            if (!response.success) {
                throw new Error('Video not found');
            }
            return response.data;
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
        enabled: !!id,
    });
}

// ============================================
// Institutes/Courses List Query
// ============================================
export function useInstitutes() {
    return useQuery({
        queryKey: ['institutes'],
        queryFn: async () => {
            const response = await api.getInstitutes();
            return response;
        },
        staleTime: 1000 * 60 * 30, // 30 minutes - rarely changes
    });
}
