import React, { forwardRef } from 'react';

interface HiddenInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // No specific props needed yet
  _dummy?: never;
}

export const HiddenInput = forwardRef<HTMLInputElement, HiddenInputProps>((props, ref) => {
  return (
    <input
      ref={ref}
      type="text"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '0',
        width: '120px',
        height: '32px',
        border: '0',
        outline: 'none',
        background: 'transparent',
        color: '#111827',
        caretColor: '#111827',
        opacity: 0,
      }}
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      lang="ko"
      {...props}
    />
  );
});

HiddenInput.displayName = 'HiddenInput';
