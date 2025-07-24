import { supabase } from './supabase';
import { deleteFromStorageWithVerification, ARTICLE_IMAGES_BUCKET } from './storage';

/**
 * Clear content brief data while preserving generated articles
 * This function handles:
 * - Clearing only the content brief fields (brief_content, brief_content_text, internal_links, possible_article_titles)
 * - Preserving the generated article content and version history
 * - Only deleting images associated with the brief, not the article
 */
export async function clearContentBriefData(briefId: string): Promise<{
  success: boolean;
  error?: string;
  clearedImages?: string[];
}> {
  try {
    console.log('🧹 Starting content brief data clearing (preserving article) for ID:', briefId);

    // Get current user for authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to clear content brief data'
      };
    }

    // First, get the content brief to check ownership
    const { data: contentBrief, error: fetchError } = await supabase
      .from('content_briefs')
      .select('id, user_id, title, product_name, article_content, brief_content')
      .eq('id', briefId)
      .single();

    if (fetchError) {
      console.error('Error fetching content brief for clearing:', fetchError);
      if (fetchError.code === 'PGRST116') {
        return {
          success: false,
          error: 'Content brief not found'
        };
      }
      return {
        success: false,
        error: `Failed to fetch content brief: ${fetchError.message}`
      };
    }

    // Check if user is an admin
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id, admin_role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = !!adminProfile;

    // Check permissions (user owns the brief or is admin)
    if (!isAdmin && contentBrief.user_id !== user.id) {
      console.warn('User does not have permission to clear this content brief', {
        briefUserId: contentBrief.user_id,
        currentUser: user.id,
        isAdmin: false
      });
      return {
        success: false,
        error: 'You can only clear content briefs that you created'
      };
    }

    if (isAdmin) {
      console.log('🔓 Admin user detected, allowing clearing of any content brief');
    }

    // Check if there's an article - warn user if they're about to clear brief data on an article
    if (contentBrief.article_content && contentBrief.article_content.trim()) {
      console.log('⚠️ This record contains a generated article - only clearing brief data, preserving article');
    }

    // Find images that are only in the brief content (not in article content)
    const briefImages: string[] = [];
    if (contentBrief.brief_content && Object.keys(contentBrief.brief_content).length > 0) {
      try {
        const briefContentStr = typeof contentBrief.brief_content === 'string' 
          ? contentBrief.brief_content 
          : JSON.stringify(contentBrief.brief_content);
        
        const imageUrlPattern = new RegExp(`https://[^\\s"']+${ARTICLE_IMAGES_BUCKET}/[^\\s"']+`, 'g');
        const briefImageUrls = briefContentStr.match(imageUrlPattern) || [];
        
        // Only delete images that are in brief content but NOT in article content
        briefImageUrls.forEach(url => {
          const pathMatch = url.match(new RegExp(`${ARTICLE_IMAGES_BUCKET}/(.+)`));
          if (pathMatch && pathMatch[1]) {
            const path = pathMatch[1];
            // Only add if not in article content
            if (!contentBrief.article_content || !contentBrief.article_content.includes(url)) {
              briefImages.push(path);
            }
          }
        });
      } catch (error) {
        console.warn('Could not extract images from brief content:', error);
      }
    }

    // Delete brief-only images from storage
    let clearedImages: string[] = [];
    if (briefImages.length > 0) {
      console.log(`🧹 Cleaning up ${briefImages.length} brief-only images from storage`);
      
      const { success: storageSuccess, errors: storageErrors, deletedFiles } = 
        await deleteFromStorageWithVerification(ARTICLE_IMAGES_BUCKET, briefImages);

      if (storageErrors && storageErrors.length > 0) {
        console.warn('Some brief images could not be deleted from storage:', storageErrors);
      }

      clearedImages = deletedFiles;
      console.log(`✅ Successfully deleted ${clearedImages.length} brief-only images from storage`);
    }

    // Clear only the content brief fields, preserving article content and metadata
    const { error: updateError } = await supabase
      .from('content_briefs')
      .update({
        brief_content: {}, // Use empty object instead of null due to NOT NULL constraint
        brief_content_text: null,
        internal_links: null, 
        possible_article_titles: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', briefId);

    if (updateError) {
      console.error('Error clearing content brief data:', updateError);
      if (updateError.code === '42501') {
        return {
          success: false,
          error: 'You do not have permission to clear this content brief'
        };
      }
      return {
        success: false,
        error: `Failed to clear content brief data: ${updateError.message}`
      };
    }

    console.log('✅ Content brief data clearing completed successfully');
    console.log('📊 Clearing summary:', {
      briefId,
      briefTitle: contentBrief.title || contentBrief.product_name,
      clearedImages: clearedImages.length,
      preserved: 'article content, version history, comments, and all article-related data'
    });

    return {
      success: true,
      clearedImages
    };

  } catch (error) {
    console.error('Unexpected error during content brief clearing:', error);
    return {
      success: false,
      error: 'Unexpected error occurred during clearing'
    };
  }
}

