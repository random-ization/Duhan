import React from 'react';
import { useQuery } from 'convex/react';
import { QA_TOPICS } from '../../utils/convexRefs';
import { TopicChip } from './TopicChip';
import { cn } from '../../lib/utils';

interface TopicSelectProps {
  value: string;
  onChange: (slug: string) => void;
  className?: string;
}

export function TopicSelect({ value, onChange, className }: TopicSelectProps) {
  const topics = useQuery(QA_TOPICS.listTopics, {});

  if (!topics) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {topics.map(topic => (
        <button
          key={topic.slug}
          type="button"
          onClick={() => onChange(topic.slug)}
          className={cn(
            'transition-all duration-150',
            value === topic.slug
              ? 'ring-2 ring-k-crimson ring-offset-1 rounded-full'
              : 'opacity-60 hover:opacity-100'
          )}
        >
          <TopicChip slug={topic.slug} size="md" />
        </button>
      ))}
    </div>
  );
}
