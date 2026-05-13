import React from 'react';
import { useTranslation } from 'react-i18next';
import { DesignChip } from '../desktop/ui/DesignChip';

const TOPIC_TONES: Record<string, 'pink' | 'mint' | 'butter' | 'lilac' | 'sky' | 'crimson' | 'ink' | 'muted'> = {
  vocab: 'pink',
  grammar: 'mint',
  topik: 'lilac',
  listening: 'butter',
  writing: 'sky',
  speaking: 'crimson',
  culture: 'ink',
  resources: 'mint',
  general: 'muted',
};

const TOPIC_ICONS: Record<string, string> = {
  vocab: '📝',
  grammar: '📘',
  topik: '🎯',
  listening: '🎧',
  writing: '✍️',
  speaking: '🗣️',
  culture: '🏯',
  resources: '📂',
  general: '💬',
};

interface TopicChipProps {
  slug: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function TopicChip({ slug, size = 'sm', className }: TopicChipProps) {
  const { t } = useTranslation();
  const tone = TOPIC_TONES[slug] || 'muted';
  const icon = TOPIC_ICONS[slug] || '💬';
  const label = t(`qa.topics.${slug}`, { defaultValue: slug });

  return (
    <DesignChip tone={tone} size={size} className={className}>
      {icon} {label}
    </DesignChip>
  );
}

export { TOPIC_TONES, TOPIC_ICONS };
