import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { QA_FORUM } from '../../utils/convexRefs';
import { cn } from '../../lib/utils';

interface VoteButtonProps {
  target: 'question' | 'answer';
  targetId: string;
  voteScore: number;
  myVote?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function VoteButton({
  target,
  targetId,
  voteScore,
  myVote = 0,
  size = 'md',
  className,
}: VoteButtonProps) {
  const voteOnTarget = useMutation(QA_FORUM.voteOnTarget);
  const [optimistic, setOptimistic] = useState<{ vote: number; score: number } | null>(null);

  const currentVote = optimistic?.vote ?? myVote;
  const currentScore = optimistic?.score ?? voteScore;

  const handleVote = async (value: 1 | -1) => {
    let nextVote: number;
    let nextScore: number;

    if (currentVote === value) {
      nextVote = 0;
      nextScore = currentScore - value;
    } else {
      nextVote = value;
      nextScore = currentScore + value - currentVote;
    }

    setOptimistic({ vote: nextVote, score: nextScore });

    try {
      await voteOnTarget({ target, targetId, value });
    } catch {
      setOptimistic(null);
    }
  };

  const iconSize = size === 'sm' ? 14 : 18;
  const btnPad = size === 'sm' ? 'p-0.5' : 'p-1';

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      <button
        type="button"
        onClick={() => handleVote(1)}
        className={cn(
          btnPad, 'rounded-lg transition-colors',
          currentVote === 1
            ? 'text-k-crimson bg-k-crimson/10'
            : 'text-k-sub hover:text-k-crimson hover:bg-k-crimson/5'
        )}
      >
        <ChevronUp size={iconSize} strokeWidth={2.5} />
      </button>
      <span
        className={cn(
          'font-extrabold tabular-nums',
          size === 'sm' ? 'text-[12px]' : 'text-[14px]',
          currentScore > 0 ? 'text-k-crimson' : currentScore < 0 ? 'text-k-sub' : 'text-k-ink2'
        )}
      >
        {currentScore}
      </span>
      <button
        type="button"
        onClick={() => handleVote(-1)}
        className={cn(
          btnPad, 'rounded-lg transition-colors',
          currentVote === -1
            ? 'text-k-sky-deep bg-k-sky/10'
            : 'text-k-sub hover:text-k-sky-deep hover:bg-k-sky/5'
        )}
      >
        <ChevronDown size={iconSize} strokeWidth={2.5} />
      </button>
    </div>
  );
}
