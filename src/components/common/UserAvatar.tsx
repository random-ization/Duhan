import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface UserAvatarProps {
  user?: {
    name?: string;
    avatar?: string;
  } | null;
  className?: string;
  fallbackClassName?: string;
  showNameFallback?: boolean;
  isUploading?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  className,
  fallbackClassName,
  showNameFallback = true,
  isUploading = false,
}) => {
  const avatarUrl = user?.avatar;
  // Reset error when avatar URL changes - use key pattern instead of effect
  const [error, setError] = useState(() => false);
  const [prevAvatarUrl, setPrevAvatarUrl] = useState(avatarUrl);
  
  // Sync: reset error when URL actually changes
  if (avatarUrl !== prevAvatarUrl) {
    setPrevAvatarUrl(avatarUrl);
    if (error) setError(false);
  }

  const name = user?.name || 'User';
  const initial = name.trim().charAt(0).toUpperCase();

  const renderFallback = () => {
    if (isUploading) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-k-card/60 backdrop-blur-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-k-crimson border-t-transparent" />
        </div>
      );
    }
    if (showNameFallback && name) {
      return (
        <div 
          className={cn(
            "flex h-full w-full items-center justify-center font-bold text-k-ink",
            fallbackClassName
          )}
        >
          {initial}
        </div>
      );
    }
    return <UserIcon className="h-1/2 w-1/2 text-k-ink opacity-40" />;
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-k-pink/40 to-k-butter/40",
        className
      )}
    >
      {avatarUrl && !error ? (
        <div className="relative h-full w-full">
          <img
            src={avatarUrl}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setError(true)}
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-k-card/60 backdrop-blur-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-k-crimson border-t-transparent" />
            </div>
          )}
        </div>
      ) : (
        renderFallback()
      )}
    </div>
  );
};
