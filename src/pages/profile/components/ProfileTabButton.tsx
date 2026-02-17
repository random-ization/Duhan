import React from 'react';
import { Button } from '../../../components/ui';

type TabId = 'info' | 'security' | 'stats' | 'settings';

export const ProfileTabButton: React.FC<{
  id: TabId;
  active: boolean;
  icon: React.ElementType;
  label: string;
  onSelect: (id: TabId) => void;
}> = ({ id, active, icon: Icon, label, onSelect }) => {
  return (
    <Button
      onClick={() => onSelect(id)}
      variant="ghost"
      size="auto"
      className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all ${
        active
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:bg-indigo-500 dark:text-primary-foreground dark:shadow-indigo-500/20'
          : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Button>
  );
};
