import { useCallback, useRef, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';

interface AutoSaveOptions {
  delay?: number;
  maxWait?: number;
  onSave: (content: string) => Promise<void>;
  enabled?: boolean;
}

interface AutoSaveHook {
  triggerAutoSave: (content: string) => void;
  forceSave: (content: string) => Promise<void>;
  cancelPendingSave: () => void;
  hasPendingSave: boolean;
}

/**
 * Optimized auto-save hook with intelligent debouncing
 * 
 * Features:
 * - Intelligent delay (shorter for small changes, longer for large changes)
 * - Maximum wait time to ensure saves don't get delayed indefinitely
 * - Force save option for critical moments
 * - Pending save tracking
 * - Cleanup on unmount
 */
export const useOptimizedAutoSave = ({
  delay = 2000,
  maxWait = 10000,
  onSave,
  enabled = true,
}: AutoSaveOptions): AutoSaveHook => {
  const pendingSaveRef = useRef(false);
  const lastContentRef = useRef<string>('');
  const saveCountRef = useRef(0);

  // Create intelligent debounced save function
  const debouncedSave = useMemo(() => {
    return debounce(
      async (content: string) => {
        if (!enabled || content === lastContentRef.current) {
          pendingSaveRef.current = false;
          return;
        }

        try {
          pendingSaveRef.current = true;
          console.log('💾 Auto-saving content...', {
            contentLength: content.length,
            saveCount: saveCountRef.current + 1,
          });

          await onSave(content);
          lastContentRef.current = content;
          saveCountRef.current += 1;

          console.log('✅ Auto-save completed successfully');
        } catch (error) {
          console.error('❌ Auto-save failed:', error);
        } finally {
          pendingSaveRef.current = false;
        }
      },
      delay,
      {
        maxWait,
        leading: false,
        trailing: true,
      }
    );
  }, [delay, maxWait, onSave, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
      pendingSaveRef.current = false;
    };
  }, [debouncedSave]);

  // Trigger auto-save with intelligent delay adjustment
  const triggerAutoSave = useCallback(
    (content: string) => {
      if (!enabled || content === lastContentRef.current) {
        return;
      }

      // Calculate content change size for intelligent delay
      const contentChange = Math.abs(content.length - lastContentRef.current.length);
      const isLargeChange = contentChange > 100; // Significant content change
      
      // Cancel previous pending save
      debouncedSave.cancel();
      
      // Adjust delay based on change size
      if (isLargeChange) {
        // For large changes, save more aggressively (shorter delay)
        setTimeout(() => debouncedSave(content), delay / 2);
      } else {
        // For small changes, use normal delay
        debouncedSave(content);
      }
    },
    [debouncedSave, delay, enabled]
  );

  // Force immediate save (bypasses debouncing)
  const forceSave = useCallback(
    async (content: string): Promise<void> => {
      if (!enabled) return;

      // Cancel any pending debounced save
      debouncedSave.cancel();
      pendingSaveRef.current = false;

      if (content === lastContentRef.current) {
        return; // No changes to save
      }

      try {
        pendingSaveRef.current = true;
        console.log('🚀 Force saving content...', {
          contentLength: content.length,
        });

        await onSave(content);
        lastContentRef.current = content;
        saveCountRef.current += 1;

        console.log('✅ Force save completed successfully');
      } catch (error) {
        console.error('❌ Force save failed:', error);
        throw error; // Re-throw for caller to handle
      } finally {
        pendingSaveRef.current = false;
      }
    },
    [debouncedSave, onSave, enabled]
  );

  // Cancel any pending save
  const cancelPendingSave = useCallback(() => {
    debouncedSave.cancel();
    pendingSaveRef.current = false;
  }, [debouncedSave]);

  return {
    triggerAutoSave,
    forceSave,
    cancelPendingSave,
    hasPendingSave: pendingSaveRef.current,
  };
};