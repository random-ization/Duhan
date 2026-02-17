import { cn } from '../../lib/utils';
import { Button } from '../ui';

interface InteractiveWordChipProps {
  readonly word: string;
  readonly onClick: (word: string) => void;
  readonly highlightColor?: 'yellow' | 'green' | 'pink';
}

export function InteractiveWordChip({ word, onClick, highlightColor }: InteractiveWordChipProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
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
          'hover:bg-muted active:bg-muted border border-transparent hover:border-border',
        highlightColor === 'yellow' && 'bg-yellow-100 text-yellow-900 border border-yellow-200',
        highlightColor === 'green' && 'bg-green-100 text-green-900 border border-green-200',
        highlightColor === 'pink' && 'bg-pink-100 text-pink-900 border border-pink-200'
      )}
    >
      {word}
    </Button>
  );
}
