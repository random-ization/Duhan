import React, { useState, useEffect } from 'react';
import { usePaginatedQuery, useQuery, useMutation } from 'convex/react';
import {
  Search,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import type { PaginationOptions, PaginationResult } from 'convex/server';
import { mRef, qRef } from '../../utils/convexRefs';
import { UserRow } from './UserRow';
import { UserEditModal } from './UserEditModal';

// 类型定义
interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STUDENT';
  tier: string;
  subscriptionType?: string;
  subscriptionExpiry?: string;
  createdAt: number;
  avatar?: string;
  isVerified?: boolean;
}

export const UserManagement: React.FC = () => {
  // 状态：搜索
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 状态：编辑
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [saving, setSaving] = useState(false);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Convex paginated query for users
  const {
    results: users,
    status,
    loadMore,
  } = usePaginatedQuery(
    qRef<{ paginationOpts: PaginationOptions }, PaginationResult<User>>('admin:getUsers'),
    {},
    { initialNumItems: 20 }
  );

  // Search query (separate, only when searching)
  const searchResults = useQuery(
    qRef<{ search: string; limit: number }, User[]>('admin:searchUsers'),
    debouncedSearch ? { search: debouncedSearch, limit: 50 } : 'skip'
  );

  // Mutations
  const updateUserMutation = useMutation(
    mRef<
      {
        userId: string;
        updates: Partial<
          Pick<User, 'name' | 'role' | 'tier' | 'subscriptionType' | 'subscriptionExpiry'>
        >;
      },
      unknown
    >('admin:updateUser')
  );
  const deleteUserMutation = useMutation(mRef<{ userId: string }, unknown>('admin:deleteUser'));

  // Determine which users to display
  const displayUsers = debouncedSearch ? searchResults || [] : users;
  const loading = status === 'LoadingFirstPage' || (debouncedSearch && searchResults === undefined);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该用户吗？此操作不可恢复！')) return;
    try {
      await deleteUserMutation({ userId: id });
    } catch {
      alert('删除失败');
    }
  };

  const handleSave = async () => {
    if (!editingUser?.id) return;
    setSaving(true);
    try {
      await updateUserMutation({
        userId: editingUser.id,
        updates: {
          name: editingUser.name,
          role: editingUser.role,
          tier: editingUser.tier,
          subscriptionType: editingUser.subscriptionType,
          subscriptionExpiry: editingUser.subscriptionExpiry,
        },
      });
      setEditingUser(null);
      alert('用户更新成功');
    } catch {
      alert('更新失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col gap-6">
      {/* 顶部工具栏 */}
      <div className="bg-white p-4 rounded-xl border-2 border-zinc-900 shadow-[4px_4px_0px_0px_#18181B] flex justify-between items-center">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2 border-2 border-zinc-200 rounded-lg font-bold focus:border-zinc-900 outline-none transition-colors"
            placeholder="搜索用户邮箱或昵称..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="搜索用户"
          />
        </div>
        <div className="text-sm font-bold text-zinc-500">
          {debouncedSearch
            ? `搜索结果: ${displayUsers.length} 位用户`
            : `已加载 ${users.length} 位用户`}
        </div>
      </div>

      {/* 数据表格区 */}
      <div className="flex-1 bg-white border-2 border-zinc-900 rounded-xl shadow-[4px_4px_0px_0px_#18181B] overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 border-b-2 border-zinc-200 sticky top-0 z-10">
              <tr>
                <th className="p-4 font-black text-xs text-zinc-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="p-4 font-black text-xs text-zinc-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="p-4 font-black text-xs text-zinc-500 uppercase tracking-wider">
                  会员状态
                </th>
                <th className="p-4 font-black text-xs text-zinc-500 uppercase tracking-wider">
                  注册时间
                </th>
                <th className="p-4 font-black text-xs text-zinc-500 uppercase tracking-wider text-right">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(() => {
                if (loading) {
                  return (
                    <tr>
                      <td colSpan={5} className="p-10 text-center">
                        <Loader2 className="animate-spin mx-auto" />
                      </td>
                    </tr>
                  );
                }
                if (displayUsers.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-zinc-400">
                        暂无用户
                      </td>
                    </tr>
                  );
                }
                return displayUsers.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onEdit={setEditingUser}
                    onDelete={handleDelete}
                  />
                ));
              })()}
            </tbody>
          </table>
        </div>

        {/* Load More / Pagination */}
        <div className="p-4 border-t-2 border-zinc-200 bg-zinc-50 flex justify-center items-center">
          {!debouncedSearch && status === 'CanLoadMore' && (
            <button
              type="button"
              onClick={() => loadMore(20)}
              className="px-6 py-2 bg-white border-2 border-zinc-900 rounded-lg font-bold text-sm hover:bg-zinc-100 flex items-center gap-2 shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none"
            >
              <ChevronRight size={16} /> 加载更多
            </button>
          )}
          {status === 'LoadingMore' && (
            <div className="flex items-center gap-2 text-zinc-500">
              <Loader2 className="animate-spin" size={16} />
              加载中...
            </div>
          )}
          {status === 'Exhausted' && !debouncedSearch && (
            <span className="text-sm text-zinc-400">已加载全部用户</span>
          )}
        </div>
      </div>

      {/* 编辑弹窗 */}
      {editingUser && (
        <UserEditModal
          editingUser={editingUser}
          setEditingUser={setEditingUser}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
};

export default UserManagement;
