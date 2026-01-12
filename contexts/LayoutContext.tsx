import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Default order of cards on the dashboard
export const DEFAULT_CARD_ORDER = [
    'summary', // LearnerSummaryCard (Added recently)
    'tiger',   // Tiger Coach
    'daily-phrase',
    'textbook',
    'topik',
    'youtube',
    'podcast',
    'vocab',   // 生词本
    'notes'    // 笔记本
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
    const [cardOrder, setCardOrder] = useState<string[]>(DEFAULT_CARD_ORDER);

    // Load from local storage on mount
    useEffect(() => {
        const savedOrder = localStorage.getItem('dashboard_layout');
        if (savedOrder) {
            try {
                const parsed = JSON.parse(savedOrder);
                // Ensure all default cards are present (in case of updates)
                const merged = [...parsed];
                DEFAULT_CARD_ORDER.forEach(id => {
                    if (!merged.includes(id)) {
                        merged.push(id);
                    }
                });
                setCardOrder(merged);
            } catch (e) {
                console.error('Failed to parse dashboard layout', e);
                setCardOrder(DEFAULT_CARD_ORDER);
            }
        }
    }, []);

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
        <LayoutContext.Provider value={{ isEditing, toggleEditMode, cardOrder, updateCardOrder, resetLayout, isMobileMenuOpen, toggleMobileMenu, sidebarHidden, setSidebarHidden }}>
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
