import React from 'react';
import { cn } from '../../lib/utils';
import { renderQAContentHtml } from './qaRichText';

interface QARichContentProps {
  content: string;
  className?: string;
}

export function QARichContent({ content, className }: QARichContentProps) {
  return (
    <div
      className={cn(
        'space-y-3 text-[14px] leading-relaxed text-k-ink',
        '[&_a]:text-k-crimson [&_a]:underline-offset-2 hover:[&_a]:underline',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-k-line [&_blockquote]:pl-4 [&_blockquote]:text-k-sub',
        '[&_code]:rounded [&_code]:bg-k-bg2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.95em]',
        '[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1',
        className
      )}
      dangerouslySetInnerHTML={{ __html: renderQAContentHtml(content) }}
    />
  );
}
