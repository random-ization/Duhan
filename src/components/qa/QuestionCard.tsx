import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Eye, CheckCircle2 } from 'lucide-react';
import { TopicChip } from './TopicChip';
import { cn } from '../../lib/utils';
import type { QAQuestionDto } from '../../../convex/qaForum';
import { extractQAContentText } from './qaRichText';

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d`;
  return `${Math.floor(diffDay / 30)}mo`;
}

interface QuestionCardProps {
  question: QAQuestionDto;
  onClick: () => void;
  onAuthorClick?: () => void;
  className?: string;
}

export function QuestionCard({ question, onClick, onAuthorClick, className }: QuestionCardProps) {
  const { t } = useTranslation();
  const summary = extractQAContentText(question.content);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'w-full text-left bg-k-card rounded-k-md shadow-k-sh p-5 transition-all duration-150',
        'hover:shadow-k-shLg hover:-translate-y-[1px] cursor-pointer',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <TopicChip slug={question.topicSlug} />
            {question.hasAcceptedAnswer && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2F5847] bg-k-mint px-2 py-0.5 rounded-full">
                <CheckCircle2 size={10} />
                {t('qa.accepted', { defaultValue: 'Accepted' })}
              </span>
            )}
          </div>

          <h3 className="text-[15px] font-bold text-k-ink leading-snug mb-1.5 line-clamp-2">
            {question.title}
          </h3>

          <p className="text-[12px] text-k-sub leading-relaxed line-clamp-2 mb-3">
            {summary}
          </p>

          <div className="flex items-center gap-4 text-[11px] text-k-sub">
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                onAuthorClick?.();
              }}
              aria-label={t('qa.openAuthorProfile', {
                name: question.author.name,
                defaultValue: `View ${question.author.name}'s profile`,
              })}
              className="flex items-center gap-1 rounded-full pr-1 transition-colors hover:text-k-ink"
            >
              <img
                src={question.author.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${question.author.name}`}
                alt=""
                className="w-4 h-4 rounded-full"
              />
              <span className="font-medium text-k-ink2">{question.author.name}</span>
            </button>
            <span>{formatRelativeTime(question.createdAt)}</span>
            <div className="flex items-center gap-1">
              <MessageCircle size={12} />
              <span>{question.answerCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye size={12} />
              <span>{question.viewCount}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
