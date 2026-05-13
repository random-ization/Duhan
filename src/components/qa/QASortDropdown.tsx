import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export type SortOption = 'recent' | 'unanswered' | 'top';

interface QASortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

export function QASortDropdown({ value, onChange, className }: QASortDropdownProps) {
  const { t } = useTranslation();

  const options: { value: SortOption; label: string }[] = [
    { value: 'recent', label: t('qa.sortRecent', { defaultValue: 'Recent' }) },
    { value: 'top', label: t('qa.sortTop', { defaultValue: 'Top' }) },
    { value: 'unanswered', label: t('qa.sortUnanswered', { defaultValue: 'Unanswered' }) },
  ];

  return (
    <div className={cn('flex gap-1 bg-k-bg2 rounded-full p-1', className)}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-150',
            value === opt.value
              ? 'bg-k-card text-k-ink shadow-k-shSm'
              : 'text-k-sub hover:text-k-ink'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
