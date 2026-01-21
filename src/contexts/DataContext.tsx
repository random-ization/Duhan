import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { Institute, TopikExam } from '../types';
import { useQuery } from 'convex/react';
import { INSTITUTES, TOPIK } from '../utils/convexRefs';

interface DataContextType {
  institutes: Institute[];
  topikExams: TopikExam[];
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
  const topikExamsData = useQuery(TOPIK.getExams, {});

  // Maps Convex data to legacy state shape
  const institutes = useMemo(() => {
    if (!institutesData) return [];
    return (institutesData as unknown as Array<Record<string, unknown>>).map(inst => {
      const levelsRaw = inst.levels;
      const levels =
        typeof levelsRaw === 'string'
          ? (() => {
              try {
                return JSON.parse(levelsRaw);
              } catch {
                return [];
              }
            })()
          : levelsRaw;

      return {
        ...(inst as unknown as Institute),
        levels: (levels as Institute['levels']) ?? [],
        id: (inst as { id?: string }).id || String((inst as { _id?: unknown })._id || ''),
      };
    });
  }, [institutesData]);

  const topikExams = useMemo(() => {
    if (!topikExamsData) return [];

    const examsList = Array.isArray(topikExamsData)
      ? topikExamsData
      : (topikExamsData as unknown as { page?: unknown[] })?.page || [];

    return (examsList as unknown[]).map(e => {
      const item = e as unknown as TopikExam;
      return {
        ...item,
        id: item.id || String((e as { _id?: unknown })._id || ''),
        questions: [],
      };
    });
  }, [topikExamsData]);

  const value: DataContextType = {
    institutes,
    topikExams,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
