import React from 'react';
import { cn } from '../../lib/utils';
import { Puzzle, Zap, Headphones, BookOpen, Target, Flame, Trophy } from 'lucide-react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * 3D-Style Glassmorphic Icon Wrapper
 */
const IconWrapper = ({
  children,
  gradient,
  glow,
  className,
}: {
  children: React.ReactNode;
  gradient: string;
  glow: string;
  className?: string;
}) => (
  <div
    className={cn(
      'relative flex items-center justify-center rounded-2xl p-2.5 shadow-lg overflow-hidden',
      gradient,
      className
    )}
  >
    {/* Inner Glow Overlay */}
    <div className={cn('absolute inset-0 opacity-40 blur-xl', glow)} />
    {/* Content */}
    <div className="relative z-10 filter drop-shadow-md">{children}</div>
    {/* Highlight Edge */}
    <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
  </div>
);

export const VocabIcon = ({ className, size = 28 }: IconProps) => (
  <IconWrapper
    gradient="bg-gradient-to-br from-emerald-400 to-emerald-600"
    glow="bg-emerald-300"
    className={className}
  >
    <Puzzle size={size} className="text-white" strokeWidth={2.5} />
  </IconWrapper>
);

export const GrammarIcon = ({ className, size = 28 }: IconProps) => (
  <IconWrapper
    gradient="bg-gradient-to-br from-violet-400 to-violet-600"
    glow="bg-violet-300"
    className={className}
  >
    <Zap size={size} className="text-white" strokeWidth={2.5} />
  </IconWrapper>
);

export const ListeningIcon = ({ className, size = 28 }: IconProps) => (
  <IconWrapper
    gradient="bg-gradient-to-br from-amber-400 to-amber-600"
    glow="bg-amber-300"
    className={className}
  >
    <Headphones size={size} className="text-white" strokeWidth={2.5} />
  </IconWrapper>
);

export const ReadingIcon = ({ className, size = 28 }: IconProps) => (
  <IconWrapper
    gradient="bg-gradient-to-br from-blue-400 to-blue-600"
    glow="bg-blue-300"
    className={className}
  >
    <BookOpen size={size} className="text-white" strokeWidth={2.5} />
  </IconWrapper>
);

export const StreakIcon = ({ className, size = 20 }: IconProps) => (
  <IconWrapper
    gradient="bg-gradient-to-br from-orange-400 to-rose-600"
    glow="bg-orange-300"
    className={cn('rounded-xl p-2', className)}
  >
    <Flame size={size} className="text-white" fill="currentColor" />
  </IconWrapper>
);

export const GoalIcon = ({ className, size = 20 }: IconProps) => (
  <IconWrapper
    gradient="bg-gradient-to-br from-indigo-400 to-blue-600"
    glow="bg-blue-300"
    className={cn('rounded-xl p-2', className)}
  >
    <Target size={size} className="text-white" strokeWidth={3} />
  </IconWrapper>
);

export const TrophyIcon = ({ className, size = 20 }: IconProps) => (
  <IconWrapper
    gradient="bg-gradient-to-br from-yellow-400 to-amber-600"
    glow="bg-yellow-300"
    className={cn('rounded-xl p-2', className)}
  >
    <Trophy size={size} className="text-white" fill="currentColor" />
  </IconWrapper>
);
