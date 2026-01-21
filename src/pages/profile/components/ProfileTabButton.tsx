import React from 'react';

type TabId = 'info' | 'security' | 'stats' | 'settings';

export const ProfileTabButton: React.FC<{
  id: TabId;
  active: boolean;
  icon: React.ElementType;
  label: string;
  onSelect: (id: TabId) => void;
}> = ({ id, active, icon: Icon, label, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all ${
        active
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
          : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
};
