import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { performanceMonitor } from '../utils/performanceMonitor';
import { virtualRendering, VirtualRenderingConfig } from '../utils/virtualRendering';

interface UsePerformanceOptimizationOptions {
  editor?: Editor | null;
  config?: Partial<VirtualRenderingConfig>;
  enableMonitoring?: boolean;
  documentSizeThreshold?: number; // Threshold for enabling optimizations
  measurementInterval?: number; // How often to measure performance (ms)
}

interface PerformanceOptimizationState {
  isOptimized: boolean;
  documentSize: number;
  lastMeasurement: Date | null;
  warnings: string[];
  recommendations: string[];
  statistics: any;
}

export const usePerformanceOptimization = (
  options: UsePerformanceOptimizationOptions = {}
) => {
  const {
    editor,
    config = {},
    enableMonitoring = true,
    documentSizeThreshold = 50000, // 50k characters
    measurementInterval = 5000 // 5 seconds
  } = options;

  const editorElementRef = useRef<HTMLElement | null>(null);
  const measurementIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<PerformanceOptimizationState>({
    isOptimized: false,
    documentSize: 0,
    lastMeasurement: null,
    warnings: [],
    recommendations: [],
    statistics: null
  });

  // Initialize performance monitoring
  useEffect(() => {
    if (enableMonitoring) {
      performanceMonitor.startMonitoring();
      return () => {
        performanceMonitor.stopMonitoring();
      };
    }
  }, [enableMonitoring]);

  // Get editor element and set up virtual rendering
  useEffect(() => {
    if (!editor) return;

    // Find the editor element
    const editorDom = editor.view.dom;
    const editorContainer = editorDom.closest('.border') as HTMLElement; // ArticleEditor container
    
    if (editorContainer) {
      editorElementRef.current = editorContainer;
      
      // Initialize virtual rendering
      virtualRendering.initialize(editorContainer);
      
      console.log('Performance optimization initialized for editor');
    }

    return () => {
      virtualRendering.cleanup();
    };
  }, [editor]);

  // Set up periodic performance measurements
  useEffect(() => {
    if (!enableMonitoring || !editorElementRef.current) return;

    const measurePerformance = () => {
      if (!editorElementRef.current || !editor) return;

      // Measure document size
      const documentSize = editorElementRef.current.textContent?.length || 0;
      
      // Record measurement
      performanceMonitor.recordMeasurement(editorElementRef.current);
      
      // Check for warnings
      const warnings = performanceMonitor.checkPerformanceThresholds();
      
      // Get recommendations
      const recommendations = virtualRendering.getPerformanceRecommendations(documentSize);
      
      // Get statistics
      const statistics = performanceMonitor.getStatistics();
      
      // Update state
      setState(prevState => ({
        ...prevState,
        documentSize,
        lastMeasurement: new Date(),
        warnings: warnings || [],
        recommendations,
        statistics
      }));

      // Apply optimizations if needed
      if (documentSize > documentSizeThreshold && !state.isOptimized) {
        applyOptimizations(documentSize);
      }
    };

    // Initial measurement
    measurePerformance();

    // Set up interval
    measurementIntervalRef.current = setInterval(measurePerformance, measurementInterval);

    return () => {
      if (measurementIntervalRef.current) {
        clearInterval(measurementIntervalRef.current);
      }
    };
  }, [editor, enableMonitoring, measurementInterval, documentSizeThreshold, state.isOptimized]);

  // Apply performance optimizations based on document size
  const applyOptimizations = useCallback((documentSize: number) => {
    if (!editorElementRef.current) return;

    const container = editorElementRef.current;
    
    // Add performance optimization CSS classes
    container.classList.add('performance-optimized-container');
    
    // Determine device type and add appropriate classes
    const width = window.innerWidth;
    if (width < 768) {
      container.classList.add('performance-optimized-mobile');
    } else if (width < 1024) {
      container.classList.add('performance-optimized-tablet');
    } else {
      container.classList.add('performance-optimized-desktop');
    }

    // Apply large document optimizations if needed
    if (documentSize > 100000) { // 100k characters
      container.classList.add('editor-large-document');
      virtualRendering.optimizeForLargeDocument();
    }

    // Apply performance-optimized class to content blocks
    const blocks = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, blockquote, pre, table, img');
    blocks.forEach((block) => {
      const element = block as HTMLElement;
      if (element.textContent && element.textContent.length > 500) {
        element.classList.add('performance-optimized-block');
      }
      
      // Specific optimizations for different element types
      if (block.tagName === 'TABLE') {
        block.classList.add('performance-optimized-table');
      } else if (block.tagName === 'IMG') {
        block.classList.add('performance-optimized-image');
      }
    });

    setState(prevState => ({ ...prevState, isOptimized: true }));
    console.log(`Performance optimizations applied for document size: ${documentSize}`);
  }, []);

  // Remove performance optimizations
  const removeOptimizations = useCallback(() => {
    if (!editorElementRef.current) return;

    const container = editorElementRef.current;
    
    // Remove performance optimization CSS classes
    container.classList.remove(
      'performance-optimized-container',
      'performance-optimized-mobile',
      'performance-optimized-tablet',
      'performance-optimized-desktop',
      'editor-large-document'
    );

    // Remove optimizations from content blocks
    const blocks = container.querySelectorAll('.performance-optimized-block, .performance-optimized-table, .performance-optimized-image');
    blocks.forEach((block) => {
      block.classList.remove('performance-optimized-block', 'performance-optimized-table', 'performance-optimized-image');
    });

    setState(prevState => ({ ...prevState, isOptimized: false }));
    console.log('Performance optimizations removed');
  }, []);

  // Manually trigger performance measurement
  const measurePerformance = useCallback(() => {
    if (!editorElementRef.current || !editor) return null;

    const measureId = Date.now().toString();
    
    // Start render measurement
    performanceMonitor.startRenderMeasure(measureId);
    
    // Force a re-render or operation
    editor.view.updateState(editor.view.state);
    
    // End render measurement
    performanceMonitor.endRenderMeasure(measureId);
    
    // Record full measurement
    performanceMonitor.recordMeasurement(editorElementRef.current);
    
    return performanceMonitor.getCurrentMetric();
  }, [editor]);

  // Get detailed performance report
  const getPerformanceReport = useCallback(() => {
    return {
      ...state,
      optimizationStatus: virtualRendering.getOptimizationStatus(),
      performanceData: performanceMonitor.exportPerformanceData(),
      config: virtualRendering.getOptimizationStatus()
    };
  }, [state]);

  // Enable debug mode (visual indicators)
  const enableDebugMode = useCallback(() => {
    if (!editorElementRef.current) return;

    editorElementRef.current.classList.add('performance-debug');
    
    const blocks = editorElementRef.current.querySelectorAll('.performance-optimized-block');
    blocks.forEach(block => {
      block.classList.add('performance-debug');
    });
  }, []);

  // Disable debug mode
  const disableDebugMode = useCallback(() => {
    if (!editorElementRef.current) return;

    editorElementRef.current.classList.remove('performance-debug');
    
    const blocks = editorElementRef.current.querySelectorAll('.performance-debug');
    blocks.forEach(block => {
      block.classList.remove('performance-debug');
    });
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    applyOptimizations,
    removeOptimizations,
    measurePerformance,
    getPerformanceReport,
    enableDebugMode,
    disableDebugMode,
    
    // Utilities
    editorElement: editorElementRef.current
  };
};

/**
 * Custom hook for debouncing values to prevent excessive operations
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

/**
 * Custom hook for optimized session storage operations
 */
export const useOptimizedSessionStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading from sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Debounce storage operations to prevent excessive I/O
  const debouncedValue = useDebounce(storedValue, 300);

  // Memoized setter function
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Effect to sync debounced value to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(debouncedValue));
    } catch (error) {
      console.error(`Error writing to sessionStorage key "${key}":`, error);
    }
  }, [key, debouncedValue]);

  return [storedValue, setValue] as const;
};

