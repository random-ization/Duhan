import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from './common/Loading';

interface ProtectedRouteProps {
  requireAdmin?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requireAdmin = false,
  redirectTo
}) => {
  const { user, loading } = useAuth();

  // 1. 如果正在加载用户信息，显示全屏 Loading，避免闪烁
  if (loading) {
    return <Loading fullScreen size="lg" text="Verifying session..." />;
  }

  // 2. 如果未登录，重定向到指定页面或默认页面
  if (!user) {
    return <Navigate to={redirectTo || '/'} replace />;
  }

  // 3. 如果需要管理员权限但用户不是管理员，重定向
  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to={redirectTo || '/dashboard'} replace />;
  }

  // 4. 验证通过，渲染子路由 (Outlet)
  return <Outlet />;
};
