import { useState, useEffect } from 'react';

export type Theme = 'light';

export const useTheme = () => {
  const [theme] = useState<Theme>('light');

  // Ensure dark class is always removed
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    // Clear any saved theme preference
    localStorage.removeItem('article-editor-theme');
  }, []);

  // Stub functions for backward compatibility
  const toggleTheme = () => {
    // No-op: theme is always light
  };

  const setThemeMode = (newTheme: Theme) => {
    // No-op: theme is always light
  };

  return { 
    theme, 
    toggleTheme, 
    setTheme: setThemeMode,
    isDark: false,
    isLight: true
  };
};