import React from 'react';
import { X, Loader2, Save } from 'lucide-react';

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

interface UserEditModalProps {
  editingUser: Partial<User>;
  setEditingUser: React.Dispatch<React.SetStateAction<Partial<User> | null>>;
  onSave: () => void;
  saving: boolean;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({
  editingUser,
  setEditingUser,
  onSave,
  saving,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border-2 border-zinc-900 shadow-[6px_6px_0px_0px_#18181B] p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black">编辑用户</h3>
          <button
            type="button"
            onClick={() => setEditingUser(null)}
            className="p-2 hover:bg-zinc-100 rounded-full"
            aria-label="关闭编辑弹窗"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="user-name" className="block text-xs font-bold text-zinc-500 mb-1">
              昵称
            </label>
            <input
              id="user-name"
              className="w-full p-2 border-2 border-zinc-200 rounded-lg font-bold focus:border-zinc-900 outline-none"
              value={editingUser.name || ''}
              onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
              aria-label="昵称"
            />
          </div>

          <div>
            <label htmlFor="user-role" className="block text-xs font-bold text-zinc-500 mb-1">
              系统角色
            </label>
            <select
              id="user-role"
              className="w-full p-2 border-2 border-zinc-200 rounded-lg font-bold focus:border-zinc-900 outline-none"
              value={editingUser.role || 'STUDENT'}
              onChange={e =>
                setEditingUser({ ...editingUser, role: e.target.value as User['role'] })
              }
              aria-label="选择系统角色"
            >
              <option value="STUDENT">普通用户 (Student)</option>
              <option value="ADMIN">管理员 (Admin)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="user-tier" className="block text-xs font-bold text-zinc-500 mb-1">
                会员等级
              </label>
              <select
                id="user-tier"
                className="w-full p-2 border-2 border-zinc-200 rounded-lg font-bold focus:border-zinc-900 outline-none"
                value={editingUser.tier || 'FREE'}
                onChange={e => setEditingUser({ ...editingUser, tier: e.target.value })}
                aria-label="选择会员等级"
              >
                <option value="FREE">免费版 (Free)</option>
                <option value="PREMIUM">高级版 (Premium)</option>
                <option value="LIFETIME">终身版 (Lifetime)</option>
              </select>
            </div>
            <div>
              <label htmlFor="user-subscription" className="block text-xs font-bold text-zinc-500 mb-1">
                订阅类型
              </label>
              <select
                id="user-subscription"
                className="w-full p-2 border-2 border-zinc-200 rounded-lg font-bold focus:border-zinc-900 outline-none"
                value={editingUser.subscriptionType || 'FREE'}
                onChange={e => setEditingUser({ ...editingUser, subscriptionType: e.target.value })}
                aria-label="选择订阅类型"
              >
                <option value="FREE">无订阅</option>
                <option value="MONTHLY">月付</option>
                <option value="ANNUAL">年付</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="user-expiry" className="block text-xs font-bold text-zinc-500 mb-1">
              会员过期时间
            </label>
            <input
              id="user-expiry"
              type="date"
              className="w-full p-2 border-2 border-zinc-200 rounded-lg font-bold focus:border-zinc-900 outline-none"
              value={
                editingUser.subscriptionExpiry
                  ? new Date(editingUser.subscriptionExpiry).toISOString().split('T')[0]
                  : ''
              }
              onChange={e =>
                setEditingUser({
                  ...editingUser,
                  subscriptionExpiry: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
              aria-label="会员过期时间"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="px-4 py-2 font-bold text-zinc-500 hover:bg-zinc-100 rounded-lg"
              aria-label="取消编辑"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="px-6 py-2 bg-lime-300 border-2 border-zinc-900 text-zinc-900 font-bold rounded-lg hover:bg-lime-400 flex items-center gap-2 shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none disabled:opacity-50"
              aria-label="保存更改"
            >
              {saving && <Loader2 className="animate-spin" size={16} />}
              <Save size={16} />
              保存更改
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
