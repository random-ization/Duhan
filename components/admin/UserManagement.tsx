import React, { useState } from 'react';
import { User, UserRole, UserTier, Language } from '../../types';
import { Search, Edit2, Trash2, Crown, GraduationCap, X, Check } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  language: Language;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  language,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  const labels = {
    en: {
      userManagement: 'User Management',
      searchUsers: 'Search users...',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      tier: 'Tier',
      stats: 'Stats',
      actions: 'Actions',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      student: 'Student',
      admin: 'Admin',
      free: 'Free',
      paid: 'Paid',
      wordsLearned: 'words learned',
      examsTaken: 'exams taken',
    },
    zh: {
      userManagement: '用户管理',
      searchUsers: '搜索用户...',
      name: '姓名',
      email: '邮箱',
      role: '角色',
      tier: '等级',
      stats: '统计',
      actions: '操作',
      edit: '编辑',
      delete: '删除',
      save: '保存',
      cancel: '取消',
      student: '学生',
      admin: '管理员',
      free: '免费',
      paid: '付费',
      wordsLearned: '已学单词',
      examsTaken: '已参加考试',
    },
    vi: {
      userManagement: 'Quản lý người dùng',
      searchUsers: 'Tìm kiếm người dùng...',
      name: 'Tên',
      email: 'Email',
      role: 'Vai trò',
      tier: 'Cấp độ',
      stats: 'Thống kê',
      actions: 'Hành động',
      edit: 'Chỉnh sửa',
      delete: 'Xóa',
      save: 'Lưu',
      cancel: 'Hủy',
      student: 'Học sinh',
      admin: 'Quản trị viên',
      free: 'Miễn phí',
      paid: 'Trả phí',
      wordsLearned: 'từ đã học',
      examsTaken: 'kỳ thi đã tham gia',
    },
    mn: {
      userManagement: 'Хэрэглэгч удирдлага',
      searchUsers: 'Хэрэглэгч хайх...',
      name: 'Нэр',
      email: 'И-мэйл',
      role: 'Үүрэг',
      tier: 'Түвшин',
      stats: 'Статистик',
      actions: 'Үйлдэл',
      edit: 'Засах',
      delete: 'Устгах',
      save: 'Хадгалах',
      cancel: 'Цуцлах',
      student: 'Оюутан',
      admin: 'Админ',
      free: 'Үнэгүй',
      paid: 'Төлбөртэй',
      wordsLearned: 'үг сурсан',
      examsTaken: 'шалгалт өгсөн',
    },
  };

  const t = labels[language];

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const startEdit = (user: User) => {
    setEditingUser(user.id);
    setEditForm({ name: user.name, email: user.email, role: user.role, tier: user.tier });
  };

  const saveEdit = () => {
    if (editingUser) {
      onUpdateUser(editingUser, editForm);
      setEditingUser(null);
      setEditForm({});
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">{t.userManagement}</h2>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder={t.searchUsers}
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* User Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.name}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.email}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.role}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.tier}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.stats}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(user => {
                const isEditing = editingUser === user.id;
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 w-full"
                        />
                      ) : (
                        <div className="font-medium text-gray-900">{user.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.email || ''}
                          onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 w-full"
                        />
                      ) : (
                        <div className="text-sm text-gray-500">{user.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={editForm.role || user.role}
                          onChange={e =>
                            setEditForm({ ...editForm, role: e.target.value as UserRole })
                          }
                          className="border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="STUDENT">{t.student}</option>
                          <option value="ADMIN">{t.admin}</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {user.role === 'ADMIN' ? (
                            <Crown className="w-3 h-3 mr-1" />
                          ) : (
                            <GraduationCap className="w-3 h-3 mr-1" />
                          )}
                          {user.role === 'ADMIN' ? t.admin : t.student}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={editForm.tier || user.tier}
                          onChange={e =>
                            setEditForm({ ...editForm, tier: e.target.value as UserTier })
                          }
                          className="border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="FREE">{t.free}</option>
                          <option value="PAID">{t.paid}</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.tier === 'PAID'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.tier === 'PAID' ? t.paid : t.free}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {user.wordsLearned} {t.wordsLearned}
                      </div>
                      <div>
                        {user.examsTaken} {t.examsTaken}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={saveEdit}
                            className="text-green-600 hover:text-green-900"
                            title={t.save}
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-gray-600 hover:text-gray-900"
                            title={t.cancel}
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="text-blue-600 hover:text-blue-900"
                            title={t.edit}
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete ${user.name}?`)) {
                                onDeleteUser(user.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                            title={t.delete}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
