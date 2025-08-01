import { supabase, supabaseAdmin } from './supabase';
import { auditLogger } from './auditLogger';
import { toast } from 'react-hot-toast';
import { deleteAllCommentsForArticle } from './commentApi';
import { createVersionHistory } from './versionHistoryApi';

// Unified types for article operations
export interface UnifiedArticleContent {
  id: string;
  title: string;
  content: string;
  editing_status: 'draft' | 'editing' | 'review' | 'final' | 'published';
  last_edited_at: string;
  last_edited_by: string;
  article_version: number;
  user_id: string;
  product_name?: string;
  created_at: string;
  updated_at: string;
  google_doc_url?: string;
}

export interface UnifiedUserContext {
  id: string;
  email: string | undefined;
  isAdmin: boolean;
  adminRole?: 'admin' | 'super_admin';
  permissions?: string[];
}

export interface UnifiedSaveOptions {
  editingStatus?: UnifiedArticleContent['editing_status'];
  createVersion?: boolean;
  adminNote?: string;
  conflictResolution?: 'force' | 'merge' | 'abort';
}

export interface UnifiedSaveResult {
  success: boolean;
  data?: UnifiedArticleContent;
  error?: string;
  conflictDetected?: boolean;
  resolvedConflict?: boolean;
  versionNumber?: number;
}

export interface UnifiedLoadResult {
  success: boolean;
  data?: UnifiedArticleContent;
  error?: string;
  userContext?: UnifiedUserContext;
  permissions?: {
    canEdit: boolean;
    canChangeStatus: boolean;
    canTransferOwnership: boolean;
    canDelete: boolean;
  };
}

/**
 * Unified Article API Service
 * Handles both user and admin access with consistent data operations
 */
export class UnifiedArticleService {
  
