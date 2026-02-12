import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type GlobalModalId = 'profile-setup';

type GlobalModalContextType = {
  activeModal: GlobalModalId | null;
  showModal: (id: GlobalModalId) => void;
  hideModal: (id: GlobalModalId) => void;
  isOpen: (id: GlobalModalId) => boolean;
};

const GlobalModalContext = createContext<GlobalModalContextType | null>(null);

export function GlobalModalProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [activeModal, setActiveModal] = useState<GlobalModalId | null>(null);

  const showModal = useCallback((id: GlobalModalId) => {
    setActiveModal(id);
  }, []);

  const hideModal = useCallback((id: GlobalModalId) => {
    setActiveModal(prev => (prev === id ? null : prev));
  }, []);

  const isOpen = useCallback((id: GlobalModalId) => activeModal === id, [activeModal]);

  const value = useMemo(
    () => ({
      activeModal,
      showModal,
      hideModal,
      isOpen,
    }),
    [activeModal, hideModal, isOpen, showModal]
  );

  return <GlobalModalContext.Provider value={value}>{children}</GlobalModalContext.Provider>;
}

export function useGlobalModal() {
  const ctx = useContext(GlobalModalContext);
  if (!ctx) {
    throw new Error('useGlobalModal must be used within GlobalModalProvider');
  }
  return ctx;
}
