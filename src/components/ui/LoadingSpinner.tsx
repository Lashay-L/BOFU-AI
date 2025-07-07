import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// Loading spinner variants using CVA
const spinnerVariants = cva(
  "flex items-center justify-center",
  {
    variants: {
      // 🎨 VARIANT TYPES - Multi-tier loading system
      variant: {
        // 🌟 INLINE - Simple spinner for buttons, forms
        inline: "inline-flex",
        
        // 📄 OVERLAY - Full screen overlay
        overlay: "fixed inset-0 z-40 bg-black bg-opacity-25 backdrop-blur-sm",
        
        // 🎪 MODAL - Modal-style loading (like ProcessingModal)
        modal: "fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm",
        
        // 📋 SECTION - Loading state for content sections
        section: "w-full py-12",
        
        // 🧩 SKELETON - Skeleton loading placeholder
        skeleton: "animate-pulse bg-gray-200 rounded"
      },
      
      // 📏 SIZE OPTIONS
      size: {
        xs: "w-4 h-4",
        sm: "w-6 h-6", 
        md: "w-8 h-8",
        lg: "w-12 h-12",
        xl: "w-16 h-16"
      },
      
      // 🎨 COLOR THEMES
      theme: {
        primary: "text-blue-600",
        secondary: "text-gray-600", 
        success: "text-green-600",
        warning: "text-yellow-600",
        danger: "text-red-600",
        white: "text-white",
        current: "text-current"
      }
    },
    defaultVariants: {
      variant: "inline",
      size: "md", 
      theme: "primary"
    }
  }
);

// Skeleton variants for placeholder loading
const skeletonVariants = cva(
  "animate-pulse bg-gray-200 rounded",
  {
    variants: {
      type: {
        text: "h-4 bg-gray-200",
        title: "h-6 bg-gray-200", 
        paragraph: "h-4 bg-gray-200 mb-2 last:mb-0",
        avatar: "rounded-full bg-gray-200",
        card: "h-32 bg-gray-200",
        button: "h-10 bg-gray-200 rounded-md"
      }
    },
    defaultVariants: {
      type: "text"
    }
  }
);

export interface LoadingSpinnerProps extends VariantProps<typeof spinnerVariants> {
  // Display options
  message?: string;
  showSpinner?: boolean;
  
  // Animation options  
  animationSpeed?: 'slow' | 'normal' | 'fast';
  
  // Overlay/Modal specific
  onCancel?: () => void;
  cancellable?: boolean;
  
  // Custom styling
  className?: string;
  spinnerClassName?: string;
  messageClassName?: string;
  
  // Accessibility
  'aria-label'?: string;
}

export interface SkeletonLoaderProps extends VariantProps<typeof skeletonVariants> {
  lines?: number;
  className?: string;
  width?: string | number;
  height?: string | number;
}

// 🎨 ANIMATION CONFIGURATIONS
const animationConfigs = {
  slow: { duration: 2 },
  normal: { duration: 1 },
  fast: { duration: 0.5 }
};

