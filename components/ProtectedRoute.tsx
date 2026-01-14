import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useConvexAuth } from 'convex/react';
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
  const { isLoading: convexAuthLoading, isAuthenticated } = useConvexAuth();
  const { user, loading: authContextLoading } = useAuth();

  // 1. Wait for Convex WebSocket authentication to complete
  if (convexAuthLoading) {
    return <Loading fullScreen size="lg" text="Connecting..." />;
  }

  // 2. Wait for user data to load from AuthContext
  if (isAuthenticated && authContextLoading) {
    return <Loading fullScreen size="lg" text="Loading user data..." />;
  }

  // 3. If not authenticated, redirect
  if (!isAuthenticated) {
    return <Navigate to={redirectTo || '/'} replace />;
  }

  // 4. If authenticated but user data not loaded yet, show loading
  if (!user) {
    return <Loading fullScreen size="lg" text="Verifying session..." />;
  }

  // 5. Admin role check
  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to={redirectTo || '/dashboard'} replace />;
  }

  // 6. All checks passed
  return <Outlet />;
};
