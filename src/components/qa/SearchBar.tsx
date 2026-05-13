import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SearchBar({ value, onChange, className }: SearchBarProps) {
  const { t } = useTranslation();
  const [local, setLocal] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setLocal(value);
  }

  useEffect(() => {
    const timer = setTimeout(() => onChange(local.trim()), 300);
    return () => clearTimeout(timer);
  }, [local]);

  return (
    <div className={cn('relative', className)}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-k-sub" />
      <input
        type="text"
        value={local}
        onChange={e => setLocal(e.target.value)}
        placeholder={t('qa.searchPlaceholder', { defaultValue: 'Search questions...' })}
        className={cn(
          'w-full bg-k-bg2 rounded-full pl-9 pr-8 py-2 text-[13px] text-k-ink',
          'placeholder:text-k-sub/60 focus:outline-none focus:ring-2 focus:ring-k-crimson/20',
          'font-k-sans transition-all'
        )}
      />
      {local && (
        <button
          type="button"
          onClick={() => { setLocal(''); onChange(''); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-k-sub hover:text-k-ink"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
