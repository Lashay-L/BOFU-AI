import { useState, useCallback } from 'react';

interface MediaSelectionState {
  isOpen: boolean;
  mode: 'upload' | 'library';
}

interface UseMediaSelectionOptions {
  defaultMode?: 'upload' | 'library';
}

export const useMediaSelection = (options: UseMediaSelectionOptions = {}) => {
  const [state, setState] = useState<MediaSelectionState>({
    isOpen: false,
    mode: options.defaultMode || 'upload'
  });

  const openMediaSelector = useCallback((mode?: 'upload' | 'library') => {
    setState({
      isOpen: true,
      mode: mode || options.defaultMode || 'upload'
    });
  }, [options.defaultMode]);

  const closeMediaSelector = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  const setMode = useCallback((mode: 'upload' | 'library') => {
    setState(prev => ({
      ...prev,
      mode
    }));
  }, []);

  return {
    isOpen: state.isOpen,
    mode: state.mode,
    openMediaSelector,
    closeMediaSelector,
    setMode
  };
};