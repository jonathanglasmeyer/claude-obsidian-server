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
    openDrawer: () => {
      // openDrawer called
      // React render phase check
      try {
        // About to call onOpenChange(true)
        onOpenChange(true);
        // openDrawer succeeded
      } catch (error) {
        console.error('❌ openDrawer failed:', error);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        // Don't rethrow - let the app continue
      }
    },
    closeDrawer: () => {
      // closeDrawer called
      try {
        onOpenChange(false);
        // closeDrawer succeeded
      } catch (error) {
        console.error('❌ closeDrawer failed:', error);
        throw error;
      }
    },
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