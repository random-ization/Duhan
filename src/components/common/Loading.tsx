import React from 'react';
import { Loader2 } from 'lucide-react';
import { DialogPortal } from '../ui';

interface LoadingProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const Loading: React.FC<LoadingProps> = ({ fullScreen = false, size = 'md', text }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-indigo-600`} />
      {text && <p className="text-sm font-medium text-muted-foreground animate-pulse">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <DialogPortal>
        <div className="fixed inset-0 bg-card/80 backdrop-blur-sm z-50 flex items-center justify-center">
          {content}
        </div>
      </DialogPortal>
    );
  }

  return <div className="flex items-center justify-center p-4">{content}</div>;
};
