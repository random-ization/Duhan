import React from 'react';
import { Shield, User as UserIcon, Crown, Edit2, Trash2 } from 'lucide-react';

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

interface UserRowProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
}

export const UserRow: React.FC<UserRowProps> = ({ user, onEdit, onDelete }) => {
  return (
    <tr className="hover:bg-zinc-50 transition-colors group">
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
        {typeof user.createdAt === 'number' ? new Date(user.createdAt).toLocaleDateString() : '-'}
      </td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(user)}
            className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="编辑用户"
            aria-label={`编辑用户 ${user.name || user.email}`}
          >
            <Edit2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(user.id)}
            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="删除用户"
            aria-label={`删除用户 ${user.name || user.email}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};
