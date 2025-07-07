import React from 'react';
import toast, { ToastOptions, toast as hotToast } from 'react-hot-toast';
import { CheckCircle, AlertCircle, Info, X, Loader2 } from 'lucide-react';

// 🎨 ENHANCED TOAST TYPES
export type UnifiedToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';
export type ToastCategory = 'auth' | 'content' | 'admin' | 'data' | 'system';

// 🎨 ENHANCED TOAST OPTIONS
export interface UnifiedToastOptions extends Omit<ToastOptions, 'icon'> {
  description?: string;
  category?: ToastCategory;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  gradient?: boolean;
}

// 🎨 VISUAL DESIGN SYSTEM - Enhanced brand styling
const toastStyles = {
  success: {
    background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    color: 'white',
    border: '1px solid #059669',
    boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
    icon: CheckCircle
  },
  error: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white', 
    border: '1px solid #dc2626',
    boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
    icon: AlertCircle
  },
  info: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    border: '1px solid #2563eb', 
    boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)',
    icon: Info
  },
  warning: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: 'white',
    border: '1px solid #d97706',
    boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)', 
    icon: AlertCircle
  },
  loading: {
    background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    color: 'white',
    border: '1px solid #5b21b6',
    boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)',
    icon: Loader2
  }
};

// 🎨 CATEGORY-SPECIFIC MESSAGES
const categoryMessages = {
  auth: {
    signIn: { message: "Welcome back! 👋", type: 'success' as const },
    signOut: { message: "See you soon! 👋", type: 'success' as const },
    error: { message: "Authentication failed", type: 'error' as const }
  },
  content: {
    saved: { message: "Content saved! ✨", type: 'success' as const },
    published: { message: "Published successfully! 🚀", type: 'success' as const },
    deleted: { message: "Deleted successfully", type: 'success' as const }
  },
  admin: {
    userCreated: { message: "User created! 👤", type: 'success' as const },
    permissionChanged: { message: "Permissions updated", type: 'success' as const },
    systemMessage: { message: "System notification", type: 'info' as const }
  },
  data: {
    uploaded: { message: "Upload complete! 📁", type: 'success' as const },
    processed: { message: "Processing complete", type: 'success' as const },
    exported: { message: "Export ready! 📥", type: 'success' as const }
  },
  system: {
    maintenance: { message: "System maintenance scheduled", type: 'warning' as const },
    update: { message: "System updated successfully", type: 'success' as const },
    error: { message: "System error occurred", type: 'error' as const }
  }
};

// 🚫 ANTI-SPAM PROTECTION
const recentToasts = new Map<string, number>();
const SPAM_THRESHOLD = 3000; // 3 seconds

function isDuplicateToast(message: string): boolean {
  const now = Date.now();
  const lastShown = recentToasts.get(message);
  
  if (lastShown && (now - lastShown) < SPAM_THRESHOLD) {
    return true;
  }
  
  recentToasts.set(message, now);
  return false;
}