/**
 * DEPRECATED: Use clearContentBriefData instead
 * This function fully deletes content briefs including generated articles
 */
export async function deleteContentBriefWithCleanup(briefId: string): Promise<{
  success: boolean;
  error?: string;
  deletedImages?: string[];
}> {
  console.warn('⚠️ deleteContentBriefWithCleanup is deprecated. Use clearContentBriefData to preserve articles.');
  
  try {
    console.log('🗑️ Starting FULL content brief deletion (including article) for ID:', briefId);

    // Get current user for authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to delete content briefs'
      };
    }

    // First, get the content brief to check ownership and get content
    const { data: contentBrief, error: fetchError } = await supabase
      .from('content_briefs')
      .select('id, user_id, title, product_name, article_content')
      .eq('id', briefId)
      .single();

    if (fetchError) {
      console.error('Error fetching content brief for deletion:', fetchError);
      if (fetchError.code === 'PGRST116') {
        return {
          success: false,
          error: 'Content brief not found'
        };
      }
      return {
        success: false,
        error: `Failed to fetch content brief: ${fetchError.message}`
      };
    }

    // Check if user is an admin
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id, admin_role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = !!adminProfile;

    // Check permissions (user owns the brief or is admin)
    if (!isAdmin && contentBrief.user_id !== user.id) {
      console.warn('User does not have permission to delete this content brief', {
        briefUserId: contentBrief.user_id,
        currentUser: user.id,
        isAdmin: false
      });
      return {
        success: false,
        error: 'You can only delete content briefs that you created'
      };
    }

    if (isAdmin) {
      console.log('🔓 Admin user detected, allowing deletion of any content brief');
    }

    // Get all associated article images from the database
    const { data: articleImages, error: imagesError } = await supabase
      .from('article_images')
      .select('id, storage_path, filename')
      .eq('article_id', briefId);

    if (imagesError) {
      console.warn('Could not fetch article images for cleanup:', imagesError);
    }

    const imagePaths: string[] = [];
    if (articleImages && articleImages.length > 0) {
      console.log(`📸 Found ${articleImages.length} associated images to delete`);
      imagePaths.push(...articleImages.map(img => img.storage_path));
    }

    // Extract embedded image URLs from article content
    if (contentBrief.article_content) {
      const imageUrlPattern = new RegExp(`https://[^\\s"']+${ARTICLE_IMAGES_BUCKET}/[^\\s"']+`, 'g');
      const embeddedImageUrls = contentBrief.article_content.match(imageUrlPattern) || [];
      
      if (embeddedImageUrls.length > 0) {
        console.log(`🖼️ Found ${embeddedImageUrls.length} embedded images in article content`);
        
        // Extract storage paths from URLs
        embeddedImageUrls.forEach(url => {
          const pathMatch = url.match(new RegExp(`${ARTICLE_IMAGES_BUCKET}/(.+)`));
          if (pathMatch && pathMatch[1]) {
            const path = pathMatch[1];
            if (!imagePaths.includes(path)) {
              imagePaths.push(path);
            }
          }
        });
      }
    }

    // Delete images from storage if any exist
    let deletedImages: string[] = [];
    if (imagePaths.length > 0) {
      console.log(`🧹 Cleaning up ${imagePaths.length} image files from storage`);
      
      const { success: storageSuccess, errors: storageErrors, deletedFiles } = 
        await deleteFromStorageWithVerification(ARTICLE_IMAGES_BUCKET, imagePaths);

      if (storageErrors && storageErrors.length > 0) {
        console.warn('Some images could not be deleted from storage:', storageErrors);
        // Continue with deletion even if some images couldn't be removed
      }

      deletedImages = deletedFiles;
      console.log(`✅ Successfully deleted ${deletedImages.length} images from storage`);
    }

    // Delete the content brief (this will CASCADE delete related records)
    const { error: deleteError } = await supabase
      .from('content_briefs')
      .delete()
      .eq('id', briefId);

    if (deleteError) {
      console.error('Error deleting content brief:', deleteError);
      if (deleteError.code === '42501') {
        return {
          success: false,
          error: 'You do not have permission to delete this content brief'
        };
      }
      return {
        success: false,
        error: `Failed to delete content brief: ${deleteError.message}`
      };
    }

    console.log('✅ Content brief deletion completed successfully');
    console.log('📊 Deletion summary:', {
      briefId,
      briefTitle: contentBrief.title || contentBrief.product_name,
      deletedImages: deletedImages.length,
      cascadeDeleted: 'comments, images metadata, version history, presence records, etc.'
    });

    return {
      success: true,
      deletedImages
    };

  } catch (error) {
    console.error('Unexpected error during content brief deletion:', error);
    return {
      success: false,
      error: 'Unexpected error occurred during deletion'
    };
  }
}

