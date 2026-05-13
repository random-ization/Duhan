import React from 'react';

interface KeyboardHintsProps {
  nextJamo: string | null;
  targetChar: string;
  hasError: boolean;
}

const ROWS = [
  ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'],
  ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
  ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'],
];

const SHIFT_MAP: Record<string, string> = {
  'ㅂ': 'ㅃ',
  'ㅈ': 'ㅉ',
  'ㄷ': 'ㄸ',
  'ㄱ': 'ㄲ',
  'ㅅ': 'ㅆ',
  'ㅐ': 'ㅒ',
  'ㅔ': 'ㅖ',
};

// Map Jamo to QWERTY keys for reference if needed
const JAMO_TO_KEY: Record<string, string> = {
  'ㅂ': 'q', 'ㅈ': 'w', 'ㄷ': 'e', 'ㄱ': 'r', 'ㅅ': 't', 'ㅛ': 'y', 'ㅕ': 'u', 'ㅑ': 'i', 'ㅐ': 'o', 'ㅔ': 'p',
  'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd', 'ㄹ': 'f', 'ㅎ': 'g', 'ㅗ': 'h', 'ㅓ': 'j', 'ㅏ': 'k', 'ㅣ': 'l',
  'ㅋ': 'z', 'ㅌ': 'x', 'ㅊ': 'c', 'ㅍ': 'v', 'ㅠ': 'b', 'ㅜ': 'n', 'ㅡ': 'm',
  'ㅃ': 'Q', 'ㅉ': 'W', 'ㄸ': 'E', 'ㄲ': 'R', 'ㅆ': 'T', 'ㅒ': 'O', 'ㅖ': 'P',
};

export const DesktopKeyboardHints: React.FC<KeyboardHintsProps> = ({ nextJamo, hasError }) => {
  const isShifted = nextJamo ? Object.values(SHIFT_MAP).includes(nextJamo) : false;
  const baseJamo = isShifted 
    ? Object.keys(SHIFT_MAP).find(key => SHIFT_MAP[key] === nextJamo) || nextJamo
    : nextJamo;

  return (
    <div className="flex flex-col items-center gap-1.5 p-4 rounded-[20px] bg-k-bg2 border border-k-line/50">
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1.5">
          {rowIndex === 1 && <div className="w-4" />} {/* Indent home row */}
          {rowIndex === 2 && <div className="w-10" />} {/* Indent bottom row */}
          
          {row.map(jamo => {
            const displayJamo = isShifted && SHIFT_MAP[jamo] ? SHIFT_MAP[jamo] : jamo;
            const isTarget = baseJamo === jamo;
            
            return (
              <div
                key={jamo}
                className={`
                  relative flex h-[46px] w-[46px] items-center justify-center rounded-[10px] text-[15px] font-bold transition-all duration-200
                  ${isTarget 
                    ? (hasError ? 'bg-k-crimson text-k-bg shadow-lg scale-105' : 'bg-k-mint-deep text-k-bg shadow-lg scale-105') 
                    : 'bg-k-card text-k-sub border border-k-line/30'}
                `}
              >
                {displayJamo}
                <span className="absolute top-1 right-1.5 text-[9px] opacity-40 uppercase">
                  {JAMO_TO_KEY[displayJamo] || JAMO_TO_KEY[jamo]}
                </span>
              </div>
            );
          })}
        </div>
      ))}
      
      <div className="mt-1 flex gap-1.5">
        <div 
          className={`flex h-[46px] w-[80px] items-center justify-center rounded-[10px] text-[11px] font-extrabold tracking-widest transition-all
            ${isShifted ? 'bg-k-butter text-k-ink shadow-sm' : 'bg-k-card text-k-sub border border-k-line/30'}
          `}
        >
          SHIFT
        </div>
        <div className="flex h-[46px] w-[260px] items-center justify-center rounded-[10px] border border-k-line/30 bg-k-card text-[10px] font-bold text-k-sub/50">
          SPACE
        </div>
        <div className={`flex h-[46px] w-[80px] items-center justify-center rounded-[10px] text-[11px] font-extrabold tracking-widest transition-all
            ${isShifted ? 'bg-k-butter text-k-ink shadow-sm' : 'bg-k-card text-k-sub border border-k-line/30'}
          `}
        >
          SHIFT
        </div>
      </div>
    </div>
  );
};
