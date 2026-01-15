import React from 'react';
import { useNavigate } from 'react-router-dom';

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
    onClick
}) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (onClick) onClick();
        if (onClickPath) navigate(onClickPath);
    };

    return (
        <div
            onClick={handleClick}
            className={`
                relative overflow-hidden rounded-3xl border-2 p-6 transition-all duration-300 group
                ${bgClass} ${borderClass} ${className}
                ${(onClickPath || onClick) ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''}
            `}
        >
            {children}
            {/* Hover shine effect */}
            {(onClickPath || onClick) && (
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
            )}
        </div>
    );
};
