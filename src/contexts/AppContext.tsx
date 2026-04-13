import React from 'react';
import { useLocation } from 'react-router-dom';

import { AuthProvider } from './AuthContext';
import { LearningProvider } from './LearningContext';
import { DataProvider } from './DataContext';
import { LayoutProvider } from './LayoutContext';
import { ConfirmDialogProvider } from './ConfirmDialogContext';
import { NotebookPickerProvider } from './NotebookPickerContext';
import { isValidLanguage, normalizeLocalizedPathname } from '../components/LanguageRouter';

function isPublicPathname(pathname: string): boolean {
  if (pathname === '/') {
    return true;
  }

  const normalizedPathname = normalizeLocalizedPathname(pathname);
  const segments = normalizedPathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  const routeOffset = firstSegment && isValidLanguage(firstSegment) ? 1 : 0;
  const routeRoot = segments[routeOffset] ?? '';
  const routeChild = segments[routeOffset + 1] ?? '';

  if (!routeRoot) {
    return true;
  }

  if (
    routeRoot === 'login' ||
    routeRoot === 'register' ||
    routeRoot === 'auth' ||
    routeRoot === 'verify-email' ||
    routeRoot === 'forgot-password' ||
    routeRoot === 'reset-password' ||
    routeRoot === 'terms' ||
    routeRoot === 'privacy' ||
    routeRoot === 'refund' ||
    routeRoot === 'pricing' ||
    routeRoot === 'learn'
  ) {
    return true;
  }

  if (routeRoot === 'payment' && routeChild === 'success') {
    return true;
  }

  if (routeRoot === 'preview' && routeChild === 'mobile') {
    return true;
  }

  if (routeRoot === 'admin' && routeChild === 'login') {
    return true;
  }

  return false;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const shouldUsePublicProviders = isPublicPathname(location.pathname);

  const content = shouldUsePublicProviders ? (
    children
  ) : (
    <DataProvider>
      <NotebookPickerProvider>
        <ConfirmDialogProvider>
          <LayoutProvider>{children}</LayoutProvider>
        </ConfirmDialogProvider>
      </NotebookPickerProvider>
    </DataProvider>
  );

  return (
    <AuthProvider>
      <LearningProvider>{content}</LearningProvider>
    </AuthProvider>
  );
};
