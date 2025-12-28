import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

interface BentoCardProps {
    children: React.ReactNode;
    className?: string;
    onClickPath?: string;
    bgClass?: string;
    borderClass?: string;
}

export function BentoCard({ children, className, onClickPath, bgClass, borderClass }: BentoCardProps) {
    const navigate = useNavigate();
    return (
        <div
            onClick={() => onClickPath && navigate(onClickPath)}
            className={clsx(
                "relative overflow-hidden shadow-pop rounded-[2.5rem] p-4 md:p-6 transition-transform duration-300 hover:-translate-y-2 hover:scale-[1.01] cursor-pointer group border-2",
                bgClass || "bg-white",
                borderClass || "border-slate-900",
                className
            )}
        >
            {children}
        </div>
    );
}
