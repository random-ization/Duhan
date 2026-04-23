import { cn } from '../../lib/utils';
import { Button } from '../ui';
import { KT } from './ksoft/ksoft';

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
        highlightColor === 'yellow' && 'border',
        highlightColor === 'green' && 'border',
        highlightColor === 'pink' && 'border'
      )}
      style={
        highlightColor === 'yellow'
          ? { background: KT.butter, color: '#7A5F1F', borderColor: KT.butterDeep }
          : highlightColor === 'green'
            ? { background: KT.mint, color: '#2F5847', borderColor: KT.mintDeep }
            : highlightColor === 'pink'
              ? { background: KT.pink, color: '#7A2F26', borderColor: KT.pinkDeep }
              : undefined
      }
    >
      {word}
    </Button>
  );
}
