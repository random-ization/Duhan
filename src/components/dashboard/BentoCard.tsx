import React from 'react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  bgClass?: string;
  borderClass?: string;
  onClickPath?: string;
  onClick?: () => void;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  className = '',
  bgClass = 'bg-white',
  borderClass = 'border-slate-200',
  onClickPath,
  onClick,
}) => {
  const navigate = useLocalizedNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    if (onClickPath) navigate(onClickPath);
  };

  const isInteractive = Boolean(onClick || onClickPath);
  const Component = isInteractive ? 'button' : ('div' as React.ElementType);

  return (
    <Component
      onClick={isInteractive ? handleClick : undefined}
      type={isInteractive ? 'button' : undefined}
      className={`
                relative overflow-hidden rounded-3xl border-2 p-6 transition-all duration-300 group text-left
                ${bgClass} ${borderClass} ${className}
                w-full h-full
                ${isInteractive ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''}
                ${isInteractive ? 'hover:bg-gray-50' : ''}
            `}
    >
      {children}
      {/* Hover shine effect */}
      {isInteractive && (
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
      )}
    </Component>
  );
};
