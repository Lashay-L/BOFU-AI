import { useState, useCallback } from 'react';

// 🎨 MODAL STATE HOOK
export interface UseModalStateOptions {
  initialOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface ModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setIsOpen: (open: boolean) => void;
}

export function useModalState(options: UseModalStateOptions = {}): ModalState {
  const { initialOpen = false, onOpen, onClose } = options;
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const setIsOpenCallback = useCallback((shouldOpen: boolean) => {
    if (shouldOpen) {
      open();
    } else {
      close();
    }
  }, [open, close]);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen: setIsOpenCallback
  };
}

// 🎪 ADVANCED MODAL STATE with data management
export interface UseAdvancedModalStateOptions<T = any> extends UseModalStateOptions {
  initialData?: T;
  onDataChange?: (data: T | undefined) => void;
}

export interface AdvancedModalState<T> extends ModalState {
  data: T | undefined;
  setData: (data: T | undefined) => void;
  openWithData: (data: T) => void;
  clearData: () => void;
}

export function useAdvancedModalState<T = any>(
  options: UseAdvancedModalStateOptions<T> = {}
): AdvancedModalState<T> {
  const { initialData, onDataChange } = options;
  const modalState = useModalState(options);
  const [data, setDataState] = useState<T | undefined>(initialData);

  const setData = useCallback((newData: T | undefined) => {
    setDataState(newData);
    onDataChange?.(newData);
  }, [onDataChange]);

  const openWithData = useCallback((newData: T) => {
    setData(newData);
    modalState.open();
  }, [setData, modalState]);

  const clearData = useCallback(() => {
    setData(undefined);
  }, [setData]);

  const close = useCallback(() => {
    modalState.close();
    clearData();
  }, [modalState, clearData]);

  return {
    ...modalState,
    close, // Override with data clearing
    data,
    setData,
    openWithData,
    clearData
  };
} 