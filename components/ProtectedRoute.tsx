import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useConvexAuth } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from './common/Loading';
import { LoginModal } from './common/LoginModal';

interface ProtectedRouteProps {
  requireAdmin?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requireAdmin = false,
  redirectTo
}) => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { user, loading: userDataLoading, sessionExpired, setSessionExpired } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Monitor session expiration
  useEffect(() => {
    if (sessionExpired && !isLoading && !userDataLoading) {
      setShowLoginModal(true);
    }
  }, [sessionExpired, isLoading, userDataLoading]);

  // Step 1: ANY loading state = show loading, DO NOT redirect
  // This is CRITICAL to avoid the race condition
  if (isLoading || userDataLoading) {
    return <Loading fullScreen size="lg" text="Loading..." />;
  }

  // Step 2: Only after ALL loading is complete, check authentication
  // At this point isAuthenticated has its final value
  if (!isAuthenticated) {
    // If session expired, show modal instead of redirecting
    if (sessionExpired || showLoginModal) {
      return (
        <>
          <Outlet />
          <LoginModal
            isOpen={true}
            onClose={() => {
              // Don't allow closing without login
              // User must login or navigate away
            }}
            onSuccess={() => {
              setShowLoginModal(false);
              setSessionExpired(false);
            }}
          />
        </>
      );
    }
    return <Navigate to={redirectTo || '/'} replace />;
  }

  // Step 3: Authenticated but waiting for user data (edge case)
  if (!user) {
    return <Loading fullScreen size="lg" text="Loading user..." />;
  }

  // Step 4: Admin role check
  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to={redirectTo || '/dashboard'} replace />;
  }

  // Step 5: All checks passed
  return (
    <>
      <Outlet />
      {/* Show login modal if session expires while user is on the page */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => {
            // Don't allow closing without login
          }}
          onSuccess={() => {
            setShowLoginModal(false);
            setSessionExpired(false);
          }}
        />
      )}
    </>
  );
};
