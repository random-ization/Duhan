import React from 'react';
import { cn } from '../../lib/utils';

interface InteractiveWordChipProps {
  readonly word: string;
  readonly onClick: (word: string) => void;
  readonly highlightColor?: 'yellow' | 'green' | 'pink';
}

export function InteractiveWordChip({ word, onClick, highlightColor }: InteractiveWordChipProps) {
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onClick(word);
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(word);
        }
      }}
      className={cn(
        'inline-block rounded-lg px-1 py-0.5 mx-0.5 cursor-pointer transition-all active:scale-95 select-none text-left',
        !highlightColor &&
          'hover:bg-slate-100 active:bg-slate-200 border border-transparent hover:border-slate-200',
        highlightColor === 'yellow' && 'bg-yellow-100 text-yellow-900 border border-yellow-200',
        highlightColor === 'green' && 'bg-green-100 text-green-900 border border-green-200',
        highlightColor === 'pink' && 'bg-pink-100 text-pink-900 border border-pink-200'
      )}
    >
      {word}
    </button>
  );
}
