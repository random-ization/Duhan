import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from './common/Loading';

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requireAdmin = false }) => {
  const { user, loading } = useAuth();

  // 1. 如果正在加载用户信息，显示全屏 Loading，避免闪烁
  if (loading) {
    return <Loading fullScreen size="lg" text="Verifying session..." />;
  }

  // 2. 如果未登录，重定向到登录页 (/)
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 3. 如果需要管理员权限但用户不是管理员，重定向到首页 (/home)
  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to="/home" replace />;
  }

  // 4. 验证通过，渲染子路由 (Outlet)
  return <Outlet />;
};
