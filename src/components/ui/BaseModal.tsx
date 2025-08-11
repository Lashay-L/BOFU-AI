import React, { ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// Modal size variants
const modalVariants = cva(
  "relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all",
  {
    variants: {
      size: {
        sm: "max-w-md w-full",
        md: "max-w-lg w-full", 
        lg: "max-w-2xl w-full",
        xl: "max-w-4xl w-full",
        full: "max-w-6xl w-full h-[85vh]",
        chat: "w-[1200px] h-[700px]",
        auto: "w-auto"
      },
      theme: {
        light: "bg-white text-gray-900",
        dark: "bg-gray-800 text-white",
        gradient: "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white"
      }
    },
    defaultVariants: {
      size: "md",
      theme: "light"
    }
  }
);

// Animation presets based on the creative design phase
const animationPresets = {
  // 🎨 FADE_SCALE - Elegant entrance (most common)
  fade_scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  },
  
  // 🎨 SLIDE_UP - Mobile-friendly
  slide_up: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 }
  },
  
  // 🎨 SLIDE_RIGHT - Side panel style
  slide_right: {
    initial: { opacity: 0, x: 300 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 300 }
  },
  
  // 🎨 ZOOM - Dramatic entrance
  zoom: {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.5 }
  }
};

export interface BaseModalProps extends VariantProps<typeof modalVariants> {
  // Core modal state
  isOpen: boolean;
  onClose: () => void;
  
  // Content
  title?: string;
  children: ReactNode;
  
  // Behavior options
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  
  // Animation
  animation?: keyof typeof animationPresets;
  animationDuration?: number;
  
  // Styling
  overlayClassName?: string;
  contentClassName?: string;
  
  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;
  
  // Advanced
  initialFocus?: React.RefObject<HTMLElement>;
}

export function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  theme = "light",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  animation = "fade_scale",
  animationDuration = 0.2,
  overlayClassName,
  contentClassName,
  initialFocus,
  ...ariaProps
}: BaseModalProps) {
  
  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      onClose();
    }
  };

  const animationConfig = animationPresets[animation];
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={closeOnEscape ? onClose : () => {}}
        initialFocus={initialFocus}
        {...ariaProps}
      >
        {/* Backdrop overlay with animation */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div 
            className={cn(
              "fixed inset-0 bg-black bg-opacity-50",
              overlayClassName
            )}
            onClick={handleOverlayClick}
          />
        </Transition.Child>

        {/* Modal positioning container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            
            {/* Modal content with Framer Motion animation */}
            <Transition.Child
              as={Fragment}
              enter={`ease-out duration-${Math.round(animationDuration * 1000)}`}
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave={`ease-in duration-${Math.round(animationDuration * 1000)}`}
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <motion.div
                initial={animationConfig.initial}
                animate={animationConfig.animate}
                exit={animationConfig.exit}
                transition={{ duration: animationDuration }}
                className={cn(
                  modalVariants({ size, theme }),
                  contentClassName
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <Dialog.Panel className="w-full text-left align-middle">
                  
                  {/* Header with title and close button */}
                  {(title || showCloseButton) && (
                    <div className="flex items-center justify-between p-6 pb-4">
                      {title && (
                        <Dialog.Title 
                          as="h3" 
                          className="text-lg font-medium leading-6"
                        >
                          {title}
                        </Dialog.Title>
                      )}
                      
                      {showCloseButton && (
                        <button
                          type="button"
                          className={cn(
                            "rounded-md p-2 transition-colors hover:bg-opacity-75",
                            theme === 'light' ? "hover:bg-gray-100" : "hover:bg-gray-700"
                          )}
                          onClick={onClose}
                          aria-label="Close modal"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Modal content */}
                  <div className={cn(
                    "px-6",
                    (title || showCloseButton) ? "pb-6" : "py-6"
                  )}>
                    {children}
                  </div>
                  
                </Dialog.Panel>
              </motion.div>
            </Transition.Child>
            
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Export variants for external usage
export { modalVariants, animationPresets };

// Convenience hook for modal state management
export function useModalState(initialState = false) {
  const [isOpen, setIsOpen] = React.useState(initialState);
  
  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), []);
  
  return {
    isOpen,
    open,
    close,
    toggle,
    // For backward compatibility with existing modal patterns
    setIsOpen
  };
} 