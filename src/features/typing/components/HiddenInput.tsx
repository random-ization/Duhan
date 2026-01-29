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
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '1px',
        height: '1px',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        color: 'transparent',
        caretColor: 'transparent',
        // Allow input events but hide visually
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
