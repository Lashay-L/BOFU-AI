import { supabase, supabaseAdmin } from './supabase';
import { auditLogger } from './auditLogger';
import { toast } from 'react-hot-toast';

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
          .single();
        
        if (adminData && !adminError) {
          adminProfile = adminData;
        }
      } catch (adminProfileError) {
        // Regular users can't access admin_profiles table due to RLS - this is expected
        console.log('Admin profile check failed (expected for regular users):', adminProfileError);
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
}

// Export singleton instance
export const unifiedArticleService = new UnifiedArticleService();

// Legacy compatibility functions
export const loadUnifiedArticleContent = unifiedArticleService.loadArticle.bind(unifiedArticleService);
export const saveUnifiedArticleContent = unifiedArticleService.saveArticle.bind(unifiedArticleService);
export const autoSaveUnifiedArticleContent = unifiedArticleService.autoSaveArticle.bind(unifiedArticleService); 