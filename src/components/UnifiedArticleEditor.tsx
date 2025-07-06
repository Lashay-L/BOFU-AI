import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArticleEditor } from './ArticleEditor';
import { toast } from 'react-hot-toast';
import { 
  unifiedArticleService, 
  UnifiedArticleContent, 
  UnifiedUserContext,
  UnifiedSaveResult 
} from '../lib/unifiedArticleApi';
import { useAdminCheck } from '../hooks/useAdminCheck';
import { realtimeCollaboration } from '../lib/realtimeCollaboration';


interface UnifiedArticleEditorProps {
  // Optional mode override for specific routing scenarios
  forceMode?: 'admin' | 'user';
}

export const UnifiedArticleEditor: React.FC<UnifiedArticleEditorProps> = ({ forceMode }) => {
  const params = useParams<{ id?: string; articleId?: string }>();
  const articleId = params.id || params.articleId;
  const navigate = useNavigate();
  const { isAdmin, loading: adminCheckLoading } = useAdminCheck();
  
  // State management
  const [article, setArticle] = useState<UnifiedArticleContent | null>(null);
  const [userContext, setUserContext] = useState<UnifiedUserContext | null>(null);
  const [permissions, setPermissions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollaborationReady, setIsCollaborationReady] = useState(false);
  
  // Ref for managing content update timeouts (to prevent excessive API calls)
  const contentUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine UI mode based on user permissions and route
  const uiMode = forceMode || (userContext?.isAdmin ? 'admin' : 'user');

  /**
   * Load article data using unified API
   */
  const loadArticle = useCallback(async () => {
    if (!articleId) {
      setError('Article ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await unifiedArticleService.loadArticle(articleId);
      
      if (!result.success) {
        setError(result.error || 'Failed to load article');
        
        // Redirect based on error type
        if (result.error?.includes('Access denied')) {
          toast.error('You do not have permission to access this article');
          navigate('/dashboard');
        } else if (result.error?.includes('not found')) {
          toast.error('Article not found');
          navigate('/dashboard');
        }
        return;
      }

      setArticle(result.data!);
      setUserContext(result.userContext!);
      setPermissions(result.permissions!);
      setHasUnsavedChanges(false);

    } catch (error) {
      console.error('Error loading article:', error);
      setError('Unexpected error loading article');
      toast.error('Failed to load article');
    } finally {
      setLoading(false);
    }
  }, [articleId, navigate]);

  /**
   * Save article using unified API with conflict resolution
   */
  const saveArticle = useCallback(async (
    content: string, 
    options: { 
      editingStatus?: UnifiedArticleContent['editing_status'];
      showToast?: boolean;
      isAutoSave?: boolean;
    } = {}
  ): Promise<UnifiedSaveResult> => {
    if (!articleId) {
      return { success: false, error: 'Article ID is required' };
    }

    console.log('💾 [UNIFIED EDITOR] Starting save:', {
      articleId,
      uiMode,
      contentLength: content?.length,
      userEmail: userContext?.email,
      isAdmin: userContext?.isAdmin,
      isAutoSave: options.isAutoSave,
      options
    });

    try {
      setSaving(true);
      
      const saveOptions = {
        editingStatus: options.editingStatus,
        conflictResolution: options.isAutoSave ? 'merge' as const : 'force' as const
      };

      const result = options.isAutoSave 
        ? await unifiedArticleService.autoSaveArticle(articleId, content)
        : await unifiedArticleService.saveArticle(articleId, content, saveOptions);

      console.log('💾 [UNIFIED EDITOR] Save result:', {
        success: result.success,
        version: result.data?.article_version,
        conflictDetected: result.conflictDetected,
        error: result.error
      });

      if (result.success) {
        setArticle(result.data!);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        
        console.log('✅ [UNIFIED EDITOR] Save completed successfully, article state updated');
        
        if (options.showToast !== false) {
          if (result.conflictDetected && result.resolvedConflict) {
            toast.success('Article saved (conflict resolved)');
          } else {
            toast.success(options.isAutoSave ? 'Auto-saved' : 'Article saved');
          }
        }
      } else {
        console.error('❌ [UNIFIED EDITOR] Save failed:', result.error);
        if (result.conflictDetected) {
          toast.error('Save conflict detected. Please refresh and try again.');
          // Optionally reload the article to get latest version
          await loadArticle();
        } else {
          toast.error(result.error || 'Failed to save article');
        }
      }

      return result;

    } catch (error) {
      console.error('❌ [UNIFIED EDITOR] Error saving article:', error);
      const errorMessage = 'Unexpected error saving article';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setSaving(false);
    }
  }, [articleId, loadArticle, uiMode, userContext]);



  /**
   * Handle status changes (admin/owner only)
   */
  const handleStatusChange = useCallback(async (status: UnifiedArticleContent['editing_status']) => {
    if (!articleId || !permissions?.canChangeStatus) {
      toast.error('You do not have permission to change article status');
      return;
    }

    try {
      const result = await unifiedArticleService.updateArticleStatus(articleId, status);
      
      if (result.success) {
        setArticle(result.data!);
        toast.success(`Article status changed to ${status}`);
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update article status');
    }
  }, [articleId, permissions]);

  /**
   * Auto-save functionality
   */
  const handleAutoSave = useCallback(async (content: string) => {
    if (!hasUnsavedChanges) return;
    
    await saveArticle(content, { 
      isAutoSave: true, 
      showToast: false 
    });
  }, [hasUnsavedChanges, saveArticle]);

  // Load article on mount
  useEffect(() => {
    if (!adminCheckLoading) {
      loadArticle();
    }
  }, [loadArticle, adminCheckLoading]);

  // Set up real-time collaboration
  useEffect(() => {
    if (!articleId || !userContext) return;

    const setupCollaboration = async () => {
      try {
        console.log('🔄 Setting up real-time collaboration for article:', articleId);
        
        // Join the article for real-time collaboration
        const userMetadata = {
          name: userContext.email?.split('@')[0] || 'Unknown',
          email: userContext.email,
        };
        
        await realtimeCollaboration.joinArticle(articleId, userMetadata);
        setIsCollaborationReady(true);
        
        console.log('✅ Real-time collaboration ready');
      } catch (error) {
        console.error('❌ Failed to setup collaboration:', error);
      }
    };

    setupCollaboration();

    // Subscribe to content changes
    const unsubscribeContentChange = realtimeCollaboration.onContentChange((payload) => {
      console.log('🔄 [UNIFIED EDITOR] Real-time content change detected:', {
        payload,
        currentArticleId: articleId,
        uiMode,
        payloadEventType: payload?.eventType,
        payloadTable: payload?.table,
        payloadSchema: payload?.schema
      });
      
      // Only process if this is a content_briefs table update for our article
      if (payload?.table === 'content_briefs' && payload?.new?.id === articleId) {
        console.log('✅ [UNIFIED EDITOR] Processing content change for our article:', {
          oldContent: payload?.old?.article_content?.substring(0, 100) + '...',
          newContent: payload?.new?.article_content?.substring(0, 100) + '...',
          contentChanged: payload?.old?.article_content !== payload?.new?.article_content
        });
        
        // Debounce content updates to prevent excessive API calls
        if (contentUpdateTimeoutRef.current) {
          clearTimeout(contentUpdateTimeoutRef.current);
          console.log('🔄 [UNIFIED EDITOR] Clearing previous timeout');
        }
        
        contentUpdateTimeoutRef.current = setTimeout(async () => {
          console.log('🔄 [UNIFIED EDITOR] Refreshing article content due to real-time update...');
          try {
            // Reload the article to get the latest content
            await loadArticle();
            console.log('✅ [UNIFIED EDITOR] Article reloaded successfully');
          } catch (error) {
            console.error('❌ [UNIFIED EDITOR] Failed to reload article after real-time update:', error);
          }
        }, 1500); // 1.5 second debounce
      } else {
        console.log('⏭️ [UNIFIED EDITOR] Ignoring content change - not for our article:', {
          payloadTable: payload?.table,
          payloadId: payload?.new?.id,
          ourArticleId: articleId
        });
      }
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up real-time collaboration');
      unsubscribeContentChange();
      realtimeCollaboration.leaveArticle();
      setIsCollaborationReady(false);
      
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
      }
    };
  }, [articleId, userContext, loadArticle]);

  // Loading states
  if (adminCheckLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading article...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-md">
          <h3 className="text-red-400 text-lg font-semibold mb-2">Error Loading Article</h3>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // No article loaded
  if (!article || !userContext) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">
          <p>Article not found or access denied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header with unified status and permissions */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-white">
              {article.title}
            </h1>
            
            {/* Mode indicator */}
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              uiMode === 'admin' 
                ? 'bg-red-900/30 text-red-400 border border-red-500/30' 
                : 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
            }`}>
              {uiMode === 'admin' ? 'Admin Mode' : 'User Mode'}
            </span>

            {/* Article status */}
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              article.editing_status === 'published' ? 'bg-green-900/30 text-green-400' :
              article.editing_status === 'review' ? 'bg-yellow-900/30 text-yellow-400' :
              'bg-gray-700 text-gray-300'
            }`}>
              {article.editing_status}
            </span>

            {/* Version indicator */}
            <span className="text-xs text-gray-500">
              v{article.article_version}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Save status */}
            {saving && (
              <span className="text-xs text-blue-400">Saving...</span>
            )}
            {hasUnsavedChanges && (
              <span className="text-xs text-yellow-400">Unsaved changes</span>
            )}
            {lastSaved && !hasUnsavedChanges && (
              <span className="text-xs text-green-400">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}

            {/* Status change controls (if user has permission) */}
            {permissions?.canChangeStatus && (
              <select
                value={article.editing_status}
                onChange={(e) => handleStatusChange(e.target.value as UnifiedArticleContent['editing_status'])}
                className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="editing">Editing</option>
                <option value="review">Review</option>
                <option value="final">Final</option>
                <option value="published">Published</option>
              </select>
            )}

            {/* Admin-specific controls */}
            {uiMode === 'admin' && permissions?.canDelete && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this article?')) {
                    // Implement delete functionality
                    toast.error('Delete functionality not yet implemented');
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 border border-red-500/30 rounded hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Permission indicators */}
        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
          <span>Permissions:</span>
          {permissions?.canEdit && <span className="text-green-400">Edit</span>}
          {permissions?.canChangeStatus && <span className="text-blue-400">Change Status</span>}
          {permissions?.canTransferOwnership && <span className="text-purple-400">Transfer</span>}
          {permissions?.canDelete && <span className="text-red-400">Delete</span>}
        </div>
      </div>

      {/* Article Editor */}
      <ArticleEditor
        key={`article-${article.id}-${article.article_version}`} // Force re-render on content updates
        articleId={articleId!}
        initialContent={article.content}
        onSave={(content) => saveArticle(content, { showToast: true })}
        onAutoSave={handleAutoSave}
        adminMode={uiMode === 'admin'}
        adminUser={userContext.isAdmin ? userContext as any : undefined}
        originalAuthor={article.user_id !== userContext.id ? { id: article.user_id } as any : undefined}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default UnifiedArticleEditor; 