// 🌟 MAIN LOADING SPINNER COMPONENT
export function LoadingSpinner({
  variant = "inline",
  size = "md", 
  theme = "primary",
  message,
  showSpinner = true,
  animationSpeed = "normal",
  onCancel,
  cancellable = false,
  className,
  spinnerClassName,
  messageClassName,
  ...ariaProps
}: LoadingSpinnerProps) {
  
  const animationConfig = animationConfigs[animationSpeed];
  
  // 🎪 SPINNER ICON with Framer Motion animation
  const SpinnerIcon = () => (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration: animationConfig.duration,
        repeat: Infinity,
        ease: "linear"
      }}
      className={cn(
        spinnerVariants({ size, theme: showSpinner ? theme : undefined }),
        spinnerClassName
      )}
    >
      <Loader2 className="w-full h-full" />
    </motion.div>
  );
  
  // 📝 MESSAGE COMPONENT
  const MessageComponent = () => (
    message ? (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={cn(
          "text-sm font-medium",
          theme === 'white' ? "text-white" : "text-gray-700",
          messageClassName
        )}
      >
        {message}
      </motion.p>
    ) : null
  );
  
  // 🚫 CANCEL BUTTON (for overlay/modal variants)
  const CancelButton = () => (
    cancellable && onCancel ? (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onCancel}
        className="mt-4 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
      >
        Cancel
      </motion.button>
    ) : null
  );
  
  // 🎯 RENDER BASED ON VARIANT
  switch (variant) {
    case 'overlay':
    case 'modal':
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(spinnerVariants({ variant }), className)}
          {...ariaProps}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            {showSpinner && <SpinnerIcon />}
            <MessageComponent />
            <CancelButton />
          </div>
        </motion.div>
      );
      
    case 'section':
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(spinnerVariants({ variant }), className)}
          {...ariaProps}
        >
          <div className="flex flex-col items-center space-y-3">
            {showSpinner && <SpinnerIcon />}
            <MessageComponent />
          </div>
        </motion.div>
      );
      
    case 'inline':
    default:
      return (
        <span className={cn(spinnerVariants({ variant }), className)} {...ariaProps}>
          {showSpinner && <SpinnerIcon />}
          {message && (
            <span className={cn("ml-2 text-sm", messageClassName)}>
              {message}
            </span>
          )}
        </span>
      );
  }
}

// 🧩 SKELETON LOADER COMPONENT
export function SkeletonLoader({
  type = "text",
  lines = 1,
  className,
  width,
  height,
  ...props
}: SkeletonLoaderProps) {
  
  // 📐 DYNAMIC STYLING
  const style = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height })
  };
  
  if (type === 'paragraph' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.1 // Stagger animation
            }}
            className={cn(
              skeletonVariants({ type }),
              i === lines - 1 && "w-3/4", // Last line shorter
              className
            )}
            style={style}
            {...props}
          />
        ))}
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0.3 }}
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{
        duration: 1.5,
        repeat: Infinity
      }}
      className={cn(skeletonVariants({ type }), className)}
      style={style}
      {...props}
    />
  );
}

// 🎨 PREDEFINED SKELETON PATTERNS
export const SkeletonPatterns = {
  // 📄 ARTICLE CARD
  ArticleCard: () => (
    <div className="p-4 space-y-3">
      <SkeletonLoader type="title" width="75%" />
      <SkeletonLoader type="paragraph" lines={3} />
      <div className="flex items-center space-x-2">
        <SkeletonLoader type="avatar" className="w-8 h-8" />
        <SkeletonLoader type="text" width="100px" />
      </div>
    </div>
  ),
  
  // 👤 USER PROFILE
  UserProfile: () => (
    <div className="flex items-center space-x-3">
      <SkeletonLoader type="avatar" className="w-12 h-12" />
      <div className="space-y-2">
        <SkeletonLoader type="title" width="120px" />
        <SkeletonLoader type="text" width="80px" />
      </div>
    </div>
  ),
  
  // 📊 DASHBOARD STATS
  DashboardStats: () => (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="p-4 space-y-2">
          <SkeletonLoader type="text" width="60%" />
          <SkeletonLoader type="title" width="40%" />
        </div>
      ))}
    </div>
  )
};

// Export spinner variants for external usage
export { spinnerVariants, skeletonVariants };

// 🪝 LOADING STATE HOOK
export function useLoadingState(initialLoading = false) {
  const [isLoading, setIsLoading] = React.useState(initialLoading);
  const [message, setMessage] = React.useState<string>();
  
  const startLoading = React.useCallback((loadingMessage?: string) => {
    setIsLoading(true);
    setMessage(loadingMessage);
  }, []);
  
  const stopLoading = React.useCallback(() => {
    setIsLoading(false);
    setMessage(undefined);
  }, []);
  
  const updateMessage = React.useCallback((newMessage: string) => {
    setMessage(newMessage);
  }, []);
  
  return {
    isLoading,
    message,
    startLoading,
    stopLoading,
    updateMessage,
    // For backward compatibility
    setIsLoading,
    setMessage
  };
} 