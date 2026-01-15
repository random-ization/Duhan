import React, { useState, useEffect } from 'react';
import { usePaginatedQuery, useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
    Search, Trash2, Edit2, Shield, User as UserIcon,
    Crown, ChevronRight, X, Save, Loader2
} from 'lucide-react';

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
        api.admin.getUsers,
        {},
        { initialNumItems: 20 }
    );

    // Search query (separate, only when searching)
    const searchResults = useQuery(
        api.admin.searchUsers,
        debouncedSearch ? { search: debouncedSearch, limit: 50 } : 'skip'
    );

    // Mutations
    const updateUserMutation = useMutation(api.admin.updateUser);
    const deleteUserMutation = useMutation(api.admin.deleteUser);

    // Determine which users to display
    const displayUsers = debouncedSearch ? (searchResults || []) : users;
    const loading = status === 'LoadingFirstPage' || (debouncedSearch && searchResults === undefined);

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除该用户吗？此操作不可恢复！')) return;
        try {
            await deleteUserMutation({ userId: id as any });
        } catch (e) {
            alert('删除失败');
        }
    };

    const handleSave = async () => {
        if (!editingUser || !editingUser.id) return;
        setSaving(true);
        try {
            await updateUserMutation({
                userId: editingUser.id as any,
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
        } catch (e) {
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
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="text-sm font-bold text-zinc-500">
                    {debouncedSearch ? `搜索结果: ${displayUsers.length} 位用户` : `已加载 ${users.length} 位用户`}
                </div>
            </div>

            {/* 数据表格区 */}
            <div className="flex-1 bg-white border-2 border-zinc-900 rounded-xl shadow-[4px_4px_0px_0px_#18181B] overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-50 border-b-2 border-zinc-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-black text-xs text-zinc-500 uppercase tracking-wider">用户</th>
                                <th className="p-4 font-black text-xs text-zinc-500 uppercase tracking-wider">角色</th>
                                <th className="p-4 font-black text-xs text-zinc-500 uppercase tracking-wider">会员状态</th>
                                <th className="p-4 font-black text-xs text-zinc-500 uppercase tracking-wider">注册时间</th>
                                <th className="p-4 font-black text-xs text-zinc-500 uppercase tracking-wider text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
                            ) : displayUsers.length === 0 ? (
                                <tr><td colSpan={5} className="p-10 text-center text-zinc-400">暂无用户</td></tr>
                            ) : displayUsers.map(user => (
                                <tr key={user.id} className="hover:bg-zinc-50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden border-2 border-zinc-300">
                                                {user.avatar ? (
                                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <UserIcon size={16} className="text-zinc-500" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-zinc-900">{user.name || '未设置昵称'}</div>
                                                <div className="text-xs text-zinc-400 font-mono">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {user.role === 'ADMIN' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-900 text-white text-xs font-bold rounded">
                                                <Shield size={12} /> 管理员
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-500 text-xs font-bold rounded">
                                                用户
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {user.tier && user.tier !== 'FREE' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded border border-amber-200">
                                                <Crown size={12} fill="currentColor" /> {user.tier}
                                            </span>
                                        ) : (
                                            <span className="text-xs font-bold text-zinc-400">免费版</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm font-medium text-zinc-500">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingUser(user as any)}
                                                className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="编辑用户"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="删除用户"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Load More / Pagination */}
                <div className="p-4 border-t-2 border-zinc-200 bg-zinc-50 flex justify-center items-center">
                    {!debouncedSearch && status === 'CanLoadMore' && (
                        <button
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
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl border-2 border-zinc-900 shadow-[6px_6px_0px_0px_#18181B] p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black">编辑用户</h3>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-zinc-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">昵称</label>
                                <input
                                    className="w-full p-2 border-2 border-zinc-200 rounded-lg font-bold focus:border-zinc-900 outline-none"
                                    value={editingUser.name || ''}
                                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">系统角色</label>
                                <select
                                    className="w-full p-2 border-2 border-zinc-200 rounded-lg font-bold focus:border-zinc-900 outline-none"
                                    value={editingUser.role || 'STUDENT'}
                                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                                >
                                    <option value="STUDENT">普通用户 (Student)</option>
                                    <option value="ADMIN">管理员 (Admin)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">会员等级</label>
                                    <select
                                        className="w-full p-2 border-2 border-zinc-200 rounded-lg font-bold focus:border-zinc-900 outline-none"
                                        value={editingUser.tier || 'FREE'}
                                        onChange={e => setEditingUser({ ...editingUser, tier: e.target.value })}
                                    >
                                        <option value="FREE">免费版 (Free)</option>
                                        <option value="PREMIUM">高级版 (Premium)</option>
                                        <option value="LIFETIME">终身版 (Lifetime)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">订阅类型</label>
                                    <select
                                        className="w-full p-2 border-2 border-zinc-200 rounded-lg font-bold focus:border-zinc-900 outline-none"
                                        value={editingUser.subscriptionType || 'FREE'}
                                        onChange={e => setEditingUser({ ...editingUser, subscriptionType: e.target.value })}
                                    >
                                        <option value="FREE">无订阅</option>
                                        <option value="MONTHLY">月付</option>
                                        <option value="ANNUAL">年付</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">会员过期时间</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border-2 border-zinc-200 rounded-lg font-bold focus:border-zinc-900 outline-none"
                                    value={editingUser.subscriptionExpiry ? new Date(editingUser.subscriptionExpiry).toISOString().split('T')[0] : ''}
                                    onChange={e => setEditingUser({ ...editingUser, subscriptionExpiry: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="px-4 py-2 font-bold text-zinc-500 hover:bg-zinc-100 rounded-lg"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2 bg-lime-300 border-2 border-zinc-900 text-zinc-900 font-bold rounded-lg hover:bg-lime-400 flex items-center gap-2 shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none disabled:opacity-50"
                                >
                                    {saving && <Loader2 className="animate-spin" size={16} />}
                                    <Save size={16} />
                                    保存更改
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
