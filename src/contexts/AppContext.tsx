import React from 'react';
import { AuthProvider } from './AuthContext';
import { LearningProvider } from './LearningContext';
import { DataProvider } from './DataContext';
import { LayoutProvider } from './LayoutContext';
import { ConfirmDialogProvider } from './ConfirmDialogContext';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <DataProvider>
        <ConfirmDialogProvider>
          <LayoutProvider>
            <LearningProvider>{children}</LearningProvider>
          </LayoutProvider>
        </ConfirmDialogProvider>
      </DataProvider>
    </AuthProvider>
  );
};
