import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserManagement } from '../../src/components/admin/UserManagement';
import type {
  AdminDataHealth,
  AdminUserDetail,
  AdminUserListItem,
} from '../../src/components/admin/userManagementTypes';

const usePaginatedQueryMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock('convex/react', () => ({
  usePaginatedQuery: (...args: unknown[]) => usePaginatedQueryMock(...args),
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

const getFunctionName = (ref: Record<PropertyKey, unknown>) => {
  const symbolKey = Object.getOwnPropertySymbols(ref)[0];
  return String(ref[symbolKey]);
};

const listItem: AdminUserListItem = {
  id: 'user_123',
  name: 'Kim Hana',
  email: 'hana@example.com',
  avatar: undefined,
  role: 'STUDENT',
  accountStatus: 'ACTIVE',
  resolvedPlan: 'FREE',
  subscriptionStatus: 'FREE',
  emailVerified: false,
  kycStatus: 'NONE',
  createdAt: new Date('2026-03-01T00:00:00.000Z').getTime(),
  lastLoginAt: new Date('2026-03-20T00:00:00.000Z').getTime(),
  lastActivityAt: new Date('2026-03-28T00:00:00.000Z').getTime(),
  lastActivityType: 'READING',
  savedWordsCount: 3,
  mistakesCount: 1,
  totalStudyMinutes: 45,
};

const detail: AdminUserDetail = {
  user: {
    ...listItem,
    phoneRegion: 'CN',
    isRegionalPromoEligible: true,
    disabledAt: undefined,
    disabledReason: undefined,
    disabledBy: null,
  },
  membership: {
    plan: 'FREE',
    subscriptionType: null,
    subscriptionStatus: 'FREE',
    subscriptionExpiry: null,
    isViewerAccessible: true,
  },
  learning: {
    currentPointer: {
      instituteId: 'yonsei-1',
      instituteName: '延世韩国语 1',
      level: 1,
      unit: 3,
      module: 'reading',
    },
    vocab: { total: 12, mastered: 5, dueReviews: 2, savedByUser: 4 },
    grammar: { total: 7, mastered: 3 },
    courses: {
      totalCourses: 2,
      totalCompletedUnits: 5,
      recentCourseId: 'yonsei-1',
      recentCourseName: '延世韩国语 1',
      recentCourseLastAccessAt: new Date('2026-03-28T00:00:00.000Z').getTime(),
    },
    notes: { totalPages: 6, archivedPages: 1, templates: 0, queuedReviewCount: 2 },
    annotations: { total: 8 },
    exams: {
      totalAttempts: 4,
      averageScore: 78,
      latestAttemptAt: new Date('2026-03-25T00:00:00.000Z').getTime(),
    },
    typing: { totalRecords: 5, bestWpm: 210, averageAccuracy: 94 },
    podcasts: {
      subscriptions: 2,
      listeningSessions: 3,
      latestPlayedAt: new Date('2026-03-26T00:00:00.000Z').getTime(),
    },
    ai: { callsLast30Days: 10, totalTokensLast30Days: 2048, totalCostLast30Days: 1.2 },
    badges: { total: 6, new: 1 },
    moduleBreakdown: [{ module: 'READING', minutes: 12, sessions: 1 }],
    health: {
      invalidLastModule: false,
      lastActivityCacheMismatch: false,
    },
  },
  recentActivity: [
    {
      id: 'act_1',
      activityType: 'READING',
      duration: 12,
      itemsStudied: 2,
      createdAt: new Date('2026-03-28T00:00:00.000Z').getTime(),
    },
  ],
  recentExamAttempts: [
    {
      id: 'exam_1',
      examId: 'topik-1',
      examTitle: 'TOPIK 60届',
      score: 78,
      maxScore: 100,
      correctCount: 24,
      createdAt: new Date('2026-03-25T00:00:00.000Z').getTime(),
    },
  ],
  recentListeningHistory: [
    {
      id: 'listen_1',
      episodeTitle: 'Episode 1',
      channelName: 'Duhan Cast',
      progress: 320,
      duration: 600,
      playedAt: new Date('2026-03-26T00:00:00.000Z').getTime(),
    },
  ],
  recentLearningSessions: [
    {
      id: 'evt_1',
      sessionId: 'sess_1',
      module: 'READING',
      eventName: 'content_completed',
      durationSec: 720,
      itemCount: 2,
      result: 'unit_completed',
      createdAt: new Date('2026-03-28T00:00:00.000Z').getTime(),
    },
  ],
  adminNotes: [
    {
      id: 'note_1',
      body: '首轮运营跟进。',
      createdAt: new Date('2026-03-24T00:00:00.000Z').getTime(),
      updatedAt: new Date('2026-03-24T00:00:00.000Z').getTime(),
      author: { id: 'admin_1', name: '运营 A', email: 'ops@example.com' },
    },
  ],
  auditLogs: [
    {
      id: 'audit_1',
      action: 'USER_PROFILE_UPDATED',
      metadata: { changedFields: 'name' },
      createdAt: new Date('2026-03-24T00:00:00.000Z').getTime(),
      actor: { id: 'admin_1', name: '运营 A', email: 'ops@example.com' },
    },
  ],
};

const dataHealth: AdminDataHealth = {
  usersScanned: 1,
  learningEventsScanned: 10,
  recentActivityLogsScanned: 10,
  missingSessionIdCount: 0,
  invalidModuleCount: 0,
  invalidLastModuleUsers: 0,
  missingActivityCache: 0,
  missingStudyMinuteCache: 0,
  recentSummaryEvents: 4,
};

describe('UserManagement', () => {
  const loadMoreMock = vi.fn();
  const updateProfileMock = vi.fn().mockResolvedValue({ success: true, changedFields: [] });
  const setStatusMock = vi.fn().mockResolvedValue({ success: true, status: 'DISABLED' });
  const addNoteMock = vi.fn().mockResolvedValue({ success: true, noteId: 'note_new' });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    usePaginatedQueryMock.mockImplementation((ref, args) => {
      const fnName = getFunctionName(ref as Record<PropertyKey, unknown>);
      if (fnName !== 'admin:getUsers') {
        throw new Error(`unexpected paginated query ${fnName}`);
      }
      return { results: [listItem], status: 'Exhausted', loadMore: loadMoreMock, args };
    });

    useQueryMock.mockImplementation((ref, args) => {
      const fnName = getFunctionName(ref as Record<PropertyKey, unknown>);
      if (fnName === 'admin:getUserDetail') {
        return args === 'skip' ? undefined : detail;
      }
      if (fnName === 'admin:getDataHealth') {
        return dataHealth;
      }
      throw new Error(`unexpected query ${fnName}`);
    });

    useMutationMock.mockImplementation(ref => {
      const fnName = getFunctionName(ref as Record<PropertyKey, unknown>);
      if (fnName === 'admin:updateUserProfile') return updateProfileMock;
      if (fnName === 'admin:setUserAccountStatus') return setStatusMock;
      if (fnName === 'admin:addUserNote') return addNoteMock;
      throw new Error(`unexpected mutation ${fnName}`);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes updated filters to the paginated user query and opens the detail sheet', async () => {
    render(<UserManagement />);

    fireEvent.change(screen.getByLabelText('搜索用户'), { target: { value: 'hana' } });
    fireEvent.change(screen.getByLabelText('按角色筛选'), { target: { value: 'ADMIN' } });
    await waitFor(() => {
      const lastPaginatedArgs = usePaginatedQueryMock.mock.calls.at(-1)?.[1];
      expect(lastPaginatedArgs).toMatchObject({
        search: 'hana',
        role: 'ADMIN',
        sortBy: 'NEWEST',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: /查看/i }));

    expect(await screen.findByText('当前学习位置')).toBeInTheDocument();
    expect(screen.getByText('延世韩国语 1')).toBeInTheDocument();
  });

  it('validates profile and disable operations in the security tab', async () => {
    render(<UserManagement />);
    fireEvent.click(screen.getByRole('button', { name: /查看/i }));
    fireEvent.click(await screen.findByRole('tab', { name: '权限与安全' }));

    fireEvent.change(screen.getByLabelText('会员方案'), { target: { value: 'PRO' } });
    fireEvent.click(screen.getByRole('button', { name: '保存账户配置' }));
    expect(window.alert).toHaveBeenCalledWith('订阅会员必须填写到期时间');

    fireEvent.click(screen.getByRole('button', { name: '禁用账号' }));
    expect(window.alert).toHaveBeenCalledWith('禁用账号必须填写原因');

    fireEvent.change(screen.getByLabelText('禁用原因'), { target: { value: '测试禁用原因' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /我确认要禁用该账号/i }));
    fireEvent.click(screen.getByRole('button', { name: '禁用账号' }));

    await waitFor(() => {
      expect(setStatusMock).toHaveBeenCalledWith({
        userId: 'user_123',
        status: 'DISABLED',
        reason: '测试禁用原因',
      });
    });
  });

  it('submits admin notes from the ops tab', async () => {
    render(<UserManagement />);
    fireEvent.click(screen.getByRole('button', { name: /查看/i }));
    fireEvent.click(await screen.findByRole('tab', { name: '备注与审计' }));

    fireEvent.change(
      screen.getByPlaceholderText('记录与该用户相关的运营观察、沟通结论或后续跟进'),
      {
        target: { value: '需要继续观察续费意向。' },
      }
    );
    fireEvent.click(screen.getByRole('button', { name: '添加备注' }));

    await waitFor(() => {
      expect(addNoteMock).toHaveBeenCalledWith({
        userId: 'user_123',
        body: '需要继续观察续费意向。',
      });
    });
  });
});