/**
 * Get content brief clearing impact preview
 * Shows what will be cleared vs preserved to help users make informed decisions
 */
export async function getContentBriefClearingPreview(briefId: string): Promise<{
  success: boolean;
  preview?: {
    title: string;
    createdAt: string;
    hasArticleContent: boolean;
    hasBriefContent: boolean;
    briefOnlyImageCount: number;
    articleImageCount: number;
    commentCount: number;
    versionCount: number;
  };
  error?: string;
}> {
  try {
    // Get content brief info
    const { data: contentBrief, error: briefError } = await supabase
      .from('content_briefs')
      .select('title, product_name, created_at, article_content, brief_content')
      .eq('id', briefId)
      .single();

    if (briefError) {
      return {
        success: false,
        error: 'Content brief not found'
      };
    }

    // Count brief-only images vs article images
    let briefOnlyImageCount = 0;
    let articleImageCount = 0;

    if (contentBrief.brief_content && Object.keys(contentBrief.brief_content).length > 0) {
      try {
        const briefContentStr = typeof contentBrief.brief_content === 'string' 
          ? contentBrief.brief_content 
          : JSON.stringify(contentBrief.brief_content);
        
        const imageUrlPattern = new RegExp(`https://[^\\s"']+${ARTICLE_IMAGES_BUCKET}/[^\\s"']+`, 'g');
        const briefImageUrls = briefContentStr.match(imageUrlPattern) || [];
        
        briefImageUrls.forEach(url => {
          // Check if this image is also in article content
          if (!contentBrief.article_content || !contentBrief.article_content.includes(url)) {
            briefOnlyImageCount++;
          } else {
            articleImageCount++;
          }
        });
      } catch (error) {
        console.warn('Could not extract images from brief content:', error);
      }
    }

    // Get counts for related data that will be preserved (not deleted)
    const [commentsResult, versionsResult] = await Promise.all([
      supabase
        .from('article_comments')
        .select('id', { count: 'exact' })
        .eq('article_id', briefId),
      supabase
        .from('version_history')
        .select('id', { count: 'exact' })
        .eq('article_id', briefId)
    ]);

    return {
      success: true,
      preview: {
        title: contentBrief.title || contentBrief.product_name || 'Untitled',
        createdAt: contentBrief.created_at,
        hasArticleContent: !!(contentBrief.article_content && contentBrief.article_content.trim()),
        hasBriefContent: !!(contentBrief.brief_content && Object.keys(contentBrief.brief_content).length > 0),
        briefOnlyImageCount,
        articleImageCount,
        commentCount: commentsResult.count || 0,
        versionCount: versionsResult.count || 0
      }
    };

  } catch (error) {
    console.error('Error getting clearing preview:', error);
    return {
      success: false,
      error: 'Failed to get clearing preview'
    };
  }
}

/**
 * DEPRECATED: Use getContentBriefClearingPreview instead
 * Get deletion impact preview for a content brief
 */
export async function getContentBriefDeletionPreview(briefId: string): Promise<{
  success: boolean;
  preview?: {
    title: string;
    createdAt: string;
    hasArticleContent: boolean;
    imageCount: number;
    commentCount: number;
    versionCount: number;
  };
  error?: string;
}> {
  console.warn('⚠️ getContentBriefDeletionPreview is deprecated. Use getContentBriefClearingPreview instead.');
  
  try {
    // Get content brief info
    const { data: contentBrief, error: briefError } = await supabase
      .from('content_briefs')
      .select('title, product_name, created_at, article_content')
      .eq('id', briefId)
      .single();

    if (briefError) {
      return {
        success: false,
        error: 'Content brief not found'
      };
    }

    // Get counts for related data that will be deleted
    const [imagesResult, commentsResult, versionsResult] = await Promise.all([
      supabase
        .from('article_images')
        .select('id', { count: 'exact' })
        .eq('article_id', briefId),
      supabase
        .from('article_comments')
        .select('id', { count: 'exact' })
        .eq('article_id', briefId),
      supabase
        .from('version_history')
        .select('id', { count: 'exact' })
        .eq('article_id', briefId)
    ]);

    return {
      success: true,
      preview: {
        title: contentBrief.title || contentBrief.product_name || 'Untitled',
        createdAt: contentBrief.created_at,
        hasArticleContent: !!(contentBrief.article_content && contentBrief.article_content.trim()),
        imageCount: imagesResult.count || 0,
        commentCount: commentsResult.count || 0,
        versionCount: versionsResult.count || 0
      }
    };

  } catch (error) {
    console.error('Error getting deletion preview:', error);
    return {
      success: false,
      error: 'Failed to get deletion preview'
    };
  }
}