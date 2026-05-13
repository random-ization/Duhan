import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  variant?: 'full' | 'icon';
}

export const Logo: React.FC<LogoProps> = ({ size = 32, className = '', variant = 'icon' }) => {
  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <LogoIcon size={size} />
        <span className="font-k-serif font-medium text-k-crimson" style={{ fontSize: size * 0.7 }}>두한</span>
        <span className="font-extrabold tracking-[-0.3px] text-k-ink" style={{ fontSize: size * 0.7 }}>Duhan</span>
      </div>
    );
  }

  return <LogoIcon size={size} className={className} />;
};

export const LogoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => {
  return (
    <div 
      className={`shrink-0 overflow-hidden rounded-[22%] shadow-[0_2px_8px_rgba(217,97,74,0.15)] ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 220 220" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg-bloom-comp" cx="50%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#FFE9D8"/><stop offset="55%" stopColor="#F4B7A0"/><stop offset="100%" stopColor="#D9614A"/>
          </radialGradient>
          <linearGradient id="petal-comp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBF8F3" stopOpacity="0.95"/><stop offset="100%" stopColor="#FBF8F3" stopOpacity="0.55"/>
          </linearGradient>
        </defs>
        <rect width="220" height="220" fill="url(#bg-bloom-comp)"/>
        <g transform="translate(110,110)">
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse 
              key={r} 
              cx="0" 
              cy="-44" 
              rx="26" 
              ry="56" 
              fill="url(#petal-comp)" 
              transform={`rotate(${r})`} 
              opacity="0.92"
            />
          ))}
          <circle r="22" fill="#5B1B12"/>
          <circle r="9" fill="#FBF8F3"/>
        </g>
      </svg>
    </div>
  );
};
