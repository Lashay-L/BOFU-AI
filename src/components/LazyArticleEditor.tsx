import React, { Suspense, lazy } from 'react';
import { LoadingSpinner } from './ui/LoadingSpinner';

// Lazy load the heavy ArticleEditor component
const ArticleEditor = lazy(() => 
  import('./ArticleEditor').then(module => {
    console.log('✅ ArticleEditor module loaded successfully');
    return {
      default: module.ArticleEditor
    };
  }).catch(error => {
    console.error('❌ Failed to load ArticleEditor:', error);
    throw error;
  })
);

interface LazyArticleEditorProps {
  [key: string]: any; // Forward all props to the actual editor
}

// Error boundary component specifically for ArticleEditor
class ArticleEditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('ArticleEditor Error Boundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ArticleEditor Error Details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] bg-white border border-red-200 rounded-lg">
          <div className="text-center p-8">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Editor Loading Error</h3>
            <p className="text-gray-600 mb-4">
              The article editor failed to load properly.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * LazyArticleEditor - Code-split wrapper for ArticleEditor
 * 
 * Benefits:
 * - Reduces initial bundle size by ~500KB (TipTap extensions)
 * - Only loads editor dependencies when actually needed
 * - Shows loading state while editor is being loaded
 * - Maintains all original ArticleEditor functionality
 */
export const LazyArticleEditor: React.FC<LazyArticleEditorProps> = (props) => {
  return (
    <ArticleEditorErrorBoundary>
      <Suspense 
        fallback={
          <div className="flex items-center justify-center min-h-[400px] bg-white">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-600">Loading article editor...</p>
              <p className="text-sm text-gray-400 mt-2">Preparing rich text editing experience</p>
            </div>
          </div>
        }
      >
        <ArticleEditor {...props} />
      </Suspense>
    </ArticleEditorErrorBoundary>
  );
};

export default LazyArticleEditor;