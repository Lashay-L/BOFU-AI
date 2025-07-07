import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';

interface LayoutState {
  adminSidebarVisible: boolean;
  adminSidebarWidth: number;
  aiCopilotVisible: boolean;
  aiCopilotWidth: number;
  commentsSidebarVisible: boolean;
  commentsSidebarWidth: number;
  screenSize: 'mobile' | 'tablet' | 'desktop';
  availableWidth: number;
  editorWidth: number;
}

interface LayoutContextType {
  layout: LayoutState;
  toggleAdminSidebar: () => void;
  toggleAICopilot: () => void;
  toggleCommentsSidebar: () => void;
  setAICopilotVisible: (visible: boolean) => void;
  setCommentsSidebarVisible: (visible: boolean) => void;
  calculateEditorWidth: () => number;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [layout, setLayout] = useState<LayoutState>({
    adminSidebarVisible: true,
    adminSidebarWidth: 320, // w-80 = 320px
    aiCopilotVisible: false,
    aiCopilotWidth: 650,
    commentsSidebarVisible: false,
    commentsSidebarWidth: 420,
    screenSize: 'desktop',
    availableWidth: window.innerWidth,
    editorWidth: 0,
  });

  const getScreenSize = (width: number): 'mobile' | 'tablet' | 'desktop' => {
    if (width < 768) return 'mobile';
    if (width < 1280) return 'tablet';
    return 'desktop';
  };

  const updateLayout = useCallback((updates: Partial<LayoutState>) => {
    setLayout(prev => {
      const newLayout = { ...prev, ...updates };
      
      // Calculate editor width based on new layout
      let availableWidth = newLayout.availableWidth || window.innerWidth;
      
      if (newLayout.adminSidebarVisible) {
        availableWidth -= newLayout.adminSidebarWidth;
      }
      if (newLayout.aiCopilotVisible) {
        availableWidth -= newLayout.aiCopilotWidth;
      }
      if (newLayout.commentsSidebarVisible) {
        availableWidth -= newLayout.commentsSidebarWidth;
      }
      
      newLayout.editorWidth = Math.max(availableWidth, 600);
      return newLayout;
    });
  }, []);

  const calculateEditorWidth = useCallback((): number => {
    let availableWidth = window.innerWidth;
    
    if (layout.adminSidebarVisible) {
      availableWidth -= layout.adminSidebarWidth;
    }
    if (layout.aiCopilotVisible) {
      availableWidth -= layout.aiCopilotWidth;
    }
    if (layout.commentsSidebarVisible) {
      availableWidth -= layout.commentsSidebarWidth;
    }
    
    return Math.max(availableWidth, 600);
  }, [layout.adminSidebarVisible, layout.aiCopilotVisible, layout.commentsSidebarVisible, layout.adminSidebarWidth, layout.aiCopilotWidth, layout.commentsSidebarWidth]);


  useEffect(() => {
    const handleResize = () => {
      const availableWidth = window.innerWidth;
      const screenSize = getScreenSize(availableWidth);
      
      updateLayout({
        availableWidth,
        screenSize,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation
    
    return () => window.removeEventListener('resize', handleResize);
  }, [updateLayout]);

  const toggleAdminSidebar = useCallback(() => {
    const screenSize = getScreenSize(window.innerWidth);
    const shouldShow = screenSize === 'desktop' ? !layout.adminSidebarVisible : false;
    updateLayout({ adminSidebarVisible: shouldShow });
  }, [layout.adminSidebarVisible, updateLayout]);

  const toggleAICopilot = useCallback(() => {
    updateLayout({ aiCopilotVisible: !layout.aiCopilotVisible });
  }, [layout.aiCopilotVisible, updateLayout]);

  const toggleCommentsSidebar = useCallback(() => {
    updateLayout({ commentsSidebarVisible: !layout.commentsSidebarVisible });
  }, [layout.commentsSidebarVisible, updateLayout]);

  const setAICopilotVisible = useCallback((visible: boolean) => {
    updateLayout({ aiCopilotVisible: visible });
  }, [updateLayout]);

  const setCommentsSidebarVisible = useCallback((visible: boolean) => {
    updateLayout({ commentsSidebarVisible: visible });
  }, [updateLayout]);

  const value: LayoutContextType = useMemo(() => ({
    layout,
    toggleAdminSidebar,
    toggleAICopilot,
    toggleCommentsSidebar,
    setAICopilotVisible,
    setCommentsSidebarVisible,
    calculateEditorWidth,
  }), [layout, toggleAdminSidebar, toggleAICopilot, toggleCommentsSidebar, setAICopilotVisible, setCommentsSidebarVisible, calculateEditorWidth]);

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
