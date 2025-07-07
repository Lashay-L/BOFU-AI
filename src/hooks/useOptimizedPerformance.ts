import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

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

/**
 * Custom hook for optimized useEffect with stable dependencies
 */
export const useOptimizedEffect = (
  effect: React.EffectCallback,
  deps: React.DependencyList
) => {
  const stableDeps = useMemo(() => deps, deps);
  useEffect(effect, stableDeps);
};

/**
 * Custom hook for preventing unnecessary re-renders with shallow comparison
 */
export const useShallowMemo = <T extends Record<string, any>>(obj: T): T => {
  const ref = useRef<T>(obj);
  
  return useMemo(() => {
    // Shallow comparison
    if (Object.keys(obj).length !== Object.keys(ref.current).length) {
      ref.current = obj;
      return obj;
    }
    
    for (const key in obj) {
      if (obj[key] !== ref.current[key]) {
        ref.current = obj;
        return obj;
      }
    }
    
    return ref.current;
  }, [obj]);
};

export default {
  useDebounce,
  useOptimizedSessionStorage,
  useStableCallback,
  useComputedValue,
  useBatchedState,
  usePerformanceMonitor,
  useOptimizedArray,
  useOptimizedEffect,
  useShallowMemo
}; 