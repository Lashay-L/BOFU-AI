import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getRealtimeCommentActivity } from '../lib/commentAnalytics';

export interface AdminActivityItem {
  id: string;
  title: string;
  time: string;
  type: 'comment' | 'article' | 'user' | 'content_brief' | 'research' | 'approved_product' | 'system';
  user?: string;
  details?: string;
}

export interface AdminActivityData {
  activities: AdminActivityItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useAdminActivity = (maxItems: number = 10): AdminActivityData => {
  const [activities, setActivities] = useState<AdminActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const allActivities: AdminActivityItem[] = [];

      // Comments activities
      console.log('💬 Fetching comment activities...');
      const { data: commentsData, error: commentsError } = await supabase
        .from('article_comments')
        .select('id, content, created_at, article_id, user_id')
        .order('created_at', { ascending: false })
        .limit(3);

      if (commentsError) {
        console.log('❌ Comments query error:', commentsError);
      } else {
        console.log('💬 Comments data found:', commentsData);
        allActivities.push(...(commentsData || []).map(comment => ({
          id: `comment-${comment.id}`,
          title: 'New comment posted',
          time: formatTime(comment.created_at),
          type: 'comment' as const,
          user: 'User', // Simplified user display
          details: `Comment: ${comment.content?.substring(0, 50)}...` || 'New comment added'
        })));
      }

      // Research results activities  
      console.log('🔬 Fetching research activities...');
      const { data: researchData, error: researchError } = await supabase
        .from('research_results')
        .select('id, title, created_at, updated_at, user_id')
        .order('created_at', { ascending: false })
        .limit(3);

      if (researchError) {
        console.log('❌ Research query error:', researchError);
      } else {
        console.log('🔬 Research data found:', researchData);
        allActivities.push(...(researchData || []).map(result => ({
          id: `research-${result.id}`,
          title: 'Research completed',
          time: formatTime(result.created_at),
          type: 'research' as const,
          user: 'User', // Simplified user display
          details: `Product research: ${result.title || 'Unknown product'}`
        })));
      }

      // Approved products activities
      console.log('✅ Fetching approved products...');
      const { data: productsData, error: productsError } = await supabase
        .from('approved_products')
        .select('id, product_name, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (productsError) {
        console.log('❌ Approved products query error:', productsError);
      } else {
        console.log('✅ Approved products data found:', productsData);
        allActivities.push(...(productsData || []).map(product => ({
          id: `approval-${product.id}`,
          title: 'Product approved',
          time: formatTime(product.created_at),
          type: 'approved_product' as const,
          user: 'Admin', // Product approvals are admin actions
          details: `Product approved: ${product.product_name || 'Unknown product'}`
        })));
      }

      // Article activities
      console.log('📄 Fetching article activities...');
      const { data: articlesData, error: articlesError } = await supabase
        .from('content_briefs')
        .select('id, title, created_at, updated_at, status, user_id')
        .eq('status', 'approved')
        .order('updated_at', { ascending: false })
        .limit(3);

      if (articlesError) {
        console.log('❌ Articles query error:', articlesError);
      } else if (!articlesData || articlesData.length === 0) {
        console.log('📄 No approved articles found');
      } else {
        console.log('📄 Articles data found:', articlesData);
        allActivities.push(...articlesData.map(article => ({
          id: `article-${article.id}`,
          title: 'Article approved',
          time: formatTime(article.updated_at),
          type: 'article' as const,
          user: 'User', // Simplified user display
          details: `Article: ${article.title || 'Untitled'}`
        })));
      }

      // Content brief activities
      console.log('📋 Fetching content brief activities...');
      const { data: briefsData, error: briefsError } = await supabase
        .from('content_briefs')
        .select('id, title, status, created_at, updated_at, user_id')
        .order('updated_at', { ascending: false })
        .limit(3);

      if (briefsError) {
        console.log('❌ Content briefs query error:', briefsError);
      } else {
        console.log('📋 Content briefs data found:', briefsData);
        allActivities.push(...(briefsData || []).map(brief => ({
          id: `brief-${brief.id}`,
          title: `Content brief ${brief.status}`,
          time: formatTime(brief.updated_at),
          type: 'content_brief' as const,
          user: 'User', // Simplified user display
          details: `Brief: ${brief.title || 'Untitled'}`
        })));
      }

      // 6. Fetch user registrations
      console.log('👥 Fetching user registrations...');
      try {
        const { data: users, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, email, company_name, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (usersError) {
          console.error('❌ Users query error:', usersError);
        } else if (users && users.length > 0) {
          console.log('👥 Users data found:', users);
          const userActivities: AdminActivityItem[] = users.map((user: any) => ({
            id: `user-${user.id}`,
            title: 'New user registered',
            time: formatTime(user.created_at),
            type: 'user' as const,
            user: user.email,
            details: `Email: ${user.email}${user.company_name ? `, New user registered from ${user.company_name}` : ''}`
          }));
          allActivities.push(...userActivities);
        } else {
          console.log('👥 No user registrations found');
        }
      } catch (usersError) {
        console.error('❌ Failed to fetch user activity:', usersError);
      }

      // Sort all activities by time and limit to maxItems
      allActivities.sort((a, b) => {
        const timeA = new Date(a.time === 'Just now' ? Date.now() : a.time).getTime();
        const timeB = new Date(b.time === 'Just now' ? Date.now() : b.time).getTime();
        return timeB - timeA;
      });

      const limitedActivities = allActivities.slice(0, maxItems);
      console.log(`🎯 Total activities found: ${allActivities.length}, showing top ${limitedActivities.length}`);

      setActivities(limitedActivities);

    } catch (error) {
      console.error('❌ Error fetching admin activities:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch activities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [maxItems]);

  return {
    activities,
    isLoading,
    error,
    refresh: fetchActivities
  };
}; 