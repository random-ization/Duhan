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

interface LayoutDashboardState {
  isEditing: boolean;
  cardOrder: string[];
}

interface LayoutChromeState {
  isMobileMenuOpen: boolean;
  sidebarHidden: boolean;
  footerHidden: boolean;
}

interface LayoutActions {
  toggleEditMode: () => void;
  updateCardOrder: (newOrder: string[]) => void;
  resetLayout: () => void;
  toggleMobileMenu: () => void;
  setSidebarHidden: (hidden: boolean) => void;
  setFooterHidden: (hidden: boolean) => void;
  setContextualSidebar: (sidebar: ContextualSidebarState, ownerId?: string) => void;
  clearContextualSidebar: (id?: string, ownerId?: string) => void;
}

export interface LayoutContextType extends LayoutDashboardState, LayoutChromeState, LayoutActions {}

export interface ContextualSidebarState {
  id: string;
  title?: string;
  subtitle?: string;
  content: ReactNode;
}

type StoredContextualSidebarState = ContextualSidebarState & {
  __ownerId: string;
};

const LayoutDashboardStateContext = createContext<LayoutDashboardState | undefined>(undefined);
const LayoutChromeStateContext = createContext<LayoutChromeState | undefined>(undefined);
const LayoutActionsContext = createContext<LayoutActions | undefined>(undefined);
const ContextualSidebarStateContext = createContext<ContextualSidebarState | null>(null);

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
  const [contextualSidebar, setContextualSidebarState] =
    useState<StoredContextualSidebarState | null>(null);
  const setContextualSidebar = useCallback((sidebar: ContextualSidebarState, ownerId?: string) => {
    setContextualSidebarState({
      ...sidebar,
      __ownerId: ownerId || 'layout-default-owner',
    });
  }, []);
  const clearContextualSidebar = useCallback((id?: string, ownerId?: string) => {
    setContextualSidebarState(prev => {
      if (!prev) return null;
      if (id && prev.id !== id) return prev;
      if (ownerId && prev.__ownerId !== ownerId) return prev;
      return null;
    });
  }, []);

  const dashboardState = useMemo<LayoutDashboardState>(
    () => ({
      isEditing,
      cardOrder,
    }),
    [isEditing, cardOrder]
  );

  const chromeState = useMemo<LayoutChromeState>(
    () => ({
      isMobileMenuOpen,
      sidebarHidden,
      footerHidden,
    }),
    [isMobileMenuOpen, sidebarHidden, footerHidden]
  );

  const actions = useMemo<LayoutActions>(
    () => ({
      toggleEditMode,
      updateCardOrder,
      resetLayout,
      toggleMobileMenu,
      setSidebarHidden,
      setFooterHidden,
      setContextualSidebar,
      clearContextualSidebar,
    }),
    [
      toggleEditMode,
      updateCardOrder,
      resetLayout,
      toggleMobileMenu,
      setContextualSidebar,
      clearContextualSidebar,
    ]
  );

  return (
    <LayoutActionsContext.Provider value={actions}>
      <LayoutDashboardStateContext.Provider value={dashboardState}>
        <LayoutChromeStateContext.Provider value={chromeState}>
          <ContextualSidebarStateContext.Provider value={contextualSidebar}>
            {children}
          </ContextualSidebarStateContext.Provider>
        </LayoutChromeStateContext.Provider>
      </LayoutDashboardStateContext.Provider>
    </LayoutActionsContext.Provider>
  );
};

export const useLayoutDashboardState = () => {
  const context = useContext(LayoutDashboardStateContext);
  if (!context) {
    throw new Error('useLayoutDashboardState must be used within a LayoutProvider');
  }
  return context;
};

export const useLayoutChromeState = () => {
  const context = useContext(LayoutChromeStateContext);
  if (!context) {
    throw new Error('useLayoutChromeState must be used within a LayoutProvider');
  }
  return context;
};

export const useLayoutActions = () => {
  const context = useContext(LayoutActionsContext);
  if (!context) {
    throw new Error('useLayoutActions must be used within a LayoutProvider');
  }
  return context;
};

export const useContextualSidebarState = () => useContext(ContextualSidebarStateContext);

export const useLayout = () => {
  const dashboard = useLayoutDashboardState();
  const chrome = useLayoutChromeState();
  const actions = useLayoutActions();
  return useMemo<LayoutContextType>(
    () => ({ ...dashboard, ...chrome, ...actions }),
    [dashboard, chrome, actions]
  );
};
