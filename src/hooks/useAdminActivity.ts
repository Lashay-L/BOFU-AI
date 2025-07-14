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

      // 1. Fetch comment activities
      console.log('💬 Fetching comment activities...');
      try {
        const { data: comments, error: commentsError } = await supabase
          .from('article_comments')
          .select('id, content, created_at, article_id, user_id')
          .order('created_at', { ascending: false })
          .limit(3);

        if (commentsError) {
          console.error('❌ Comments query error:', commentsError);
        } else if (comments && comments.length > 0) {
          console.log('💬 Comments data found:', comments);
          const commentActivities: AdminActivityItem[] = comments.map((comment: any) => ({
            id: `comment-${comment.id}`,
            title: 'New comment posted',
            time: formatTime(comment.created_at),
            type: 'comment' as const,
            user: 'User', // Simplified for now
            details: `Comment: ${comment.content?.substring(0, 50)}...` || 'New comment added'
          }));
          allActivities.push(...commentActivities);
        } else {
          console.log('💬 No comments found');
        }
      } catch (commentError) {
        console.error('❌ Failed to fetch comment activity:', commentError);
      }

      // 2. Fetch research results activities
      console.log('🔬 Fetching research activities...');
      try {
        const { data: research, error: researchError } = await supabase
          .from('research_results')
          .select('id, title, product_name, created_at, updated_at, user_id')
          .order('created_at', { ascending: false })
          .limit(3);

        if (researchError) {
          console.error('❌ Research query error:', researchError);
        } else if (research && research.length > 0) {
          console.log('🔬 Research data found:', research);
          const researchActivities: AdminActivityItem[] = research.map((research: any) => ({
            id: `research-${research.id}`,
            title: 'Research completed',
            time: formatTime(research.created_at),
            type: 'research' as const,
            user: 'User', // Simplified for now
            details: `Product research: ${research.product_name || research.title || 'Unknown product'}`
          }));
          allActivities.push(...researchActivities);
        } else {
          console.log('🔬 No research data found');
        }
      } catch (researchError) {
        console.error('❌ Failed to fetch research activity:', researchError);
      }

      // 3. Fetch approved products activities
      console.log('✅ Fetching approved products...');
      try {
        const { data: approvals, error: approvalsError } = await supabase
          .from('approved_products')
          .select('id, product_name, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(3);

        if (approvalsError) {
          console.error('❌ Approved products query error:', approvalsError);
        } else if (approvals && approvals.length > 0) {
          console.log('✅ Approved products data found:', approvals);
          const approvalActivities: AdminActivityItem[] = approvals.map((approval: any) => ({
            id: `approval-${approval.id}`,
            title: 'Product approved',
            time: formatTime(approval.created_at),
            type: 'approved_product' as const,
            user: 'Admin', // Simplified for now
            details: `Product approved: ${approval.product_name || 'Unknown product'}`
          }));
          allActivities.push(...approvalActivities);
        } else {
          console.log('✅ No approved products found');
        }
      } catch (approvalsError) {
        console.error('❌ Failed to fetch approved products activity:', approvalsError);
      }

      // 4. Fetch article activities
      console.log('📄 Fetching article activities...');
      try {
        const { data: articles, error: articlesError } = await supabase
          .from('content_briefs')
          .select('id, title, created_at, updated_at, status, user_id')
          .eq('status', 'approved')
          .order('updated_at', { ascending: false })
          .limit(3);

        if (articlesError) {
          console.error('❌ Articles query error:', articlesError);
        } else if (articles && articles.length > 0) {
          console.log('📄 Articles data found:', articles);
          const articleActivities: AdminActivityItem[] = articles.map((article: any) => ({
            id: `article-${article.id}`,
            title: 'Article approved',
            time: formatTime(article.updated_at),
            type: 'article' as const,
            user: 'User', // Simplified for now
            details: `Article: ${article.title || 'Untitled'}`
          }));
          allActivities.push(...articleActivities);
        } else {
          console.log('📄 No approved articles found');
        }
      } catch (articlesError) {
        console.error('❌ Failed to fetch article activity:', articlesError);
      }

      // 5. Fetch content brief activities
      console.log('📋 Fetching content brief activities...');
      try {
        const { data: briefs, error: briefsError } = await supabase
          .from('content_briefs')
          .select('id, title, approval_status, created_at, updated_at, user_id')
          .order('updated_at', { ascending: false })
          .limit(3);

        if (briefsError) {
          console.error('❌ Content briefs query error:', briefsError);
        } else if (briefs && briefs.length > 0) {
          console.log('📋 Content briefs data found:', briefs);
          const briefActivities: AdminActivityItem[] = briefs.map((brief: any) => {
            const statusText = brief.approval_status === 'approved' ? 'approved' : 'submitted';
            return {
              id: `brief-${brief.id}`,
              title: `Content brief ${statusText}`,
              time: formatTime(brief.updated_at),
              type: 'content_brief' as const,
              user: 'User', // Simplified for now
              details: `Brief: ${brief.title || 'Untitled'}`
            };
          });
          allActivities.push(...briefActivities);
        } else {
          console.log('📋 No content briefs found');
        }
      } catch (briefsError) {
        console.error('❌ Failed to fetch content brief activity:', briefsError);
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