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
                // Claymorphism style: soft 3D, thick borders, double shadows, rounded corners
                "relative overflow-hidden rounded-[24px] p-4 md:p-6 transition-all duration-200 ease-out cursor-pointer group",
                // Thick border (3-4px) for clay look
                "border-[3px]",
                // Claymorphism double shadow: outer + inner shadow for depth
                "shadow-[0_8px_30px_rgba(0,0,0,0.08),inset_0_-4px_10px_rgba(255,255,255,0.6),inset_0_4px_10px_rgba(255,255,255,0.9)]",
                // Soft hover effect (no scale to avoid layout shift)
                "hover:shadow-[0_12px_40px_rgba(0,0,0,0.12),inset_0_-4px_10px_rgba(255,255,255,0.6),inset_0_4px_10px_rgba(255,255,255,0.9)]",
                "hover:-translate-y-1",
                // Default colors
                bgClass || "bg-white",
                borderClass || "border-slate-200",
                className
            )}
        >
            {children}
        </div>
    );
}
