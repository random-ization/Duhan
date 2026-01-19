import React, { createContext, useContext, useState, ReactNode } from 'react';

// Default order of cards on the dashboard
export const DEFAULT_CARD_ORDER = [
  'summary', // LearnerSummaryCard (Added recently)
  'tiger', // Tiger Coach
  'textbook',
  'topik',
  'youtube',
  'podcast',
  'vocab', // 生词本
  'notes', // 笔记本
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
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_CARD_ORDER;
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

  const toggleEditMode = () => {
    setIsEditing(prev => {
      const newState = !prev;
      // When exiting edit mode, save could be triggered here or in updateCardOrder
      return newState;
    });
  };

  const updateCardOrder = (newOrder: string[]) => {
    setCardOrder(newOrder);
    localStorage.setItem('dashboard_layout', JSON.stringify(newOrder));
  };

  const resetLayout = () => {
    setCardOrder(DEFAULT_CARD_ORDER);
    localStorage.setItem('dashboard_layout', JSON.stringify(DEFAULT_CARD_ORDER));
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);

  const [sidebarHidden, setSidebarHidden] = useState(false);

  return (
    <LayoutContext.Provider
      value={{
        isEditing,
        toggleEditMode,
        cardOrder,
        updateCardOrder,
        resetLayout,
        isMobileMenuOpen,
        toggleMobileMenu,
        sidebarHidden,
        setSidebarHidden,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