// 🎨 CUSTOM TOAST RENDERER
function createCustomToast(
  type: UnifiedToastType,
  message: string,
  options: UnifiedToastOptions = {}
): React.ReactElement {
  const { description, action, dismissible = true, gradient = true } = options;
  const style = toastStyles[type];
  const IconComponent = style.icon;
  
  return (
    <div
      className="flex items-start space-x-3 p-4 rounded-lg border max-w-md"
      style={{
        background: gradient ? style.background : '#ffffff',
        color: gradient ? style.color : '#1f2937',
        border: style.border,
        boxShadow: style.boxShadow
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {type === 'loading' ? (
          <div className="animate-spin">
            <IconComponent className="w-5 h-5" />
          </div>
        ) : (
          <IconComponent className="w-5 h-5" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
        {description && (
          <p className="text-xs opacity-90 mt-1">{description}</p>
        )}
        
        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs underline mt-2 hover:no-underline"
          >
            {action.label}
          </button>
        )}
      </div>
      
      {/* Close Button */}
      {dismissible && (
        <button
          onClick={() => hotToast.dismiss()}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// 🎯 MAIN UNIFIED TOAST HOOK
export function useUnifiedToast() {
  // 🌟 BASIC TOASTS (enhanced react-hot-toast)
  const showToast = React.useCallback((
    type: UnifiedToastType,
    message: string,
    options: UnifiedToastOptions = {}
  ) => {
    // Anti-spam protection
    if (isDuplicateToast(message)) {
      return;
    }
    
    const toastOptions: ToastOptions = {
      duration: 4000,
      position: 'top-right',
      ...options
    };
    
    const customToast = createCustomToast(type, message, options);
    
    switch (type) {
      case 'success':
        return toast.success(customToast, toastOptions);
      case 'error':
        return toast.error(customToast, toastOptions);
      case 'loading':
        return toast.loading(customToast, toastOptions);
      default:
        return toast(customToast, toastOptions);
    }
  }, []);

  // 🚀 CONVENIENCE METHODS
  const success = React.useCallback((message: string, options?: UnifiedToastOptions) => 
    showToast('success', message, options), [showToast]);
    
  const error = React.useCallback((message: string, options?: UnifiedToastOptions) => 
    showToast('error', message, options), [showToast]);
    
  const info = React.useCallback((message: string, options?: UnifiedToastOptions) => 
    showToast('info', message, options), [showToast]);
    
  const warning = React.useCallback((message: string, options?: UnifiedToastOptions) => 
    showToast('warning', message, options), [showToast]);
    
  const loading = React.useCallback((message: string, options?: UnifiedToastOptions) => 
    showToast('loading', message, options), [showToast]);

  // 🎪 CATEGORY-BASED TOASTS
  const category = React.useCallback((
    cat: ToastCategory,
    action: string,
    customMessage?: string,
    options?: UnifiedToastOptions
  ) => {
    const categoryGroup = categoryMessages[cat];
    if (categoryGroup) {
      const categoryAction = categoryGroup[action as keyof typeof categoryGroup];
      if (categoryAction) {
        const message = customMessage || categoryAction.message;
        return showToast(categoryAction.type, message, { category: cat, ...options });
      }
    }
    return showToast('info', customMessage || 'Action completed', { category: cat, ...options });
  }, [showToast]);

  // 🎯 PROMISE TOASTS
  const promise = React.useCallback(<T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    },
    options?: UnifiedToastOptions
  ): Promise<T> => {
    return toast.promise(
      promise,
      {
        loading: createCustomToast('loading', messages.loading, options),
        success: (data) => {
          const successMessage = typeof messages.success === 'function' 
            ? messages.success(data) 
            : messages.success;
          return createCustomToast('success', successMessage, options);
        },
        error: (err) => {
          const errorMessage = typeof messages.error === 'function' 
            ? messages.error(err) 
            : messages.error;
          return createCustomToast('error', errorMessage, options);
        }
      },
      {
        duration: 4000,
        position: 'top-right',
        ...options
      }
    );
  }, []);

  // 🎪 SPECIAL EFFECTS
  const celebration = React.useCallback((message: string) => {
    return showToast('success', message, {
      duration: 6000,
      description: '🎉 Congratulations!',
      gradient: true
    });
  }, [showToast]);

  // 🔧 DEVELOPER UTILS
  const debug = React.useCallback((data: any) => {
    const message = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    return showToast('info', `🐛 Debug: ${message}`, {
      duration: 8000,
      dismissible: true
    });
  }, [showToast]);

  // 🎮 CONTROL METHODS
  const dismiss = React.useCallback((toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }, []);

  const remove = React.useCallback((toastId: string) => {
    toast.remove(toastId);
  }, []);

  // 🎯 BACKWARD COMPATIBILITY ALIASES
  const notify = React.useCallback((
    type: UnifiedToastType,
    message: string,
    options?: UnifiedToastOptions
  ) => showToast(type, message, options), [showToast]);

  return {
    // 🌟 Main API
    showToast,
    success,
    error,
    info,
    warning,
    loading,
    
    // 🎪 Advanced Features
    category,
    promise,
    celebration,
    debug,
    
    // 🎮 Control
    dismiss,
    remove,
    
    // 🔄 Backward Compatibility
    notify,
    
    // 📊 Direct access to underlying toast
    toast: hotToast
  };
}

// 🎯 CONVENIENCE EXPORT for direct usage
export const unifiedToast = {
  success: (message: string, options?: UnifiedToastOptions) => 
    toast.success(createCustomToast('success', message, options)),
  error: (message: string, options?: UnifiedToastOptions) => 
    toast.error(createCustomToast('error', message, options)),
  info: (message: string, options?: UnifiedToastOptions) => 
    toast(createCustomToast('info', message, options)),
  warning: (message: string, options?: UnifiedToastOptions) => 
    toast(createCustomToast('warning', message, options)),
  loading: (message: string, options?: UnifiedToastOptions) => 
    toast.loading(createCustomToast('loading', message, options)),
  dismiss: toast.dismiss,
  remove: toast.remove
};

// Export types for external usage
export type { ToastOptions }; 