  /**
   * Get current user context with permissions
   */
  private async getUserContext(): Promise<UnifiedUserContext | null> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return null;
      }

      // Check if user is admin (with proper error handling for regular users)
      let adminProfile = null;
      try {
        const { data: adminData, error: adminError } = await supabase
          .from('admin_profiles')
          .select('id, email, role, permissions')
          .eq('id', user.id)
          .maybeSingle();
        
        if (adminData && !adminError) {
          adminProfile = adminData;
        } else if (adminError && 
                   !(adminError.code === 'PGRST116' || adminError.code === '406' || 
                     adminError.message?.includes('406') || adminError.message?.includes('Not Acceptable'))) {
          // Only log unexpected errors, not normal "user not found" errors
          console.error('Unexpected admin profile error:', adminError);
        }
      } catch (adminProfileError) {
        // Regular users can't access admin_profiles table due to RLS - this is expected
        if (adminProfileError && typeof adminProfileError === 'object' && 'code' in adminProfileError && 
            !(adminProfileError.code === 'PGRST116' || adminProfileError.code === '406')) {
          console.error('Unexpected admin profile exception:', adminProfileError);
        }
      }

      return {
        id: user.id,
        email: user.email,
        isAdmin: !!adminProfile,
        adminRole: adminProfile?.role as 'admin' | 'super_admin' | undefined,
        permissions: adminProfile?.permissions || []
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return null;
    }
  }

  /**
   * Check if user can access article
   */
  private async canAccessArticle(articleId: string, userContext: UnifiedUserContext): Promise<boolean> {
    try {
      // Admin can access any article
      if (userContext.isAdmin) {
        return true;
      }

      // For regular users, rely on RLS policies to determine access
      // RLS policies handle company-based access and admin assignments
      const { data: article, error } = await supabase
        .from('content_briefs')
        .select('user_id')
        .eq('id', articleId)
        .single();

      // If RLS allows the query to succeed, user has access
      // If RLS blocks access, the query will return null or error
      return !error && !!article;
    } catch (error) {
      console.error('Error checking article access:', error);
      return false;
    }
  }

  /**
   * Get user permissions for an article
   */
  private getArticlePermissions(articleUserId: string, userContext: UnifiedUserContext) {
    const isOwner = articleUserId === userContext.id;
    const isAdmin = userContext.isAdmin;
    const isSuperAdmin = userContext.adminRole === 'super_admin';

    return {
      canEdit: isOwner || isAdmin,
      canChangeStatus: isOwner || isAdmin,
      canTransferOwnership: isSuperAdmin,
      canDelete: isSuperAdmin || (isAdmin && !isOwner)
    };
  }

  /**
   * Get the appropriate client based on user context
   */
  private getClient(userContext: UnifiedUserContext) {
    // Use admin client if user is admin AND supabaseAdmin is available
    if (userContext.isAdmin && supabaseAdmin) {
      return supabaseAdmin;
    }
    return supabase;
  }

  /**
   * Unified load article function
   */
  async loadArticle(articleId: string): Promise<UnifiedLoadResult> {
    try {
      const userContext = await this.getUserContext();
      if (!userContext) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check access permissions
      const canAccess = await this.canAccessArticle(articleId, userContext);
      if (!canAccess) {
        return {
          success: false,
          error: 'Access denied to this article'
        };
      }

      // Get appropriate client
      const client = this.getClient(userContext);
      
      const { data: article, error } = await client
        .from('content_briefs')
        .select(`
          id,
          product_name,
          article_content,
          editing_status,
          last_edited_at,
          last_edited_by,
          article_version,
          user_id,
          created_at,
          updated_at,
          google_doc_url
        `)
        .eq('id', articleId)
        .single();

      if (error) {
        console.error('Error loading article:', error);
        return {
          success: false,
          error: `Failed to load article: ${error.message}`
        };
      }

      if (!article) {
        return {
          success: false,
          error: 'Article not found'
        };
      }

      // Log access if admin
      if (userContext.isAdmin && article.user_id !== userContext.id) {
        await auditLogger.logAction(
          articleId,
          'view',
          `Admin ${userContext.email || 'unknown'} accessed article`,
          {
            admin_id: userContext.id,
            original_author: article.user_id,
            access_type: 'unified_load'
          }
        );
      }

      const unifiedArticle: UnifiedArticleContent = {
        id: article.id,
        title: article.product_name || 'Untitled',
        content: article.article_content || '',
        editing_status: article.editing_status || 'draft',
        last_edited_at: article.last_edited_at || article.updated_at,
        last_edited_by: article.last_edited_by || userContext.id,
        article_version: article.article_version || 1,
        user_id: article.user_id,
        product_name: article.product_name,
        created_at: article.created_at,
        updated_at: article.updated_at,
        google_doc_url: article.google_doc_url
      };

      const permissions = this.getArticlePermissions(article.user_id, userContext);

      return {
        success: true,
        data: unifiedArticle,
        userContext,
        permissions
      };

    } catch (error) {
      console.error('Unexpected error loading article:', error);
      return {
        success: false,
        error: 'Unexpected error occurred while loading article'
      };
    }
  }

  /**
   * Unified save article function with conflict resolution
   */
  async saveArticle(
    articleId: string, 
    content: string, 
    options: UnifiedSaveOptions = {}
  ): Promise<UnifiedSaveResult> {
    try {
      const userContext = await this.getUserContext();
      if (!userContext) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check access permissions
      const canAccess = await this.canAccessArticle(articleId, userContext);
      if (!canAccess) {
        return {
          success: false,
          error: 'Access denied to this article'
        };
      }

      // Get appropriate client
      const client = this.getClient(userContext);

      // Get current article for conflict detection
      const { data: currentArticle, error: fetchError } = await client
        .from('content_briefs')
        .select('article_version, editing_status, last_edited_at, last_edited_by, user_id')
        .eq('id', articleId)
        .single();

      if (fetchError) {
        return {
          success: false,
          error: `Failed to fetch current article: ${fetchError.message}`
        };
      }

      // Conflict detection: Check if article was modified by someone else recently
      const lastEditTime = new Date(currentArticle.last_edited_at).getTime();
      const now = Date.now();
      const timeSinceLastEdit = now - lastEditTime;
      
      // If article was edited by someone else in the last 5 seconds, it's a potential conflict
      const conflictDetected = 
        currentArticle.last_edited_by !== userContext.id && 
        timeSinceLastEdit < 5000;

      if (conflictDetected && options.conflictResolution === 'abort') {
        return {
          success: false,
          error: 'Conflict detected: Article was recently modified by another user',
          conflictDetected: true
        };
      }

      // Prepare update data
      const newVersion = (currentArticle?.article_version || 0) + 1;
      const editingStatus = options.editingStatus || 'editing';

      // Atomic update with version check to prevent race conditions
      const updateData = {
        article_content: content,
        editing_status: editingStatus,
        last_edited_at: new Date().toISOString(),
        last_edited_by: userContext.id,
        article_version: newVersion,
        updated_at: new Date().toISOString()
      };

      // Perform atomic update with version check
      const { data: updatedArticle, error: updateError } = await client
        .from('content_briefs')
        .update(updateData)
        .eq('id', articleId)
        .eq('article_version', currentArticle.article_version) // Optimistic locking
        .select(`
          id,
          product_name,
          article_content,
          editing_status,
          last_edited_at,
          last_edited_by,
          article_version,
          user_id,
          created_at,
          updated_at,
          google_doc_url
        `)
        .single();

      if (updateError) {
        // Check if it's a version conflict
        if (updateError.code === 'PGRST116') { // No rows returned (version mismatch)
          return {
            success: false,
            error: 'Save conflict: Article was modified by another user. Please refresh and try again.',
            conflictDetected: true
          };
        }

        return {
          success: false,
          error: `Failed to save article: ${updateError.message}`
        };
      }

      // Log save action
      const logMessage = userContext.isAdmin && currentArticle.user_id !== userContext.id
        ? `Admin ${userContext.email || 'unknown'} saved article`
        : 'Article saved';

      await auditLogger.logAction(
        articleId,
        'edit',
        logMessage,
        {
          admin_id: userContext.isAdmin ? userContext.id : undefined,
          original_author: currentArticle.user_id,
          new_version: newVersion,
          new_status: editingStatus,
          admin_note: options.adminNote,
          action_type: userContext.isAdmin ? 'unified_admin_save' : 'unified_user_save',
          conflict_detected: conflictDetected,
          conflict_resolved: conflictDetected && options.conflictResolution === 'force'
        }
      );

      const result: UnifiedArticleContent = {
        id: updatedArticle.id,
        title: updatedArticle.product_name || 'Untitled',
        content: updatedArticle.article_content || '',
        editing_status: updatedArticle.editing_status || 'draft',
        last_edited_at: updatedArticle.last_edited_at,
        last_edited_by: updatedArticle.last_edited_by,
        article_version: updatedArticle.article_version,
        user_id: updatedArticle.user_id,
        product_name: updatedArticle.product_name,
        created_at: updatedArticle.created_at,
        updated_at: updatedArticle.updated_at,
        google_doc_url: updatedArticle.google_doc_url
      };

      return {
        success: true,
        data: result,
        conflictDetected,
        resolvedConflict: conflictDetected && options.conflictResolution === 'force',
        versionNumber: newVersion
      };

    } catch (error) {
      console.error('Unexpected error saving article:', error);
      return {
        success: false,
        error: 'Unexpected error occurred while saving article'
      };
    }
  }

  /**
   * Auto-save with debouncing support
   */
  async autoSaveArticle(articleId: string, content: string): Promise<UnifiedSaveResult> {
    return this.saveArticle(articleId, content, {
      editingStatus: 'editing',
      conflictResolution: 'merge' // Auto-save is more forgiving
    });
  }

  /**
   * Update article status (admin/owner only)
   */
  async updateArticleStatus(
    articleId: string, 
    status: UnifiedArticleContent['editing_status']
  ): Promise<UnifiedSaveResult> {
    const userContext = await this.getUserContext();
    if (!userContext) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const loadResult = await this.loadArticle(articleId);
    if (!loadResult.success || !loadResult.permissions?.canChangeStatus) {
      return {
        success: false,
        error: 'Insufficient permissions to change article status'
      };
    }

    const client = this.getClient(userContext);
    
    const { data, error } = await client
      .from('content_briefs')
      .update({ 
        editing_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId)
      .select('*')
      .single();

    if (error) {
      return {
        success: false,
        error: `Failed to update status: ${error.message}`
      };
    }

    await auditLogger.logAction(
      articleId,
      'status_change',
      `Status changed to ${status}`,
      {
        admin_id: userContext.isAdmin ? userContext.id : undefined,
        old_status: loadResult.data?.editing_status,
        new_status: status
      }
    );

    return {
      success: true,
      data: {
        ...loadResult.data!,
        editing_status: status,
        updated_at: data.updated_at
      }
    };
  }

  /**
   * Get article status and metadata
   */
  async getArticleStatus(articleId: string): Promise<UnifiedLoadResult> {
    try {
      const userContext = await this.getUserContext();
      if (!userContext) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check access permissions
      const canAccess = await this.canAccessArticle(articleId, userContext);
      if (!canAccess) {
        return {
          success: false,
          error: 'Access denied to this article'
        };
      }

      const client = this.getClient(userContext);
      
      const { data, error } = await client
        .from('content_briefs')
        .select('editing_status, last_edited_at, last_edited_by, article_version, user_id, product_name, created_at, updated_at')
        .eq('id', articleId)
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to get article status: ${error.message}`
        };
      }

      const articleData: UnifiedArticleContent = {
        id: articleId,
        title: data.product_name || 'Untitled',
        content: '', // Status check doesn't need full content
        editing_status: data.editing_status || 'draft',
        last_edited_at: data.last_edited_at || '',
        last_edited_by: data.last_edited_by || '',
        article_version: data.article_version || 1,
        user_id: data.user_id,
        product_name: data.product_name,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      const permissions = this.getArticlePermissions(data.user_id, userContext);

      return {
        success: true,
        data: articleData,
        userContext,
        permissions
      };

    } catch (error) {
      console.error('Unexpected error getting article status:', error);
      return {
        success: false,
        error: 'Unexpected error occurred while getting article status'
      };
    }
  }

  /**
   * Create a manual version snapshot of an article
   */
  async createManualVersion(
    articleId: string,
    changeSummary?: string,
    versionTag: 'manual_save' | 'milestone' | 'published' | 'review' = 'manual_save'
  ): Promise<UnifiedSaveResult & { versionNumber?: number }> {
    try {
      const userContext = await this.getUserContext();
      if (!userContext) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Get the current article content
      const articleResult = await this.loadArticle(articleId);
      if (!articleResult.success || !articleResult.data) {
        return {
          success: false,
          error: `Failed to load article: ${articleResult.error}`
        };
      }

      const article = articleResult.data;

      // Check permissions
      if (!articleResult.permissions?.canEdit) {
        return {
          success: false,
          error: 'Insufficient permissions to create version for this article'
        };
      }

      // Create metadata
      const metadata = {
        title: article.product_name,
        editing_status: article.editing_status,
        content_length: article.content.length
      };

      // Create the version
      const versionResult = await createVersionHistory(
        articleId,
        article.content,
        metadata,
        changeSummary,
        versionTag
      );

      if (!versionResult.success || !versionResult.data) {
        return {
          success: false,
          error: `Failed to create version: ${versionResult.error}`
        };
      }

      // Log version creation
      await auditLogger.logAction(
        articleId,
        'version_create',
        `Manual version created: ${versionTag}`,
        {
          admin_id: userContext.isAdmin ? userContext.id : undefined,
          version_number: versionResult.data.version_number,
          version_tag: versionTag,
          change_summary: changeSummary
        }
      );

      return {
        success: true,
        data: article,
        versionNumber: versionResult.data.version_number
      };

    } catch (error) {
      console.error('Unexpected error creating manual version:', error);
      return {
        success: false,
        error: 'Unexpected error occurred while creating version'
      };
    }
  }

  /**
   * Helper function to extract image URLs from HTML content
   */
  private extractImageUrlsFromContent(content: string): string[] {
    const imageUrls: string[] = [];
    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    let match;
    
    while ((match = imgRegex.exec(content)) !== null) {
      imageUrls.push(match[1]);
    }
    
    return imageUrls;
  }

  /**
   * Delete article content and all related data (unified for both user and admin)
   */
  async deleteArticle(articleId: string): Promise<UnifiedSaveResult> {
    try {
      const userContext = await this.getUserContext();
      if (!userContext) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Check access permissions
      const canAccess = await this.canAccessArticle(articleId, userContext);
      if (!canAccess) {
        return {
          success: false,
          error: 'Access denied to this article'
        };
      }

      const client = this.getClient(userContext);

      console.log('🗑️ Clearing article content and all article metadata:', { 
        articleId, 
        userId: userContext.id, 
        isAdmin: userContext.isAdmin 
      });

      // First, get the article to verify existence and get metadata for cleanup
      const { data: articleData, error: fetchError } = await client
        .from('content_briefs')
        .select('id, product_name, user_id, article_content, link')
        .eq('id', articleId)
        .single();

      if (fetchError) {
        console.error('Error fetching article for deletion:', fetchError);
        return {
          success: false,
          error: `Article not found or access denied: ${fetchError.message}`
        };
      }

      if (!articleData) {
        return {
          success: false,
          error: 'Article not found or you do not have permission to delete it'
        };
      }

      // Check permissions for deletion
      const permissions = this.getArticlePermissions(articleData.user_id, userContext);
      if (!permissions.canDelete && articleData.user_id !== userContext.id) {
        return {
          success: false,
          error: 'Insufficient permissions to delete this article'
        };
      }

      // Delete related data first (comments, images, etc.)
      try {
        console.log('🔍 Starting comment cleanup process...');
        
        // Delete all comments for this article using the dedicated function
        const commentDeletionResult = await deleteAllCommentsForArticle(articleId);
        
        if (!commentDeletionResult.success) {
          console.warn('⚠️ Comment deletion had issues:', commentDeletionResult.error);
          // Continue with article deletion even if comment deletion fails
          if (commentDeletionResult.deletedCount === 0) {
            console.warn('❌ No comments were deleted, but continuing with article deletion');
          }
        } else {
          console.log(`✅ Successfully deleted ${commentDeletionResult.deletedCount} comments`);
        }

        // Delete article images and their metadata
        const { data: imageData, error: imagesError } = await client
          .from('article_images')
          .select('storage_path')
          .eq('article_id', articleId);

        if (imagesError) {
          console.warn('Warning: Could not fetch article images for cleanup:', imagesError);
        } else if (imageData && imageData.length > 0) {
          // Import the reliable deletion helper
          const { deleteFromStorageWithVerification } = await import('./storage');
          
          // Delete images from storage with verification
          const imagePaths = imageData.map(img => img.storage_path);
          console.log(`🖼️ Deleting ${imagePaths.length} article images...`);
          
          const { success: storageSuccess, errors: storageErrors } = await deleteFromStorageWithVerification(
            'article-images',
            imagePaths
          );

          if (!storageSuccess) {
            console.error('❌ Failed to delete some article images:', storageErrors);
            // Continue with metadata deletion even if some images failed
          } else {
            console.log('✅ Successfully deleted all article images from storage');
          }

          // Delete image metadata
          const { error: imageMetaError } = await client
            .from('article_images')
            .delete()
            .eq('article_id', articleId);

          if (imageMetaError) {
            console.warn('Warning: Could not delete image metadata:', imageMetaError);
          } else {
            console.log('✅ Successfully deleted article image metadata');
          }
        }

        // Also check article content for embedded images
        if (articleData.article_content) {
          const embeddedImageUrls = this.extractImageUrlsFromContent(articleData.article_content);
          const articleStorageImages = embeddedImageUrls.filter(url => 
            url.includes('article-images') || url.includes('media-library')
          );
          
          if (articleStorageImages.length > 0) {
            console.log(`🖼️ Found ${articleStorageImages.length} embedded images in article content`);
            
            // Extract paths from URLs
            const embeddedPaths = articleStorageImages.map(url => {
              try {
                const urlObj = new URL(url);
                const pathParts = urlObj.pathname.split('/');
                // Get the path after the bucket name
                const bucketIndex = pathParts.findIndex(part => 
                  part === 'article-images' || part === 'media-library'
                );
                if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
                  return pathParts.slice(bucketIndex + 1).join('/');
                }
                return null;
              } catch (e) {
                console.warn('Could not parse image URL:', url);
                return null;
              }
            }).filter(path => path !== null) as string[];

            if (embeddedPaths.length > 0) {
              // Import the reliable deletion helper
              const { deleteFromStorageWithVerification } = await import('./storage');
              
              // Try to delete from article-images bucket first
              const articleImagePaths = embeddedPaths.filter(path => !path.includes('media-library'));
              if (articleImagePaths.length > 0) {
                const { success, errors } = await deleteFromStorageWithVerification(
                  'article-images',
                  articleImagePaths
                );
                if (!success) {
                  console.warn('Failed to delete some embedded article images:', errors);
                }
              }
              
              // Note: We don't delete from media-library as those might be shared
              console.log('✅ Processed embedded image cleanup');
            }
          }
        }

        // Delete version history if it exists
        const { error: versionError } = await client
          .from('article_version_history')
          .delete()
          .eq('article_id', articleId);

        if (versionError) {
          console.warn('Warning: Could not delete version history:', versionError);
        }

      } catch (cleanupError) {
        console.warn('Warning: Some cleanup operations failed:', cleanupError);
        // Continue with main article content deletion even if cleanup fails
      }

      // Clear article content and all related metadata (reset to original brief state)
      const { error: updateError } = await client
        .from('content_briefs')
        .update({
          article_content: null,
          link: null,
          editing_status: null,
          last_edited_at: null,
          last_edited_by: null,
          article_version: null,
          current_version: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);

      if (updateError) {
        console.error('Error clearing article content:', updateError);
        return {
          success: false,
          error: `Failed to clear article content: ${updateError.message}`
        };
      }

      // Log successful deletion
      const logMessage = userContext.isAdmin && articleData.user_id !== userContext.id
        ? `Admin ${userContext.email || 'unknown'} cleared article content and metadata`
        : 'Article content and metadata cleared by user';

      await auditLogger.logAction(
        articleId,
        'delete',
        `${logMessage} for "${articleData.product_name}"`,
        {
          admin_id: userContext.isAdmin ? userContext.id : undefined,
          original_author: articleData.user_id,
          product_name: articleData.product_name,
          action_type: userContext.isAdmin ? 'unified_admin_delete' : 'unified_user_delete'
        }
      );

      console.log('✅ Article content and metadata cleared successfully:', articleId);

      return {
        success: true,
        data: {
          id: articleId,
          title: articleData.product_name || 'Untitled',
          content: '',
          editing_status: 'draft',
          last_edited_at: new Date().toISOString(),
          last_edited_by: userContext.id,
          article_version: 1,
          user_id: articleData.user_id,
          product_name: articleData.product_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Unexpected error clearing article content:', error);
      return {
        success: false,
        error: 'Unexpected error occurred while clearing article content'
      };
    }
  }
}

// Export singleton instance
export const unifiedArticleService = new UnifiedArticleService();

// Legacy compatibility functions
export const loadUnifiedArticleContent = unifiedArticleService.loadArticle.bind(unifiedArticleService);
export const saveUnifiedArticleContent = unifiedArticleService.saveArticle.bind(unifiedArticleService);
export const autoSaveUnifiedArticleContent = unifiedArticleService.autoSaveArticle.bind(unifiedArticleService);
export const getUnifiedArticleStatus = unifiedArticleService.getArticleStatus.bind(unifiedArticleService);
export const createUnifiedManualVersion = unifiedArticleService.createManualVersion.bind(unifiedArticleService);
export const deleteUnifiedArticle = unifiedArticleService.deleteArticle.bind(unifiedArticleService); 