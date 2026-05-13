import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { QA_TOPICS } from '../../utils/convexRefs';
import { cn } from '../../lib/utils';
import { TOPIC_TONES, TOPIC_ICONS } from './TopicChip';

interface TopicFilterProps {
  value: string | null;
  onChange: (slug: string | null) => void;
  className?: string;
}

export function TopicFilter({ value, onChange, className }: TopicFilterProps) {
  const { t } = useTranslation();
  const topics = useQuery(QA_TOPICS.listTopics, {});

  if (!topics) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-150',
          !value
            ? 'bg-k-ink text-k-card'
            : 'bg-k-bg2 text-k-sub hover:text-k-ink'
        )}
      >
        {t('qa.allTopics', { defaultValue: 'All Topics' })}
      </button>
      {topics.map(topic => {
        const isActive = value === topic.slug;
        const icon = TOPIC_ICONS[topic.slug] || '💬';
        return (
          <button
            key={topic.slug}
            type="button"
            onClick={() => onChange(isActive ? null : topic.slug)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-150',
              isActive
                ? 'bg-k-ink text-k-card'
                : 'bg-k-bg2 text-k-sub hover:text-k-ink'
            )}
          >
            {icon} {t(`qa.topics.${topic.slug}`, { defaultValue: topic.slug })}
          </button>
        );
      })}
    </div>
  );
}
