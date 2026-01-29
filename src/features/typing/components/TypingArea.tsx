import React, { useMemo } from 'react';
import { ValidationStatus } from '../hooks/useKoreanTyping';

interface TypingAreaProps {
  text: string;
  userInput: string;
  currIndex: number;
  checkInput: (target: string, input: string) => ValidationStatus;
  onClick: () => void;
  className?: string;
  focused?: boolean;
}

export const TypingArea: React.FC<TypingAreaProps> = ({
  text,
  userInput,
  // currIndex, // Unused
  checkInput,
  onClick,
  className,
  focused = true,
}) => {
  const chars = useMemo(() => text.split(''), [text]);

  return (
    <div
      className={`relative font-mono text-3xl leading-relaxed cursor-text select-none focus:outline-none max-w-4xl mx-auto break-keep whitespace-pre-wrap ${className}`}
      onClick={onClick}
    >
      {!focused && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10 text-lg font-bold text-gray-400">
          Click to focus
        </div>
      )}

      {chars.map((char, index) => {
        const inputChar = userInput[index];
        let status: ValidationStatus = 'pending';
        let colorClass = 'text-gray-300'; // Default untyped color (lighter gray for cleaner look)

        // Logic to determine visual state
        if (index < userInput.length) {
          status = checkInput(char, inputChar);
          if (status === 'correct') {
            colorClass = 'text-gray-800'; // Typed Correct
          } else if (status === 'incorrect') {
            colorClass = 'text-red-500'; // Typed Wrong
          } else if (status === 'pending') {
            colorClass = 'text-gray-800'; // Pending (actively composing)
          }
        }

        // Cursor Logic:
        const isPending = index === userInput.length - 1 && status === 'pending';
        // const isNextCursor = (index === userInput.length); // Unused

        // const isActive = isPending || (index === userInput.length && !isPending); // Unused

        const showCursor = index === userInput.length;
        // Note: For 'pending', we might want a different background style or underline.
        // Let's stick to the prompt Requirement: "Pending (Current): bg-gray-200"

        return (
          <span
            key={index}
            className={`
                relative inline-block border-b-2 border-transparent transition-all
                ${colorClass}
                ${showCursor && focused ? 'bg-gray-200/50 animate-pulse rounded' : ''}
                ${isPending ? 'bg-gray-200 rounded' : ''}
                ${status === 'incorrect' ? 'decoration-red-500 underline-offset-4' : ''}
            `}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </div>
  );
};
