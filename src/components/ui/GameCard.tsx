import React from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface GameCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export function GameCard({ children, className, onClick, ...props }: GameCardProps) {
    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={cn(
                "bg-white rounded-[2.5rem] border-2 border-slate-900 shadow-pop transition-all cursor-pointer relative overflow-hidden",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
}
