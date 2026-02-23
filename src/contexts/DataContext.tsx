import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { Institute } from '../types';
import { useQuery } from 'convex/react';
import { INSTITUTES } from '../utils/convexRefs';

interface DataContextType {
  institutes: Institute[] | undefined;
  isLoading: boolean;
  institutesLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const institutesData = useQuery(INSTITUTES.getAll, {});

  const institutes = useMemo<Institute[] | undefined>(() => institutesData, [institutesData]);
  const institutesLoading = institutesData === undefined;

  const value = useMemo(
    () => ({
      institutes,
      isLoading: institutesLoading,
      institutesLoading,
    }),
    [institutes, institutesLoading]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
