import React, { useEffect, useState } from 'react';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import {
  ArrowUpRight,
  Eye,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import type { PaginationOptions, PaginationResult } from 'convex/server';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { mRef, qRef } from '../../utils/convexRefs';
import { UserDetailSheet } from './UserDetailSheet';
import type {
  AdminDataHealth,
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
  const dataHealth = useQuery(qRef<Record<string, never>, AdminDataHealth>('admin:getDataHealth'));

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
  const hasActiveFilters = Boolean(
    search.trim() ||
    filters.role ||
    filters.accountStatus ||
    filters.plan ||
    filters.emailVerified ||
    filters.kycStatus ||
    filters.activityWindow ||
    filters.sortBy !== DEFAULT_FILTERS.sortBy
  );

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

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border-2 border-zinc-900 bg-white p-5 shadow-[6px_6px_0px_0px_#18181B]">
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              用户工作台
            </div>
            <h2 className="mt-3 text-2xl font-black text-zinc-900">快速筛选，直接查看详情</h2>
            <p className="mt-2 max-w-3xl text-sm font-medium text-zinc-500">
              第一屏先给你搜索和关键筛选，下面直接就是用户列表。点击任意用户行或“查看详情”即可打开完整画像。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-700">
              <Users className="h-4 w-4 text-zinc-500" />
              当前已加载 {users.length} 位用户
            </div>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                <RotateCcw className="mr-2 h-4 w-4" />
                清空筛选
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
          <div className="relative md:col-span-2 xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <Input
              aria-label="搜索用户"
              className="h-12 rounded-2xl border-zinc-200 bg-zinc-50 pl-10"
              placeholder="搜索邮箱、昵称或用户 ID"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <Select
            aria-label="按角色筛选"
            className="h-12 rounded-2xl border-zinc-200 bg-zinc-50"
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
            className="h-12 rounded-2xl border-zinc-200 bg-zinc-50"
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
            className="h-12 rounded-2xl border-zinc-200 bg-zinc-50"
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
            className="h-12 rounded-2xl border-zinc-200 bg-zinc-50"
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
            aria-label="按 KYC 状态筛选"
            className="h-12 rounded-2xl border-zinc-200 bg-zinc-50"
            value={filters.kycStatus || ''}
            onChange={event =>
              setFilters(prev => ({
                ...prev,
                kycStatus: (event.target.value || undefined) as AdminUserListFilters['kycStatus'],
              }))
            }
          >
            <option value="">KYC 状态</option>
            <option value="VERIFIED">已认证</option>
            <option value="NONE">未认证</option>
          </Select>
          <Select
            aria-label="按活跃状态筛选"
            className="h-12 rounded-2xl border-zinc-200 bg-zinc-50"
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
            className="h-12 rounded-2xl border-zinc-200 bg-zinc-50"
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

        {dataHealth ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                Session 缺失
              </div>
              <div className="mt-2 text-2xl font-black text-zinc-900">
                {dataHealth.missingSessionIdCount}
              </div>
              <div className="mt-1 text-sm text-zinc-500">最近活动日志缺少 sessionId</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                模块异常
              </div>
              <div className="mt-2 text-2xl font-black text-zinc-900">
                {dataHealth.invalidModuleCount}
              </div>
              <div className="mt-1 text-sm text-zinc-500">最近学习事件中的无效模块值</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                进度指针异常
              </div>
              <div className="mt-2 text-2xl font-black text-zinc-900">
                {dataHealth.invalidLastModuleUsers}
              </div>
              <div className="mt-1 text-sm text-zinc-500">用户 `lastModule` 无法归一化</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                活跃缓存异常
              </div>
              <div className="mt-2 text-2xl font-black text-zinc-900">
                {dataHealth.missingActivityCache + dataHealth.missingStudyMinuteCache}
              </div>
              <div className="mt-1 text-sm text-zinc-500">最近活跃/学习分钟缓存疑似缺失</div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-3xl border-2 border-zinc-900 bg-white shadow-[6px_6px_0px_0px_#18181B]">
        <div className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-zinc-900">用户列表</h3>
            <p className="mt-1 text-sm font-medium text-zinc-500">
              点击整行或右侧按钮即可查看完整用户画像、权限与运营备注。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.accountStatus ? (
              <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-700">
                账号: {getAccountStatusLabel(filters.accountStatus)}
              </Badge>
            ) : null}
            {filters.plan ? (
              <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-700">
                方案: {getPlanLabel(filters.plan)}
              </Badge>
            ) : null}
            {filters.activityWindow ? (
              <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-700">
                活跃: {filters.activityWindow === 'ACTIVE_7_DAYS' ? '7 天活跃' : '30 天未活跃'}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="divide-y divide-zinc-100 lg:hidden">
          {loading ? (
            <div className="p-10 text-center text-zinc-400">
              <Loader2 className="mx-auto animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-zinc-400">暂无匹配用户</div>
          ) : (
            users.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => openDetail(user.id)}
                className="w-full space-y-4 p-4 text-left transition hover:bg-zinc-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-200 bg-zinc-100">
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
                    <div className="min-w-0">
                      <div className="truncate font-black text-zinc-900">
                        {user.name || '未设置昵称'}
                      </div>
                      <div className="truncate text-sm text-zinc-500">{user.email}</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-400" />
                </div>

                <div className="flex flex-wrap gap-2">
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
                  <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-700">
                    {getPlanLabel(user.resolvedPlan)}
                  </Badge>
                  <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-700">
                    {user.emailVerified ? '邮箱已验证' : '邮箱未验证'}
                  </Badge>
                </div>

                <div className="grid gap-3 text-sm text-zinc-500 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                      最近活跃
                    </div>
                    <div className="mt-1 font-semibold text-zinc-900">
                      {formatRelativeActivity(user.lastActivityAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                      注册时间
                    </div>
                    <div className="mt-1 font-semibold text-zinc-900">
                      {formatAdminDateTime(user.createdAt)}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-[1120px] w-full text-left">
            <thead className="bg-zinc-50">
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
                  <tr
                    key={user.id}
                    className="cursor-pointer transition-colors hover:bg-zinc-50"
                    onClick={() => openDetail(user.id)}
                  >
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={event => {
                            event.stopPropagation();
                            openDetail(user.id);
                          }}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          查看详情
                        </Button>
                        <Button
                          size="sm"
                          variant={user.accountStatus === 'DISABLED' ? 'outline' : 'destructive'}
                          onClick={event => {
                            event.stopPropagation();
                            void handleQuickStatusAction(user);
                          }}
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
      </section>

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
