import { supabase } from './supabase';

export interface ArticleInfo {
  id: string;
  title: string;
  product_name?: string;
  user_id: string;
  status?: string;
  created_at: string;
}

/**
 * Navigation helper for article access from comments and notifications
 */
export class ArticleNavigation {
  /**
   * Get article information by ID
   */
  static async getArticleInfo(articleId: string): Promise<ArticleInfo | null> {
    try {
      const { data, error } = await supabase
        .from('content_briefs')
        .select('id, title, product_name, user_id, status, created_at')
        .eq('id', articleId)
        .single();

      if (error) {
        console.error('Error fetching article info:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getArticleInfo:', error);
      return null;
    }
  }

  /**
   * Check if current user can access the article
   */
  static async canAccessArticle(articleId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      // Check if user is admin
      const { data: adminProfile } = await supabase
        .from('admin_profiles')
        .select('id')
        .eq('id', user.user.id)
        .single();

      // Admins can access all articles
      if (adminProfile) return true;

      // Regular users can only access their own articles
      const articleInfo = await this.getArticleInfo(articleId);
      return articleInfo?.user_id === user.user.id;
    } catch (error) {
      console.error('Error checking article access:', error);
      return false;
    }
  }

  /**
   * Generate navigation URL for article based on user role
   */
  static async getArticleNavigationUrl(articleId: string): Promise<string | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const canAccess = await this.canAccessArticle(articleId);
      if (!canAccess) return null;

      // Check if user is admin
      const { data: adminProfile } = await supabase
        .from('admin_profiles')
        .select('id')
        .eq('id', user.user.id)
        .single();

      if (adminProfile) {
        // Admin navigation - goes to admin article editor
        return `/admin/articles/${articleId}`;
      } else {
        // User navigation - goes to user article editor
        return `/articles/${articleId}`;
      }
    } catch (error) {
      console.error('Error generating navigation URL:', error);
      return null;
    }
  }

  /**
   * Navigate to article with proper error handling
   */
  static async navigateToArticle(
    articleId: string, 
    navigate: (url: string) => void,
    onError?: (message: string) => void
  ): Promise<void> {
    try {
      const url = await this.getArticleNavigationUrl(articleId);
      
      if (!url) {
        const message = 'Unable to access this article. You may not have permission or the article may have been deleted.';
        onError?.(message);
        return;
      }

      navigate(url);
    } catch (error) {
      console.error('Error navigating to article:', error);
      const message = 'An error occurred while trying to open the article.';
      onError?.(message);
    }
  }

  /**
   * Generate navigation URL with comment anchor
   */
  static async getArticleNavigationUrlWithComment(
    articleId: string, 
    commentId: string
  ): Promise<string | null> {
    const baseUrl = await this.getArticleNavigationUrl(articleId);
    if (!baseUrl) return null;

    return `${baseUrl}#comment-${commentId}`;
  }
}

/**
 * Hook for article navigation in React components
 */
export const useArticleNavigation = () => {
  const navigateToArticle = async (
    articleId: string,
    navigate: (url: string) => void,
    onError?: (message: string) => void
  ) => {
    await ArticleNavigation.navigateToArticle(articleId, navigate, onError);
  };

  const navigateToArticleWithComment = async (
    articleId: string,
    commentId: string,
    navigate: (url: string) => void,
    onError?: (message: string) => void
  ) => {
    try {
      const url = await ArticleNavigation.getArticleNavigationUrlWithComment(articleId, commentId);
      
      if (!url) {
        const message = 'Unable to access this article. You may not have permission or the article may have been deleted.';
        onError?.(message);
        return;
      }

      navigate(url);
    } catch (error) {
      console.error('Error navigating to article with comment:', error);
      const message = 'An error occurred while trying to open the article.';
      onError?.(message);
    }
  };

  return {
    navigateToArticle,
    navigateToArticleWithComment
  };
};