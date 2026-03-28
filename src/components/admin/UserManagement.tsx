import React, { useEffect, useState } from 'react';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Eye, Loader2, Search, ShieldOff, ShieldCheck } from 'lucide-react';
import type { PaginationOptions, PaginationResult } from 'convex/server';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { mRef, qRef } from '../../utils/convexRefs';
import { UserDetailSheet } from './UserDetailSheet';
import type {
  AdminProfileFormState,
  AdminUserDetail,
  AdminUserListFilters,
  AdminUserListItem,
} from './userManagementTypes';
import {
  ADMIN_SORT_OPTIONS,
  formatAdminDateTime,
  formatRelativeActivity,
  getAccountStatusLabel,
  getKycStatusLabel,
  getPlanLabel,
  getSubscriptionStatusLabel,
} from './userManagementUtils';

type DetailTab = 'overview' | 'learning' | 'security' | 'ops';

type FilterState = Omit<AdminUserListFilters, 'search'> & {
  sortBy: NonNullable<AdminUserListFilters['sortBy']>;
};

const DEFAULT_FILTERS: FilterState = {
  role: undefined,
  accountStatus: undefined,
  plan: undefined,
  emailVerified: undefined,
  kycStatus: undefined,
  activityWindow: undefined,
  sortBy: 'NEWEST',
};

