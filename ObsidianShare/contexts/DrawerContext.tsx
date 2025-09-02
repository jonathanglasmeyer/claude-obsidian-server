import React, { createContext, useContext } from 'react';

interface DrawerContextType {
  openDrawer: () => void;
  closeDrawer: () => void;
  isDrawerOpen: boolean;
}

const DrawerContext = createContext<DrawerContextType | null>(null);

export function DrawerProvider({ 
  children, 
  isOpen, 
  onOpenChange 
}: { 
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const contextValue: DrawerContextType = {
    openDrawer: () => onOpenChange(true),
    closeDrawer: () => onOpenChange(false),
    isDrawerOpen: isOpen,
  };

  return (
    <DrawerContext.Provider value={contextValue}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawerContext() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawerContext must be used within a DrawerProvider');
  }
  return context;
}