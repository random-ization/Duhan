import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type PhoneVerifyModalContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const PhoneVerifyModalContext = createContext<PhoneVerifyModalContextType | null>(null);

export function PhoneVerifyModalProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<PhoneVerifyModalContextType>(
    () => ({ isOpen, open, close }),
    [isOpen, open, close]
  );

  return (
    <PhoneVerifyModalContext.Provider value={value}>{children}</PhoneVerifyModalContext.Provider>
  );
}

export function usePhoneVerifyModal() {
  const ctx = useContext(PhoneVerifyModalContext);
  if (!ctx) throw new Error('usePhoneVerifyModal must be used within PhoneVerifyModalProvider');
  return ctx;
}