/**
 * Custom hook for stable callback references to prevent unnecessary re-renders
 */
export const useStableCallback = <T extends (...args: any[]) => any>(callback: T): T => {
  const callbackRef = useRef<T>(callback);
  
  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Return stable callback that calls the current ref
  return useCallback((...args: any[]) => {
    return callbackRef.current(...args);
  }, []) as T;
};

/**
 * Custom hook for memoized computed values with dependency optimization
 */
export const useComputedValue = <T>(
  computeFn: () => T, 
  deps: React.DependencyList
): T => {
  return useMemo(computeFn, deps);
};

/**
 * Custom hook for batched state updates to reduce re-renders
 */
export const useBatchedState = <T>(initialState: T) => {
  const [state, setState] = useState<T>(initialState);
  const batchedUpdates = useRef<Partial<T>[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((updates: Partial<T>) => {
    batchedUpdates.current.push(updates);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(prevState => {
        let newState = { ...prevState };
        batchedUpdates.current.forEach(update => {
          newState = { ...newState, ...update };
        });
        batchedUpdates.current = [];
        return newState;
      });
    }, 16); // 16ms for ~60fps batching
  }, []);

  const setStateValue = useCallback((newState: T | ((prev: T) => T)) => {
    if (typeof newState === 'function') {
      setState(newState as (prev: T) => T);
    } else {
      setState(newState);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, setStateValue, batchUpdate] as const;
};

/**
 * Custom hook for performance monitoring and optimization hints
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;
    
    // Only log in development and if renders are frequent
    if (process.env.NODE_ENV === 'development' && timeSinceLastRender < 100) {
      console.warn(`${componentName} rendered ${renderCount.current} times (${timeSinceLastRender}ms since last render)`);
    }
  });

  return {
    renderCount: renderCount.current,
    resetCount: () => { renderCount.current = 0; }
  };
};

/**
 * Custom hook for optimized array operations with memoization
 */
export const useOptimizedArray = <T>(
  array: T[], 
  keyExtractor: (item: T, index: number) => string | number
) => {
  const memoizedArray = useMemo(() => array, [array]);
  
  const arrayMap = useMemo(() => {
    const map = new Map<string | number, T>();
    memoizedArray.forEach((item, index) => {
      map.set(keyExtractor(item, index), item);
    });
    return map;
  }, [memoizedArray, keyExtractor]);

  const getItem = useCallback((key: string | number) => {
    return arrayMap.get(key);
  }, [arrayMap]);

  const findItem = useCallback((predicate: (item: T, index: number) => boolean) => {
    return memoizedArray.find(predicate);
  }, [memoizedArray]);

  return {
    array: memoizedArray,
    getItem,
    findItem,
    length: memoizedArray.length,
    isEmpty: memoizedArray.length === 0
  };
};

export default {
  useDebounce,
  useOptimizedSessionStorage,
  useStableCallback,
  useComputedValue,
  useBatchedState,
  usePerformanceMonitor,
  useOptimizedArray
}; 