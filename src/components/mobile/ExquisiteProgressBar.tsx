import React from 'react';
import { motion } from 'framer-motion';
import { KT } from './ksoft/ksoft';

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
      <div
        className="absolute inset-0 rounded-full backdrop-blur-[1px]"
        style={{ background: `${KT.line2}88` }}
      />

      {/* Progress Fill */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="absolute inset-y-0 left-0 rounded-full overflow-visible transition-all duration-300"
        style={{
          background: isCompleted
            ? `linear-gradient(90deg, ${KT.mintDeep} 0%, ${KT.jade} 100%)`
            : `linear-gradient(90deg, ${KT.indigo} 0%, ${KT.skyDeep} 100%)`,
          boxShadow: isCompleted ? `0 0 12px ${KT.mintDeep}66` : undefined,
        }}
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
            className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full blur-[2px]"
            style={{ background: isCompleted ? KT.card : KT.sky }}
          />
        )}
      </motion.div>

      {/* Sub-track Reflection (Optional for extra depth) */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-white/20 rounded-full mx-1" />
    </div>
  );
}
