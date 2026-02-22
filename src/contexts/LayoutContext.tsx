import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

// Default order of cards on the dashboard
export const DEFAULT_CARD_ORDER = [
  'tiger', // Tiger Coach
  'textbook',
  'reading', // Reading entry
  'youtube',
  'podcast',
  'vocab', // Vocabulary notebook
  'notes', // Notes
  'typing', // Typing practice
];

interface LayoutContextType {
  isEditing: boolean;
  toggleEditMode: () => void;
  cardOrder: string[];
  updateCardOrder: (newOrder: string[]) => void;
  resetLayout: () => void;
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  sidebarHidden: boolean;
  setSidebarHidden: (hidden: boolean) => void;
  footerHidden: boolean;
  setFooterHidden: (hidden: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    if (globalThis.window === undefined) return DEFAULT_CARD_ORDER;
    const savedOrder = localStorage.getItem('dashboard_layout');
    if (!savedOrder) return DEFAULT_CARD_ORDER;
    try {
      const parsed = JSON.parse(savedOrder);
      const validCards = (Array.isArray(parsed) ? parsed : []).filter(
        (id: unknown): id is string => typeof id === 'string' && DEFAULT_CARD_ORDER.includes(id)
      );
      DEFAULT_CARD_ORDER.forEach(id => {
        if (!validCards.includes(id)) validCards.push(id);
      });
      return validCards;
    } catch {
      return DEFAULT_CARD_ORDER;
    }
  });

  const toggleEditMode = useCallback(() => {
    setIsEditing(prev => !prev);
  }, []);

  const updateCardOrder = useCallback((newOrder: string[]) => {
    setCardOrder(newOrder);
    localStorage.setItem('dashboard_layout', JSON.stringify(newOrder));
  }, []);

  const resetLayout = useCallback(() => {
    setCardOrder(DEFAULT_CARD_ORDER);
    localStorage.setItem('dashboard_layout', JSON.stringify(DEFAULT_CARD_ORDER));
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen(prev => !prev), []);

  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [footerHidden, setFooterHidden] = useState(false);

  const value = useMemo(
    () => ({
      isEditing,
      toggleEditMode,
      cardOrder,
      updateCardOrder,
      resetLayout,
      isMobileMenuOpen,
      toggleMobileMenu,
      sidebarHidden,
      setSidebarHidden,
      footerHidden,
      setFooterHidden,
    }),
    [
      isEditing,
      toggleEditMode,
      cardOrder,
      updateCardOrder,
      resetLayout,
      isMobileMenuOpen,
      toggleMobileMenu,
      sidebarHidden,
      footerHidden,
    ]
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
