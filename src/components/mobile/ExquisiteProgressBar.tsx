import React from 'react';
import { motion } from 'framer-motion';

interface ExquisiteProgressBarProps {
  readonly progress: number; // 0 to 100
  readonly className?: string;
  readonly height?: number;
  readonly showGlow?: boolean;
}

export default function ExquisiteProgressBar({
  progress,
  className = '',
  height = 6,
  showGlow = true,
}: ExquisiteProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, progress));
  const isCompleted = percentage >= 100;

  return (
    <div className={`relative w-full ${className}`} style={{ height }}>
      {/* Track Background */}
      <div className="absolute inset-0 rounded-full bg-slate-200/50 dark:bg-slate-800/40 backdrop-blur-[1px]" />

      {/* Progress Fill */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className={`absolute inset-y-0 left-0 rounded-full overflow-visible transition-all duration-300 ${
          isCompleted
            ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
            : 'bg-gradient-to-r from-indigo-400 via-blue-500 to-sky-400'
        }`}
      >
        {/* Leading Glow Point */}
        {showGlow && percentage > 5 && (
          <motion.div
            animate={{
              opacity: [0.6, 1, 0.6],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full blur-[2px] ${
              isCompleted ? 'bg-white' : 'bg-blue-200'
            }`}
          />
        )}
      </motion.div>

      {/* Sub-track Reflection (Optional for extra depth) */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-white/20 rounded-full mx-1" />
    </div>
  );
}