export const UserManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailInitialTab, setDetailInitialTab] = useState<DetailTab>('overview');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    results: users,
    status,
    loadMore,
  } = usePaginatedQuery(
    qRef<
      {
        paginationOpts: PaginationOptions;
        search?: string;
        role?: 'ADMIN' | 'STUDENT';
        accountStatus?: 'ACTIVE' | 'DISABLED';
        plan?: 'FREE' | 'PRO' | 'LIFETIME';
        emailVerified?: 'VERIFIED' | 'UNVERIFIED';
        kycStatus?: 'NONE' | 'VERIFIED';
        activityWindow?: 'ACTIVE_7_DAYS' | 'INACTIVE_30_DAYS';
        sortBy?: 'NEWEST' | 'OLDEST' | 'LAST_ACTIVE_DESC' | 'LAST_LOGIN_DESC' | 'TOTAL_STUDY_DESC';
      },
      PaginationResult<AdminUserListItem>
    >('admin:getUsers'),
    {
      search: debouncedSearch || undefined,
      role: filters.role,
      accountStatus: filters.accountStatus,
      plan: filters.plan,
      emailVerified: filters.emailVerified,
      kycStatus: filters.kycStatus,
      activityWindow: filters.activityWindow,
      sortBy: filters.sortBy,
    },
    { initialNumItems: 20 }
  );

  const detail = useQuery(
    qRef<{ userId: string }, AdminUserDetail | null>('admin:getUserDetail'),
    selectedUserId ? { userId: selectedUserId } : 'skip'
  );

  const updateUserProfile = useMutation(
    mRef<
      {
        userId: string;
        updates: {
          name?: string;
          role?: AdminProfileFormState['role'];
          emailVerified?: boolean;
          kycStatus?: AdminProfileFormState['kycStatus'];
          plan?: 'FREE' | 'PRO' | 'LIFETIME';
          subscriptionType?: AdminProfileFormState['subscriptionType'];
          subscriptionExpiry?: string;
        };
      },
      { success: boolean; changedFields: string[] }
    >('admin:updateUserProfile')
  );
  const setUserAccountStatus = useMutation(
    mRef<
      { userId: string; status: 'ACTIVE' | 'DISABLED'; reason?: string },
      { success: boolean; status: 'ACTIVE' | 'DISABLED' }
    >('admin:setUserAccountStatus')
  );
  const addUserNote = useMutation(
    mRef<{ userId: string; body: string }, { success: boolean; noteId: string }>(
      'admin:addUserNote'
    )
  );

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  const loading = status === 'LoadingFirstPage';

  const openDetail = (userId: string, tab: DetailTab = 'overview') => {
    setSelectedUserId(userId);
    setDetailInitialTab(tab);
    setDetailOpen(true);
  };

  const handleQuickStatusAction = async (user: AdminUserListItem) => {
    if (user.accountStatus === 'ACTIVE') {
      openDetail(user.id, 'security');
      return;
    }
    if (!confirm(`确认恢复账号 ${user.name || user.email} 吗？`)) return;
    setSavingStatus(true);
    try {
      await setUserAccountStatus({ userId: user.id, status: 'ACTIVE' });
    } catch (error) {
      alert((error as Error).message || '恢复失败');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveProfile = async (updates: Parameters<typeof updateUserProfile>[0]['updates']) => {
    if (!selectedUserId) return;
    setSavingProfile(true);
    try {
      await updateUserProfile({ userId: selectedUserId, updates });
    } catch (error) {
      alert((error as Error).message || '保存失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSetAccountStatus = async (statusValue: 'ACTIVE' | 'DISABLED', reason?: string) => {
    if (!selectedUserId) return;
    setSavingStatus(true);
    try {
      await setUserAccountStatus({ userId: selectedUserId, status: statusValue, reason });
    } catch (error) {
      alert((error as Error).message || '账号状态更新失败');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAddNote = async (body: string) => {
    if (!selectedUserId) return;
    setAddingNote(true);
    try {
      await addUserNote({ userId: selectedUserId, body });
    } catch (error) {
      alert((error as Error).message || '备注保存失败');
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col gap-6">
      <div className="rounded-2xl border-2 border-zinc-900 bg-white p-4 shadow-[4px_4px_0px_0px_#18181B]">
        <div className="grid gap-4 xl:grid-cols-[minmax(260px,1.3fr),repeat(6,minmax(120px,1fr))]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <Input
              aria-label="搜索用户"
              className="pl-10"
              placeholder="搜索邮箱、昵称或用户 ID"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <Select
            aria-label="按角色筛选"
            value={filters.role || ''}
            onChange={event =>
              setFilters(prev => ({
                ...prev,
                role: (event.target.value || undefined) as AdminUserListFilters['role'],
              }))
            }
          >
            <option value="">全部角色</option>
            <option value="STUDENT">普通用户</option>
            <option value="ADMIN">管理员</option>
          </Select>
          <Select
            aria-label="按账号状态筛选"
            value={filters.accountStatus || ''}
            onChange={event =>
              setFilters(prev => ({
                ...prev,
                accountStatus: (event.target.value ||
                  undefined) as AdminUserListFilters['accountStatus'],
              }))
            }
          >
            <option value="">全部状态</option>
            <option value="ACTIVE">正常</option>
            <option value="DISABLED">已禁用</option>
          </Select>
          <Select
            aria-label="按会员方案筛选"
            value={filters.plan || ''}
            onChange={event =>
              setFilters(prev => ({
                ...prev,
                plan: (event.target.value || undefined) as AdminUserListFilters['plan'],
              }))
            }
          >
            <option value="">全部方案</option>
            <option value="FREE">免费版</option>
            <option value="PRO">订阅会员</option>
            <option value="LIFETIME">终身会员</option>
          </Select>
          <Select
            aria-label="按邮箱验证筛选"
            value={filters.emailVerified || ''}
            onChange={event =>
              setFilters(prev => ({
                ...prev,
                emailVerified: (event.target.value ||
                  undefined) as AdminUserListFilters['emailVerified'],
              }))
            }
          >
            <option value="">验证状态</option>
            <option value="VERIFIED">已验证</option>
            <option value="UNVERIFIED">未验证</option>
          </Select>
          <Select
            aria-label="按活跃状态筛选"
            value={filters.activityWindow || ''}
            onChange={event =>
              setFilters(prev => ({
                ...prev,
                activityWindow: (event.target.value ||
                  undefined) as AdminUserListFilters['activityWindow'],
              }))
            }
          >
            <option value="">活跃窗口</option>
            <option value="ACTIVE_7_DAYS">7 天活跃</option>
            <option value="INACTIVE_30_DAYS">30 天未活跃</option>
          </Select>
          <Select
            aria-label="排序方式"
            value={filters.sortBy}
            onChange={event =>
              setFilters(prev => ({ ...prev, sortBy: event.target.value as typeof prev.sortBy }))
            }
          >
            {ADMIN_SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3 text-sm font-bold text-zinc-500">当前已加载 {users.length} 位用户</div>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border-2 border-zinc-900 bg-white shadow-[4px_4px_0px_0px_#18181B]">
        <div className="h-full overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-zinc-50">
              <tr className="border-b-2 border-zinc-200">
                <th className="p-4 text-xs font-black uppercase tracking-wider text-zinc-500">
                  用户
                </th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-zinc-500">
                  账号状态
                </th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-zinc-500">
                  方案
                </th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-zinc-500">
                  验证 / KYC
                </th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-zinc-500">
                  最近活跃
                </th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-zinc-500">
                  注册时间
                </th>
                <th className="p-4 text-right text-xs font-black uppercase tracking-wider text-zinc-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-zinc-400">
                    <Loader2 className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-zinc-400">
                    暂无匹配用户
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="transition-colors hover:bg-zinc-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-200 bg-zinc-100">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name || user.email}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="font-black text-zinc-500">
                              {(user.name || user.email).slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-zinc-900">
                              {user.name || '未设置昵称'}
                            </span>
                            {user.role === 'ADMIN' ? (
                              <Badge
                                variant="outline"
                                className="border-zinc-300 bg-zinc-100 text-zinc-700"
                              >
                                管理员
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-sm text-zinc-500">{user.email}</div>
                          <div className="mt-1 text-xs text-zinc-400">
                            学习 {user.totalStudyMinutes} 分钟 · 收藏 {user.savedWordsCount} · 错题{' '}
                            {user.mistakesCount}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={
                          user.accountStatus === 'DISABLED'
                            ? 'border-red-300 bg-red-50 text-red-700'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        }
                      >
                        {getAccountStatusLabel(user.accountStatus)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-bold text-zinc-900">
                          {getPlanLabel(user.resolvedPlan)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {getSubscriptionStatusLabel(user.subscriptionStatus)}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1 text-sm">
                        <div className="font-medium text-zinc-700">
                          {user.emailVerified ? '邮箱已验证' : '邮箱未验证'}
                        </div>
                        <div className="text-zinc-500">
                          KYC: {getKycStatusLabel(user.kycStatus)}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-zinc-600">
                      <div className="font-semibold text-zinc-900">
                        {formatRelativeActivity(user.lastActivityAt)}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {user.lastActivityType || '暂无记录'}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-zinc-600">
                      {formatAdminDateTime(user.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openDetail(user.id)}>
                          <Eye className="mr-1 h-4 w-4" />
                          查看
                        </Button>
                        <Button
                          size="sm"
                          variant={user.accountStatus === 'DISABLED' ? 'outline' : 'destructive'}
                          onClick={() => void handleQuickStatusAction(user)}
                        >
                          {user.accountStatus === 'DISABLED' ? (
                            <>
                              <ShieldCheck className="mr-1 h-4 w-4" />
                              恢复
                            </>
                          ) : (
                            <>
                              <ShieldOff className="mr-1 h-4 w-4" />
                              禁用
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center border-t-2 border-zinc-200 bg-zinc-50 p-4">
          {status === 'CanLoadMore' ? (
            <Button variant="outline" onClick={() => loadMore(20)}>
              加载更多
            </Button>
          ) : null}
          {status === 'LoadingMore' ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在加载更多...
            </div>
          ) : null}
          {status === 'Exhausted' ? (
            <span className="text-sm text-zinc-400">已经到底了</span>
          ) : null}
        </div>
      </div>

      <UserDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        detail={detail}
        loading={selectedUserId !== null && detail === undefined}
        initialTab={detailInitialTab}
        savingProfile={savingProfile}
        savingStatus={savingStatus}
        addingNote={addingNote}
        onSaveProfile={handleSaveProfile}
        onSetAccountStatus={handleSetAccountStatus}
        onAddNote={handleAddNote}
      />
    </div>
  );
};

export default UserManagement;
