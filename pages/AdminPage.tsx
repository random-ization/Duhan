import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AdminPanel from '../components/admin';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import type { User } from '../types';

const AdminPage: React.FC = () => {
  const { user, language } = useAuth();
  const {
    institutes,
    textbookContexts,
    topikExams,
    addInstitute,
    updateInstitute,
    deleteInstitute,
    saveTextbookContext,
    saveTopikExam,
    deleteTopikExam,
  } = useData();

  // NEW: 管理用户列表状态
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const u = await api.getUsers();
      setUsers(u);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handlers for update/delete (minimal, refresh list after operation)
  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await api.updateUser(userId, updates);
      await fetchUsers();
    } catch (err) {
      console.error('Failed to update user', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.deleteUser(userId);
      await fetchUsers();
    } catch (err) {
      console.error('Failed to delete user', err);
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  // 计算实际的统计数据（可选优化）
  const stats = {
    totalUsers: users.length,
    activeUsers: 1,
    activeLearners: 1,
    totalTextbooks: institutes.length,
    totalTopikExams: topikExams.length,
    premiumUsers: 0,
    totalRevenue: 0,
    contentCoverage: Object.keys(textbookContexts).length,
  };

  return (
    <AdminPanel
      institutes={institutes}
      onUpdateInstitutes={() => { }}
      onUpdateInstitute={updateInstitute}
      onAddInstitute={addInstitute}
      onDeleteInstitute={deleteInstitute}
      textbookContexts={textbookContexts}
      onSaveContext={saveTextbookContext}
      language={language}
      users={users}
      onUpdateUser={handleUpdateUser}
      onDeleteUser={handleDeleteUser}
      stats={stats}
      topikExams={topikExams}
      onAddTopikExam={saveTopikExam}
      onUpdateTopikExam={saveTopikExam}
      onDeleteTopikExam={deleteTopikExam}
    />
  );
};

export default AdminPage;
