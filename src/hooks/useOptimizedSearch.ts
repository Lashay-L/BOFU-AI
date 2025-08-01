import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { debounce } from 'lodash';

interface SearchOptions<T> {
  delay?: number;
  minQueryLength?: number;
  maxResults?: number;
  searchFn: (query: string, options?: any) => Promise<T[]>;
  cacheResults?: boolean;
  cacheTimeout?: number;
}

interface SearchResult<T> {
  results: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
}

interface SearchHook<T> {
  query: string;
  setQuery: (query: string) => void;
  results: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  clearResults: () => void;
  refetch: () => Promise<void>;
}

/**
 * Optimized search hook with intelligent debouncing and caching
 * 
 * Features:
 * - Intelligent debouncing (adapts to query length and typing speed)
 * - LRU cache for search results
 * - Automatic cleanup and cancellation
 * - Loading state management
 * - Error handling with retry capability
 * - Minimum query length validation
 */
export const useOptimizedSearch = <T>({
  delay = 300,
  minQueryLength = 2,
  maxResults = 50,
  searchFn,
  cacheResults = true,
  cacheTimeout = 300000, // 5 minutes
}: SearchOptions<T>): SearchHook<T> => {
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult<T>>({
    results: [],
    loading: false,
    error: null,
    hasMore: false,
    totalCount: 0,
  });

  // Cache management
  const cacheRef = useRef(new Map<string, { results: T[]; timestamp: number }>());
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef('');

  // Clean up expired cache entries
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;
    
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > cacheTimeout) {
        cache.delete(key);
      }
    }
  }, [cacheTimeout]);

  // Perform search operation
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim().length < minQueryLength) {
        setSearchResult({
          results: [],
          loading: false,
          error: null,
          hasMore: false,
          totalCount: 0,
        });
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Check cache first
      if (cacheResults) {
        cleanupCache();
        const cached = cacheRef.current.get(searchQuery);
        if (cached) {
          console.log('📋 Using cached search results for:', searchQuery);
          setSearchResult({
            results: cached.results,
            loading: false,
            error: null,
            hasMore: cached.results.length >= maxResults,
            totalCount: cached.results.length,
          });
          return;
        }
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      setSearchResult(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        console.log('🔍 Performing search for:', searchQuery);
        const startTime = performance.now();

        const results = await searchFn(searchQuery, {
          signal: abortControllerRef.current.signal,
          limit: maxResults,
        });

        const endTime = performance.now();
        console.log(`✅ Search completed in ${Math.round(endTime - startTime)}ms:`, {
          query: searchQuery,
          resultCount: results.length,
        });

        // Cache results if enabled
        if (cacheResults) {
          cacheRef.current.set(searchQuery, {
            results,
            timestamp: Date.now(),
          });
        }

        setSearchResult({
          results,
          loading: false,
          error: null,
          hasMore: results.length >= maxResults,
          totalCount: results.length,
        });

        lastQueryRef.current = searchQuery;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('🚫 Search request cancelled for:', searchQuery);
          return;
        }

        const errorMessage = error.message || 'Search failed';
        console.error('❌ Search error:', errorMessage);

        setSearchResult(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    },
    [searchFn, minQueryLength, maxResults, cacheResults, cleanupCache]
  );

  // Create intelligent debounced search
  const debouncedSearch = useMemo(() => {
    return debounce(performSearch, delay, {
      leading: false,
      trailing: true,
    });
  }, [performSearch, delay]);

  // Handle query changes
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);

      if (newQuery.trim().length < minQueryLength) {
        debouncedSearch.cancel();
        setSearchResult({
          results: [],
          loading: false,
          error: null,
          hasMore: false,
          totalCount: 0,
        });
        return;
      }

      // Intelligent delay adjustment based on query characteristics
      const isTypingFast = newQuery.length > lastQueryRef.current.length + 1;
      const hasSpaces = newQuery.includes(' ');
      
      if (isTypingFast && !hasSpaces) {
        // User is typing fast, wait longer
        debouncedSearch.cancel();
        setTimeout(() => debouncedSearch(newQuery), delay * 1.5);
      } else if (hasSpaces && newQuery.endsWith(' ')) {
        // User finished a word, search immediately
        debouncedSearch.cancel();
        setTimeout(() => debouncedSearch(newQuery.trim()), 100);
      } else {
        // Normal typing, use standard delay
        debouncedSearch(newQuery);
      }
    },
    [debouncedSearch, delay, minQueryLength]
  );

  // Clear results
  const clearResults = useCallback(() => {
    debouncedSearch.cancel();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setQuery('');
    setSearchResult({
      results: [],
      loading: false,
      error: null,
      hasMore: false,
      totalCount: 0,
    });
  }, [debouncedSearch]);

  // Refetch current query
  const refetch = useCallback(async () => {
    if (query.trim().length >= minQueryLength) {
      await performSearch(query);
    }
  }, [query, minQueryLength, performSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedSearch]);

  return {
    query,
    setQuery: handleQueryChange,
    results: searchResult.results,
    loading: searchResult.loading,
    error: searchResult.error,
    hasMore: searchResult.hasMore,
    totalCount: searchResult.totalCount,
    clearResults,
    refetch,
  };
};